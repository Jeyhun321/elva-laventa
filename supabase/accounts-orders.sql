-- ============================================================
--  Аккаунты покупателей + заказы
--  Запустить в Supabase → SQL Editor → New query → Run
-- ============================================================

-- ============================================================
--  1. ПРОФИЛИ ПОКУПАТЕЛЕЙ
--     Привязаны к auth.users. Пароли хранит Supabase, не мы.
-- ============================================================
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text        not null default '',
  phone        text,                                  -- WhatsApp / основной номер
  phone_call   text,                                  -- номер для звонка
  birth_date   date,
  address      text,
  role         text        not null default 'customer'
                           check (role in ('customer', 'admin')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is 'Данные покупателя: имя, номера, адрес. Пароль и почта — в auth.users';

create index if not exists profiles_phone_idx on public.profiles (phone);

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Профиль создаётся автоматически при регистрации
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, birth_date)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'phone', ''),
    (nullif(new.raw_user_meta_data->>'birth_date', ''))::date
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Удобная проверка «я админ?»
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
     where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================
--  2. ЗАКАЗЫ
-- ============================================================
create table if not exists public.orders (
  id            bigint generated always as identity primary key,
  order_no      text unique,                          -- номер для клиента: EL-1001
  user_id       uuid references auth.users(id) on delete set null,
  customer_name text        not null,
  phone         text        not null,                 -- WhatsApp
  phone_call    text,                                 -- для звонка
  email         text,
  address       text        not null,
  note          text,
  total         numeric(10,2) not null default 0,
  status        text        not null default 'new'
                            check (status in ('new','contacted','confirmed','shipped','done','cancelled')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.orders is 'Заказы с сайта. status: new → contacted → confirmed → shipped → done';

create index if not exists orders_status_idx  on public.orders (status);
create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_user_idx    on public.orders (user_id);
create index if not exists orders_phone_idx   on public.orders (phone);

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch
  before update on public.orders
  for each row execute function public.touch_updated_at();

-- Номер заказа: EL-1001, EL-1002 ...
create or replace function public.set_order_no()
returns trigger language plpgsql as $$
begin
  if new.order_no is null or btrim(new.order_no) = '' then
    new.order_no := 'EL-' || (1000 + new.id)::text;
  end if;
  return new;
end $$;

drop trigger if exists orders_set_no on public.orders;
create trigger orders_set_no
  before insert on public.orders
  for each row execute function public.set_order_no();

-- ============================================================
--  3. СОСТАВ ЗАКАЗА
--     Название и цену сохраняем копией: товар потом может
--     подорожать или исчезнуть, а заказ должен остаться как был.
-- ============================================================
create table if not exists public.order_items (
  id           bigint generated always as identity primary key,
  order_id     bigint  not null references public.orders(id) on delete cascade,
  product_id   bigint  references public.products(id) on delete set null,
  product_code text    not null default '',
  product_name text    not null default '',
  size         text,
  qty          int     not null default 1 check (qty > 0),
  price        numeric(10,2) not null default 0
);

create index if not exists order_items_order_idx on public.order_items (order_id);

-- Итог заказа считается сам
create or replace function public.recalc_order_total()
returns trigger language plpgsql as $$
declare oid bigint;
begin
  oid := coalesce(new.order_id, old.order_id);
  update public.orders o
     set total = coalesce((select sum(i.price * i.qty)
                             from public.order_items i
                            where i.order_id = oid), 0)
   where o.id = oid;
  return null;
end $$;

drop trigger if exists order_items_total on public.order_items;
create trigger order_items_total
  after insert or update or delete on public.order_items
  for each row execute function public.recalc_order_total();

-- ============================================================
--  4. БЕЗОПАСНОСТЬ
-- ============================================================
alter table public.profiles    enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- --- Профили: свой видишь и меняешь, админ видит все ---
drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert" on public.profiles
  for insert with check (id = auth.uid());

-- --- Заказы: оформить может любой (в т.ч. без аккаунта) ---
drop policy if exists "anyone can place order" on public.orders;
create policy "anyone can place order" on public.orders
  for insert with check (true);

drop policy if exists "own orders read" on public.orders;
create policy "own orders read" on public.orders
  for select using (
    public.is_admin()
    or (user_id is not null and user_id = auth.uid())
  );

drop policy if exists "admin manages orders" on public.orders;
create policy "admin manages orders" on public.orders
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin deletes orders" on public.orders;
create policy "admin deletes orders" on public.orders
  for delete using (public.is_admin());

-- --- Состав заказа ---
drop policy if exists "anyone can add order items" on public.order_items;
create policy "anyone can add order items" on public.order_items
  for insert with check (true);

drop policy if exists "order items read" on public.order_items;
create policy "order items read" on public.order_items
  for select using (
    public.is_admin()
    or exists (select 1 from public.orders o
                where o.id = order_id and o.user_id = auth.uid())
  );

drop policy if exists "admin manages order items" on public.order_items;
create policy "admin manages order items" on public.order_items
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
--  5. УДОБНЫЕ ПРЕДСТАВЛЕНИЯ ДЛЯ ТЕБЯ
-- ============================================================

-- Покупатели с возрастом и числом заказов
create or replace view public.customers_view as
select
  p.id,
  u.email,
  p.full_name,
  p.phone,
  p.phone_call,
  p.birth_date,
  case when p.birth_date is null then null
       else date_part('year', age(p.birth_date))::int
  end                                        as age,
  p.address,
  p.role,
  u.email_confirmed_at is not null           as email_verified,
  u.last_sign_in_at,
  p.created_at,
  (select count(*) from public.orders o where o.user_id = p.id) as orders_count
from public.profiles p
join auth.users u on u.id = p.id;

-- Заказы со списком товаров одной строкой
create or replace view public.orders_view as
select
  o.id, o.order_no, o.status, o.created_at,
  o.customer_name, o.phone, o.phone_call, o.email, o.address, o.note,
  o.total,
  (select count(*) from public.order_items i where i.order_id = o.id) as items_count,
  (select string_agg(i.product_name || ' (' || i.product_code || ') x' || i.qty, E'\n')
     from public.order_items i where i.order_id = o.id)               as items_text
from public.orders o;

-- ============================================================
--  6. СДЕЛАЙ СЕБЯ АДМИНОМ
--     Замени почту на свою, если она другая.
-- ============================================================
update public.profiles
   set role = 'admin'
 where id in (select id from auth.users where email = 'elvalaventa@gmail.com');

-- Проверка
select 'profiles' as t, count(*) from public.profiles
union all select 'orders', count(*) from public.orders;
select id, email, full_name, role from public.customers_view;
