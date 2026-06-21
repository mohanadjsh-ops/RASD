import { getMessages, isLocale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { demoStories } from "@/lib/demo-data";
import { StatusBadge } from "@/components/status-badge";
import { localizeStoryCluster, translateTextListToArabic } from "@/lib/translation";

export default async function StoryPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: localeParam, id } = await params;
  const locale = isLocale(localeParam) ? localeParam : "ar";
  const t = await getMessages(locale);
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("story_clusters").select("*").eq("id", id).maybeSingle();
  const story = await localizeStoryCluster(data ?? demoStories.find((item) => item.id === id) ?? demoStories[0], locale);
  const { data: sourceRows } = await supabase
    .from("cluster_sources")
    .select("raw_articles(title,url,published_at), sources(name,source_type)")
    .eq("cluster_id", story.id);
  const { data: mediaRows } = await supabase.from("media_links").select("*").eq("cluster_id", story.id).limit(20);
  const sourceList = (sourceRows ?? []) as unknown as Array<{
    raw_articles: { title: string; url: string; published_at?: string } | null;
    sources: { name: string; source_type: string } | null;
  }>;
  const translatedSourceTitles = locale === "ar" ? await translateTextListToArabic(sourceList.map((row) => row.raw_articles?.title ?? "")) : [];

  return (
    <section className="max-w-5xl" dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">{locale === "ar" ? story.arabic_title ?? story.main_title : story.main_title}</h1>
          <p className="mt-2 text-slate-600">{story.primary_source_name ?? story.normalized_topic}</p>
          <p className="mt-1 text-sm text-slate-500">{formatMakkahTime(story.primary_published_at ?? story.first_seen_at)}</p>
        </div>
        <StatusBadge status={story.verification_status} locale={locale} />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-md border border-line bg-panel p-4 text-slate-600 shadow-sm shadow-slate-200">{t.confidence}<p className="mt-2 text-3xl font-semibold text-slate-950">{story.confidence_score}%</p></div>
        <div className="rounded-md border border-line bg-panel p-4 text-slate-600 shadow-sm shadow-slate-200">{t.importance}<p className="mt-2 text-3xl font-semibold text-slate-950">{story.importance_score}</p></div>
        <div className="rounded-md border border-line bg-panel p-4 text-slate-600 shadow-sm shadow-slate-200">{t.sourcesCount}<p className="mt-2 text-3xl font-semibold text-slate-950">{story.source_count ?? sourceList.length}</p></div>
      </div>
      <div className="mt-6 rounded-md border border-line bg-panel p-5 shadow-sm shadow-slate-200">
        <h2 className="font-semibold text-slate-950">{t.verificationReason}</h2>
        <p className="mt-3 text-slate-700">{story.arabic_excerpt ?? story.verification_reason}</p>
        {story.arabic_bullets?.length ? (
          <ul className="mt-4 space-y-2 text-slate-800">
            {story.arabic_bullets.map((bullet: string) => <li key={bullet}>• {bullet}</li>)}
          </ul>
        ) : null}
      </div>
      <div className="mt-6 rounded-md border border-line bg-panel p-5 shadow-sm shadow-slate-200">
        <h2 className="font-semibold text-slate-950">{t.sourceLinks}</h2>
        <div className="mt-3 space-y-3">
          {sourceList.length ? sourceList.map((row, index) => (
            <a key={`${row.raw_articles?.url}-${index}`} href={row.raw_articles?.url ?? "#"} target="_blank" rel="noreferrer" className="block rounded-md border border-line bg-white p-3 text-sm shadow-sm transition hover:-translate-y-0.5 hover:border-electric">
              <span className="font-medium text-slate-950">{row.sources?.name ?? "Source"}</span>
              <span className="mx-2 text-slate-500">•</span>
              <span className="text-slate-700">{translatedSourceTitles[index] || row.raw_articles?.title}</span>
              <span className="mt-1 block break-all text-electric">{row.raw_articles?.url}</span>
            </a>
          )) : <p className="text-sm text-slate-500">{t.empty}</p>}
        </div>
      </div>
      <div className="mt-6 rounded-md border border-line bg-panel p-5 shadow-sm shadow-slate-200">
        <h2 className="font-semibold text-slate-950">{t.media}</h2>
        <div className="mt-3 space-y-2">
          {mediaRows?.length ? mediaRows.map((media) => (
            <a key={media.id} href={media.url} target="_blank" rel="noreferrer" className="block break-all rounded-md border border-line bg-white p-3 text-sm text-electric shadow-sm transition hover:-translate-y-0.5 hover:border-electric">
              {media.media_type}: {media.url}
            </a>
          )) : <p className="text-sm text-slate-500">{t.empty}</p>}
        </div>
      </div>
    </section>
  );
}

function formatMakkahTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-SA", {
    timeZone: "Asia/Riyadh",
    dateStyle: "medium",
    timeStyle: "medium"
  }).format(date);
}
