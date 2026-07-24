-- ============================================================
--  Товарный код (артикул)
--  Запустить в Supabase → SQL Editor → New query → Run
-- ============================================================

-- 1) Новая колонка
alter table public.products add column if not exists code text;

-- 2) Код для уже существующих товаров: 1001, 1002, ...
update public.products
   set code = (1000 + id)::text
 where code is null or btrim(code) = '';

-- 3) Код обязателен и уникален
alter table public.products alter column code set not null;
create unique index if not exists products_code_uidx on public.products (upper(code));

-- 4) Если код не указан — генерируем сами
create or replace function public.set_product_code()
returns trigger language plpgsql as $$
begin
  if new.code is null or btrim(new.code) = '' then
    new.code := (1000 + new.id)::text;
  end if;
  new.code := upper(btrim(new.code));
  return new;
end $$;

drop trigger if exists products_set_code on public.products;
create trigger products_set_code
  before insert or update on public.products
  for each row execute function public.set_product_code();

-- 5) Витрина отдаёт код вместе с товаром
create or replace view public.products_public as
select
  p.id, p.code, p.brand, p.name, p.description,
  p.category_id, c.label as category_label,
  p.price, p.old_price,
  case when p.old_price is null then 0
       else round((1 - p.price / p.old_price) * 100)::int
  end as discount_percent,
  p.image, p.colors, p.sizes, p.rating, p.reviews, p.tag
from public.products p
join public.categories c on c.id = p.category_id
where p.is_active;

-- Проверка
select id, code, name->>'az' as ad, price from public.products order by id limit 20;
