-- ============================================================
--  Уведомление в Telegram при новом заказе
--  Запустить в Supabase → SQL Editor → New query → Run
--
--  ПЕРЕД запуском получи 2 значения (инструкцию даст ассистент):
--   • telegram_token   — токен бота от @BotFather
--   • telegram_chat_id — твой числовой id от @userinfobot
--  и подставь их в блок INSERT ниже.
-- ============================================================

-- 1) Расширение для HTTP-запросов из базы
create extension if not exists pg_net;

-- 2) Приватная таблица настроек (никакого публичного доступа)
create table if not exists public.app_settings (
  key   text primary key,
  value text
);
alter table public.app_settings enable row level security;
-- политик нет → анонимно не читается; функции security definer видят

-- 3) ВСТАВЬ СВОИ ЗНАЧЕНИЯ (замени на реальные)
insert into public.app_settings (key, value) values
  ('telegram_token',   'СЮДА_ТОКЕН_БОТА'),
  ('telegram_chat_id', 'СЮДА_CHAT_ID')
on conflict (key) do update set value = excluded.value;

-- 4) Обновлённая функция заказа: создаёт заказ + шлёт в Telegram
create or replace function public.place_order(
  p_customer_name text,
  p_phone         text,
  p_phone_call    text,
  p_email         text,
  p_address       text,
  p_note          text,
  p_items         jsonb
)
returns table (order_no text, order_id bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id  bigint;
  v_order_no  text;
  it          jsonb;
  prod        public.products%rowtype;
  v_items_txt text := '';
  v_total     numeric := 0;
  v_token     text;
  v_chat      text;
  v_msg       text;
  v_phone_dig text;
begin
  if btrim(coalesce(p_customer_name,'')) = '' then raise exception 'name required'; end if;
  if btrim(coalesce(p_phone,'')) = '' then raise exception 'phone required'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty order';
  end if;

  insert into public.orders
    (user_id, customer_name, phone, phone_call, email, address, note, total)
  values
    (auth.uid(), btrim(p_customer_name), btrim(p_phone),
     nullif(btrim(coalesce(p_phone_call,'')),''),
     nullif(btrim(coalesce(p_email,'')),''),
     btrim(coalesce(p_address,'')),
     nullif(btrim(coalesce(p_note,'')),''), 0)
  returning id, orders.order_no into v_order_id, v_order_no;

  for it in select * from jsonb_array_elements(p_items)
  loop
    select * into prod from public.products
      where id = (it->>'product_id')::bigint and is_active;
    if found then
      insert into public.order_items
        (order_id, product_id, product_code, product_name, size, qty, price)
      values
        (v_order_id, prod.id, coalesce(prod.code,''), coalesce(prod.name->>'az',''),
         nullif(btrim(coalesce(it->>'size','')),''),
         greatest(1, coalesce((it->>'qty')::int,1)), prod.price);

      v_items_txt := v_items_txt || '• ' || coalesce(prod.name->>'az','') ||
                     ' (kod ' || coalesce(prod.code,'') || ') ×' ||
                     greatest(1, coalesce((it->>'qty')::int,1)) || E'\n';
      v_total := v_total + prod.price * greatest(1, coalesce((it->>'qty')::int,1));
    end if;
  end loop;

  -- ---------- Telegram bildirişi (sifarişi heç vaxt pozmur) ----------
  begin
    select value into v_token from public.app_settings where key = 'telegram_token';
    select value into v_chat  from public.app_settings where key = 'telegram_chat_id';

    if v_token is not null and v_token <> 'СЮДА_ТОКЕН_БОТА'
       and v_chat is not null and v_chat <> 'СЮДА_CHAT_ID' then

      v_phone_dig := regexp_replace(btrim(p_phone), '\D', '', 'g');

      v_msg :=
        '🛍 <b>Yeni sifariş ' || v_order_no || '</b>' || E'\n\n' ||
        '👤 ' || btrim(p_customer_name) || E'\n' ||
        '📱 <a href="https://wa.me/' || v_phone_dig || '">' || btrim(p_phone) || '</a>' || E'\n' ||
        '📍 ' || btrim(coalesce(p_address,'')) || E'\n' ||
        case when btrim(coalesce(p_note,'')) <> '' then '📝 ' || btrim(p_note) || E'\n' else '' end ||
        E'\n' || v_items_txt ||
        '💰 ' || v_total || ' ₼';

      perform net.http_post(
        url     := 'https://api.telegram.org/bot' || v_token || '/sendMessage',
        body    := jsonb_build_object(
                     'chat_id', v_chat,
                     'text', v_msg,
                     'parse_mode', 'HTML',
                     'disable_web_page_preview', true),
        headers := jsonb_build_object('Content-Type','application/json')
      );
    end if;
  exception when others then
    null; -- bildiriş uğursuz olsa belə, sifariş qalır
  end;

  return query select v_order_no, v_order_id;
end;
$$;

grant execute on function
  public.place_order(text,text,text,text,text,text,jsonb)
  to anon, authenticated;
