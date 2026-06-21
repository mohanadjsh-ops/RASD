import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";
import { sendEmailDigest } from "@/lib/notifications/email-provider";

export const maxDuration = 60;

export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (!serverEnv.CRON_SECRET || secret !== serverEnv.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();
  const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const { data: settings, error: settingsError } = await supabase
    .from("user_settings")
    .select("user_id,alert_email,enable_email_alerts")
    .eq("enable_email_alerts", true)
    .not("alert_email", "is", null);

  if (settingsError) return NextResponse.json({ error: settingsError.message }, { status: 500 });

  const { data: stories, error: storiesError } = await supabase
    .from("story_clusters")
    .select("id,arabic_title,arabic_excerpt,primary_source_name,primary_source_url,primary_published_at,last_seen_at,importance_score")
    .eq("translation_status", "ready")
    .in("verification_status", ["confirmed", "high_confidence"])
    .gte("last_seen_at", since)
    .order("importance_score", { ascending: false })
    .order("last_seen_at", { ascending: false })
    .limit(12);

  if (storiesError) return NextResponse.json({ error: storiesError.message }, { status: 500 });

  const digestStories = (stories ?? []).filter((story) => story.arabic_title).map((story) => ({
    title: story.arabic_title ?? "خبر مؤكد من رصد",
    excerpt: story.arabic_excerpt,
    sourceName: story.primary_source_name,
    sourceUrl: story.primary_source_url,
    publishedAt: story.primary_published_at ?? story.last_seen_at,
    dashboardUrl: serverEnv.APP_BASE_URL ? `${serverEnv.APP_BASE_URL}/ar/dashboard/story/${story.id}` : undefined
  }));

  const periodLabel = `آخر 6 ساعات حتى ${new Intl.DateTimeFormat("ar-SA", {
    timeZone: "Asia/Riyadh",
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date())}`;

  let sent = 0;
  let failed = 0;
  for (const row of settings ?? []) {
    const email = row.alert_email as string | null;
    if (!email) continue;
    try {
      await sendEmailDigest({ to: email, stories: digestStories, periodLabel });
      sent += 1;
      await supabase.from("alerts").insert({
        channel_type: "email",
        sent_to: email,
        status: "sent",
        sent_at: new Date().toISOString()
      });
    } catch (error) {
      failed += 1;
      await supabase.from("alerts").insert({
        channel_type: "email",
        sent_to: email,
        status: "failed",
        error_message: error instanceof Error ? error.message : "Email digest failed"
      });
    }
  }

  return NextResponse.json({ sent, failed, storyCount: digestStories.length });
}
