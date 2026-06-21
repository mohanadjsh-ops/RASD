alter table public.raw_articles
  add column if not exists canonical_url text,
  add column if not exists source_item_id text,
  add column if not exists fetch_method text not null default 'rss';

alter table public.story_clusters
  add column if not exists topic_tags jsonb not null default '[]',
  add column if not exists region_tags jsonb not null default '[]',
  add column if not exists source_count integer not null default 0,
  add column if not exists alert_sent_at timestamptz;

alter table public.summaries
  add column if not exists lead_line text;

create table if not exists public.fetch_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  source_count integer not null default 0,
  inserted_articles integer not null default 0,
  updated_clusters integer not null default 0,
  alerts_sent integer not null default 0,
  status text not null default 'running' check (status in ('running','completed','failed','partial')),
  error_message text,
  metadata jsonb not null default '{}'
);

create table if not exists public.media_links (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references public.raw_articles(id) on delete cascade,
  cluster_id uuid references public.story_clusters(id) on delete cascade,
  media_type text not null check (media_type in ('image','video')),
  url text not null,
  origin text not null default 'rss',
  created_at timestamptz not null default now(),
  unique(article_id, url)
);

create unique index if not exists sources_feed_url_unique on public.sources(feed_url);
create index if not exists raw_articles_content_hash_idx on public.raw_articles(content_hash);
create index if not exists story_clusters_last_seen_idx on public.story_clusters(last_seen_at desc);
create index if not exists story_clusters_alert_idx on public.story_clusters(alert_sent_at, importance_score, confidence_score);
create index if not exists cluster_sources_cluster_idx on public.cluster_sources(cluster_id);

alter table public.fetch_runs enable row level security;
alter table public.media_links enable row level security;

create policy "fetch runs admin read" on public.fetch_runs for select to authenticated using (public.is_admin());
create policy "media links read authenticated" on public.media_links for select to authenticated using (true);

insert into public.sources (name, url, feed_url, source_type, language, country, category, credibility_weight, enabled)
values
  ('BBC Arabic', 'https://www.bbc.com/arabic', 'https://feeds.bbci.co.uk/arabic/rss.xml', 'trusted_media', 'ar', 'global', 'general', 82, true),
  ('BBC World', 'https://www.bbc.com/news/world', 'https://feeds.bbci.co.uk/news/world/rss.xml', 'trusted_media', 'en', 'global', 'world', 82, true),
  ('Al Jazeera Arabic', 'https://www.aljazeera.net', 'https://www.aljazeera.net/aljazeerarss/ar.xml', 'trusted_media', 'ar', 'global', 'general', 80, true),
  ('Al Jazeera English', 'https://www.aljazeera.com', 'https://www.aljazeera.com/xml/rss/all.xml', 'trusted_media', 'en', 'global', 'general', 80, true),
  ('Sky News Arabia', 'https://www.skynewsarabia.com', 'https://www.skynewsarabia.com/rss', 'trusted_media', 'ar', 'global', 'general', 76, true),
  ('RT Arabic', 'https://arabic.rt.com', 'https://arabic.rt.com/rss/', 'monitoring_only', 'ar', 'global', 'general', 52, true),
  ('Guardian World', 'https://www.theguardian.com/world', 'https://www.theguardian.com/world/rss', 'trusted_media', 'en', 'global', 'world', 78, true),
  ('Axios', 'https://www.axios.com', 'https://www.axios.com/feeds/feed.rss', 'trusted_media', 'en', 'US', 'politics', 76, true),
  ('CNN World', 'https://www.cnn.com/world', 'http://rss.cnn.com/rss/cnn_world.rss', 'trusted_media', 'en', 'global', 'world', 76, true),
  ('Reuters via Google News', 'https://www.reuters.com', 'https://news.google.com/rss/search?q=site%3Areuters.com%20Middle%20East%20OR%20Russia%20OR%20US%20politics%20OR%20economy&hl=en-US&gl=US&ceid=US%3Aen', 'major_agency', 'en', 'global', 'general', 90, true)
on conflict (feed_url) do update set
  name = excluded.name,
  url = excluded.url,
  source_type = excluded.source_type,
  language = excluded.language,
  country = excluded.country,
  category = excluded.category,
  credibility_weight = excluded.credibility_weight,
  enabled = excluded.enabled,
  updated_at = now();

insert into public.profiles (id, email, full_name, role)
select id, email, 'Mohannad Aljashi', 'admin'
from auth.users
where email = 'mohannadaljashi@gmail.com'
on conflict (id) do update set
  email = excluded.email,
  full_name = excluded.full_name,
  role = 'admin',
  updated_at = now();
