-- ============================================================
--  Elva LaVenta — Модуль ЗАКУПКИ (procurement) + Поставщики + точки
--
--  Запустить ЦЕЛИКОМ: Supabase → SQL Editor → New query → вставить → Run.
--  ИДЕМПОТЕНТНО (create table if not exists / create or replace / add column if not exists).
--  АДДИТИВНО и БЕЗОПАСНО: ничего существующего не удаляет и не меняет.
--  НЕ трогает: is_admin/OTP/impersonation/RLS других таблиц/OAuth/orders/promos/wheel.
--
--  ЧТО ДАЁТ:
--   1) suppliers          — поставщики (name/contact/phone/email/notes/active).
--   2) supplier_points    — торговые точки поставщика (рынок/город/ряд/магазин…).
--   3) procurements       — закупочные партии (товар+вариант, поставщик+точка,
--                           дата, количество, закуп. и план. цена продажи, статус…).
--      Денежные суммы и прибыль — GENERATED-колонки (считает БД, не клиент):
--        purchase_total     = purchase_unit_price * quantity
--        expected_revenue   = planned_sale_unit_price * quantity
--        expected_profit    = (planned_sale_unit_price - purchase_unit_price) * quantity
--        margin_percent     = profit/revenue*100  (margin = прибыль/выручка)
--        quantity_remaining = quantity - quantity_sold
--        actual_profit      = (planned_sale_unit_price - purchase_unit_price) * quantity_sold
--
--  БЕЗОПАСНОСТЬ: все три таблицы — RLS ON, доступ ТОЛЬКО public.is_admin()
--  (owner). Обычный пользователь/anon НЕ читают закупочные цены, контакты
--  поставщиков и прибыль. service_role во фронте не используется.
--
--  ОГРАНИЧЕНИЕ (честно): «фактическая прибыль» stage 1 считается по planned_sale
--  и вручную проставленному quantity_sold (owner отмечает продажи партии). FIFO/
--  автосписание по заказам НЕ реализовано (см. docs/DECISIONS.md D-009).
-- ============================================================

-- ---- 0. touch_updated_at (идемпотентно; уже может существовать) --------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ============================================================
--  1. SUPPLIERS
-- ============================================================
create table if not exists public.suppliers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (btrim(name) <> ''),
  contact_name  text,
  phone         text,
  whatsapp      text,
  email         text,
  notes         text,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists suppliers_touch on public.suppliers;
create trigger suppliers_touch before update on public.suppliers
  for each row execute function public.touch_updated_at();

-- ============================================================
--  2. SUPPLIER POINTS (торговые точки поставщика)
-- ============================================================
create table if not exists public.supplier_points (
  id            uuid primary key default gen_random_uuid(),
  supplier_id   uuid not null references public.suppliers(id) on delete cascade,
  name          text not null check (btrim(name) <> ''),
  market_name   text,
  city          text,
  address       text,
  row_no        text,           -- ряд (напр. «sıra 3»)
  shop_number   text,           -- магазин/бутик (напр. «mağaza 42»)
  phone         text,
  notes         text,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create index if not exists supplier_points_supplier_idx on public.supplier_points (supplier_id);

-- ============================================================
--  3. PROCUREMENTS (закупочные партии)
-- ============================================================
create table if not exists public.procurements (
  id                      uuid primary key default gen_random_uuid(),
  -- Связь с существующим каталогом (не второй каталог!). product_id может быть
  -- null, если товар ещё не заведён — тогда полагаемся на snapshot-поля.
  product_id              bigint references public.products(id) on delete set null,
  product_code            text,
  product_name            text,
  category                text,
  color                   text,
  size                    text,
  supplier_id             uuid not null references public.suppliers(id) on delete restrict,
  supplier_point_id       uuid references public.supplier_points(id) on delete set null,
  purchase_date           date not null default current_date,
  purchase_time           time,
  quantity                integer not null check (quantity > 0),
  quantity_sold           integer not null default 0
                            check (quantity_sold >= 0 and quantity_sold <= quantity),
  purchase_unit_price     numeric(12,2) not null check (purchase_unit_price >= 0),
  planned_sale_unit_price numeric(12,2) not null check (planned_sale_unit_price >= 0),
  payment_method          text,
  status                  text not null default 'purchased'
                            check (status in ('purchased','in_transit','in_stock','sold_out','cancelled')),
  receipt_url             text,
  notes                   text,
  archived                boolean not null default false,
  created_by              uuid default auth.uid(),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  -- ---- Денежные/производные величины: считает БД (single source of truth) ----
  purchase_total          numeric(14,2)
                            generated always as (purchase_unit_price * quantity) stored,
  expected_revenue        numeric(14,2)
                            generated always as (planned_sale_unit_price * quantity) stored,
  expected_profit         numeric(14,2)
                            generated always as ((planned_sale_unit_price - purchase_unit_price) * quantity) stored,
  margin_percent          numeric(7,2)
                            generated always as (
                              case when planned_sale_unit_price > 0
                                then round((planned_sale_unit_price - purchase_unit_price) / planned_sale_unit_price * 100, 2)
                                else 0 end
                            ) stored,
  quantity_remaining      integer
                            generated always as (quantity - quantity_sold) stored,
  actual_profit           numeric(14,2)
                            generated always as ((planned_sale_unit_price - purchase_unit_price) * quantity_sold) stored
);

create index if not exists procurements_supplier_idx on public.procurements (supplier_id);
create index if not exists procurements_point_idx    on public.procurements (supplier_point_id);
create index if not exists procurements_product_idx  on public.procurements (product_id);
create index if not exists procurements_date_idx     on public.procurements (purchase_date desc);
create index if not exists procurements_status_idx   on public.procurements (status);

drop trigger if exists procurements_touch on public.procurements;
create trigger procurements_touch before update on public.procurements
  for each row execute function public.touch_updated_at();

-- ---- Server-side валидация: точка обязана принадлежать выбранному поставщику ----
create or replace function public.procurement_validate()
returns trigger language plpgsql as $$
begin
  if new.supplier_point_id is not null then
    if not exists (
      select 1 from public.supplier_points sp
       where sp.id = new.supplier_point_id and sp.supplier_id = new.supplier_id
    ) then
      raise exception 'POINT_SUPPLIER_MISMATCH';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists procurements_validate on public.procurements;
create trigger procurements_validate before insert or update on public.procurements
  for each row execute function public.procurement_validate();

-- ============================================================
--  4. RLS — ТОЛЬКО is_admin() (owner). anon/обычный пользователь — отказ.
-- ============================================================
alter table public.suppliers       enable row level security;
alter table public.supplier_points enable row level security;
alter table public.procurements    enable row level security;

drop policy if exists suppliers_admin_all on public.suppliers;
create policy suppliers_admin_all on public.suppliers
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists supplier_points_admin_all on public.supplier_points;
create policy supplier_points_admin_all on public.supplier_points
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists procurements_admin_all on public.procurements;
create policy procurements_admin_all on public.procurements
  for all using (public.is_admin()) with check (public.is_admin());

-- Прямых grant для anon нет; authenticated проходит только через RLS (is_admin).
revoke all on public.suppliers, public.supplier_points, public.procurements from anon;
grant select, insert, update, delete
  on public.suppliers, public.supplier_points, public.procurements to authenticated;

-- ============================================================
--  5. АНАЛИТИКА — агрегаты за период (is_admin-gated, server-trusted).
--     Возвращает ТОЛЬКО реальные суммы из procurements. «Фактическая» прибыль —
--     по quantity_sold (ручной), не выдуманная.
-- ============================================================
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
    'quantity_sold',      coalesce(sum(quantity_sold), 0),
    'quantity_remaining', coalesce(sum(quantity_remaining), 0),
    'purchase_total',     coalesce(sum(purchase_total), 0),
    'expected_revenue',   coalesce(sum(expected_revenue), 0),
    'expected_profit',    coalesce(sum(expected_profit), 0),
    'actual_profit',      coalesce(sum(actual_profit), 0),
    'avg_margin_percent', coalesce(round(avg(nullif(margin_percent, 0)), 2), 0),
    'in_transit_qty',     coalesce(sum(quantity) filter (where status = 'in_transit'), 0),
    'in_transit_amount',  coalesce(sum(purchase_total) filter (where status = 'in_transit'), 0)
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

-- ============================================================
--  ПРОВЕРКА (после Run):
--   -- под админом:
--   insert into public.suppliers (name) values ('Ali Fashion') returning id;
--   -- под обычным пользователем/anon:
--   select * from public.procurements;            -- пусто/denied (RLS)
--   -- аналитика:
--   select public.procurement_analytics(current_date - 30, current_date);
--   -- матч точки и поставщика (ожидается POINT_SUPPLIER_MISMATCH):
--   -- insert закупки с supplier_point_id чужого поставщика.
-- ============================================================
