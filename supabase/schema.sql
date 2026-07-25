-- ============================================================
--  Elva LaVenta — схема базы (PostgreSQL / Supabase)
--  Запустить целиком в Supabase → SQL Editor → New query → Run
-- ============================================================

-- ---------- КАТЕГОРИИ ----------
create table if not exists public.categories (
  id          text primary key,                    -- 'donlar', 'bluzalar', ...
  label       jsonb not null,                      -- {"az":"Donlar","ru":"Платья","en":"Dresses"}
  sort_order  int  not null default 100,
  created_at  timestamptz not null default now()
);

comment on table public.categories is 'Категории каталога, названия на 3 языках';

-- ---------- ТОВАРЫ ----------
create table if not exists public.products (
  id           bigint generated always as identity primary key,
  brand        text        not null default 'Elva LaVenta',
  name         jsonb       not null,               -- {"az":"...","ru":"...","en":"..."}
  description  jsonb       not null default '{"az":"","ru":"","en":""}'::jsonb,
  category_id  text        not null references public.categories(id) on update cascade,
  price        numeric(10,2) not null check (price >= 0),
  old_price    numeric(10,2)          check (old_price is null or old_price > price),
  image        text        not null default '',
  images       text[]      not null default '{}',
  colors       text[]      not null default '{}',
  sizes        text[]      not null default '{}',
  rating       numeric(2,1) not null default 5 check (rating between 1 and 5),
  reviews      int         not null default 0 check (reviews >= 0),
  tag          text                   check (tag in ('new','bestseller','sale')),
  is_active    boolean     not null default true,  -- снять с витрины, не удаляя
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.products is 'Товары каталога';
comment on column public.products.old_price is 'Старая цена; должна быть больше текущей — так считается скидка';
comment on column public.products.is_active is 'false = скрыт с сайта, но остаётся в базе';

-- ---------- ИНДЕКСЫ ----------
create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_price_idx    on public.products (price);
create index if not exists products_active_idx   on public.products (is_active) where is_active;
-- поиск по названию на всех языках
create index if not exists products_name_gin_idx on public.products using gin (name jsonb_path_ops);

-- ---------- АВТООБНОВЛЕНИЕ updated_at ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists products_touch on public.products;
create trigger products_touch
  before update on public.products
  for each row execute function public.touch_updated_at();

-- ---------- УДОБНОЕ ПРЕДСТАВЛЕНИЕ ----------
create or replace view public.products_public as
select
  p.id, p.brand, p.name, p.description,
  p.category_id, c.label as category_label,
  p.price, p.old_price,
  case when p.old_price is null then 0
       else round((1 - p.price / p.old_price) * 100)::int
  end as discount_percent,
  p.image, p.images, p.colors, p.sizes, p.rating, p.reviews, p.tag
from public.products p
join public.categories c on c.id = p.category_id
where p.is_active;

comment on view public.products_public is 'Витрина: только активные товары, скидка посчитана';

-- ============================================================
--  БЕЗОПАСНОСТЬ (Row Level Security)
--  Читать может любой. Менять — только вошедший пользователь.
-- ============================================================
alter table public.categories enable row level security;
alter table public.products   enable row level security;

drop policy if exists "categories read for everyone" on public.categories;
create policy "categories read for everyone"
  on public.categories for select using (true);

drop policy if exists "categories write for authenticated" on public.categories;
create policy "categories write for authenticated"
  on public.categories for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "products read for everyone" on public.products;
create policy "products read for everyone"
  on public.products for select using (true);

drop policy if exists "products write for authenticated" on public.products;
create policy "products write for authenticated"
  on public.products for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ============================================================
--  НАЧАЛЬНЫЕ ДАННЫЕ — категории
-- ============================================================
insert into public.categories (id, label, sort_order) values
  ('donlar',      '{"az":"Donlar","ru":"Платья","en":"Dresses"}',            10),
  ('bluzalar',    '{"az":"Bluzalar","ru":"Блузки","en":"Blouses"}',          20),
  ('etekler',     '{"az":"Ətəklər","ru":"Юбки","en":"Skirts"}',              30),
  ('salvarlar',   '{"az":"Şalvarlar","ru":"Брюки","en":"Trousers"}',         40),
  ('ust-geyim',   '{"az":"Üst geyim","ru":"Верхняя одежда","en":"Outerwear"}',50),
  ('trikotaj',    '{"az":"Trikotaj","ru":"Трикотаж","en":"Knitwear"}',       60),
  ('aksesuarlar', '{"az":"Aksesuarlar","ru":"Аксессуары","en":"Accessories"}',70)
on conflict (id) do update set label = excluded.label;

-- ============================================================
--  ПРОВЕРКА
-- ============================================================
-- select * from public.products_public order by price;
-- select c.id, count(p.id) from categories c left join products p on p.category_id = c.id group by 1;
