alter table public.raw_articles
  add column if not exists title_ar text,
  add column if not exists excerpt_ar text,
  add column if not exists translation_status text not null default 'pending'
    check (translation_status in ('pending','ready','failed'));

alter table public.story_clusters
  add column if not exists arabic_title text,
  add column if not exists arabic_excerpt text,
  add column if not exists arabic_bullets jsonb not null default '[]',
  add column if not exists translation_status text not null default 'pending'
    check (translation_status in ('pending','ready','failed')),
  add column if not exists primary_source_name text,
  add column if not exists primary_source_url text,
  add column if not exists primary_published_at timestamptz,
  add column if not exists primary_article_id uuid references public.raw_articles(id) on delete set null;

update public.raw_articles
set
  title_ar = coalesce(title_ar, case when title ~ '[ء-ي]' then title else null end),
  excerpt_ar = coalesce(excerpt_ar, case when excerpt ~ '[ء-ي]' then excerpt else null end),
  translation_status = case when title ~ '[ء-ي]' then 'ready' else translation_status end
where title_ar is null or translation_status = 'pending';

update public.story_clusters
set
  arabic_title = coalesce(arabic_title, case when main_title ~ '[ء-ي]' then main_title else null end),
  arabic_excerpt = coalesce(arabic_excerpt, case when verification_reason ~ '[ء-ي]' then verification_reason else null end),
  translation_status = case when main_title ~ '[ء-ي]' then 'ready' else translation_status end
where arabic_title is null or translation_status = 'pending';

create index if not exists story_clusters_live_ar_idx
  on public.story_clusters(translation_status, verification_status, last_seen_at desc);

create index if not exists story_clusters_primary_published_idx
  on public.story_clusters(primary_published_at desc);

insert into public.sources (name, url, feed_url, source_type, language, country, category, credibility_weight, enabled)
values
  ('Al Arabiya', 'https://www.alarabiya.net', 'https://www.alarabiya.net/.mrss/ar.xml', 'trusted_media', 'ar', 'global', 'general', 80, true),
  ('Asharq News', 'https://asharq.com', 'https://asharq.com/feed/', 'trusted_media', 'ar', 'global', 'general', 78, true),
  ('France 24 Arabic', 'https://www.france24.com/ar', 'https://www.france24.com/ar/rss', 'trusted_media', 'ar', 'global', 'general', 76, true),
  ('AP Middle East via Google News', 'https://apnews.com', 'https://news.google.com/rss/search?q=site%3Aapnews.com%20Middle%20East%20OR%20Russia%20OR%20US%20politics%20OR%20economy&hl=en-US&gl=US&ceid=US%3Aen', 'major_agency', 'en', 'global', 'general', 88, true),
  ('AFP Arabic via Google News', 'https://www.france24.com/ar/tag/وكالة-فرانس-برس/', 'https://news.google.com/rss/search?q=%D9%88%D9%83%D8%A7%D9%84%D8%A9%20%D9%81%D8%B1%D8%A7%D9%86%D8%B3%20%D8%A8%D8%B1%D8%B3%20OR%20AFP%20site%3Afrance24.com%2Far&hl=ar&gl=SA&ceid=SA%3Aar', 'major_agency', 'ar', 'global', 'general', 86, true),
  ('Reuters Arabic via Google News', 'https://www.reuters.com', 'https://news.google.com/rss/search?q=Reuters%20%D8%B9%D8%B1%D8%A8%D9%8A%20OR%20%D8%B1%D9%88%D9%8A%D8%AA%D8%B1%D8%B2%20%D8%A7%D9%84%D8%B4%D8%B1%D9%82%20%D8%A7%D9%84%D8%A3%D9%88%D8%B3%D8%B7&hl=ar&gl=SA&ceid=SA%3Aar', 'major_agency', 'ar', 'global', 'general', 90, true)
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
