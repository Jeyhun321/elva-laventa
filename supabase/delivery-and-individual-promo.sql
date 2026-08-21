-- ============================================================
--  Elva LaVenta — Доставка (новые правила) + индивидуальный промокод по User ID
--
--  Запустить ЦЕЛИКОМ: Supabase → SQL Editor → New query → вставить → Run.
--  ИДЕМПОТЕНТНО (add column if not exists / create or replace).
--  НИЧЕГО не ломает: is_admin/OTP/impersonation/RLS/OAuth не трогаются.
--
--  ЧТО ДАЁТ:
--   1) orders.delivery_type + orders.delivery_fee — стоимость и тип доставки
--      теперь ХРАНЯТСЯ в заказе (Admin → Orders видит корректные значения).
--   2) public.delivery_fee(subtotal, type) — ЕДИНЫЙ trusted источник цены доставки
--      (клиент дублирует ту же формулу только для показа; авторитет — сервер):
--        • standard: subtotal(после скидки) >= 100 → 0 ₼, иначе 3 ₼;
--        • express:  всегда 7 ₼.
--      Порог 100 ₼ считается по стоимости ТОВАРОВ после скидки (без доставки).
--   3) place_order(9 арг) — добавлен p_delivery_type; сервер сам считает доставку,
--      пишет delivery_type/delivery_fee и total = (товары − скидка) + доставка.
--      Старые 7-/8-арг сигнатуры СОХРАНЕНЫ (переходная совместимость фронта).
--   4) admin_find_user(uuid) — поиск пользователя по его User ID для привязки
--      индивидуального промокода. Только is_admin (server-trusted).
--
--  ИСТОРИЧЕСКИЕ ЗАКАЗЫ не переписываются: новые правила применяются только к
--  новым checkout/place_order. Старые строки сохраняют свой total.
-- ============================================================

-- ---- 1. Колонки доставки в заказе (аддитивно) -------------------------------
alter table public.orders add column if not exists delivery_type text not null default 'standard';
alter table public.orders add column if not exists delivery_fee  numeric(10,2) not null default 0;

-- ---- 2. Единый расчёт цены доставки (trusted) -------------------------------
--  p_subtotal — стоимость ТОВАРОВ ПОСЛЕ скидки (доставка в порог не входит).
create or replace function public.delivery_fee(p_subtotal numeric, p_type text)
returns numeric
language sql
immutable
as $$
  select case
    when lower(btrim(coalesce(p_type, 'standard'))) = 'express' then 7::numeric
    when coalesce(p_subtotal, 0) >= 100 then 0::numeric
    else 3::numeric
  end
$$;

-- ---- 3. Пересчёт итога с учётом доставки ------------------------------------
--  total = greatest(0, subtotal − discount) + delivery_fee.
--  Триггер на order_items (recalc_order_total) уже существует — обновляем тело.
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
        + coalesce(o.delivery_fee, 0)
   where o.id = oid;
  return null;
end $$;

-- ---- 4. place_order — 9-арг версия (промо + доставка) -----------------------
create or replace function public.place_order(
  p_customer_name text,
  p_phone text,
  p_phone_call text,
  p_email text,
  p_address text,
  p_note text,
  p_items jsonb,
  p_promo_code text,
  p_delivery_type text
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
  v_after numeric := 0;
  v_delivery numeric := 0;
  v_delivery_type text := case when lower(btrim(coalesce(p_delivery_type, 'standard'))) = 'express'
                               then 'express' else 'standard' end;
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
    user_id, customer_name, phone, phone_call, email, address, note, status, delivery_type
  ) values (
    auth.uid(), btrim(p_customer_name), btrim(p_phone), btrim(coalesce(p_phone_call, '')),
    btrim(coalesce(p_email, '')), btrim(p_address), btrim(coalesce(p_note, '')), 'new', v_delivery_type
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
           discount_source = v_promo.source
     where id = v_order.id;
  end if;

  -- ---- ДОСТАВКА: считаем на сервере по товарам ПОСЛЕ скидки, фиксируем итог ----
  v_after := greatest(0, v_subtotal - v_discount);
  v_delivery := public.delivery_fee(v_after, v_delivery_type);
  update public.orders
     set delivery_fee = v_delivery,
         total = v_after + v_delivery
   where id = v_order.id;

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
        'Çatdırılma: ' || (case when v_delivery_type = 'express' then 'Ekspress' else 'Standart' end) ||
          ' · ' || (case when v_delivery = 0 then 'Pulsuz' else v_delivery || ' ₼' end) || E'\n' ||
        'Cəmi: ' || (v_after + v_delivery) || ' ₼' || E'\n\n' ||
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

revoke all on function public.place_order(text, text, text, text, text, text, jsonb, text, text) from anon;
grant execute on function public.place_order(text, text, text, text, text, text, jsonb, text, text) to authenticated;

-- Совместимость: 8-арг вызов (без доставки) продолжает работать → standard.
create or replace function public.place_order(
  p_customer_name text, p_phone text, p_phone_call text, p_email text,
  p_address text, p_note text, p_items jsonb, p_promo_code text
)
returns table(order_no text, order_id bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query select * from public.place_order(
    p_customer_name, p_phone, p_phone_call, p_email, p_address, p_note,
    p_items, p_promo_code, 'standard'::text);
end $$;

revoke all on function public.place_order(text, text, text, text, text, text, jsonb, text) from anon;
grant execute on function public.place_order(text, text, text, text, text, text, jsonb, text) to authenticated;

-- ---- 5. admin_find_user — поиск пользователя по User ID (is_admin only) ------
create or replace function public.admin_find_user(p_id uuid)
returns table (id uuid, email text, full_name text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- Единственный source of truth админ-прав (server-trusted). Не-админ (даже с
  -- прямым REST-вызовом) получает отказ.
  if not public.is_admin() then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_id is null then
    raise exception 'INVALID_USER_ID';
  end if;
  if not exists (select 1 from auth.users u where u.id = p_id) then
    raise exception 'USER_NOT_FOUND';
  end if;

  return query
  select
    u.id,
    u.email::text,
    coalesce(
      nullif(btrim(p.full_name), ''),
      u.raw_user_meta_data ->> 'full_name',
      u.raw_user_meta_data ->> 'name',
      split_part(u.email, '@', 1)
    )::text as full_name
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = p_id;
end $$;

revoke all on function public.admin_find_user(uuid) from anon, public;
grant execute on function public.admin_find_user(uuid) to authenticated;

-- ============================================================
--  ПРОВЕРКА (после Run):
--   select public.delivery_fee(95, 'standard');   -- 3
--   select public.delivery_fee(100, 'standard');  -- 0
--   select public.delivery_fee(250, 'express');   -- 7
--   -- под админом: select * from public.admin_find_user('<uuid>');
--   -- под обычным/anon: тот же вызов → AUTH_REQUIRED.
-- ============================================================
