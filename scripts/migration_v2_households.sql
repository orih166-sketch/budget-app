-- ============================================================
-- Step 1: Multi-Tenancy Migration
-- Run this entire file in your Supabase SQL Editor (Project → SQL Editor → New query)
-- ============================================================

-- 1. Create households table
create table if not exists households (
  id uuid default gen_random_uuid() primary key,
  name text not null default 'משפחה שלי',
  created_at timestamptz default now()
);

-- 2. Create household_members table
create table if not exists household_members (
  household_id uuid references households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz default now(),
  primary key (household_id, user_id)
);

-- 3. Create household_invitations table
create table if not exists household_invitations (
  id uuid default gen_random_uuid() primary key,
  household_id uuid references households(id) on delete cascade,
  invited_email text not null,
  invited_by uuid references auth.users(id),
  token uuid default gen_random_uuid() unique not null,
  expires_at timestamptz default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz default now()
);

-- 4. Add household_id to transactions (if not already there)
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'transactions' and column_name = 'household_id'
  ) then
    alter table public.transactions add column household_id uuid references households(id);
  end if;
end $$;

-- 5. Rename family_id → household_id in category_budgets
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'category_budgets' and column_name = 'family_id'
  ) then
    alter table public.category_budgets rename column family_id to household_id;
  end if;
end $$;

-- Add FK constraint on category_budgets.household_id if missing
do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints tc
    join information_schema.constraint_column_usage ccu on tc.constraint_name = ccu.constraint_name
    where tc.table_name = 'category_budgets'
      and ccu.column_name = 'household_id'
      and tc.constraint_type = 'FOREIGN KEY'
  ) then
    begin
      alter table public.category_budgets
        add constraint category_budgets_household_id_fkey
        foreign key (household_id) references households(id);
    exception when others then null;
    end;
  end if;
end $$;

-- 6. Rename family_id → household_id in savings_goals
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'savings_goals' and column_name = 'family_id'
  ) then
    alter table public.savings_goals rename column family_id to household_id;
  end if;
end $$;

-- Add FK constraint on savings_goals.household_id if missing
do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints tc
    join information_schema.constraint_column_usage ccu on tc.constraint_name = ccu.constraint_name
    where tc.table_name = 'savings_goals'
      and ccu.column_name = 'household_id'
      and tc.constraint_type = 'FOREIGN KEY'
  ) then
    begin
      alter table public.savings_goals
        add constraint savings_goals_household_id_fkey
        foreign key (household_id) references households(id);
    exception when others then null;
    end;
  end if;
end $$;

-- ============================================================
-- 7. Helper function: get current user's household_id
-- ============================================================
create or replace function get_my_household_id()
returns uuid
language sql security definer stable
as $$
  select household_id from public.household_members
  where user_id = auth.uid()
  limit 1;
$$;

-- ============================================================
-- 8. Trigger: auto-create household when a new user registers
-- ============================================================
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  new_household_id uuid;
  display_name text;
begin
  display_name := coalesce(
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );

  insert into public.households (name)
  values ('משפחת ' || display_name)
  returning id into new_household_id;

  insert into public.household_members (household_id, user_id, role)
  values (new_household_id, new.id, 'owner');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- 9. Function: accept a household invitation
-- ============================================================
create or replace function accept_household_invitation(invitation_token uuid)
returns void
language plpgsql security definer
as $$
declare
  inv record;
  current_email text;
begin
  select email into current_email from auth.users where id = auth.uid();

  select * into inv
  from public.household_invitations
  where token = invitation_token
    and accepted_at is null
    and expires_at > now();

  if not found then
    raise exception 'ההזמנה לא נמצאה או שפג תוקפה';
  end if;

  if lower(inv.invited_email) != lower(current_email) then
    raise exception 'ההזמנה שייכת לכתובת מייל אחרת';
  end if;

  -- Leave current household first
  delete from public.household_members where user_id = auth.uid();

  -- Join the invited household
  insert into public.household_members (household_id, user_id, role)
  values (inv.household_id, auth.uid(), 'member')
  on conflict (household_id, user_id) do nothing;

  -- Mark invitation accepted
  update public.household_invitations
  set accepted_at = now()
  where id = inv.id;
end;
$$;

-- ============================================================
-- 10. Enable Row Level Security on all data tables
-- ============================================================

-- households
alter table public.households enable row level security;

drop policy if exists "users view own household" on public.households;
create policy "users view own household" on public.households
  for select using (id = get_my_household_id());

drop policy if exists "authenticated users create household" on public.households;
create policy "authenticated users create household" on public.households
  for insert with check (auth.uid() is not null);

-- household_members
alter table public.household_members enable row level security;

drop policy if exists "users view their household members" on public.household_members;
create policy "users view their household members" on public.household_members
  for select using (household_id = get_my_household_id());

drop policy if exists "service role manages members" on public.household_members;
create policy "service role manages members" on public.household_members
  for all using (true)
  with check (true);

-- household_invitations
alter table public.household_invitations enable row level security;

drop policy if exists "household owner manages invitations" on public.household_invitations;
create policy "household owner manages invitations" on public.household_invitations
  for all using (household_id = get_my_household_id());

drop policy if exists "invited user views own invitation" on public.household_invitations;
create policy "invited user views own invitation" on public.household_invitations
  for select using (
    lower(invited_email) = lower((select email from auth.users where id = auth.uid()))
  );

-- transactions
alter table public.transactions enable row level security;

drop policy if exists "household transactions select" on public.transactions;
create policy "household transactions select" on public.transactions
  for select using (household_id = get_my_household_id());

drop policy if exists "household transactions insert" on public.transactions;
create policy "household transactions insert" on public.transactions
  for insert with check (household_id = get_my_household_id());

drop policy if exists "household transactions update" on public.transactions;
create policy "household transactions update" on public.transactions
  for update using (household_id = get_my_household_id());

drop policy if exists "household transactions delete" on public.transactions;
create policy "household transactions delete" on public.transactions
  for delete using (household_id = get_my_household_id());

-- category_budgets
alter table public.category_budgets enable row level security;

drop policy if exists "household budgets all" on public.category_budgets;
create policy "household budgets all" on public.category_budgets
  for all using (household_id = get_my_household_id());

-- savings_goals
alter table public.savings_goals enable row level security;

drop policy if exists "household savings goals all" on public.savings_goals;
create policy "household savings goals all" on public.savings_goals
  for all using (household_id = get_my_household_id());

-- ============================================================
-- DONE. After running this migration:
--
-- 1. Register a fresh account at the app (this triggers handle_new_user)
--    Your new household_id will be created automatically.
--
-- 2. Run the data migration snippet below (replace YOUR_HOUSEHOLD_ID
--    with the id from the households table):
--
--    update public.transactions    set household_id = 'YOUR_HOUSEHOLD_ID' where household_id is null;
--    update public.category_budgets set household_id = 'YOUR_HOUSEHOLD_ID' where household_id is null;
--    update public.savings_goals   set household_id = 'YOUR_HOUSEHOLD_ID' where household_id is null;
--
-- 3. Use the Family Settings screen in the app to invite your partner.
-- ============================================================
