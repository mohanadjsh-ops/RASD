import Link from "next/link";
import { FileSearch, FileText, RadioTower } from "lucide-react";
import { getMessages, isLocale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { demoStories } from "@/lib/demo-data";
import { StatusBadge } from "@/components/status-badge";
import { localizeStoryClusters } from "@/lib/translation";

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = isLocale(localeParam) ? localeParam : "ar";
  const t = await getMessages(locale);
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("story_clusters")
    .select("*")
    .eq("translation_status", "ready")
    .order("last_seen_at", { ascending: false })
    .limit(6);
  const stories = await localizeStoryClusters(data?.length ? data : demoStories, locale);

  return (
    <section dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">{t.overview}</h1>
          <p className="mt-1 text-sm text-slate-600">{t.sourceBasedMonitoring}</p>
        </div>
        <Link href={`/${locale}/dashboard/breaking-news`} className="inline-flex items-center gap-2 rounded-md bg-urgent px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-200 transition hover:-translate-y-0.5 hover:bg-red-700">
          <RadioTower className="h-4 w-4" aria-hidden />
          {t.breakingNews}
        </Link>
        <Link href={`/${locale}/dashboard/newsroom-tool`} className="inline-flex items-center gap-2 rounded-md bg-electric px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-electric/25 transition hover:-translate-y-0.5 hover:bg-verified">
          <FileText className="h-4 w-4" aria-hidden />
          {t.openNewsroom}
        </Link>
        <Link href={`/${locale}/dashboard/osint`} className="inline-flex items-center gap-2 rounded-md border border-electric bg-white px-4 py-2 text-sm font-semibold text-verified transition hover:-translate-y-0.5 hover:bg-green-50">
          <FileSearch className="h-4 w-4" aria-hidden />
          {t.osintLab}
        </Link>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          [t.latestStories, stories.length],
          [t.confirmed, stories.filter((s) => ["confirmed", "high_confidence"].includes(s.verification_status)).length],
          [t.monitoring, stories.filter((s) => s.verification_status === "monitoring").length]
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-md border border-line bg-panel p-5 shadow-sm shadow-slate-200">
            <p className="text-sm text-slate-600">{label}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 overflow-hidden rounded-md border border-line bg-panel shadow-sm shadow-slate-200">
        <div className="flex items-center gap-2 border-b border-line p-4">
          <RadioTower className="h-5 w-5 text-electric" aria-hidden />
          <h2 className="font-semibold text-slate-950">{t.latestStories}</h2>
        </div>
        <div className="divide-y divide-line">
          {stories.map((story) => (
            <Link key={story.id} href={`/${locale}/dashboard/story/${story.id}`} className="block p-4 transition hover:bg-slate-50">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-medium text-slate-950">{locale === "ar" ? story.arabic_title ?? story.main_title : story.main_title}</h3>
                <StatusBadge status={story.verification_status} locale={locale} />
              </div>
              <p className="mt-2 text-sm text-slate-600">{story.verification_reason} - {t.sourcesCount}: {story.source_count ?? 0}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
