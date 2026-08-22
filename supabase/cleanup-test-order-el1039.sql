-- ============================================================
--  Elva LaVenta — CLEANUP: удалить ТОЛЬКО тестовый QA-заказ EL-1039
--
--  Контекст: заказ EL-1039 создан Claude во время A→Z QA-аудита
--  (реальный тест checkout). Данные заказа:
--    order_no = EL-1039 · email = alekberov.ceyhun2002@gmail.com (owner)
--    товар код 2002 (Qırmızı Ürəkli Maxi Don) L ×3 · Экспресс 7 ₼ · total 154 ₼
--
--  Запустить ЦЕЛИКОМ: Supabase → SQL Editor → New query → вставить → Run.
--  БЕЗОПАСНО: удаляет строку ТОЛЬКО если совпали ВСЕ три критерия
--    (order_no='EL-1039' И email=owner И total=154). Иначе — ничего не делает.
--    order_items уходят автоматически (orders → on delete cascade).
--  Разовая cleanup-операция (НЕ миграция схемы). Идемпотентна: повторный
--  запуск после удаления просто напишет "не найдено".
--
--  ВНИМАНИЕ: удаление физическое и необратимое. Это единственный способ —
--  UI админки не поддерживает удаление заказов (только смену статуса), и
--  функции deleteOrder в коде нет. Настоящий production-заказ этой командой
--  затронут быть НЕ может (тройной фильтр по тестовым признакам).
-- ============================================================

do $$
declare
  v_id bigint;
begin
  select id into v_id
    from public.orders
   where order_no = 'EL-1039'
     and email    = 'alekberov.ceyhun2002@gmail.com'
     and total    = 154;

  if v_id is null then
    raise notice 'EL-1039 test order НЕ найден по критериям (уже удалён или не совпал) — ничего не делаю.';
    return;
  end if;

  delete from public.orders where id = v_id;   -- order_items уйдут каскадом
  raise notice 'Удалён тестовый заказ EL-1039 (orders.id=%) + его order_items (cascade).', v_id;
end $$;

-- ПРОВЕРКА после Run (должно вернуть 0 строк):
--   select id, order_no, email, total from public.orders where order_no = 'EL-1039';
