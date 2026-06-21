create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'viewer' check (role in ('admin','viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  feed_url text not null,
  source_type text not null check (source_type in ('official','major_agency','trusted_media','monitoring_only')),
  language text not null,
  country text,
  category text,
  credibility_weight integer not null default 50,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.raw_articles (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.sources(id) on delete set null,
  title text not null,
  url text unique not null,
  published_at timestamptz,
  raw_content text,
  excerpt text,
  language text,
  detected_entities jsonb not null default '{}',
  content_hash text,
  created_at timestamptz not null default now()
);

create table public.story_clusters (
  id uuid primary key default gen_random_uuid(),
  main_title text not null,
  normalized_topic text not null,
  category text,
  importance_score integer not null default 0,
  verification_status text not null default 'unverified' check (verification_status in ('unverified','monitoring','likely','confirmed','high_confidence')),
  confidence_score integer not null default 0,
  verification_reason text not null default '',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cluster_sources (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid references public.story_clusters(id) on delete cascade,
  article_id uuid references public.raw_articles(id) on delete cascade,
  source_id uuid references public.sources(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(cluster_id, article_id)
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid references public.story_clusters(id) on delete cascade,
  channel_type text not null check (channel_type in ('email','telegram')),
  sent_to text,
  status text not null default 'pending' check (status in ('pending','sent','failed','skipped')),
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create table public.summaries (
  id uuid primary key default gen_random_uuid(),
  input_text text not null,
  input_language text,
  output_language text not null default 'ar',
  headline_12_words text,
  summary_35_45_words text,
  social_caption_35_45_words text,
  key_points jsonb not null default '[]',
  source_links jsonb not null default '[]',
  verification_note text,
  risk_flags jsonb not null default '[]',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  alert_email text,
  keywords jsonb not null default '[]',
  minimum_confidence_score integer not null default 70,
  minimum_source_count integer not null default 2,
  categories jsonb not null default '[]',
  enable_email_alerts boolean not null default true,
  enable_telegram_alerts boolean not null default false,
  telegram_chat_id text,
  ui_language text not null default 'ar' check (ui_language in ('ar','en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.notification_channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  channel_type text not null check (channel_type in ('email','telegram')),
  enabled boolean not null default true,
  destination text,
  verified boolean not null default false,
  settings_json jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

alter table public.profiles enable row level security;
alter table public.sources enable row level security;
alter table public.raw_articles enable row level security;
alter table public.story_clusters enable row level security;
alter table public.cluster_sources enable row level security;
alter table public.alerts enable row level security;
alter table public.summaries enable row level security;
alter table public.user_settings enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notification_channels enable row level security;

create policy "profiles read own or admin" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "profiles admin update" on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "sources read authenticated" on public.sources for select to authenticated using (true);
create policy "sources admin insert" on public.sources for insert to authenticated with check (public.is_admin());
create policy "sources admin update" on public.sources for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "sources admin delete" on public.sources for delete to authenticated using (public.is_admin());

create policy "raw articles read authenticated" on public.raw_articles for select to authenticated using (true);
create policy "story clusters read authenticated" on public.story_clusters for select to authenticated using (true);
create policy "cluster sources read authenticated" on public.cluster_sources for select to authenticated using (true);
create policy "alerts read authenticated" on public.alerts for select to authenticated using (true);

create policy "summaries read own or admin" on public.summaries for select to authenticated using (created_by = auth.uid() or public.is_admin());
create policy "summaries insert own" on public.summaries for insert to authenticated with check (created_by = auth.uid());

create policy "settings read own" on public.user_settings for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "settings upsert own" on public.user_settings for insert to authenticated with check (user_id = auth.uid());
create policy "settings update own" on public.user_settings for update to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

create policy "audit admin read" on public.audit_logs for select to authenticated using (public.is_admin());

create policy "channels read own" on public.notification_channels for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "channels insert own" on public.notification_channels for insert to authenticated with check (user_id = auth.uid());
create policy "channels update own" on public.notification_channels for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
