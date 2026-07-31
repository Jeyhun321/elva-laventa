-- ============================================================
--  Elva LaVenta — варианты товара по цвету. ЭТАП 1: база.
--  Безопасно: ничего не удаляет, существующие товары не ломает.
--  Запуск: Supabase → SQL Editor → New query → вставить → Run
--
--  Модель: каждый цвет — отдельная строка товара.
--  Товары с ОДИНАКОВЫМ кодом = один товар с несколькими цветами.
--  У каждого цвета своя цена, свои размеры и свои фото.
-- ============================================================

-- 1) Новые колонки -------------------------------------------------
alter table public.products
  add column if not exists color_name       text    not null default '',
  add column if not exists color_hex        text    not null default '',
  add column if not exists is_default_color boolean not null default false,
  add column if not exists in_stock         boolean not null default true;

comment on column public.products.color_name is
  'Название цвета варианта. Пусто = обычный товар без вариантов';
comment on column public.products.color_hex is
  'Оттенок для образца цвета на витрине';
comment on column public.products.is_default_color is
  'Основной цвет группы: показывается в каталоге и открыт первым';
comment on column public.products.in_stock is
  'Галочка "есть в наличии". Числа остатков не храним';

-- 2) Существующие товары: каждый — сам себе группа и основной цвет --
--    Ставим ровно один основной на группу (самый ранний id).
--    Запрос идемпотентный: повторный запуск ничего не испортит.
update public.products p
   set is_default_color = true
 where not exists (
         select 1 from public.products d
          where upper(d.code) = upper(p.code) and d.is_default_color)
   and p.id = (select min(p2.id) from public.products p2
                where upper(p2.code) = upper(p.code));

-- 3) Уникальность: было "код", стало "код + цвет" -------------------
drop index if exists public.products_code_uidx;
create unique index if not exists products_code_color_uidx
  on public.products (upper(code), lower(color_name));

-- 4) В одной группе только ОДИН основной цвет (страховка) -----------
create unique index if not exists products_default_color_uidx
  on public.products (upper(code)) where is_default_color;

-- 5) Автоматика основного цвета ------------------------------------
--    - выбрал основным другой цвет → со старого галочка снимается сама
--    - первый цвет новой группы становится основным автоматически
create or replace function public.products_one_default_color()
returns trigger language plpgsql as $$
begin
  if pg_trigger_depth() > 1 then
    return new;               -- защита от зацикливания
  end if;

  if coalesce(new.is_default_color, false) then
    update public.products
       set is_default_color = false
     where upper(code) = upper(new.code)
       and id is distinct from new.id
       and is_default_color;
  elsif not exists (
      select 1 from public.products
       where upper(code) = upper(new.code)
         and id is distinct from new.id
         and is_default_color) then
    new.is_default_color := true;
  end if;

  return new;
end $$;

-- ВАЖНО: имя начинается с "z", чтобы триггер сработал ПОСЛЕ
-- products_set_code — иначе код ещё пустой и группа не определится.
drop trigger if exists products_zdefault_color on public.products;
create trigger products_zdefault_color
  before insert or update on public.products
  for each row execute function public.products_one_default_color();

-- 6) Публичное представление (фронт его не читает, держим в согласии)
drop view if exists public.products_public;
create view public.products_public as
select
  p.id, p.code, p.brand, p.name, p.description,
  p.category_id, c.label as category_label,
  p.price, p.old_price,
  case when p.old_price is null then 0
       else round((1 - p.price / p.old_price) * 100)::int end as discount_percent,
  p.image, p.images, p.colors, p.sizes,
  p.color_name, p.color_hex, p.is_default_color, p.in_stock,
  p.rating, p.reviews, p.tag
from public.products p
join public.categories c on c.id = p.category_id
where p.is_active;

-- 7) Проверка ------------------------------------------------------
select id, code, color_name, is_default_color, in_stock, name->>'az' as ad
  from public.products order by code, color_name;

-- ============================================================
-- ОТКАТ (если что-то пойдёт не так) — раскомментировать и выполнить:
-- drop trigger if exists products_zdefault_color on public.products;
-- drop function if exists public.products_one_default_color();
-- drop index if exists public.products_default_color_uidx;
-- drop index if exists public.products_code_color_uidx;
-- create unique index products_code_uidx on public.products (upper(code));
-- alter table public.products
--   drop column if exists color_name, drop column if exists color_hex,
--   drop column if exists is_default_color, drop column if exists in_stock;
-- ============================================================
