import "server-only";
import crypto from "node:crypto";
import Parser from "rss-parser";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";
import { sendTelegramAlert } from "@/lib/notifications/telegram-provider";
import {
  calculateImportanceScore,
  detectRegionTags,
  detectTopicTags,
  evaluateVerification,
  normalizeTopic,
  shouldSendTrustedAlert
} from "@/lib/verification";
import type { Source, SourceType, StoryCluster } from "@/types/app";

const parser = new Parser();

type IngestedArticle = {
  id: string;
  title: string;
  url: string;
};

type ClusterSourceRow = {
  source_id: string | null;
  raw_articles?: { title: string; url: string } | null;
  sources?: { source_type: SourceType; credibility_weight: number; name: string } | null;
};

export async function runRssIngestion() {
  const supabase = createSupabaseServiceClient();
  const { data: run } = await supabase.from("fetch_runs").insert({ status: "running" }).select().single();
  const { data: sources, error } = await supabase.from("sources").select("*").eq("enabled", true);
  if (error) throw error;

  const errors: Array<{ source: string; error: string }> = [];
  const results = [];

  for (const source of (sources ?? []) as Source[]) {
    try {
      results.push(await ingestSource(source));
    } catch (sourceError) {
      errors.push({ source: source.name, error: sourceError instanceof Error ? sourceError.message : "Unknown source failure" });
    }
  }

  const result = {
    sourceCount: sources?.length ?? 0,
    insertedArticles: results.reduce((sum, item) => sum + item.insertedArticles, 0),
    updatedClusters: results.reduce((sum, item) => sum + item.updatedClusters, 0),
    alertsSent: results.reduce((sum, item) => sum + item.alertsSent, 0),
    errors
  };

  if (run?.id) {
    await supabase
      .from("fetch_runs")
      .update({
        finished_at: new Date().toISOString(),
        source_count: result.sourceCount,
        inserted_articles: result.insertedArticles,
        updated_clusters: result.updatedClusters,
        alerts_sent: result.alertsSent,
        status: errors.length ? "partial" : "completed",
        error_message: errors[0]?.error ?? null,
        metadata: { errors }
      })
      .eq("id", run.id);
  }

  return result;
}

async function ingestSource(source: Source) {
  const supabase = createSupabaseServiceClient();
  const feed = await parser.parseURL(source.feed_url);
  let insertedArticles = 0;
  let updatedClusters = 0;
  let alertsSent = 0;

  for (const item of feed.items.slice(0, 30)) {
    const title = item.title?.trim() || "Untitled";
    const itemUrl = item.link?.trim();
    if (!itemUrl) continue;

    const rawContent = item.contentSnippet ?? item.content ?? "";
    const canonicalUrl = normalizeUrl(itemUrl);
    const contentHash = crypto.createHash("sha256").update(`${title}:${rawContent || canonicalUrl}`).digest("hex");
    const publishedAt = item.isoDate ?? item.pubDate ?? new Date().toISOString();
    const importanceScore = calculateImportanceScore(`${title} ${rawContent}`);
    const mediaLinks = [
      ...extractMediaFromFeedItem(item as Record<string, unknown>),
      ...(importanceScore >= 60 ? await fetchOpenGraphMedia(canonicalUrl) : [])
    ];

    const article = await upsertArticle({
      source,
      title,
      url: itemUrl,
      canonicalUrl,
      publishedAt,
      rawContent,
      contentHash,
      sourceItemId: item.guid ?? item.id ?? itemUrl
    });
    if (!article) continue;

    insertedArticles += 1;
    const cluster = await upsertCluster(article, source, rawContent, importanceScore);
    if (!cluster) continue;
    updatedClusters += 1;

    await supabase.from("cluster_sources").upsert(
      {
        cluster_id: cluster.id,
        article_id: article.id,
        source_id: source.id
      },
      { onConflict: "cluster_id,article_id" }
    );

    await saveMediaLinks(article.id, cluster.id, mediaLinks);
    const updatedCluster = await refreshClusterVerification(cluster.id);
    if (updatedCluster && (await maybeSendTrustedTelegramAlert(updatedCluster))) {
      alertsSent += 1;
    }
  }

  return { insertedArticles, updatedClusters, alertsSent };
}

async function upsertArticle(input: {
  source: Source;
  title: string;
  url: string;
  canonicalUrl: string;
  publishedAt: string;
  rawContent: string;
  contentHash: string;
  sourceItemId: string;
}): Promise<IngestedArticle | null> {
  const supabase = createSupabaseServiceClient();
  const existingByUrl = await supabase.from("raw_articles").select("id,title,url").eq("url", input.url).maybeSingle();
  const existing =
    existingByUrl.data ??
    (await supabase.from("raw_articles").select("id,title,url").eq("content_hash", input.contentHash).maybeSingle()).data;

  const payload = {
    source_id: input.source.id,
    title: input.title,
    url: input.url,
    canonical_url: input.canonicalUrl,
    source_item_id: input.sourceItemId,
    fetch_method: input.source.feed_url.includes("news.google.com") ? "google_news_rss" : "rss",
    published_at: input.publishedAt,
    raw_content: input.rawContent,
    excerpt: input.rawContent.slice(0, 400),
    language: input.source.language,
    detected_entities: {},
    content_hash: input.contentHash
  };

  if (existing?.id) {
    const { data } = await supabase.from("raw_articles").update(payload).eq("id", existing.id).select("id,title,url").single();
    return data;
  }

  const { data } = await supabase.from("raw_articles").insert(payload).select("id,title,url").single();
  return data;
}

async function upsertCluster(article: IngestedArticle, source: Source, rawContent: string, importanceScore: number) {
  const supabase = createSupabaseServiceClient();
  const topic = normalizeTopic(`${article.title} ${safeHostname(article.url)}`);
  const topicTags = detectTopicTags(`${article.title} ${rawContent}`);
  const regionTags = detectRegionTags(`${article.title} ${rawContent}`);
  const existingCluster = await findSimilarCluster(topic);
  const verification = evaluateVerification([{ source_type: source.source_type as SourceType, credibility_weight: source.credibility_weight }]);

  const payload = {
    main_title: article.title,
    normalized_topic: existingCluster?.normalized_topic ?? topic,
    category: source.category,
    importance_score: Math.max(existingCluster?.importance_score ?? 0, importanceScore),
    verification_status: verification.status,
    confidence_score: verification.confidenceScore,
    verification_reason: verification.reason,
    topic_tags: mergeTags(existingCluster?.topic_tags as string[] | null, topicTags),
    region_tags: mergeTags(existingCluster?.region_tags as string[] | null, regionTags),
    source_count: existingCluster?.source_count ?? 1,
    first_seen_at: existingCluster?.first_seen_at ?? new Date().toISOString(),
    last_seen_at: new Date().toISOString()
  };

  const { data } = existingCluster
    ? await supabase.from("story_clusters").update(payload).eq("id", existingCluster.id).select().single()
    : await supabase.from("story_clusters").insert(payload).select().single();
  return data as StoryCluster | null;
}

async function findSimilarCluster(topic: string) {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase.from("story_clusters").select("*").order("last_seen_at", { ascending: false }).limit(200);
  const candidates = (data ?? []) as StoryCluster[];
  return candidates.find((cluster) => similarity(topic, cluster.normalized_topic) >= 0.5) ?? null;
}

async function refreshClusterVerification(clusterId: string) {
  const supabase = createSupabaseServiceClient();
  const { data: rows } = await supabase
    .from("cluster_sources")
    .select("source_id, raw_articles(title,url), sources(source_type,credibility_weight,name)")
    .eq("cluster_id", clusterId);

  const clusterRows = (rows ?? []) as unknown as ClusterSourceRow[];
  const uniqueSources = new Map<string, { source_type: SourceType; credibility_weight: number; name: string }>();
  for (const row of clusterRows) {
    if (row.source_id && row.sources) uniqueSources.set(row.source_id, row.sources);
  }

  const sourceBasis = Array.from(uniqueSources.values()).map((source) => ({
    source_type: source.source_type,
    credibility_weight: source.credibility_weight
  }));
  const verification = evaluateVerification(sourceBasis);
  const { data: current } = await supabase.from("story_clusters").select("*").eq("id", clusterId).single();
  if (!current) return null;

  const { data } = await supabase
    .from("story_clusters")
    .update({
      verification_status: verification.status,
      confidence_score: verification.confidenceScore,
      verification_reason: verification.reason,
      source_count: uniqueSources.size,
      last_seen_at: new Date().toISOString()
    })
    .eq("id", clusterId)
    .select()
    .single();
  return data as StoryCluster | null;
}

async function maybeSendTrustedTelegramAlert(cluster: StoryCluster) {
  const supabase = createSupabaseServiceClient();
  const { data: sourceRows } = await supabase
    .from("cluster_sources")
    .select("raw_articles(url), sources(source_type)")
    .eq("cluster_id", cluster.id);
  const rows = (sourceRows ?? []) as unknown as Array<{
    raw_articles?: { url: string } | null;
    sources?: { source_type: SourceType } | null;
  }>;
  const sourceTypes = rows.map((row) => row.sources?.source_type).filter(Boolean) as SourceType[];

  if (
    !shouldSendTrustedAlert({
      importanceScore: cluster.importance_score,
      confidenceScore: cluster.confidence_score,
      sourceTypes,
      alertSentAt: cluster.alert_sent_at
    })
  ) {
    return false;
  }

  const sourceLinks = Array.from(new Set(rows.map((row) => row.raw_articles?.url).filter(Boolean) as string[]));
  const { data: mediaRows } = await supabase.from("media_links").select("url").eq("cluster_id", cluster.id).limit(10);
  const mediaLinks = Array.from(new Set((mediaRows ?? []).map((row) => row.url)));

  try {
    await sendTelegramAlert({
      headline: cluster.main_title,
      verificationStatus: cluster.verification_status,
      confidenceScore: cluster.confidence_score,
      verificationReason: cluster.verification_reason,
      sourceLinks,
      mediaLinks,
      firstSeenAt: cluster.first_seen_at,
      dashboardUrl: serverEnv.APP_BASE_URL ? `${serverEnv.APP_BASE_URL}/ar/dashboard/story/${cluster.id}` : undefined
    });

    await supabase.from("alerts").insert({
      cluster_id: cluster.id,
      channel_type: "telegram",
      sent_to: serverEnv.TELEGRAM_DEFAULT_CHAT_ID,
      status: "sent",
      sent_at: new Date().toISOString()
    });
    await supabase.from("story_clusters").update({ alert_sent_at: new Date().toISOString() }).eq("id", cluster.id);
    return true;
  } catch (error) {
    await supabase.from("alerts").insert({
      cluster_id: cluster.id,
      channel_type: "telegram",
      sent_to: serverEnv.TELEGRAM_DEFAULT_CHAT_ID,
      status: "failed",
      error_message: error instanceof Error ? error.message : "Telegram send failed"
    });
    return false;
  }
}

async function saveMediaLinks(articleId: string, clusterId: string, mediaLinks: Array<{ type: "image" | "video"; url: string; origin: string }>) {
  if (!mediaLinks.length) return;
  const supabase = createSupabaseServiceClient();
  const rows = mediaLinks.map((media) => ({
    article_id: articleId,
    cluster_id: clusterId,
    media_type: media.type,
    url: media.url,
    origin: media.origin
  }));
  await supabase.from("media_links").upsert(rows, { onConflict: "article_id,url" });
}

function extractMediaFromFeedItem(item: Record<string, unknown>) {
  const media: Array<{ type: "image" | "video"; url: string; origin: string }> = [];
  const enclosure = item.enclosure as { url?: string; type?: string } | undefined;
  if (enclosure?.url) media.push({ type: enclosure.type?.startsWith("video") ? "video" : "image", url: enclosure.url, origin: "rss" });

  const mediaContent = item["media:content"] as Array<{ $?: { url?: string; medium?: string; type?: string } }> | { $?: { url?: string; medium?: string; type?: string } } | undefined;
  const mediaItems = Array.isArray(mediaContent) ? mediaContent : mediaContent ? [mediaContent] : [];
  for (const entry of mediaItems) {
    const url = entry.$?.url;
    if (url) media.push({ type: entry.$?.medium === "video" || entry.$?.type?.startsWith("video") ? "video" : "image", url, origin: "rss" });
  }

  const thumbnail = item["media:thumbnail"] as Array<{ $?: { url?: string } }> | { $?: { url?: string } } | undefined;
  const thumbnailItems = Array.isArray(thumbnail) ? thumbnail : thumbnail ? [thumbnail] : [];
  for (const entry of thumbnailItems) {
    if (entry.$?.url) media.push({ type: "image", url: entry.$.url, origin: "rss" });
  }

  return dedupeMedia(media);
}

async function fetchOpenGraphMedia(url: string) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(url, { signal: controller.signal, headers: { "user-agent": "Rasd/1.0" } });
    clearTimeout(timer);
    if (!response.ok) return [];
    const html = await response.text();
    const media: Array<{ type: "image" | "video"; url: string; origin: string }> = [];
    for (const match of html.matchAll(/<meta[^>]+property=["']og:(image|video)["'][^>]+content=["']([^"']+)["'][^>]*>/gi)) {
      media.push({ type: match[1] === "video" ? "video" : "image", url: resolveUrl(match[2], url), origin: "open_graph" });
    }
    return dedupeMedia(media);
  } catch {
    return [];
  }
}

function normalizeUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url;
  }
}

function safeHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function resolveUrl(url: string, base: string) {
  try {
    return new URL(url, base).toString();
  } catch {
    return url;
  }
}

function mergeTags(existing: string[] | null | undefined, next: string[]) {
  return Array.from(new Set([...(existing ?? []), ...next]));
}

function similarity(left: string, right: string) {
  const leftWords = new Set(left.split(/\s+/).filter(Boolean));
  const rightWords = new Set(right.split(/\s+/).filter(Boolean));
  if (!leftWords.size || !rightWords.size) return 0;
  const intersection = Array.from(leftWords).filter((word) => rightWords.has(word)).length;
  return intersection / Math.max(leftWords.size, rightWords.size);
}

function dedupeMedia(media: Array<{ type: "image" | "video"; url: string; origin: string }>) {
  const seen = new Set<string>();
  return media.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}
