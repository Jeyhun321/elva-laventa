-- Elva LaVenta — общий журнал диагностики.
-- В журнал намеренно не сохраняются пароли, OTP-коды, телефоны, адреса и другие личные данные.

create table if not exists public.system_logs (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  level text not null check (level in ('error', 'warning', 'info')),
  source text not null,
  event text not null,
  message text,
  details jsonb not null default '{}'::jsonb,
  user_id uuid references auth.users(id) on delete set null,
  path text
);

create index if not exists system_logs_created_at_idx on public.system_logs (created_at desc);
create index if not exists system_logs_level_created_at_idx on public.system_logs (level, created_at desc);

alter table public.system_logs enable row level security;

drop policy if exists "admins can view system logs" on public.system_logs;
create policy "admins can view system logs"
  on public.system_logs for select to authenticated
  using (public.is_admin());

grant select on table public.system_logs to authenticated;

create or replace function public.log_system_event(
  p_level text,
  p_source text,
  p_event text,
  p_message text default null,
  p_details jsonb default '{}'::jsonb,
  p_path text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  safe_level text := lower(coalesce(p_level, 'error'));
begin
  if auth.uid() is null then
    return;
  end if;

  if safe_level not in ('error', 'warning', 'info') then
    safe_level := 'error';
  end if;

  insert into public.system_logs(level, source, event, message, details, user_id, path)
  values (
    safe_level,
    left(coalesce(nullif(btrim(p_source), ''), 'frontend'), 48),
    left(coalesce(nullif(btrim(p_event), ''), 'unknown'), 100),
    nullif(left(btrim(coalesce(p_message, '')), 500), ''),
    coalesce(p_details, '{}'::jsonb),
    auth.uid(),
    nullif(left(btrim(coalesce(p_path, '')), 240), '')
  );
end;
$$;

revoke all on function public.log_system_event(text, text, text, text, jsonb, text) from public;
grant execute on function public.log_system_event(text, text, text, text, jsonb, text) to authenticated;
