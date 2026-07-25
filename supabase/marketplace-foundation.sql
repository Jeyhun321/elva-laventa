-- Elva LaVenta: фундамент архитектуры интернет-магазина.
-- Запустить в Supabase: SQL Editor -> New query -> вставить весь файл -> Run.
-- Скрипт безопасно дополняет существующую базу и не удаляет товары/заказы.

create table if not exists public.customer_cart_items (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id bigint not null references public.products(id) on delete cascade,
  size text not null default '',
  quantity integer not null check (quantity between 1 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id, size)
);

create index if not exists customer_cart_items_user_id_idx
  on public.customer_cart_items(user_id);

drop trigger if exists customer_cart_items_touch_updated_at on public.customer_cart_items;
create trigger customer_cart_items_touch_updated_at
before update on public.customer_cart_items
for each row execute function public.touch_updated_at();

alter table public.customer_cart_items enable row level security;
drop policy if exists "customers manage own cart" on public.customer_cart_items;
create policy "customers manage own cart"
on public.customer_cart_items for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.customer_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id bigint not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create index if not exists customer_favorites_user_id_idx
  on public.customer_favorites(user_id);

alter table public.customer_favorites enable row level security;
drop policy if exists "customers manage own favorites" on public.customer_favorites;
create policy "customers manage own favorites"
on public.customer_favorites for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Редактировать каталог может только администратор, а не любой вошедший клиент.
drop policy if exists "categories write for authenticated" on public.categories;
drop policy if exists "categories write for admin" on public.categories;
create policy "categories write for admin"
on public.categories for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "products write for authenticated" on public.products;
drop policy if exists "products write for admin" on public.products;
create policy "products write for admin"
on public.products for all
using (public.is_admin())
with check (public.is_admin());

-- Заказы создаёт только защищённая функция ниже; прямую запись из браузера запрещаем.
drop policy if exists "anyone can place order" on public.orders;
drop policy if exists "anyone can add order items" on public.order_items;

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
      v_order.id, v_product.id, v_product.code, v_product.name,
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
