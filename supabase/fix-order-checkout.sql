-- Elva LaVenta — исправление оформления заказа.
-- Supabase → SQL Editor → New query → вставьте этот файл целиком → Run.
-- Скрипт не удаляет товары, корзины и существующие заказы.

alter table public.order_items
  add column if not exists product_image text;

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
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not exists (
    select 1 from auth.identities
    where user_id = auth.uid() and provider = 'google'
  ) then
    raise exception 'GOOGLE_AUTH_REQUIRED';
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
  end loop;

  delete from public.customer_cart_items where user_id = auth.uid();
  return query select v_order.order_no, v_order.id;
end;
$$;

revoke all on function public.place_order(text, text, text, text, text, text, jsonb) from anon;
grant execute on function public.place_order(text, text, text, text, text, text, jsonb) to authenticated;
