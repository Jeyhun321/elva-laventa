-- ============================================================
--  Elva LaVenta — Procurement-first Product lifecycle
--  Supplier → Procurement Batch → Product Draft → Product Publication
--
--  Запустить ЦЕЛИКОМ: Supabase → SQL Editor → New query → вставить → Run.
--  ИДЕМПОТЕНТНО и АДДИТИВНО. Ничего не удаляет, production-записи не трогает.
--  Требует уже применённого supabase/procurement-module.sql.
--  НЕ трогает: is_admin/OTP/impersonation/RLS storefront/orders/promos/wheel/delivery.
--
--  ЧТО ДАЁТ:
--   1) procurements: фото товара (images), варианты (variants jsonb:
--      [{color,colorHex,sizes:[{size,qty}]}]), связь с товаром и идемпотентность
--      переноса (product_id уже есть; + promoted_to_product_at, stock_applied),
--      planned_sale_unit_price → NULLABLE (цену продажи задаёт owner в «Товары»).
--   2) promote_procurement_to_product(uuid) — атомарно создаёт ЧЕРНОВИК товара
--      (is_active=false) из закупки ИЛИ линкует к существующему товару с тем же
--      кодом (защита от дублей и двойного клика). Закупочная цена в товар НЕ
--      попадает (остаётся confidential в procurements).
--   3) procurement_analytics(from,to) — ТОЛЬКО закупочные метрики (никаких продаж
--      /orders): партии, единицы, потрачено, средняя закуп. цена, ожидаемые
--      выручка/прибыль (expected, если задана план. цена). Sales Analytics —
--      отдельный будущий модуль (см. docs/DECISIONS.md D-010).
--
--  БЕЗОПАСНОСТЬ: procurements — RLS только is_admin (закуп. цена/поставщики
--  скрыты от обычных пользователей). promote_* — SECURITY DEFINER + is_admin.
--  Черновик товара публично отдаёт лишь storefront-safe поля (закуп. цены там нет).
-- ============================================================

-- ---- 1. Новые колонки закупки (аддитивно) -----------------------------------
alter table public.procurements add column if not exists images                 text[] not null default '{}';
alter table public.procurements add column if not exists variants               jsonb  not null default '[]'::jsonb;
alter table public.procurements add column if not exists promoted_to_product_at  timestamptz;
alter table public.procurements add column if not exists stock_applied          boolean not null default false;

-- Цена продажи теперь необязательна на этапе закупки (задаётся в «Товары»).
alter table public.procurements alter column planned_sale_unit_price drop not null;

-- ---- 2. Обновлённая аналитика закупок — ТОЛЬКО procurement (без продаж) -------
create or replace function public.procurement_analytics(p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v jsonb;
begin
  if not public.is_admin() then
    raise exception 'AUTH_REQUIRED';
  end if;

  select jsonb_build_object(
    'batches',            count(*),
    'quantity_purchased', coalesce(sum(quantity), 0),
    'purchase_total',     coalesce(sum(purchase_total), 0),
    'avg_purchase_price', case when coalesce(sum(quantity), 0) > 0
                               then round(sum(purchase_total) / sum(quantity), 2) else 0 end,
    'expected_revenue',   coalesce(sum(expected_revenue), 0),
    'expected_profit',    coalesce(sum(expected_profit), 0),
    'avg_margin_percent', coalesce(round(avg(nullif(margin_percent, 0)), 2), 0),
    'has_sale_price',     coalesce(bool_or(planned_sale_unit_price is not null), false)
  )
  into v
  from public.procurements
  where archived = false
    and purchase_date >= p_from
    and purchase_date <= p_to;

  return coalesce(v, '{}'::jsonb);
end $$;

revoke all on function public.procurement_analytics(date, date) from anon, public;
grant execute on function public.procurement_analytics(date, date) to authenticated;

-- ---- 3. Перенос закупки в товары (черновик) — атомарно и идемпотентно --------
--  Возвращает {product_id, created} (created=false → линковка к существующему).
create or replace function public.promote_procurement_to_product(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proc     public.procurements%rowtype;
  v_pid      bigint;
  v_existing bigint;
  v_cat      text;
  v_name     text;
  v_colors   text[];
  v_sizes    text[];
  v_images   text[];
begin
  if not public.is_admin() then
    raise exception 'AUTH_REQUIRED';
  end if;

  -- Блокируем строку закупки: два параллельных клика сериализуются,
  -- второй увидит уже проставленный product_id и не создаст дубль.
  select * into v_proc from public.procurements where id = p_id for update;
  if not found then
    raise exception 'PROCUREMENT_NOT_FOUND';
  end if;

  -- Уже связана — идемпотентно возвращаем существующий товар.
  if v_proc.product_id is not null then
    return jsonb_build_object('product_id', v_proc.product_id, 'created', false);
  end if;

  -- Тот же код уже есть в каталоге (основной цвет, без варианта) → линкуем,
  -- НЕ создаём дубль (повторная закупка того же SKU).
  if coalesce(btrim(v_proc.product_code), '') <> '' then
    select id into v_existing from public.products
      where upper(code) = upper(btrim(v_proc.product_code))
        and coalesce(color_name, '') = ''
      order by id limit 1;
  end if;

  if v_existing is not null then
    v_pid := v_existing;
    update public.products set in_stock = true where id = v_pid;
    update public.procurements
       set product_id = v_pid, promoted_to_product_at = now(), stock_applied = true
     where id = p_id;
    return jsonb_build_object('product_id', v_pid, 'created', false);
  end if;

  -- ---- Иначе создаём ЧЕРНОВИК товара ----
  -- Категория: сохранённый category_id закупки, иначе первая по сортировке.
  select id into v_cat from public.categories where id = nullif(btrim(coalesce(v_proc.category, '')), '');
  if v_cat is null then
    select id into v_cat from public.categories order by sort_order nulls last, id limit 1;
  end if;
  if v_cat is null then
    raise exception 'NO_CATEGORY';
  end if;

  v_name := coalesce(nullif(btrim(coalesce(v_proc.product_name, '')), ''), v_proc.product_code, 'Новый товар');
  v_images := coalesce(v_proc.images, '{}');

  -- Цвета/размеры из вариантов (mapping в storefront-модель: colors[], sizes[]).
  select coalesce(array_agg(distinct hex) filter (where hex <> ''), '{}')
    into v_colors
  from (select v->>'colorHex' as hex from jsonb_array_elements(v_proc.variants) v) t;

  select coalesce(array_agg(distinct sz) filter (where sz <> ''), '{}')
    into v_sizes
  from (
    select s->>'size' as sz
    from jsonb_array_elements(v_proc.variants) v,
         jsonb_array_elements(coalesce(v->'sizes', '[]'::jsonb)) s
  ) t;

  -- Фолбэк размеров: одиночное поле size закупки, иначе 'One size'.
  if coalesce(array_length(v_sizes, 1), 0) = 0 then
    v_sizes := case when coalesce(btrim(v_proc.size), '') <> ''
                    then array[btrim(v_proc.size)] else array['One size'] end;
  end if;

  insert into public.products (
    brand, name, description, category_id, price, image, images, colors, sizes,
    code, color_name, color_hex, is_default_color, in_stock, is_active
  ) values (
    'Elva LaVenta',
    jsonb_build_object('az', v_name, 'ru', v_name, 'en', v_name),
    '{"az":"","ru":"","en":""}'::jsonb,
    v_cat,
    0,                                   -- цену продажи owner задаёт в «Товары»
    coalesce(v_images[1], ''),
    v_images,
    v_colors,
    v_sizes,
    nullif(btrim(coalesce(v_proc.product_code, '')), ''),
    '', '', false,
    true,                                -- в наличии
    false                                -- ЧЕРНОВИК (не опубликован)
  ) returning id into v_pid;

  update public.procurements
     set product_id = v_pid, promoted_to_product_at = now(), stock_applied = true
   where id = p_id;

  return jsonb_build_object('product_id', v_pid, 'created', true);
end $$;

revoke all on function public.promote_procurement_to_product(uuid) from anon, public;
grant execute on function public.promote_procurement_to_product(uuid) to authenticated;

-- ============================================================
--  ПРОВЕРКА (после Run):
--   -- под админом: создать закупку, затем
--   select public.promote_procurement_to_product('<procurement-uuid>');   -- {product_id, created:true}
--   -- повторный вызов → created:false, тот же product_id (идемпотентно).
--   -- обычный пользователь/anon: тот же вызов → AUTH_REQUIRED.
--   select public.procurement_analytics(current_date - 30, current_date);
-- ============================================================
