-- ============================================================
--  Elva LaVenta — Phase 2 FINAL: Wheel полностью управляется из Admin
--
--  Запустить ЦЕЛИКОМ: Supabase → SQL Editor → New query → вставить → Run.
--  ИДЕМПОТЕНТНО и БЕЗОПАСНО (create or replace + merge существующих наград).
--
--  ЧТО ДАЁТ:
--  Расширяет модель каждой награды wheel_config.rewards ДВУМЯ явными полями,
--  которыми управляет Admin (не выводятся автоматически из weight):
--     { "percent": 5, "weight": 80, "status": "active",       "show_lock": false }
--     { "percent": 30,"weight": 0,  "status": "display_only", "show_lock": true  }
--
--  status:
--    'active'       — сектор виден, УЧАСТВУЕТ в розыгрыше (нужен weight>0);
--    'display_only' — сектор виден, НО сервер его НИКОГДА не выбирает (даже если
--                     кто-то поставил weight>0). Витрина не может это обойти.
--  show_lock:
--    true/false — показывать ли иконку замка рядом с процентом. Управляется
--                 Admin ЯВНО (не «weight==0 → замок»). Для active обычно false.
--
--  Обратная совместимость: старые награды без status/show_lock трактуются как
--  active при weight>0 (иначе display_only); show_lock по умолчанию = замок для
--  display-only. Это сохраняет текущее поведение 7 секторов (5/10/15 active;
--  20/30/40/50 display-only с замком) без потери данных.
-- ============================================================

-- ---------- (1) НОРМАЛИЗАЦИЯ существующих наград: добавить status + show_lock ----------
--  Существующие проценты и веса сохраняются как есть; status/show_lock
--  выводятся из текущего weight ТОЛЬКО если поля ещё нет (первый прогон).
do $$
declare
  cur jsonb;
  r jsonb;
  out jsonb := '[]'::jsonb;
  w  numeric;
  st text;
  sl boolean;
begin
  select rewards into cur from public.wheel_config where id = 1;
  for r in select value from jsonb_array_elements(coalesce(cur, '[]'::jsonb)) loop
    w := coalesce((r->>'weight')::numeric, 0);
    st := coalesce(nullif(lower(r->>'status'), ''),
                   case when w > 0 then 'active' else 'display_only' end);
    if st not in ('active', 'display_only') then
      st := case when w > 0 then 'active' else 'display_only' end;
    end if;
    sl := coalesce((r->>'show_lock')::boolean, st = 'display_only');
    out := out || jsonb_build_object(
      'percent', (r->>'percent')::numeric,
      'weight',  w,
      'status',  st,
      'show_lock', sl
    );
  end loop;
  if out <> '[]'::jsonb then
    update public.wheel_config set rewards = out where id = 1;
  end if;
end $$;

-- ---------- (2) SPIN — сервер выбирает ТОЛЬКО status='active' AND weight>0 ----------
--  DISPLAY ONLY исключены всегда, независимо от значения на витрине.
create or replace function public.spin_wheel()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.wheel_config%rowtype;
  v_window text;
  v_key text;
  v_total_weight numeric := 0;
  v_pick numeric;
  v_acc numeric := 0;
  r jsonb;
  v_percent numeric := null;
  v_code text;
  v_promo_id bigint;
  v_expiry timestamptz;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into c from public.wheel_config where id = 1;
  if not found or c.enabled is not true then
    raise exception 'WHEEL_DISABLED';
  end if;

  v_window := public._wheel_current_window(c);
  if v_window is null then
    raise exception 'WHEEL_CLOSED';
  end if;
  v_key := public._wheel_window_key(c, v_window);

  -- Сумма весов ТОЛЬКО активных наград (status='active' AND weight>0).
  -- display_only исключены даже при ошибочном weight>0 (защита от обхода).
  for r in select value from jsonb_array_elements(c.rewards)
           where coalesce(nullif(lower(value->>'status'), ''),
                          case when coalesce((value->>'weight')::numeric, 0) > 0
                               then 'active' else 'display_only' end) = 'active'
             and coalesce((value->>'weight')::numeric, 0) > 0 loop
    v_total_weight := v_total_weight + (r->>'weight')::numeric;
  end loop;
  if v_total_weight <= 0 then
    raise exception 'WHEEL_NO_REWARDS';
  end if;

  -- Взвешенный выбор на сервере (built-in random(); frontend НЕ участвует).
  v_pick := random() * v_total_weight;
  for r in select value from jsonb_array_elements(c.rewards)
           where coalesce(nullif(lower(value->>'status'), ''),
                          case when coalesce((value->>'weight')::numeric, 0) > 0
                               then 'active' else 'display_only' end) = 'active'
             and coalesce((value->>'weight')::numeric, 0) > 0
           order by (value->>'percent')::numeric loop
    v_acc := v_acc + (r->>'weight')::numeric;
    if v_pick <= v_acc then
      v_percent := (r->>'percent')::numeric;
      exit;
    end if;
  end loop;
  if v_percent is null then
    select (value->>'percent')::numeric into v_percent
      from jsonb_array_elements(c.rewards)
      where coalesce(nullif(lower(value->>'status'), ''),
                     case when coalesce((value->>'weight')::numeric, 0) > 0
                          then 'active' else 'display_only' end) = 'active'
        and coalesce((value->>'weight')::numeric, 0) > 0
      order by (value->>'percent')::numeric desc limit 1;
  end if;

  v_expiry := now() + make_interval(hours => c.reward_expiry_hours);

  v_code := public.generate_promo_code('WHEEL');
  insert into public.promo_codes (
    code, type, discount_type, discount_value, active,
    expires_at, max_total_uses, max_uses_per_account, assigned_account_id, source, created_by
  ) values (
    v_code, 'individual', 'percent', v_percent, true,
    v_expiry, 1, 1, auth.uid(), 'wheel', auth.uid()
  ) returning id into v_promo_id;

  begin
    insert into public.wheel_spins (account_id, window_key, reward_percent, promo_id)
      values (auth.uid(), v_key, v_percent, v_promo_id);
  exception when unique_violation then
    delete from public.promo_codes where id = v_promo_id;
    raise exception 'WHEEL_ALREADY_SPUN';
  end;

  return jsonb_build_object('percent', v_percent, 'code', v_code, 'expires_at', v_expiry);
end $$;

revoke all on function public.spin_wheel() from anon;
grant execute on function public.spin_wheel() to authenticated;

-- ---------- (3) Публичный конфиг: sectors {percent, active, show_lock}, без весов ----------
create or replace function public.get_wheel_public_config()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare c public.wheel_config%rowtype;
begin
  select * into c from public.wheel_config where id = 1;
  if not found then
    return jsonb_build_object('enabled', false);
  end if;
  return jsonb_build_object(
    'enabled', c.enabled,
    'timezone', c.timezone,
    'windows', to_jsonb(c.windows),
    'tolerance_minutes', c.tolerance_minutes,
    'reward_expiry_hours', c.reward_expiry_hours,
    -- ВСЕ сектора для отрисовки: {percent, active, show_lock}. Веса НЕ отдаём.
    'sectors', (
      select coalesce(jsonb_agg(
        jsonb_build_object('percent', pct, 'active', is_active, 'show_lock', show_lock)
        order by pct), '[]'::jsonb)
      from (
        select
          (r->>'percent')::numeric as pct,
          (coalesce(nullif(lower(r->>'status'), ''),
             case when coalesce((r->>'weight')::numeric, 0) > 0
                  then 'active' else 'display_only' end) = 'active'
           and coalesce((r->>'weight')::numeric, 0) > 0) as is_active,
          coalesce((r->>'show_lock')::boolean,
            not (coalesce(nullif(lower(r->>'status'), ''),
                   case when coalesce((r->>'weight')::numeric, 0) > 0
                        then 'active' else 'display_only' end) = 'active'
                 and coalesce((r->>'weight')::numeric, 0) > 0)) as show_lock
        from jsonb_array_elements(c.rewards) r
      ) t
    ),
    -- Совместимость: только реально достижимые проценты (active AND weight>0)
    'rewards', (
      select coalesce(jsonb_agg(pct order by pct), '[]'::jsonb)
      from (
        select (r->>'percent')::numeric as pct
        from jsonb_array_elements(c.rewards) r
        where coalesce(nullif(lower(r->>'status'), ''),
                       case when coalesce((r->>'weight')::numeric, 0) > 0
                            then 'active' else 'display_only' end) = 'active'
          and coalesce((r->>'weight')::numeric, 0) > 0
      ) t
    )
  );
end $$;

grant execute on function public.get_wheel_public_config() to anon, authenticated;

-- ---------- ПРОВЕРКА ----------
-- select public.get_wheel_public_config();   -- sectors: [{percent,active,show_lock}]
-- В активном окне под пользователем: select public.spin_wheel();  -- только active выпадают
