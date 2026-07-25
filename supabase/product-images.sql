-- Elva LaVenta — несколько фотографий для одного товара
-- Supabase → SQL Editor → New query → вставь этот файл полностью → Run

alter table public.products
  add column if not exists images text[] not null default '{}';

-- Сохраняем уже имеющуюся главную фотографию как первую в галерее.
update public.products
   set images = array[image]
 where coalesce(array_length(images, 1), 0) = 0
   and coalesce(btrim(image), '') <> '';

-- Обновляем публичное представление, если оно уже создано.
drop view if exists public.products_public;

create view public.products_public as
select
  p.id, p.code, p.brand, p.name, p.description,
  p.category_id, c.label as category_label,
  p.price, p.old_price,
  case when p.old_price is null then 0
       else round((1 - p.price / p.old_price) * 100)::int
  end as discount_percent,
  p.image, p.images, p.colors, p.sizes, p.rating, p.reviews, p.tag
from public.products p
join public.categories c on c.id = p.category_id
where p.is_active;

select id, code, image, images from public.products order by id limit 20;
