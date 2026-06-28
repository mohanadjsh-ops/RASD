create table if not exists public.osint_cases (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  input_type text not null default 'mixed'
    check (input_type in ('image','video','url','text','mixed')),
  workflow_stage text not null default 'planning'
    check (workflow_stage in ('planning','preservation','source','content','geotime','specialist','review','approval')),
  verdict text not null default 'inconclusive'
    check (verdict in ('inconclusive','needs_evidence','likely','verified','misleading')),
  confidence_score integer not null default 0 check (confidence_score between 0 and 100),
  sensitive_material boolean not null default false,
  public_interest_reason text,
  limitations text,
  ai_enabled boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.osint_claims (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.osint_cases(id) on delete cascade,
  claim_text text not null,
  claim_type text not null default 'primary'
    check (claim_type in ('primary','supporting','context')),
  status text not null default 'open'
    check (status in ('open','supported','contradicted','unresolved')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.osint_tools (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null,
  url text not null,
  execution_mode text not null default 'manual'
    check (execution_mode in ('automatic','manual')),
  access_model text not null default 'free'
    check (access_model in ('free','account_required')),
  instructions_ar text not null default '',
  enabled boolean not null default true,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.osint_evidence (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.osint_cases(id) on delete cascade,
  evidence_type text not null
    check (evidence_type in ('image','video','frame','url','text','document','telegram_file')),
  title text not null,
  source_url text,
  original_filename text,
  mime_type text,
  file_size bigint,
  sha256 text,
  metadata jsonb not null default '{}',
  notes text,
  local_only boolean not null default true,
  telegram_object_path text,
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.osint_findings (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.osint_cases(id) on delete cascade,
  evidence_id uuid references public.osint_evidence(id) on delete set null,
  tool_id uuid references public.osint_tools(id) on delete set null,
  stage text not null
    check (stage in ('planning','preservation','source','content','geotime','specialist','review','approval')),
  title text not null,
  body text not null,
  stance text not null default 'neutral'
    check (stance in ('supporting','opposing','neutral')),
  confidence_score integer not null default 0 check (confidence_score between 0 and 100),
  source_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.osint_case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.osint_cases(id) on delete cascade,
  action text not null,
  description text not null,
  metadata jsonb not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.osint_telegram_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  chat_id text unique,
  telegram_username text,
  link_code_hash text,
  link_code_expires_at timestamptz,
  verified_at timestamptz,
  active_case_id uuid references public.osint_cases(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists osint_cases_updated_idx on public.osint_cases(updated_at desc);
create index if not exists osint_evidence_case_idx on public.osint_evidence(case_id, created_at desc);
create index if not exists osint_evidence_expiry_idx on public.osint_evidence(expires_at)
  where telegram_object_path is not null;
create index if not exists osint_findings_case_idx on public.osint_findings(case_id, created_at desc);
create index if not exists osint_events_case_idx on public.osint_case_events(case_id, created_at desc);

alter table public.osint_cases enable row level security;
alter table public.osint_claims enable row level security;
alter table public.osint_tools enable row level security;
alter table public.osint_evidence enable row level security;
alter table public.osint_findings enable row level security;
alter table public.osint_case_events enable row level security;
alter table public.osint_telegram_links enable row level security;

create policy "osint cases read team" on public.osint_cases
  for select to authenticated using (true);
create policy "osint claims read team" on public.osint_claims
  for select to authenticated using (true);
create policy "osint tools read team" on public.osint_tools
  for select to authenticated using (enabled or public.is_admin());
create policy "osint evidence read team" on public.osint_evidence
  for select to authenticated using (true);
create policy "osint findings read team" on public.osint_findings
  for select to authenticated using (true);
create policy "osint events read team" on public.osint_case_events
  for select to authenticated using (true);
create policy "osint telegram links read own" on public.osint_telegram_links
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit)
values ('osint-temp', 'osint-temp', false, 20971520)
on conflict (id) do update set
  public = false,
  file_size_limit = 20971520;

create policy "osint temp read authenticated" on storage.objects
  for select to authenticated using (bucket_id = 'osint-temp');

create or replace function public.osint_temp_storage_bytes()
returns bigint
language sql
stable
security definer
set search_path = public, storage
as $$
  select coalesce(sum((metadata->>'size')::bigint), 0)
  from storage.objects
  where bucket_id = 'osint-temp';
$$;

revoke all on function public.osint_temp_storage_bytes() from public;
grant execute on function public.osint_temp_storage_bytes() to authenticated, service_role;

insert into public.osint_tools
  (name, category, url, execution_mode, access_model, instructions_ar, last_verified_at)
values
  ('InVID Verification Plugin', 'image_video', 'https://www.invid-project.eu/tools-and-services/invid-verification-plugin/', 'manual', 'free', 'استخراج إطارات الفيديو وفحص السياق والبحث العكسي والمرشحات الجنائية.', now()),
  ('Google Lens', 'image_video', 'https://lens.google.com/', 'manual', 'free', 'ارفع الصورة أو إطار الفيديو وابحث عن أقدم ظهور ونسخ مطابقة.', now()),
  ('TinEye', 'image_video', 'https://tineye.com/', 'manual', 'free', 'استخدم البحث اليدوي لتتبع أقدم ظهور للصورة والنسخ المعدلة.', now()),
  ('Bing Visual Search', 'image_video', 'https://www.bing.com/visualsearch', 'manual', 'free', 'ابحث بصريا عن الصور المشابهة والمعالم والعناصر الظاهرة.', now()),
  ('Yandex Images', 'image_video', 'https://yandex.com/images/', 'manual', 'free', 'مفيد للوجوه العامة والمعالم والنسخ المنشورة في نطاقات مختلفة.', now()),
  ('Content Credentials Verify', 'image_video', 'https://contentcredentials.org/verify', 'automatic', 'free', 'تحقق من بيانات C2PA وسلسلة منشأ وتعديلات الوسائط عند توفرها.', now()),
  ('OpenStreetMap', 'geolocation', 'https://www.openstreetmap.org/', 'manual', 'free', 'قارن الطرق والمباني والمعالم لتحديد الموقع الجغرافي.', now()),
  ('Google Earth', 'geolocation', 'https://earth.google.com/web/', 'manual', 'free', 'قارن التضاريس والمباني والصور التاريخية المتاحة.', now()),
  ('SunCalc', 'geolocation', 'https://www.suncalc.org/', 'manual', 'free', 'قارن اتجاه الظلال وموضع الشمس مع المكان والوقت المفترضين.', now()),
  ('NASA Worldview', 'satellite', 'https://worldview.earthdata.nasa.gov/', 'manual', 'free', 'راجع صور الأقمار للأحداث البيئية والدخان والحرائق والتغيرات.', now()),
  ('Copernicus Browser', 'satellite', 'https://browser.dataspace.copernicus.eu/', 'manual', 'account_required', 'استخدم صور Sentinel والمقارنات الزمنية للموقع.', now()),
  ('ArcGIS Wayback', 'satellite', 'https://livingatlas.arcgis.com/wayback/', 'manual', 'free', 'قارن الإصدارات التاريخية لصور World Imagery.', now()),
  ('Zoom Earth', 'satellite', 'https://zoom.earth/', 'manual', 'free', 'راجع الطقس والسحب والحرائق والصور القريبة من الوقت الحقيقي.', now()),
  ('MarineTraffic', 'ships', 'https://www.marinetraffic.com/', 'manual', 'account_required', 'ابحث بالاسم أو IMO أو MMSI وقارن المسار والموانئ.', now()),
  ('VesselFinder', 'ships', 'https://www.vesselfinder.com/', 'manual', 'free', 'تحقق من موقع السفينة وبياناتها الأساسية ومسارها المتاح.', now()),
  ('FleetMon', 'ships', 'https://www.fleetmon.com/', 'manual', 'account_required', 'قارن هوية السفينة ومسارها وسجل الوصول والمغادرة.', now()),
  ('Global Fishing Watch', 'ships', 'https://globalfishingwatch.org/map/', 'manual', 'free', 'حلل النشاط البحري وأنماط الصيد والحركة غير المعتادة.', now()),
  ('ADS-B Exchange', 'aircraft', 'https://globe.adsbexchange.com/', 'manual', 'free', 'تتبع الطائرات عبر Hex أو التسجيل أو النداء ومقارنة المسار.', now()),
  ('FlightAware', 'aircraft', 'https://www.flightaware.com/', 'manual', 'account_required', 'راجع الرحلات والتسجيل والأوقات المتاحة.', now()),
  ('Flightradar24', 'aircraft', 'https://www.flightradar24.com/', 'manual', 'account_required', 'قارن مسار الرحلة والطائرة والمطارات.', now()),
  ('OpenSky Network', 'aircraft', 'https://opensky-network.org/', 'manual', 'free', 'استخدم بيانات الطيران المفتوحة للبحث والتحليل.', now()),
  ('Small Arms Survey', 'weapons', 'https://www.smallarmssurvey.org/', 'manual', 'free', 'راجع مراجع الأسلحة الصغيرة والعلامات والأنماط الإقليمية.', now()),
  ('SIPRI Databases', 'weapons', 'https://www.sipri.org/databases', 'manual', 'free', 'راجع نقل الأسلحة والحظر والإنفاق العسكري.', now()),
  ('OpenCorporates', 'companies', 'https://opencorporates.com/', 'manual', 'free', 'ابحث عن تسجيل الشركات والمديرين والعناوين والروابط.', now()),
  ('OCCRP Aleph', 'companies', 'https://aleph.occrp.org/', 'manual', 'account_required', 'ابحث في الوثائق والسجلات والشركات والأشخاص ذوي الصلة بالمصلحة العامة.', now()),
  ('ICIJ Offshore Leaks', 'companies', 'https://offshoreleaks.icij.org/', 'manual', 'free', 'ابحث في الكيانات الخارجية والوسطاء والضباط والعناوين.', now()),
  ('ResourceContracts', 'companies', 'https://resourcecontracts.org/', 'manual', 'free', 'راجع عقود النفط والغاز والتعدين المنشورة.', now()),
  ('Companies House', 'companies', 'https://find-and-update.company-information.service.gov.uk/', 'manual', 'free', 'راجع الشركات البريطانية والإيداعات والمديرين.', now()),
  ('SEC EDGAR', 'companies', 'https://www.sec.gov/edgar/search/', 'manual', 'free', 'راجع إيداعات الشركات العامة في الولايات المتحدة.', now()),
  ('Internet Archive', 'archive', 'https://web.archive.org/', 'manual', 'free', 'احفظ الصفحات وراجع النسخ القديمة والتغييرات الزمنية.', now()),
  ('Bellingcat Toolkit', 'networks', 'https://bellingcat.gitbook.io/toolkit', 'manual', 'free', 'اختر أدوات متخصصة حسب نوع التحقيق مع توثيق المنهج.', now()),
  ('GIJN Resources', 'networks', 'https://gijn.org/resource/', 'manual', 'free', 'راجع أدلة وتقنيات الصحافة الاستقصائية والتحقق.', now()),
  ('ARIJ', 'networks', 'https://arij.net/', 'manual', 'free', 'مرجع عربي للتحقيقات والصحافة الاستقصائية.', now()),
  ('C4ADS', 'networks', 'https://c4ads.org/', 'manual', 'free', 'راجع الأبحاث المفتوحة حول النزاعات والشبكات غير المشروعة.', now()),
  ('Exposing the Invisible', 'networks', 'https://exposingtheinvisible.org/', 'manual', 'free', 'أدلة عملية للبحث الآمن والتحقيق الرقمي.', now()),
  ('OSINT Framework', 'networks', 'https://osintframework.com/', 'manual', 'free', 'دليل تصنيفي لاختيار أدوات المصادر المفتوحة.', now())
on conflict (name) do update set
  category = excluded.category,
  url = excluded.url,
  execution_mode = excluded.execution_mode,
  access_model = excluded.access_model,
  instructions_ar = excluded.instructions_ar,
  last_verified_at = excluded.last_verified_at,
  updated_at = now();
