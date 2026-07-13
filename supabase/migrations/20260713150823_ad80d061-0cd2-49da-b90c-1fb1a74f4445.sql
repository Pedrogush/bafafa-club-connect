
-- =====================================================================
-- BAFAFÁ — Clube dos Bafafãs :: Fundação
-- =====================================================================

-- ---------- Enums ----------
create type public.app_role as enum ('visitante','gratuito','premium','equipe','moderador','admin');
create type public.plan_code as enum ('gratuito','carteirinha_mensal','carteirinha_anual');
create type public.subscription_status as enum ('teste','ativa','pendente','vencida','cancelada','inadimplente','em_carencia');
create type public.payment_source as enum ('demo','stripe','manual','pix');

-- ---------- Utility: updated_at ----------
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin new.updated_at = now(); return new; end $$;

-- =====================================================================
-- profiles
-- =====================================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text not null,
  avatar_url text,
  bio text,
  city text,
  whatsapp text,
  birth_date date,
  is_over_18 boolean not null default false,
  is_public boolean not null default true,
  show_birth_month boolean not null default true,
  show_city boolean not null default true,
  member_since timestamptz not null default now(),
  last_seen_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.profiles to authenticated;
grant select on public.profiles to anon;
grant all on public.profiles to service_role;

create index profiles_username_idx on public.profiles (lower(username));
create index profiles_active_idx on public.profiles (id) where deleted_at is null;

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by any authenticated user"
  on public.profiles for select to authenticated
  using (deleted_at is null and (is_public or auth.uid() = id));

create policy "Users can view their own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.tg_set_updated_at();

-- =====================================================================
-- user_roles + has_role
-- =====================================================================
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  unique(user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

create index user_roles_user_idx on public.user_roles (user_id);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.current_user_roles()
returns setof public.app_role
language sql stable security definer set search_path = public
as $$
  select role from public.user_roles where user_id = auth.uid()
$$;

-- Users can read their own roles
create policy "Users can view their own roles"
  on public.user_roles for select to authenticated
  using (auth.uid() = user_id);

-- Admins can read/manage everything
create policy "Admins can view all roles"
  on public.user_roles for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can insert roles"
  on public.user_roles for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete roles"
  on public.user_roles for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update roles"
  on public.user_roles for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Extra defense: block privilege escalation to sensitive roles even if a policy is misconfigured
create or replace function public.tg_block_self_privileged_role()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.role in ('equipe','moderador','admin') then
    if auth.uid() = new.user_id and not public.has_role(auth.uid(), 'admin') then
      raise exception 'Não é permitido atribuir esse papel a si mesmo.';
    end if;
  end if;
  return new;
end $$;

create trigger user_roles_block_self_priv
  before insert or update on public.user_roles
  for each row execute function public.tg_block_self_privileged_role();

-- =====================================================================
-- user_consents
-- =====================================================================
create table public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('termos','privacidade','comunidade','marketing','maioridade')),
  accepted boolean not null,
  version text not null default '1.0',
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

grant select, insert on public.user_consents to authenticated;
grant all on public.user_consents to service_role;

create index user_consents_user_idx on public.user_consents (user_id, kind, created_at desc);

alter table public.user_consents enable row level security;

create policy "Users can view their own consents"
  on public.user_consents for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own consents"
  on public.user_consents for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Admins can view all consents"
  on public.user_consents for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- =====================================================================
-- user_preferences
-- =====================================================================
create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  event_categories text[] not null default '{}',
  notify_in_app boolean not null default true,
  notify_email boolean not null default false,
  notify_whatsapp boolean not null default false,
  notify_push boolean not null default false,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.user_preferences to authenticated;
grant all on public.user_preferences to service_role;

alter table public.user_preferences enable row level security;

create policy "Users manage their own preferences"
  on public.user_preferences for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger user_preferences_updated_at before update on public.user_preferences
  for each row execute function public.tg_set_updated_at();

-- =====================================================================
-- plans
-- =====================================================================
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code public.plan_code not null unique,
  name text not null,
  tagline text,
  description text,
  price_cents integer not null default 0,
  currency text not null default 'BRL',
  billing_period text not null default 'mensal' check (billing_period in ('unico','mensal','anual')),
  benefits jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.plans to authenticated, anon;
grant all on public.plans to service_role;

alter table public.plans enable row level security;

create policy "Plans are viewable by everyone"
  on public.plans for select to authenticated, anon
  using (is_active = true);

create policy "Admins can manage plans"
  on public.plans for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create trigger plans_updated_at before update on public.plans
  for each row execute function public.tg_set_updated_at();

-- =====================================================================
-- subscriptions
-- =====================================================================
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete restrict,
  status public.subscription_status not null default 'pendente',
  source public.payment_source not null default 'demo',
  started_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at timestamptz,
  canceled_at timestamptz,
  external_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;

create index subscriptions_user_idx on public.subscriptions (user_id);
create index subscriptions_status_idx on public.subscriptions (status);

alter table public.subscriptions enable row level security;

create policy "Users view their own subscriptions"
  on public.subscriptions for select to authenticated
  using (auth.uid() = user_id);

create policy "Admins view all subscriptions"
  on public.subscriptions for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins manage subscriptions"
  on public.subscriptions for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.tg_set_updated_at();

-- =====================================================================
-- app_settings
-- =====================================================================
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

grant select on public.app_settings to authenticated;
grant all on public.app_settings to service_role;

alter table public.app_settings enable row level security;

create policy "Authenticated can read app settings"
  on public.app_settings for select to authenticated using (true);

create policy "Admins manage app settings"
  on public.app_settings for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- =====================================================================
-- audit_logs
-- =====================================================================
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

grant select, insert on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;

create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);

alter table public.audit_logs enable row level security;

create policy "Admins view audit logs"
  on public.audit_logs for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Authenticated can insert their own audit rows"
  on public.audit_logs for insert to authenticated
  with check (auth.uid() = actor_id);

-- =====================================================================
-- Trigger: auto-create profile + default free role on signup
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_display text;
  v_username text;
  v_whatsapp text;
  v_birth date;
  v_city text;
  v_over18 boolean;
begin
  v_display  := coalesce(nullif(new.raw_user_meta_data->>'display_name',''), split_part(new.email,'@',1));
  v_username := nullif(new.raw_user_meta_data->>'username','');
  v_whatsapp := nullif(new.raw_user_meta_data->>'whatsapp','');
  v_city     := nullif(new.raw_user_meta_data->>'city','');
  v_over18   := coalesce((new.raw_user_meta_data->>'is_over_18')::boolean, false);
  begin
    v_birth := (new.raw_user_meta_data->>'birth_date')::date;
  exception when others then v_birth := null;
  end;

  insert into public.profiles (id, display_name, username, whatsapp, birth_date, city, is_over_18)
  values (new.id, v_display, v_username, v_whatsapp, v_birth, v_city, v_over18)
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id) values (new.id)
  on conflict (user_id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'gratuito')
  on conflict do nothing;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- Seed inicial: planos + configurações
-- =====================================================================
insert into public.plans (code, name, tagline, description, price_cents, billing_period, is_featured, sort_order, benefits)
values
  ('gratuito','Bafafã Gratuito','Entra na roda de graça.',
   'Acesso às Fofoquinhas, reservas, calendário, carteira gratuita, pontos e benefício de aniversário.',
   0,'mensal',false,1,
   '["Acesso às Fofoquinhas","Reservas","Calendário de eventos","Enquetes","Carteira gratuita","Pontos","Benefício de aniversário"]'::jsonb),
  ('carteirinha_mensal','Bafafã de Carteirinha','Seu passaporte oficial.',
   'Selo no perfil, prioridade em reservas, pré-venda de eventos, benefícios mensais e vantagens exclusivas.',
   2990,'mensal',true,2,
   '["Selo no perfil","Prioridade em reservas","Pré-venda de eventos","Benefício mensal","Vantagem de aniversário","Sorteios exclusivos","Fila diferenciada"]'::jsonb),
  ('carteirinha_anual','Bafafã de Carteirinha (Anual)','Bafafã o ano inteiro.',
   'Todos os benefícios do plano mensal, com desconto anual.',
   29900,'anual',false,3,
   '["Todos os benefícios do plano mensal","Desconto anual"]'::jsonb)
on conflict (code) do nothing;

insert into public.app_settings (key, value, description) values
  ('demo_mode', 'true'::jsonb, 'Quando true, permite ativação de assinatura em modo demonstração. Deve ficar em false em produção real.'),
  ('bar_name', '"Bafafá Bar"'::jsonb, 'Nome do bar.'),
  ('bar_city', '"Natal/RN"'::jsonb, 'Cidade do bar.'),
  ('brand_name', '"BAFAFÁ — Clube dos Bafafãs"'::jsonb, 'Nome de exibição do app.'),
  ('referrals_enabled', 'false'::jsonb, 'Ativa o programa de indicação de amigos.'),
  ('stripe_ready', 'false'::jsonb, 'Marca que a integração Stripe foi conectada.')
on conflict (key) do nothing;
