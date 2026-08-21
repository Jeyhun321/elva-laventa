-- ============================================================
--  Elva LaVenta — Закупки: Архив / Восстановление / Безопасное удаление
--
--  Запустить ЦЕЛИКОМ: Supabase → SQL Editor → New query → вставить → Run.
--  ИДЕМПОТЕНТНО и АДДИТИВНО. Не удаляет данные, старые миграции повторно НЕ нужны.
--  Требует applied: procurement-module.sql + procurement-product-flow.sql.
--  НЕ трогает: is_admin/OTP/impersonation/RLS storefront/orders/promos/wheel/delivery.
--
--  ЧТО ДАЁТ:
--   1) procurements.archived_at / archived_by — метаданные архивации.
--   2) archive_procurement(uuid)  — soft-delete (archived=true), история цела.
--   3) restore_procurement(uuid)  — archived=false, связи и данные не меняются.
--   4) delete_procurement(uuid)   — ФИЗИЧЕСКОЕ удаление ТОЛЬКО если закупка ни с
--      чем не связана (product_id IS NULL). Если связана с товаром — отказ
--      PROCUREMENT_LINKED (историю себестоимости и связь не уничтожаем).
--   5) procurement_analytics — теперь СЧИТАЕТ и архивированные закупки (архив —
--      это UI-lifecycle, а не отмена факта закупки); из истории исчезают только
--      реально удалённые записи.
--
--  БЕЗОПАСНОСТЬ: все три RPC — SECURITY DEFINER + public.is_admin() (owner-only).
--  Обычный пользователь/anon → AUTH_REQUIRED. Аудит пишется В ТОЙ ЖЕ транзакции
--  (для delete — ДО удаления), чтобы запись журнала не потерялась.
-- ============================================================

-- ---- 1. Метаданные архивации (аддитивно) ------------------------------------
alter table public.procurements add column if not exists archived_at timestamptz;
alter table public.procurements add column if not exists archived_by uuid;

-- ---- 2. Архивировать -------------------------------------------------------
create or replace function public.archive_procurement(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v public.procurements%rowtype;
begin
  if not public.is_admin() then raise exception 'AUTH_REQUIRED'; end if;
  select * into v from public.procurements where id = p_id for update;
  if not found then raise exception 'PROCUREMENT_NOT_FOUND'; end if;

  update public.procurements
     set archived = true, archived_at = now(), archived_by = auth.uid()
   where id = p_id;

  perform public.log_system_event('info', 'admin', 'PROCUREMENT_ARCHIVED',
    'Закупка в архив: ' || coalesce(v.product_code, v.product_name, p_id::text),
    jsonb_build_object('id', p_id, 'sku', v.product_code), null);
end $$;

-- ---- 3. Восстановить -------------------------------------------------------
create or replace function public.restore_procurement(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v public.procurements%rowtype;
begin
  if not public.is_admin() then raise exception 'AUTH_REQUIRED'; end if;
  select * into v from public.procurements where id = p_id for update;
  if not found then raise exception 'PROCUREMENT_NOT_FOUND'; end if;

  update public.procurements
     set archived = false, archived_at = null, archived_by = null
   where id = p_id;

  perform public.log_system_event('info', 'admin', 'PROCUREMENT_RESTORED',
    'Закупка восстановлена: ' || coalesce(v.product_code, v.product_name, p_id::text),
    jsonb_build_object('id', p_id, 'sku', v.product_code), null);
end $$;

-- ---- 4. Удалить (только несвязанную) ---------------------------------------
--  Сервер — source of truth: фронт НЕ решает, можно ли удалять.
create or replace function public.delete_procurement(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v public.procurements%rowtype;
begin
  if not public.is_admin() then raise exception 'AUTH_REQUIRED'; end if;
  select * into v from public.procurements where id = p_id for update;
  if not found then raise exception 'PROCUREMENT_NOT_FOUND'; end if;

  -- Связана с товаром → нельзя уничтожать историю себестоимости/связь.
  if v.product_id is not null then
    raise exception 'PROCUREMENT_LINKED';
  end if;
  -- (место для будущих зависимостей: inventory/sales references и т.п.)

  -- Аудит ДО удаления, в той же транзакции — не потеряется.
  perform public.log_system_event('warning', 'admin', 'PROCUREMENT_DELETED',
    'Закупка удалена безвозвратно: ' || coalesce(v.product_code, v.product_name, p_id::text),
    jsonb_build_object('id', p_id, 'sku', v.product_code, 'supplier_id', v.supplier_id,
                       'quantity', v.quantity, 'purchase_total', v.purchase_total), null);

  delete from public.procurements where id = p_id;
end $$;

revoke all on function public.archive_procurement(uuid) from anon, public;
revoke all on function public.restore_procurement(uuid) from anon, public;
revoke all on function public.delete_procurement(uuid) from anon, public;
grant execute on function public.archive_procurement(uuid) to authenticated;
grant execute on function public.restore_procurement(uuid) to authenticated;
grant execute on function public.delete_procurement(uuid) to authenticated;

-- ---- 5. Аналитика: архивированные закупки ОСТАЮТСЯ в истории -----------------
--  Архив — UI-lifecycle, факт закупки сохраняется. Из истории исчезают только
--  реально удалённые (delete_procurement) записи.
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
  where purchase_date >= p_from
    and purchase_date <= p_to;   -- архивированные ВКЛЮЧЕНЫ (историю не теряем)

  return coalesce(v, '{}'::jsonb);
end $$;

revoke all on function public.procurement_analytics(date, date) from anon, public;
grant execute on function public.procurement_analytics(date, date) to authenticated;

-- ============================================================
--  ПРОВЕРКА (после Run, под админом):
--   select public.archive_procurement('<uuid>');   -- в архив
--   select public.restore_procurement('<uuid>');   -- назад в активные
--   select public.delete_procurement('<uuid-без-товара>');  -- удалит
--   -- закупка со связанным product_id → delete_procurement → PROCUREMENT_LINKED.
--   -- обычный пользователь/anon → AUTH_REQUIRED.
-- ============================================================
