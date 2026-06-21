import type { StoryCluster, Source } from "@/types/app";

export const demoStories: StoryCluster[] = [
  {
    id: "demo-1",
    main_title: "Official sources report a developing regional ceasefire agreement",
    normalized_topic: "regional ceasefire agreement",
    category: "politics",
    importance_score: 86,
    verification_status: "high_confidence",
    confidence_score: 91,
    verification_reason: "Major agency coverage is supported by an official source.",
    source_count: 3,
    topic_tags: ["ceasefire", "diplomacy"],
    region_tags: ["middle_east"],
    alert_sent_at: null,
    first_seen_at: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    last_seen_at: new Date().toISOString()
  },
  {
    id: "demo-2",
    main_title: "Monitoring reports indicate an explosion near a government facility",
    normalized_topic: "explosion near government facility",
    category: "security",
    importance_score: 78,
    verification_status: "monitoring",
    confidence_score: 54,
    verification_reason: "Only one monitoring source is available; official confirmation is required.",
    source_count: 1,
    topic_tags: ["security"],
    region_tags: ["middle_east"],
    alert_sent_at: null,
    first_seen_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    last_seen_at: new Date().toISOString()
  }
];

export const demoSources: Source[] = [
  {
    id: "source-1",
    name: "Reuters via Google News",
    url: "https://www.reuters.com",
    feed_url: "https://news.google.com/rss/search?q=site%3Areuters.com%20Middle%20East%20OR%20Russia%20OR%20US%20politics%20OR%20economy&hl=en-US&gl=US&ceid=US%3Aen",
    source_type: "major_agency",
    language: "en",
    country: "global",
    category: "general",
    credibility_weight: 90,
    enabled: true
  },
  {
    id: "source-2",
    name: "BBC Arabic",
    url: "https://www.bbc.com/arabic",
    feed_url: "https://feeds.bbci.co.uk/arabic/rss.xml",
    source_type: "trusted_media",
    language: "ar",
    country: "global",
    category: "general",
    credibility_weight: 82,
    enabled: true
  }
];
