import type { StoryCluster, Source } from "@/types/app";

export const demoStories: StoryCluster[] = [
  {
    id: "demo-1",
    main_title: "Official sources report a developing regional ceasefire agreement",
    arabic_title: "مصادر موثوقة تؤكد تطورات جديدة بشأن اتفاق إقليمي لوقف إطلاق النار",
    arabic_excerpt: "تتابع رصد تطورات الاتفاق الإقليمي مع تسجيل اهتمام سياسي واسع ومتابعة من مصادر موثوقة.",
    arabic_bullets: ["مصادر موثوقة تؤكد وجود تطورات جديدة.", "المتابعة مستمرة لرصد أي بيانات رسمية إضافية."],
    translation_status: "ready",
    normalized_topic: "regional ceasefire agreement",
    category: "politics",
    importance_score: 86,
    verification_status: "high_confidence",
    confidence_score: 91,
    verification_reason: "Major agency coverage is supported by an official source.",
    source_count: 3,
    topic_tags: ["ceasefire", "diplomacy"],
    region_tags: ["middle_east"],
    primary_source_name: "Reuters",
    primary_source_url: "https://www.reuters.com",
    primary_published_at: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    primary_article_id: null,
    alert_sent_at: null,
    first_seen_at: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    last_seen_at: new Date().toISOString()
  },
  {
    id: "demo-2",
    main_title: "Monitoring reports indicate an explosion near a government facility",
    arabic_title: "تقارير رصد تشير إلى انفجار قرب منشأة حكومية في المنطقة",
    arabic_excerpt: "تشير تقارير أولية إلى وقوع انفجار قرب منشأة حكومية، بينما تستمر المتابعة بانتظار معلومات إضافية.",
    arabic_bullets: ["المعلومات ما زالت أولية.", "لم يصدر تأكيد رسمي شامل حتى الآن."],
    translation_status: "ready",
    normalized_topic: "explosion near government facility",
    category: "security",
    importance_score: 78,
    verification_status: "monitoring",
    confidence_score: 54,
    verification_reason: "Only one monitoring source is available; official confirmation is required.",
    source_count: 1,
    topic_tags: ["security"],
    region_tags: ["middle_east"],
    primary_source_name: "Monitoring source",
    primary_source_url: "https://example.com",
    primary_published_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    primary_article_id: null,
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
