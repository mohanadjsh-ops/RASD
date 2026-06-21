import Link from "next/link";
import { getMessages, isLocale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { demoStories } from "@/lib/demo-data";
import { StatusBadge } from "@/components/status-badge";
import { localizeStoryClusters } from "@/lib/translation";

export default async function BreakingNewsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = isLocale(localeParam) ? localeParam : "ar";
  const t = await getMessages(locale);
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("story_clusters").select("*").order("last_seen_at", { ascending: false }).limit(50);
  const stories = await localizeStoryClusters(data?.length ? data : demoStories, locale);

  return (
    <section>
      <h1 className="text-2xl font-semibold text-slate-950">{t.breakingNews}</h1>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <input className="rounded-md border border-line bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition hover:border-electric/60 focus:border-electric" placeholder={t.search} />
        <select className="rounded-md border border-line bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition hover:border-electric/60 focus:border-electric" aria-label={t.status}>
          <option>{t.status}</option>
          <option>{locale === "ar" ? "قيد الرصد" : "Monitoring"}</option>
          <option>{locale === "ar" ? "مؤكد" : "Confirmed"}</option>
          <option>{locale === "ar" ? "ثقة عالية" : "High confidence"}</option>
        </select>
        <input className="rounded-md border border-line bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition hover:border-electric/60 focus:border-electric" placeholder={t.category} />
        <input className="rounded-md border border-line bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition hover:border-electric/60 focus:border-electric" placeholder={t.language} />
      </div>
      <div className="mt-5 overflow-hidden rounded-md border border-line bg-panel shadow-sm shadow-slate-200">
        {stories.map((story) => (
          <Link key={story.id} href={`/${locale}/dashboard/story/${story.id}`} className="grid gap-3 border-b border-line p-4 transition last:border-0 hover:bg-navy md:grid-cols-[1fr_auto_auto]">
            <div>
              <h2 className="font-medium text-slate-950">{story.main_title}</h2>
              <p className="mt-1 text-sm text-slate-600">{story.normalized_topic}</p>
            </div>
            <StatusBadge status={story.verification_status} locale={locale} />
            <div className="text-sm text-slate-600">{t.confidence}: {story.confidence_score}% - {t.sourcesCount}: {story.source_count ?? 0}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
