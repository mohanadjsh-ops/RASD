import { getMessages, isLocale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { demoStories } from "@/lib/demo-data";
import { LiveNewsClient } from "./live-news-client";
import type { LiveStory, VerificationStatus } from "@/types/app";

export default async function BreakingNewsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = isLocale(localeParam) ? localeParam : "ar";
  const t = await getMessages(locale);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("story_clusters")
    .select("*")
    .eq("translation_status", "ready")
    .in("verification_status", ["confirmed", "high_confidence"])
    .order("last_seen_at", { ascending: false })
    .limit(30);

  const sourceStories = !error && data?.length ? data : demoStories;
  const initialStories = sourceStories
    .filter((story) => story.translation_status === "ready" && (story.arabic_title || story.main_title))
    .map((story) => ({
      id: story.id,
      title: story.arabic_title ?? story.main_title,
      excerpt: story.arabic_excerpt ?? story.verification_reason,
      bullets: Array.isArray(story.arabic_bullets) ? story.arabic_bullets : [],
      status: story.verification_status as VerificationStatus,
      confidenceScore: story.confidence_score,
      sourceCount: story.source_count ?? 0,
      sourceName: story.primary_source_name ?? null,
      sourceUrl: story.primary_source_url ?? null,
      publishedAt: story.primary_published_at ?? story.first_seen_at,
      lastSeenAt: story.last_seen_at,
      imageUrl: null
    })) satisfies LiveStory[];

  return <LiveNewsClient locale={locale} labels={t} initialStories={initialStories} />;
}
