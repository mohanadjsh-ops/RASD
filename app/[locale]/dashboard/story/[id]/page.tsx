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
    <section className="max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">{story.main_title}</h1>
          <p className="mt-2 text-slate-400">{story.normalized_topic}</p>
        </div>
        <StatusBadge status={story.verification_status} locale={locale} />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-md border border-line bg-panel p-4 shadow-sm shadow-black/20">{t.confidence}<p className="mt-2 text-3xl font-semibold text-white">{story.confidence_score}%</p></div>
        <div className="rounded-md border border-line bg-panel p-4 shadow-sm shadow-black/20">{t.importance}<p className="mt-2 text-3xl font-semibold text-white">{story.importance_score}</p></div>
        <div className="rounded-md border border-line bg-panel p-4 shadow-sm shadow-black/20">{t.sourcesCount}<p className="mt-2 text-3xl font-semibold text-white">{story.source_count ?? sourceList.length}</p></div>
      </div>
      <div className="mt-6 rounded-md border border-line bg-panel p-5 shadow-sm shadow-black/20">
        <h2 className="font-semibold text-white">{t.verificationReason}</h2>
        <p className="mt-3 text-slate-300">{story.verification_reason}</p>
      </div>
      <div className="mt-6 rounded-md border border-line bg-panel p-5 shadow-sm shadow-black/20">
        <h2 className="font-semibold text-white">{t.sourceLinks}</h2>
        <div className="mt-3 space-y-3">
          {sourceList.length ? sourceList.map((row, index) => (
            <a key={`${row.raw_articles?.url}-${index}`} href={row.raw_articles?.url ?? "#"} target="_blank" rel="noreferrer" className="block rounded-md border border-line bg-black/20 p-3 text-sm transition hover:border-electric hover:bg-white/5">
              <span className="text-white">{row.sources?.name ?? "Source"}</span>
              <span className="mx-2 text-slate-500">•</span>
              <span className="text-slate-300">{translatedSourceTitles[index] || row.raw_articles?.title}</span>
              <span className="mt-1 block break-all text-electric">{row.raw_articles?.url}</span>
            </a>
          )) : <p className="text-sm text-slate-400">{t.empty}</p>}
        </div>
      </div>
      <div className="mt-6 rounded-md border border-line bg-panel p-5 shadow-sm shadow-black/20">
        <h2 className="font-semibold text-white">{t.media}</h2>
        <div className="mt-3 space-y-2">
          {mediaRows?.length ? mediaRows.map((media) => (
            <a key={media.id} href={media.url} target="_blank" rel="noreferrer" className="block break-all rounded-md border border-line bg-black/20 p-3 text-sm text-electric transition hover:border-electric hover:bg-white/5">
              {media.media_type}: {media.url}
            </a>
          )) : <p className="text-sm text-slate-400">{t.empty}</p>}
        </div>
      </div>
    </section>
  );
}
