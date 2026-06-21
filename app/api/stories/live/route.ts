import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { LiveStory, VerificationStatus } from "@/types/app";

const allowedStatuses = new Set(["confirmed", "high_confidence", "monitoring", "likely", "unverified"]);

export async function GET(request: NextRequest) {
  await requireUser("ar");
  const supabase = createSupabaseServiceClient();
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get("q")?.trim();
  const status = searchParams.get("status")?.trim();
  const since = searchParams.get("since")?.trim();

  let query = supabase
    .from("story_clusters")
    .select(
      "id,main_title,arabic_title,arabic_excerpt,arabic_bullets,translation_status,verification_status,confidence_score,source_count,primary_source_name,primary_source_url,primary_published_at,last_seen_at"
    )
    .eq("translation_status", "ready")
    .in("verification_status", ["confirmed", "high_confidence"])
    .order("last_seen_at", { ascending: false })
    .limit(60);

  if (status && allowedStatuses.has(status)) query = query.eq("verification_status", status);
  if (since) query = query.gt("last_seen_at", since);
  if (q) {
    const safe = q.replace(/[%_]/g, "");
    query = query.or(`arabic_title.ilike.%${safe}%,main_title.ilike.%${safe}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const ids = rows.map((row) => String(row.id));
  const mediaByCluster = new Map<string, string>();

  if (ids.length) {
    const { data: mediaRows } = await supabase
      .from("media_links")
      .select("cluster_id,url,media_type")
      .in("cluster_id", ids)
      .eq("media_type", "image")
      .limit(ids.length * 3);

    for (const media of mediaRows ?? []) {
      const clusterId = media.cluster_id as string | null;
      if (clusterId && !mediaByCluster.has(clusterId)) mediaByCluster.set(clusterId, media.url as string);
    }
  }

  const stories: LiveStory[] = rows
    .filter((row) => row.arabic_title)
    .map((row) => ({
      id: String(row.id),
      title: String(row.arabic_title ?? row.main_title),
      excerpt: typeof row.arabic_excerpt === "string" ? row.arabic_excerpt : null,
      bullets: Array.isArray(row.arabic_bullets) ? row.arabic_bullets.map(String).filter(Boolean).slice(0, 3) : [],
      status: row.verification_status as VerificationStatus,
      confidenceScore: Number(row.confidence_score ?? 0),
      sourceCount: Number(row.source_count ?? 0),
      sourceName: typeof row.primary_source_name === "string" ? row.primary_source_name : null,
      sourceUrl: typeof row.primary_source_url === "string" ? row.primary_source_url : null,
      publishedAt: String(row.primary_published_at ?? row.last_seen_at),
      lastSeenAt: String(row.last_seen_at),
      imageUrl: mediaByCluster.get(String(row.id)) ?? null
    }));

  return NextResponse.json({
    stories,
    latestSeenAt: stories[0]?.lastSeenAt ?? null,
    count: stories.length
  });
}
