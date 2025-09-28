-- Enable required extensions
create extension if not exists "pgcrypto";

-- Create budgets table
create table if not exists budgets(
  id uuid primary key default gen_random_uuid(),
  display_id text, 
  tipo text check (tipo in ('filme','audio','cc','imagem')) not null,
  status text default 'Rascunho', 
  created_at timestamptz default now(), 
  updated_at timestamptz default now()
);

-- Create versions table
create table if not exists versions(
  id uuid primary key default gen_random_uuid(), 
  budget_id uuid references budgets(id) on delete cascade,
  versao int not null default 1, 
  payload jsonb default '{}', 
  honorario_total numeric default 0, 
  total_geral numeric default 0,
  created_at timestamptz default now()
);

-- Create function to generate budgets with initial version
create or replace function create_budget_with_version(p_tipo text)
returns json language plpgsql security definer as $$
declare 
  bid uuid := gen_random_uuid(); 
  vid uuid := gen_random_uuid();
  disp text := 'ORC-' || upper(p_tipo) || '-' || to_char(now() at time zone 'America/Sao_Paulo','YYYYMMDD') || '-' || extract(epoch from now())::text;
begin 
  insert into budgets(id, display_id, tipo) values(bid, disp, p_tipo);
  insert into versions(id, budget_id, versao) values(vid, bid, 1);
  return json_build_object('id', bid, 'display_id', disp);
end $$;

-- Enable RLS
alter table budgets enable row level security; 
alter table versions enable row level security;

-- Create RLS policies
create policy "budgets_select" on budgets for select using(true);
create policy "budgets_insert" on budgets for insert with check(true);
create policy "budgets_update" on budgets for update using(true);
create policy "versions_select" on versions for select using(true);
create policy "versions_insert" on versions for insert with check(true);
create policy "versions_update" on versions for update using(true);