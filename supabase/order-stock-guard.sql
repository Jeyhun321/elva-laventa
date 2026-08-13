-- Elva LaVenta — АВТОРИТЕТНАЯ проверка наличия при оформлении заказа.
-- Supabase → SQL Editor → New query → вставьте этот файл целиком → Run.
-- Скрипт не удаляет товары, корзины и существующие заказы.
--
-- Зачем: сервер — единственный источник истины для покупки. Старый фронтенд
-- (открытая вкладка, кэш, чужой localStorage) НЕ должен мочь заказать товар,
-- который админ снял с продажи.
--
-- Единственное отличие от supabase/fix-order-any-auth.sql:
-- добавлена проверка in_stock. Товар с is_active = true, но in_stock = false
-- теперь отклоняется как PRODUCT_UNAVAILABLE — как удалённый/выключенный.
-- Всё остальное (любой вошедший, серверная цена, проверка размера,
-- order_items, Telegram-уведомление, очистка корзины) — БЕЗ ИЗМЕНЕНИЙ.

create extension if not exists pg_net;

create or replace function public.place_order(
  p_customer_name text,
  p_phone text,
  p_phone_call text,
  p_email text,
  p_address text,
  p_note text,
  p_items jsonb
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
  v_total numeric := 0;
  v_token text;
  v_chat_id text;
  v_message text;
  v_whatsapp_digits text;
begin
  -- Достаточно быть вошедшим. Каким способом — не важно.
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

    select * into v_product
    from public.products
    where id = v_product_id and is_active = true;

    if not found then
      raise exception 'PRODUCT_UNAVAILABLE';
    end if;

    -- НАЛИЧИЕ: is_active недостаточно. Товар с in_stock = false заказать нельзя,
    -- каким бы старым ни был фронтенд-стейт. Это и есть корневая проверка.
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
    v_total := v_total + (v_product.price * v_qty);
  end loop;

  -- Уведомление отделено от оформления: его ошибка никогда не отменит заказ.
  begin
    select value into v_token
    from public.app_settings
    where key = 'telegram_token';

    select value into v_chat_id
    from public.app_settings
    where key = 'telegram_chat_id';

    if nullif(btrim(coalesce(v_token, '')), '') is not null
      and nullif(btrim(coalesce(v_chat_id, '')), '') is not null then
      v_whatsapp_digits := regexp_replace(btrim(p_phone), '\D', '', 'g');
      v_message :=
        '🛍 Yeni sifariş ' || coalesce(v_order.order_no, '#' || v_order.id::text) || E'\n\n' ||
        v_items_text || E'\n' ||
        'Cəmi: ' || v_total || ' ₼' || E'\n\n' ||
        'Müştəri:' || E'\n' ||
        'Ad və soyad: ' || btrim(p_customer_name) || E'\n' ||
        'WhatsApp: ' || btrim(p_phone) ||
        case when v_whatsapp_digits <> '' then ' · https://wa.me/' || v_whatsapp_digits else '' end || E'\n' ||
        case when btrim(coalesce(p_phone_call, '')) <> '' then 'Zəng: ' || btrim(p_phone_call) || E'\n' else '' end ||
        'Ünvan: ' || btrim(p_address) || E'\n' ||
        case when btrim(coalesce(p_note, '')) <> '' then 'Qeyd: ' || btrim(p_note) else '' end;

      perform net.http_post(
        url := 'https://api.telegram.org/bot' || v_token || '/sendMessage',
        body := jsonb_build_object(
          'chat_id', v_chat_id,
          'text', v_message,
          'disable_web_page_preview', true
        ),
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

revoke all on function public.place_order(text, text, text, text, text, text, jsonb) from anon;
grant execute on function public.place_order(text, text, text, text, text, text, jsonb) to authenticated;
