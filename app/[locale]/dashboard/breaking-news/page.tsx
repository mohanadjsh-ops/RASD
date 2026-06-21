import Link from "next/link";
import { getMessages, isLocale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { demoStories } from "@/lib/demo-data";
import { StatusBadge } from "@/components/status-badge";

export default async function BreakingNewsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = isLocale(localeParam) ? localeParam : "ar";
  const t = await getMessages(locale);
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("story_clusters").select("*").order("last_seen_at", { ascending: false }).limit(50);
  const stories = data?.length ? data : demoStories;

  return (
    <section>
      <h1 className="text-2xl font-semibold text-white">{t.breakingNews}</h1>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <input className="rounded-md border border-line bg-panel px-3 py-2 text-sm" placeholder={t.search} />
        <select className="rounded-md border border-line bg-panel px-3 py-2 text-sm" aria-label={t.status}>
          <option>{t.status}</option>
          <option>monitoring</option>
          <option>confirmed</option>
          <option>high_confidence</option>
        </select>
        <input className="rounded-md border border-line bg-panel px-3 py-2 text-sm" placeholder={t.category} />
        <input className="rounded-md border border-line bg-panel px-3 py-2 text-sm" placeholder={t.language} />
      </div>
      <div className="mt-5 overflow-hidden rounded-md border border-line bg-panel">
        {stories.map((story) => (
          <Link key={story.id} href={`/${locale}/dashboard/story/${story.id}`} className="grid gap-3 border-b border-line p-4 last:border-0 md:grid-cols-[1fr_auto_auto]">
            <div>
              <h2 className="font-medium text-white">{story.main_title}</h2>
              <p className="mt-1 text-sm text-slate-400">{story.normalized_topic}</p>
            </div>
            <StatusBadge status={story.verification_status} />
            <div className="text-sm text-slate-300">{t.confidence}: {story.confidence_score}% · Sources: {story.source_count ?? 0}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
