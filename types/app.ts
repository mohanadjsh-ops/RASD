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

export type OsintStage =
  | "planning"
  | "preservation"
  | "source"
  | "content"
  | "geotime"
  | "specialist"
  | "review"
  | "approval";

export type OsintVerdict =
  | "inconclusive"
  | "needs_evidence"
  | "likely"
  | "verified"
  | "misleading";

export type OsintCase = {
  id: string;
  title: string;
  description: string | null;
  input_type: "image" | "video" | "url" | "text" | "mixed";
  workflow_stage: OsintStage;
  verdict: OsintVerdict;
  confidence_score: number;
  sensitive_material: boolean;
  public_interest_reason: string | null;
  limitations: string | null;
  ai_enabled: boolean;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OsintClaim = {
  id: string;
  case_id: string;
  claim_text: string;
  claim_type: "primary" | "supporting" | "context";
  status: "open" | "supported" | "contradicted" | "unresolved";
  created_by: string | null;
  created_at: string;
};

export type OsintEvidence = {
  id: string;
  case_id: string;
  evidence_type: "image" | "video" | "frame" | "url" | "text" | "document" | "telegram_file";
  title: string;
  source_url: string | null;
  original_filename: string | null;
  mime_type: string | null;
  file_size: number | null;
  sha256: string | null;
  metadata: Record<string, unknown>;
  notes: string | null;
  local_only: boolean;
  telegram_object_path: string | null;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
};

export type OsintFinding = {
  id: string;
  case_id: string;
  evidence_id: string | null;
  tool_id: string | null;
  stage: OsintStage;
  title: string;
  body: string;
  stance: "supporting" | "opposing" | "neutral";
  confidence_score: number;
  source_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type OsintCaseEvent = {
  id: string;
  case_id: string;
  action: string;
  description: string;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
};

export type OsintTool = {
  id: string;
  name: string;
  category: string;
  url: string;
  execution_mode: "automatic" | "manual";
  access_model: "free" | "account_required";
  instructions_ar: string;
  enabled: boolean;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OsintCaseBundle = {
  case: OsintCase;
  claims: OsintClaim[];
  evidence: OsintEvidence[];
  findings: OsintFinding[];
  events: OsintCaseEvent[];
  tools: OsintTool[];
};
