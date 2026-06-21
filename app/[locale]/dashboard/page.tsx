import Link from "next/link";
import { RadioTower } from "lucide-react";
import { getMessages, isLocale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { demoStories } from "@/lib/demo-data";
import { StatusBadge } from "@/components/status-badge";

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = isLocale(localeParam) ? localeParam : "ar";
  const t = await getMessages(locale);
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("story_clusters")
    .select("*")
    .order("last_seen_at", { ascending: false })
    .limit(6);
  const stories = data?.length ? data : demoStories;

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">{t.overview}</h1>
          <p className="mt-1 text-sm text-slate-400">Source-based monitoring, transparent confidence scoring, private alerts.</p>
        </div>
        <Link href={`/${locale}/dashboard/newsroom-tool`} className="rounded-md bg-electric px-4 py-2 text-sm font-semibold text-white">
          {t.newsroomTool}
        </Link>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          [t.latestStories, stories.length],
          [t.highConfidence, stories.filter((s) => s.verification_status === "high_confidence").length],
          [t.monitoring, stories.filter((s) => s.verification_status === "monitoring").length]
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-md border border-line bg-panel p-5">
            <p className="text-sm text-slate-400">{label}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-md border border-line bg-panel">
        <div className="flex items-center gap-2 border-b border-line p-4">
          <RadioTower className="h-5 w-5 text-electric" aria-hidden />
          <h2 className="font-semibold text-white">{t.latestStories}</h2>
        </div>
        <div className="divide-y divide-line">
          {stories.map((story) => (
            <Link key={story.id} href={`/${locale}/dashboard/story/${story.id}`} className="block p-4 hover:bg-electric/5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-medium text-white">{story.main_title}</h3>
                <StatusBadge status={story.verification_status} />
              </div>
              <p className="mt-2 text-sm text-slate-400">{story.verification_reason} · Sources: {story.source_count ?? 0}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
