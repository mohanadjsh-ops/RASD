import type { SourceType, VerificationStatus } from "@/types/app";

export const englishBreakingKeywords = [
  "breaking",
  "urgent",
  "developing",
  "confirmed",
  "official statement",
  "attack",
  "explosion",
  "earthquake",
  "president",
  "government",
  "war",
  "ceasefire",
  "death",
  "sanctions",
  "military",
  "airstrike",
  "missile",
  "nuclear",
  "election",
  "resignation",
  "oil",
  "markets",
  "central bank"
];

export const arabicBreakingKeywords = [
  "عاجل",
  "طارئ",
  "تطور",
  "بيان رسمي",
  "هجوم",
  "انفجار",
  "زلزال",
  "حرب",
  "وقف إطلاق النار",
  "وفاة",
  "اغتيال",
  "عقوبات",
  "عسكري",
  "قصف",
  "صاروخ",
  "نووي",
  "انتخابات",
  "استقالة",
  "الشرق الأوسط",
  "واشنطن",
  "موسكو",
  "الاقتصاد"
];

const regionRules = [
  { tag: "middle_east", words: ["middle east", "gaza", "israel", "iran", "lebanon", "syria", "iraq", "yemen", "الخليج", "غزة", "إسرائيل", "إيران", "لبنان", "سوريا", "العراق", "اليمن"] },
  { tag: "us_politics", words: ["white house", "congress", "trump", "biden", "washington", "senate", "البيت الأبيض", "واشنطن", "الكونغرس", "ترامب"] },
  { tag: "russia", words: ["russia", "moscow", "putin", "kremlin", "ukraine", "روسيا", "موسكو", "بوتين", "الكرملين", "أوكرانيا"] },
  { tag: "economy", words: ["economy", "markets", "oil", "gas", "sanctions", "inflation", "central bank", "الاقتصاد", "الأسواق", "النفط", "الغاز", "العقوبات", "التضخم", "البنك المركزي"] }
];

const topicRules = [
  { tag: "war", words: ["war", "attack", "airstrike", "missile", "military", "حرب", "هجوم", "قصف", "صاروخ", "عسكري"] },
  { tag: "diplomacy", words: ["ceasefire", "talks", "agreement", "official statement", "وقف إطلاق النار", "محادثات", "اتفاق", "بيان رسمي"] },
  { tag: "politics", words: ["president", "government", "election", "resignation", "الرئيس", "الحكومة", "انتخابات", "استقالة"] },
  { tag: "economy", words: ["economy", "oil", "markets", "sanctions", "الاقتصاد", "النفط", "الأسواق", "عقوبات"] }
];

export function calculateImportanceScore(text: string) {
  const lower = text.toLowerCase();
  const keywordHits = englishBreakingKeywords.filter((keyword) => lower.includes(keyword)).length + arabicBreakingKeywords.filter((keyword) => text.includes(keyword)).length;
  const regionHits = detectRegionTags(text).length;
  return Math.min(100, 30 + keywordHits * 10 + regionHits * 8);
}

export function detectRegionTags(text: string) {
  return detectTags(text, regionRules);
}

export function detectTopicTags(text: string) {
  return detectTags(text, topicRules);
}

function detectTags(text: string, rules: Array<{ tag: string; words: string[] }>) {
  const lower = text.toLowerCase();
  return rules.filter((rule) => rule.words.some((word) => lower.includes(word.toLowerCase()))).map((rule) => rule.tag);
}

export function evaluateVerification(sources: Array<{ source_type: SourceType; credibility_weight: number }>): {
  status: VerificationStatus;
  confidenceScore: number;
  reason: string;
} {
  const sourceCount = sources.length;
  const hasOfficial = sources.some((source) => source.source_type === "official");
  const hasMajorAgency = sources.some((source) => source.source_type === "major_agency");
  const trustedCount = sources.filter((source) => ["official", "major_agency", "trusted_media"].includes(source.source_type)).length;
  const monitoringOnly = sourceCount > 0 && sources.every((source) => source.source_type === "monitoring_only");
  const weightAverage = sourceCount
    ? Math.round(sources.reduce((sum, source) => sum + source.credibility_weight, 0) / sourceCount)
    : 20;

  if (sourceCount === 0) {
    return { status: "unverified", confidenceScore: 10, reason: "No source basis has been attached yet." };
  }
  if (monitoringOnly) {
    return {
      status: "monitoring",
      confidenceScore: Math.min(45, weightAverage),
      reason: "Only monitoring-only sources are available; no confirmed alert should be sent."
    };
  }
  if (hasOfficial && hasMajorAgency) {
    return {
      status: "high_confidence",
      confidenceScore: Math.min(95, weightAverage + 12),
      reason: "A major agency source is supported by an official source."
    };
  }
  if (trustedCount >= 2) {
    return {
      status: "confirmed",
      confidenceScore: Math.min(90, weightAverage + 8),
      reason: "Two or more trusted sources report the same story."
    };
  }
  if (hasOfficial || trustedCount === 1) {
    return {
      status: "likely",
      confidenceScore: Math.min(76, weightAverage),
      reason: "One trusted or official source is available; continued monitoring is required before alerting."
    };
  }
  return {
    status: "monitoring",
    confidenceScore: Math.min(55, weightAverage),
    reason: "The source basis is limited and remains under monitoring."
  };
}

export function shouldSendTrustedAlert(input: {
  importanceScore: number;
  confidenceScore: number;
  sourceTypes: SourceType[];
  alertSentAt?: string | null;
}) {
  if (input.alertSentAt) return false;
  if (input.importanceScore < 75 || input.confidenceScore < 80) return false;

  const trustedCount = input.sourceTypes.filter((type) => ["official", "major_agency", "trusted_media"].includes(type)).length;
  const hasOfficial = input.sourceTypes.includes("official");
  const hasMajorAgency = input.sourceTypes.includes("major_agency");
  return trustedCount >= 2 || (hasOfficial && hasMajorAgency);
}

export function normalizeTopic(title: string) {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 8)
    .join(" ");
}
