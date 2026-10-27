-- אלה בטבע – מסד נתונים ב-Supabase
-- מריצים פעם אחת: Supabase → SQL Editor → New query → מדביקים את כל הקובץ → Run

-- 1. Who may use the system (Google / email login must match one of these)
create table if not exists public.allowed_users (
  email text primary key
);
insert into public.allowed_users (email) values ('elah262@gmail.com') on conflict do nothing;
-- להוספת משתמש נוסף (למשל מפתח), מריצים:
-- insert into public.allowed_users (email) values ('someone@gmail.com');

alter table public.allowed_users enable row level security;
-- no policies: the list is readable only through is_allowed()

create or replace function public.is_allowed()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.allowed_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- 2. All business records (customers, products, sales, expenses, followups, templates, posts, settings)
create table if not exists public.records (
  id text primary key,
  kind text not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists records_kind_idx on public.records (kind);

alter table public.records enable row level security;
drop policy if exists "allowed users manage records" on public.records;
create policy "allowed users manage records" on public.records
  for all to authenticated using (public.is_allowed()) with check (public.is_allowed());

-- 3. Atomic helpers
create or replace function public.next_receipt_no()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.is_allowed() then raise exception 'אין הרשאה'; end if;
  insert into public.records (id, kind, data) values ('settings', 'settings', '{}'::jsonb) on conflict (id) do nothing;
  select coalesce(nullif(data ->> 'receiptNext', '')::integer, 1) into n from public.records where id = 'settings' for update;
  update public.records
    set data = jsonb_set(data, '{receiptNext}', to_jsonb((n + 1)::text)), updated_at = now()
    where id = 'settings';
  return n;
end $$;

create or replace function public.adjust_stock(pid text, delta numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.is_allowed() then raise exception 'אין הרשאה'; end if;
  update public.records
    set data = jsonb_set(data, '{stock}', to_jsonb(coalesce(nullif(data ->> 'stock', '')::numeric, 0) + delta)), updated_at = now()
    where id = pid and kind = 'products'
    returning data into result;
  return result;
end $$;

grant execute on function public.is_allowed() to authenticated;
grant execute on function public.next_receipt_no() to authenticated;
grant execute on function public.adjust_stock(text, numeric) to authenticated;
revoke execute on function public.next_receipt_no() from anon;
revoke execute on function public.adjust_stock(text, numeric) from anon;

-- 4. Private storage for receipt PDFs
insert into storage.buckets (id, name, public) values ('receipts', 'receipts', false) on conflict (id) do nothing;

drop policy if exists "allowed users read receipts" on storage.objects;
drop policy if exists "allowed users write receipts" on storage.objects;
drop policy if exists "allowed users update receipts" on storage.objects;
create policy "allowed users read receipts" on storage.objects
  for select to authenticated using (bucket_id = 'receipts' and public.is_allowed());
create policy "allowed users write receipts" on storage.objects
  for insert to authenticated with check (bucket_id = 'receipts' and public.is_allowed());
create policy "allowed users update receipts" on storage.objects
  for update to authenticated using (bucket_id = 'receipts' and public.is_allowed());
