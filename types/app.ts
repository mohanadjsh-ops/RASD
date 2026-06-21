export type Locale = "ar" | "en";
export type Role = "admin" | "viewer";
export type VerificationStatus =
  | "unverified"
  | "monitoring"
  | "likely"
  | "confirmed"
  | "high_confidence";

export type SourceType = "official" | "major_agency" | "trusted_media" | "monitoring_only";

export type StoryCluster = {
  id: string;
  main_title: string;
  arabic_title: string | null;
  arabic_excerpt: string | null;
  arabic_bullets: string[] | null;
  translation_status: "pending" | "ready" | "failed";
  normalized_topic: string;
  category: string | null;
  importance_score: number;
  verification_status: VerificationStatus;
  confidence_score: number;
  verification_reason: string;
  source_count: number;
  topic_tags: string[] | null;
  region_tags: string[] | null;
  primary_source_name: string | null;
  primary_source_url: string | null;
  primary_published_at: string | null;
  primary_article_id: string | null;
  alert_sent_at: string | null;
  first_seen_at: string;
  last_seen_at: string;
};

export type Source = {
  id: string;
  name: string;
  url: string;
  feed_url: string;
  source_type: SourceType;
  language: string;
  country: string | null;
  category: string | null;
  credibility_weight: number;
  enabled: boolean;
};

export type MediaLink = {
  id: string;
  article_id: string | null;
  cluster_id: string | null;
  media_type: "image" | "video";
  url: string;
  origin: "rss" | "open_graph" | "content";
};

export type LiveStory = {
  id: string;
  title: string;
  excerpt: string | null;
  bullets: string[];
  status: VerificationStatus;
  confidenceScore: number;
  sourceCount: number;
  sourceName: string | null;
  sourceUrl: string | null;
  publishedAt: string;
  lastSeenAt: string;
  imageUrl: string | null;
};
