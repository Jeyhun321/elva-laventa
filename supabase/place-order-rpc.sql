-- ============================================================
--  Оформление заказа через серверную функцию
--  Запустить в Supabase → SQL Editor → New query → Run
--
--  Зачем: браузер присылает только id товаров и количество.
--  Цену, название и код берёт САМА база — клиент не может их подделать.
--  Функция обходит RLS безопасно (security definer) и работает
--  как для гостей, так и для вошедших пользователей.
-- ============================================================

create or replace function public.place_order(
  p_customer_name text,
  p_phone         text,
  p_phone_call    text,
  p_email         text,
  p_address       text,
  p_note          text,
  p_items         jsonb        -- [{ "product_id": 1, "size": "M", "qty": 2 }]
)
returns table (order_no text, order_id bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id bigint;
  v_order_no text;
  it   jsonb;
  prod public.products%rowtype;
begin
  if btrim(coalesce(p_customer_name, '')) = '' then
    raise exception 'name required';
  end if;
  if btrim(coalesce(p_phone, '')) = '' then
    raise exception 'phone required';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty order';
  end if;

  insert into public.orders
    (user_id, customer_name, phone, phone_call, email, address, note, total)
  values
    (auth.uid(),
     btrim(p_customer_name),
     btrim(p_phone),
     nullif(btrim(coalesce(p_phone_call, '')), ''),
     nullif(btrim(coalesce(p_email, '')), ''),
     btrim(coalesce(p_address, '')),
     nullif(btrim(coalesce(p_note, '')), ''),
     0)
  returning id, orders.order_no into v_order_id, v_order_no;

  for it in select * from jsonb_array_elements(p_items)
  loop
    select * into prod
      from public.products
     where id = (it->>'product_id')::bigint
       and is_active;

    if found then
      insert into public.order_items
        (order_id, product_id, product_code, product_name, size, qty, price)
      values
        (v_order_id,
         prod.id,
         coalesce(prod.code, ''),
         coalesce(prod.name->>'az', ''),
         nullif(btrim(coalesce(it->>'size', '')), ''),
         greatest(1, coalesce((it->>'qty')::int, 1)),
         prod.price);            -- цена из БАЗЫ, не из браузера
    end if;
  end loop;

  -- итог пересчитался триггером order_items; возвращаем номер
  return query select v_order_no, v_order_id;
end;
$$;

-- Вызывать могут и гости, и вошедшие
grant execute on function
  public.place_order(text, text, text, text, text, text, jsonb)
  to anon, authenticated;

-- Проверка (создаст тестовый заказ):
-- select * from public.place_order(
--   'Тест', '+994501112233', null, null, 'Баку', null,
--   '[{"product_id":1,"size":"M","qty":2}]'::jsonb);
-- select order_no, customer_name, total from public.orders order by id desc limit 1;
