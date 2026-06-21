import "server-only";
import Parser from "rss-parser";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const parser = new Parser();

export type NewsroomSourceCandidate = {
  title: string;
  url: string;
  source: string;
  publishedAt?: string;
};

export async function findSupportingSources(inputText: string, providedLinks: string[]) {
  const [monitored, googleNews] = await Promise.all([
    findMonitoredSources(inputText),
    findGoogleNewsSources(inputText)
  ]);

  const provided = providedLinks.map((url) => ({
    title: "Provided source link",
    url,
    source: safeHostname(url)
  }));

  return dedupeSources([...provided, ...monitored, ...googleNews]).slice(0, 12);
}

async function findMonitoredSources(inputText: string) {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("raw_articles")
    .select("title,url,published_at,sources(name)")
    .order("created_at", { ascending: false })
    .limit(200);

  const normalized = normalizeForMatch(inputText);
  return ((data ?? []) as unknown as Array<{ title: string; url: string; published_at?: string; sources?: { name: string } | null }>)
    .map((article) => ({
      article,
      score: overlapScore(normalized, normalizeForMatch(article.title))
    }))
    .filter((item) => item.score >= 0.18)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ article }) => ({
      title: article.title,
      url: article.url,
      source: article.sources?.name ?? safeHostname(article.url),
      publishedAt: article.published_at
    }));
}

async function findGoogleNewsSources(inputText: string) {
  const terms = extractSearchTerms(inputText);
  if (!terms.length) return [];
  const query = encodeURIComponent(`${terms.join(" ")} source:reuters OR source:bbc OR source:aljazeera OR source:cnn OR source:guardian`);
  const url = `https://news.google.com/rss/search?q=${query}&hl=ar&gl=AE&ceid=AE:ar`;

  try {
    const feed = await parser.parseURL(url);
    return feed.items.slice(0, 8).map((item) => ({
      title: item.title ?? "Google News source",
      url: item.link ?? url,
      source: "Google News",
      publishedAt: item.isoDate ?? item.pubDate
    }));
  } catch {
    return [];
  }
}

function extractSearchTerms(text: string) {
  return normalizeForMatch(text)
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 8);
}

function normalizeForMatch(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => !stopWords.has(word))
    .join(" ");
}

function overlapScore(left: string, right: string) {
  const leftWords = new Set(left.split(/\s+/).filter(Boolean));
  const rightWords = new Set(right.split(/\s+/).filter(Boolean));
  if (!leftWords.size || !rightWords.size) return 0;
  const intersection = Array.from(leftWords).filter((word) => rightWords.has(word)).length;
  return intersection / Math.min(leftWords.size, rightWords.size);
}

function dedupeSources(sources: NewsroomSourceCandidate[]) {
  const seen = new Set<string>();
  return sources.filter((source) => {
    if (!source.url || seen.has(source.url)) return false;
    seen.add(source.url);
    return true;
  });
}

function safeHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return "source";
  }
}

const stopWords = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "هذا",
  "هذه",
  "ذلك",
  "التي",
  "الذي",
  "على",
  "إلى",
  "عن",
  "من",
  "في",
  "أن",
  "قال",
  "أفاد"
]);
