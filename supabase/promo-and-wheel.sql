-- ============================================================
--  Elva LaVenta — Phase 2: ЕДИНЫЙ discount-движок
--  (промокоды + Wheel of Fortune)
--
--  Запустить ЦЕЛИКОМ: Supabase → SQL Editor → New query → вставить → Run.
--  Скрипт ИДЕМПОТЕНТЕН и БЕЗОПАСЕН для существующих данных:
--   - не удаляет товары, заказы, корзины, профили;
--   - только добавляет таблицы/колонки/функции/политики;
--   - существующий 7-аргументный place_order продолжает работать
--     (он делегирует новой 8-аргументной версии с промокодом = null).
--
--  Архитектура: ОДНА система скидок. И ручной промокод, и выигрыш колеса —
--  это записи в public.promo_codes. Колесо создаёт account-bound промокод
--  (source='wheel'), а checkout применяет его той же trusted-логикой, что и
--  обычный промокод. Клиент НИКОГДА не считает и не присылает итоговую скидку —
--  всё проверяется и фиксируется на сервере (security definer + RLS).
-- ============================================================

create extension if not exists pgcrypto;   -- gen_random_bytes для генерации кодов

-- ============================================================
--  1. ТАБЛИЦА ПРОМОКОДОВ
-- ============================================================
create table if not exists public.promo_codes (
  id                    bigint generated always as identity primary key,
  code                  text not null,
  -- 'campaign' — общий код (много аккаунтов); 'individual' — привязан к одному аккаунту
  type                  text not null default 'campaign'
                          check (type in ('campaign', 'individual')),
  discount_type         text not null default 'percent'
                          check (discount_type in ('percent', 'fixed')),
  discount_value        numeric(10,2) not null check (discount_value > 0),
  active                boolean not null default true,
  starts_at             timestamptz,
  expires_at            timestamptz,
  max_total_uses        integer check (max_total_uses is null or max_total_uses > 0),
  max_uses_per_account  integer default 1
                          check (max_uses_per_account is null or max_uses_per_account > 0),
  minimum_order_amount  numeric(10,2) check (minimum_order_amount is null or minimum_order_amount >= 0),
  assigned_account_id   uuid references auth.users(id) on delete cascade, -- только individual
  -- 'manual' — создан админом; 'wheel' — выигрыш колеса
  source                text not null default 'manual'
                          check (source in ('manual', 'wheel')),
  created_by            uuid references auth.users(id) on delete set null,
  created_at            timestamptz not null default now()
);

comment on table public.promo_codes is 'Единый источник скидок: ручные промокоды и выигрыши колеса (source=wheel)';

-- Код уникален без учёта регистра (вводят как угодно, храним/сравниваем в upper)
create unique index if not exists promo_codes_code_uniq on public.promo_codes (upper(code));
create index if not exists promo_codes_assigned_idx on public.promo_codes (assigned_account_id);
create index if not exists promo_codes_active_idx on public.promo_codes (active) where active;

-- ============================================================
--  2. ТАБЛИЦА ПРИМЕНЕНИЙ (usage / история) — она же аудит использования
-- ============================================================
create table if not exists public.promo_redemptions (
  id               bigint generated always as identity primary key,
  promo_id         bigint not null references public.promo_codes(id) on delete cascade,
  account_id       uuid not null references auth.users(id) on delete cascade,
  order_id         bigint references public.orders(id) on delete set null,
  discount_amount  numeric(10,2) not null default 0,
  used_at          timestamptz not null default now()
);

comment on table public.promo_redemptions is 'Факт применения промокода к заказу (per-account/total лимиты считаются отсюда)';

create index if not exists promo_redemptions_promo_idx on public.promo_redemptions (promo_id);
create index if not exists promo_redemptions_account_idx on public.promo_redemptions (account_id);

-- ============================================================
--  3. КОЛОНКИ СКИДКИ В ЗАКАЗЕ (аддитивно; итог хранится уже со скидкой)
-- ============================================================
alter table public.orders add column if not exists discount_amount numeric(10,2) not null default 0;
alter table public.orders add column if not exists promo_code text;
alter table public.orders add column if not exists discount_source text; -- 'manual' | 'wheel'

-- Пересчёт итога теперь учитывает скидку: total = subtotal - discount (не ниже 0).
-- Триггер на order_items уже существует (recalc_order_total); переопределяем тело.
create or replace function public.recalc_order_total()
returns trigger language plpgsql as $$
declare oid bigint;
begin
  oid := coalesce(new.order_id, old.order_id);
  update public.orders o
     set total = greatest(0,
        coalesce((select sum(i.price * i.qty)
                    from public.order_items i
                   where i.order_id = oid), 0)
        - coalesce(o.discount_amount, 0))
   where o.id = oid;
  return null;
end $$;

-- ============================================================
--  4. ГЕНЕРАЦИЯ УНИКАЛЬНОГО КОДА
--     Безопасный случайный суффикс + проверка уникальности (не голый random).
-- ============================================================
create or replace function public.generate_promo_code(p_prefix text default 'VIP')
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- без похожих 0/O/1/I
  v_code text;
  v_suffix text;
  v_try int := 0;
  i int;
begin
  loop
    v_suffix := '';
    for i in 1..6 loop
      v_suffix := v_suffix || substr(v_alphabet,
        1 + (get_byte(gen_random_bytes(1), 0) % length(v_alphabet)), 1);
    end loop;
    v_code := upper(coalesce(nullif(btrim(p_prefix), ''), 'VIP')) || '-' || v_suffix;
    exit when not exists (select 1 from public.promo_codes where upper(code) = upper(v_code));
    v_try := v_try + 1;
    if v_try > 20 then
      raise exception 'CODE_GEN_FAILED';
    end if;
  end loop;
  return v_code;
end $$;

-- ============================================================
--  5. ВНУТРЕННЯЯ ВАЛИДАЦИЯ ПРОМОКОДА
--     Один источник истины для preview (validate_promo) и для финального
--     применения (place_order). При p_lock=true блокирует строку промокода —
--     это даёт atomic-защиту от гонки (двойное использование).
--     Возвращает id и discount_amount; при проблеме бросает КОДОВОЕ исключение.
-- ============================================================
create or replace function public._validate_promo(
  p_code      text,
  p_account   uuid,
  p_subtotal  numeric,
  p_lock      boolean default false
)
returns table (promo_id bigint, discount_type text, discount_value numeric, discount_amount numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.promo_codes%rowtype;
  v_used_account int;
  v_used_total int;
  v_amount numeric;
begin
  if p_account is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_lock then
    select * into v from public.promo_codes
      where upper(code) = upper(btrim(p_code)) for update;
  else
    select * into v from public.promo_codes
      where upper(code) = upper(btrim(p_code));
  end if;

  if not found then
    raise exception 'PROMO_NOT_FOUND';
  end if;
  if v.active is not true then
    raise exception 'PROMO_INACTIVE';
  end if;
  if v.starts_at is not null and now() < v.starts_at then
    raise exception 'PROMO_NOT_STARTED';
  end if;
  if v.expires_at is not null and now() > v.expires_at then
    raise exception 'PROMO_EXPIRED';
  end if;
  if v.type = 'individual' and v.assigned_account_id is distinct from p_account then
    raise exception 'PROMO_ACCOUNT_MISMATCH';
  end if;
  if v.minimum_order_amount is not null and coalesce(p_subtotal, 0) < v.minimum_order_amount then
    raise exception 'PROMO_MIN_ORDER';
  end if;

  if v.max_uses_per_account is not null then
    select count(*) into v_used_account from public.promo_redemptions
      where promo_id = v.id and account_id = p_account;
    if v_used_account >= v.max_uses_per_account then
      raise exception 'PROMO_ALREADY_USED';
    end if;
  end if;

  if v.max_total_uses is not null then
    select count(*) into v_used_total from public.promo_redemptions
      where promo_id = v.id;
    if v_used_total >= v.max_total_uses then
      raise exception 'PROMO_LIMIT_REACHED';
    end if;
  end if;

  if v.discount_type = 'percent' then
    v_amount := round(coalesce(p_subtotal, 0) * v.discount_value / 100.0, 2);
  else
    v_amount := least(v.discount_value, coalesce(p_subtotal, 0));
  end if;
  v_amount := greatest(0, v_amount);

  promo_id := v.id;
  discount_type := v.discount_type;
  discount_value := v.discount_value;
  discount_amount := v_amount;
  return next;
end $$;

-- ============================================================
--  6. ПУБЛИЧНЫЙ preview для checkout (Apply) — только читает, НЕ фиксирует.
--     Никогда не считать "использованным" по Apply — только при заказе.
-- ============================================================
create or replace function public.validate_promo(p_code text, p_subtotal numeric)
returns table (discount_type text, discount_value numeric, discount_amount numeric)
language plpgsql
security definer
set search_path = public
as $$
declare r record;
begin
  select * into r from public._validate_promo(p_code, auth.uid(), p_subtotal, false);
  discount_type := r.discount_type;
  discount_value := r.discount_value;
  discount_amount := r.discount_amount;
  return next;
end $$;

revoke all on function public.validate_promo(text, numeric) from anon;
grant execute on function public.validate_promo(text, numeric) to authenticated;

-- ============================================================
--  7. ОФОРМЛЕНИЕ ЗАКАЗА СО СКИДКОЙ (8-арг версия — trusted).
--     Полностью повторяет логику order-stock-guard, ДОБАВЛЯЯ:
--     атомарную валидацию промокода, запись redemption и скидку в заказе.
--     Скидка применяется к MERCHANDISE SUBTOTAL. Доставка в БД-итог не входит
--     (как и раньше — экспресс-доплата идёт в note/Telegram отдельно).
-- ============================================================
create or replace function public.place_order(
  p_customer_name text,
  p_phone text,
  p_phone_call text,
  p_email text,
  p_address text,
  p_note text,
  p_items jsonb,
  p_promo_code text
)
returns table(order_no text, order_id bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_product public.products%rowtype;
  v_item jsonb;
  v_product_id bigint;
  v_qty integer;
  v_size text;
  v_line_number integer := 0;
  v_items_text text := '';
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_promo public.promo_codes%rowtype;
  v_promo_val record;
  v_token text;
  v_chat_id text;
  v_message text;
  v_whatsapp_digits text;
  v_code text := nullif(btrim(coalesce(p_promo_code, '')), '');
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if btrim(coalesce(p_customer_name, '')) = ''
    or btrim(coalesce(p_phone, '')) = ''
    or btrim(coalesce(p_address, '')) = '' then
    raise exception 'ORDER_FIELDS_REQUIRED';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'CART_EMPTY';
  end if;

  insert into public.orders (
    user_id, customer_name, phone, phone_call, email, address, note, status
  ) values (
    auth.uid(), btrim(p_customer_name), btrim(p_phone), btrim(coalesce(p_phone_call, '')),
    btrim(coalesce(p_email, '')), btrim(p_address), btrim(coalesce(p_note, '')), 'new'
  ) returning * into v_order;

  for v_item in select value from jsonb_array_elements(p_items) loop
    begin
      v_product_id := (v_item ->> 'product_id')::bigint;
      v_qty := coalesce((v_item ->> 'qty')::integer, 1);
    exception when invalid_text_representation then
      raise exception 'INVALID_ITEM';
    end;

    if v_product_id is null or v_qty < 1 or v_qty > 20 then
      raise exception 'INVALID_ITEM';
    end if;

    select * into v_product from public.products
      where id = v_product_id and is_active = true;
    if not found then
      raise exception 'PRODUCT_UNAVAILABLE';
    end if;
    if v_product.in_stock is not true then
      raise exception 'PRODUCT_UNAVAILABLE';
    end if;

    v_size := nullif(btrim(coalesce(v_item ->> 'size', '')), '');
    if coalesce(array_length(v_product.sizes, 1), 0) > 0
      and (v_size is null or not (v_size = any(v_product.sizes))) then
      raise exception 'SIZE_INVALID';
    end if;

    insert into public.order_items (
      order_id, product_id, product_code, product_name, product_image, price, size, qty
    ) values (
      v_order.id, v_product.id, coalesce(v_product.code, ''),
      coalesce(v_product.name ->> 'az', v_product.name ->> 'ru', v_product.name ->> 'en', ''),
      coalesce(v_product.images[1], v_product.image), v_product.price,
      coalesce(v_size, ''), v_qty
    );

    v_line_number := v_line_number + 1;
    v_items_text := v_items_text || v_line_number || '. ' ||
      coalesce(v_product.name ->> 'az', v_product.name ->> 'ru', v_product.name ->> 'en', 'Məhsul') ||
      case when coalesce(v_product.code, '') <> '' then ' (kod: ' || v_product.code || ')' else '' end ||
      E'\n   Ölçü: ' || coalesce(v_size, '—') || ' · Say: ' || v_qty || E'\n';
    v_subtotal := v_subtotal + (v_product.price * v_qty);
  end loop;

  -- ---- ПРОМОКОД: атомарная валидация + фиксация использования ----
  -- _validate_promo с p_lock=true блокирует строку промокода: два параллельных
  -- заказа с одним одноразовым кодом сериализуются, второй увидит лимит и упадёт.
  if v_code is not null then
    select * into v_promo_val
      from public._validate_promo(v_code, auth.uid(), v_subtotal, true);
    v_discount := coalesce(v_promo_val.discount_amount, 0);

    select * into v_promo from public.promo_codes where id = v_promo_val.promo_id;

    insert into public.promo_redemptions (promo_id, account_id, order_id, discount_amount)
      values (v_promo.id, auth.uid(), v_order.id, v_discount);

    update public.orders
       set discount_amount = v_discount,
           promo_code = v_promo.code,
           discount_source = v_promo.source,
           total = greatest(0, v_subtotal - v_discount)
     where id = v_order.id;
  end if;

  -- ---- Telegram (ошибка уведомления никогда не отменяет заказ) ----
  begin
    select value into v_token from public.app_settings where key = 'telegram_token';
    select value into v_chat_id from public.app_settings where key = 'telegram_chat_id';

    if nullif(btrim(coalesce(v_token, '')), '') is not null
      and nullif(btrim(coalesce(v_chat_id, '')), '') is not null then
      v_whatsapp_digits := regexp_replace(btrim(p_phone), '\D', '', 'g');
      v_message :=
        '🛍 Yeni sifariş ' || coalesce(v_order.order_no, '#' || v_order.id::text) || E'\n\n' ||
        v_items_text || E'\n' ||
        'Məhsullar: ' || v_subtotal || ' ₼' || E'\n' ||
        case when v_discount > 0 then
          'Endirim' ||
          case when v_promo.source = 'wheel' then ' (Çarx)' else '' end ||
          ' [' || coalesce(v_promo.code, '') || ']: -' || v_discount || ' ₼' || E'\n'
        else '' end ||
        'Cəmi: ' || greatest(0, v_subtotal - v_discount) || ' ₼' || E'\n\n' ||
        'Müştəri:' || E'\n' ||
        'Ad və soyad: ' || btrim(p_customer_name) || E'\n' ||
        'WhatsApp: ' || btrim(p_phone) ||
        case when v_whatsapp_digits <> '' then ' · https://wa.me/' || v_whatsapp_digits else '' end || E'\n' ||
        case when btrim(coalesce(p_phone_call, '')) <> '' then 'Zəng: ' || btrim(p_phone_call) || E'\n' else '' end ||
        'Ünvan: ' || btrim(p_address) || E'\n' ||
        case when btrim(coalesce(p_note, '')) <> '' then 'Qeyd: ' || btrim(p_note) else '' end;

      perform net.http_post(
        url := 'https://api.telegram.org/bot' || v_token || '/sendMessage',
        body := jsonb_build_object('chat_id', v_chat_id, 'text', v_message, 'disable_web_page_preview', true),
        headers := jsonb_build_object('Content-Type', 'application/json')
      );
    end if;
  exception when others then
    null;
  end;

  delete from public.customer_cart_items where user_id = auth.uid();
  return query select v_order.order_no, v_order.id;
end;
$$;

revoke all on function public.place_order(text, text, text, text, text, text, jsonb, text) from anon;
grant execute on function public.place_order(text, text, text, text, text, text, jsonb, text) to authenticated;

-- Совместимость: старый 7-арг вызов клиента продолжает работать (без промо).
create or replace function public.place_order(
  p_customer_name text, p_phone text, p_phone_call text, p_email text,
  p_address text, p_note text, p_items jsonb
)
returns table(order_no text, order_id bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query select * from public.place_order(
    p_customer_name, p_phone, p_phone_call, p_email, p_address, p_note, p_items, null::text);
end $$;

revoke all on function public.place_order(text, text, text, text, text, text, jsonb) from anon;
grant execute on function public.place_order(text, text, text, text, text, text, jsonb) to authenticated;

-- ============================================================
--  8. WHEEL OF FORTUNE — конфигурация (singleton, admin-configurable)
-- ============================================================
create table if not exists public.wheel_config (
  id                  int primary key default 1 check (id = 1),
  enabled             boolean not null default true,
  timezone            text not null default 'Asia/Baku',
  -- окна суток в локальном времени timezone; допуск ± tolerance_minutes
  windows             text[] not null default array['10:00','13:00','18:00','21:00'],
  tolerance_minutes   int not null default 5 check (tolerance_minutes between 0 and 60),
  -- достижимые награды и веса: [{"percent":5,"weight":80},{"percent":10,"weight":17},{"percent":15,"weight":3}]
  rewards             jsonb not null default
                        '[{"percent":5,"weight":80},{"percent":10,"weight":17},{"percent":15,"weight":3}]'::jsonb,
  reward_expiry_hours int not null default 24 check (reward_expiry_hours > 0),
  max_spins_per_window int not null default 1 check (max_spins_per_window >= 1),
  updated_at          timestamptz not null default now()
);

insert into public.wheel_config (id) values (1) on conflict (id) do nothing;

drop trigger if exists wheel_config_touch on public.wheel_config;
create trigger wheel_config_touch
  before update on public.wheel_config
  for each row execute function public.touch_updated_at();

-- ============================================================
--  9. WHEEL — записи спинов (аудит + one-spin-per-window через UNIQUE)
-- ============================================================
create table if not exists public.wheel_spins (
  id             bigint generated always as identity primary key,
  account_id     uuid not null references auth.users(id) on delete cascade,
  window_key     text not null,                 -- 'YYYY-MM-DD#HH:MM' (локальная дата+окно)
  reward_percent numeric(5,2) not null,
  promo_id       bigint references public.promo_codes(id) on delete set null,
  spun_at        timestamptz not null default now(),
  unique (account_id, window_key)               -- атомарно: один спин на окно
);

create index if not exists wheel_spins_account_idx on public.wheel_spins (account_id);

-- ============================================================
--  10. WHEEL — определение текущего окна по СЕРВЕРНОМУ времени (Asia/Baku)
--      Возвращает метку окна ('HH:MM') если сейчас внутри допуска, иначе null.
-- ============================================================
create or replace function public._wheel_current_window(p_cfg public.wheel_config)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_local timestamptz := now();
  v_now_min int;
  w text;
  v_win_min int;
begin
  -- минуты от полуночи по локальному времени магазина
  v_now_min := extract(hour from (v_local at time zone p_cfg.timezone)) * 60
             + extract(minute from (v_local at time zone p_cfg.timezone));
  foreach w in array p_cfg.windows loop
    v_win_min := split_part(w, ':', 1)::int * 60 + split_part(w, ':', 2)::int;
    if abs(v_now_min - v_win_min) <= p_cfg.tolerance_minutes then
      return w;
    end if;
  end loop;
  return null;
end $$;

-- Ключ окна: локальная дата + метка окна (один спин на аккаунт в это окно суток)
create or replace function public._wheel_window_key(p_cfg public.wheel_config, p_window text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select to_char((now() at time zone p_cfg.timezone)::date, 'YYYY-MM-DD') || '#' || p_window;
$$;

-- ============================================================
--  11. WHEEL — публичный конфиг для UI (БЕЗ весов — веса только на сервере)
-- ============================================================
create or replace function public.get_wheel_public_config()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare c public.wheel_config%rowtype;
begin
  select * into c from public.wheel_config where id = 1;
  if not found then
    return jsonb_build_object('enabled', false);
  end if;
  return jsonb_build_object(
    'enabled', c.enabled,
    'timezone', c.timezone,
    'windows', to_jsonb(c.windows),
    'tolerance_minutes', c.tolerance_minutes,
    'reward_expiry_hours', c.reward_expiry_hours,
    -- только достижимые проценты (weight>0), по возрастанию; веса НЕ отдаём
    'rewards', (
      select coalesce(jsonb_agg(percent order by percent), '[]'::jsonb)
      from (
        select (r->>'percent')::numeric as percent
        from jsonb_array_elements(c.rewards) r
        where coalesce((r->>'weight')::numeric, 0) > 0
      ) t
    )
  );
end $$;

grant execute on function public.get_wheel_public_config() to anon, authenticated;

-- ============================================================
--  12. WHEEL — статус для текущего аккаунта (в окне? уже крутил? активная награда?)
-- ============================================================
create or replace function public.get_wheel_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c public.wheel_config%rowtype;
  v_window text;
  v_key text;
  v_spun boolean := false;
  v_reward jsonb := null;
begin
  select * into c from public.wheel_config where id = 1;
  if not found or c.enabled is not true then
    return jsonb_build_object('enabled', false, 'in_window', false, 'signed_in', auth.uid() is not null);
  end if;

  v_window := public._wheel_current_window(c);

  if auth.uid() is not null then
    if v_window is not null then
      v_key := public._wheel_window_key(c, v_window);
      select true into v_spun from public.wheel_spins
        where account_id = auth.uid() and window_key = v_key limit 1;
    end if;
    -- активная (неиспользованная, не просроченная) награда колеса
    select jsonb_build_object('code', pc.code, 'percent', pc.discount_value, 'expires_at', pc.expires_at)
      into v_reward
      from public.promo_codes pc
      where pc.assigned_account_id = auth.uid()
        and pc.source = 'wheel'
        and pc.active
        and (pc.expires_at is null or pc.expires_at > now())
        and not exists (select 1 from public.promo_redemptions r where r.promo_id = pc.id)
      order by pc.created_at desc
      limit 1;
  end if;

  return jsonb_build_object(
    'enabled', true,
    'signed_in', auth.uid() is not null,
    'in_window', v_window is not null,
    'window', v_window,
    'already_spun', coalesce(v_spun, false),
    'active_reward', v_reward
  );
end $$;

grant execute on function public.get_wheel_status() to anon, authenticated;

-- ============================================================
--  13. WHEEL — SPIN (trusted). Результат определяет СЕРВЕР (weighted), клиент
--      только анимирует к готовому результату. Один спин на окно — атомарно
--      через UNIQUE(account_id, window_key). Создаёт account-bound промокод.
-- ============================================================
create or replace function public.spin_wheel()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.wheel_config%rowtype;
  v_window text;
  v_key text;
  v_total_weight numeric := 0;
  v_pick numeric;
  v_acc numeric := 0;
  r jsonb;
  v_percent numeric := null;
  v_code text;
  v_promo_id bigint;
  v_expiry timestamptz;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into c from public.wheel_config where id = 1;
  if not found or c.enabled is not true then
    raise exception 'WHEEL_DISABLED';
  end if;

  v_window := public._wheel_current_window(c);
  if v_window is null then
    raise exception 'WHEEL_CLOSED';   -- вне временного окна (серверное время)
  end if;
  v_key := public._wheel_window_key(c, v_window);

  -- Взвешенный выбор награды на сервере (только weight>0)
  for r in select value from jsonb_array_elements(c.rewards)
           where coalesce((value->>'weight')::numeric, 0) > 0 loop
    v_total_weight := v_total_weight + (r->>'weight')::numeric;
  end loop;
  if v_total_weight <= 0 then
    raise exception 'WHEEL_NO_REWARDS';
  end if;

  v_pick := (get_byte(gen_random_bytes(2), 0) * 256 + get_byte(gen_random_bytes(2), 0))::numeric
            / 65535.0 * v_total_weight;
  for r in select value from jsonb_array_elements(c.rewards)
           where coalesce((value->>'weight')::numeric, 0) > 0
           order by (value->>'percent')::numeric loop
    v_acc := v_acc + (r->>'weight')::numeric;
    if v_pick <= v_acc then
      v_percent := (r->>'percent')::numeric;
      exit;
    end if;
  end loop;
  if v_percent is null then
    -- на всякий случай — последняя награда
    select (value->>'percent')::numeric into v_percent
      from jsonb_array_elements(c.rewards)
      where coalesce((value->>'weight')::numeric, 0) > 0
      order by (value->>'percent')::numeric desc limit 1;
  end if;

  v_expiry := now() + make_interval(hours => c.reward_expiry_hours);

  -- Создаём account-bound промокод (единый discount-движок): individual, 1 использование.
  v_code := public.generate_promo_code('WHEEL');
  insert into public.promo_codes (
    code, type, discount_type, discount_value, active,
    expires_at, max_total_uses, max_uses_per_account, assigned_account_id, source, created_by
  ) values (
    v_code, 'individual', 'percent', v_percent, true,
    v_expiry, 1, 1, auth.uid(), 'wheel', auth.uid()
  ) returning id into v_promo_id;

  -- Атомарно фиксируем спин. Дубль в этом окне → unique_violation → ALREADY_SPUN.
  begin
    insert into public.wheel_spins (account_id, window_key, reward_percent, promo_id)
      values (auth.uid(), v_key, v_percent, v_promo_id);
  exception when unique_violation then
    -- откатываем созданный промокод — спина не было
    delete from public.promo_codes where id = v_promo_id;
    raise exception 'WHEEL_ALREADY_SPUN';
  end;

  return jsonb_build_object(
    'percent', v_percent,
    'code', v_code,
    'expires_at', v_expiry
  );
end $$;

revoke all on function public.spin_wheel() from anon;
grant execute on function public.spin_wheel() to authenticated;

-- ============================================================
--  14. RLS / ПОЛИТИКИ БЕЗОПАСНОСТИ
--     Клиент НЕ имеет прямого доступа к таблицам скидок — только через RPC
--     (security definer). Админ управляет через is_admin(). Так публичный
--     пользователь не может: создавать коды, менять скидки/веса/лимиты,
--     читать чужие individual-коды, отмечать код неиспользованным,
--     создавать себе награды колеса.
-- ============================================================
alter table public.promo_codes       enable row level security;
alter table public.promo_redemptions enable row level security;
alter table public.wheel_config      enable row level security;
alter table public.wheel_spins       enable row level security;

-- promo_codes: прямого SELECT для клиента НЕТ (валидация через RPC). Только админ.
drop policy if exists "promo admin all" on public.promo_codes;
create policy "promo admin all" on public.promo_codes for all
  using (public.is_admin()) with check (public.is_admin());

-- promo_redemptions: только админ читает; запись — через security-definer RPC.
drop policy if exists "redemptions admin read" on public.promo_redemptions;
create policy "redemptions admin read" on public.promo_redemptions for select
  using (public.is_admin());

-- wheel_config: чтение/запись только админ (публичный конфиг отдаёт RPC без весов).
drop policy if exists "wheel_config admin all" on public.wheel_config;
create policy "wheel_config admin all" on public.wheel_config for all
  using (public.is_admin()) with check (public.is_admin());

-- wheel_spins: только админ читает; запись — через spin_wheel RPC.
drop policy if exists "wheel_spins admin read" on public.wheel_spins;
create policy "wheel_spins admin read" on public.wheel_spins for select
  using (public.is_admin());

-- Внутренние helper-функции: Postgres по умолчанию грантит EXECUTE для PUBLIC.
-- Закрываем — клиент вызывает только validate_promo / place_order / get_wheel_*.
revoke all on function public._validate_promo(text, uuid, numeric, boolean) from public;
revoke all on function public.generate_promo_code(text) from public;
revoke all on function public._wheel_current_window(public.wheel_config) from public;
revoke all on function public._wheel_window_key(public.wheel_config, text) from public;
-- generate_promo_code нужен админу из панели (ручная генерация кода):
grant execute on function public.generate_promo_code(text) to authenticated;

-- ============================================================
--  15. REALTIME (опционально): промокоды/конфиг колеса в publication, чтобы
--      админ видел изменения. Каталог уже добавлен в realtime-catalog.sql.
-- ============================================================
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname='supabase_realtime' and schemaname='public' and tablename='promo_codes') then
    execute 'alter publication supabase_realtime add table public.promo_codes';
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname='supabase_realtime' and schemaname='public' and tablename='wheel_config') then
    execute 'alter publication supabase_realtime add table public.wheel_config';
  end if;
end $$;

-- ============================================================
--  ПРОВЕРКА (примеры):
--  -- создать кампанию 20%, 1 раз на аккаунт:
--  insert into public.promo_codes (code, type, discount_type, discount_value, max_uses_per_account)
--    values ('SUMMER2026','campaign','percent',20,1);
--  -- сгенерировать individual-код 10% для конкретного аккаунта:
--  -- insert into public.promo_codes (code,type,discount_type,discount_value,assigned_account_id)
--  --   values (public.generate_promo_code('VIP'),'individual','percent',10,'<uuid>');
--  -- preview: select * from public.validate_promo('SUMMER2026', 100);
--  -- статус колеса: select public.get_wheel_status();
-- ============================================================
