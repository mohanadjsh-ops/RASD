import "server-only";
import OpenAI from "openai";
import type { Locale, StoryCluster } from "@/types/app";
import { serverEnv } from "@/lib/env";

type TranslatableStory = Pick<StoryCluster, "main_title" | "normalized_topic" | "verification_reason">;

export async function localizeStoryClusters<T extends TranslatableStory>(stories: T[], locale: Locale): Promise<T[]> {
  if (locale !== "ar" || !stories.length) return stories;

  const texts = stories.flatMap((story) => [story.main_title, story.normalized_topic, story.verification_reason]);
  const translated = await translateTextListToArabic(texts);
  let index = 0;

  return stories.map((story) => ({
    ...story,
    main_title: translated[index++] ?? story.main_title,
    normalized_topic: translated[index++] ?? story.normalized_topic,
    verification_reason: translated[index++] ?? story.verification_reason
  }));
}

export async function localizeStoryCluster<T extends TranslatableStory>(story: T, locale: Locale): Promise<T> {
  return (await localizeStoryClusters([story], locale))[0] ?? story;
}

export async function translateTextListToArabic(texts: string[]) {
  const translated = texts.map((text) => fallbackArabicText(text));
  const pending = texts
    .map((text, index) => ({ text, index }))
    .filter((item) => shouldTranslateToArabic(item.text));

  if (!pending.length || !serverEnv.OPENAI_API_KEY) return translated;

  try {
    const openai = new OpenAI({ apiKey: serverEnv.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Translate newsroom UI strings and news headlines into professional Arabic. Return JSON only as {\"translations\":[{\"index\":number,\"text\":\"Arabic translation\"}]}. Keep names of people, organizations, and places recognizable. Do not add facts."
        },
        {
          role: "user",
          content: JSON.stringify({
            items: pending.map((item) => ({ index: item.index, text: item.text }))
          })
        }
      ]
    });

    const parsed = JSON.parse(response.choices[0]?.message.content ?? "{}") as {
      translations?: Array<{ index: number; text: string }>;
    };

    for (const item of parsed.translations ?? []) {
      if (typeof item.index === "number" && item.text) translated[item.index] = item.text;
    }
  } catch (error) {
    console.warn("Arabic translation fallback used", describeOpenAiError(error));
  }

  return translated;
}

export function describeOpenAiError(error: unknown) {
  if (typeof error === "object" && error && "status" in error) {
    const typed = error as { status?: number; code?: string; type?: string; message?: string };
    return [typed.status, typed.code, typed.type].filter(Boolean).join(" ") || typed.message || "OpenAI request failed";
  }
  return error instanceof Error ? error.message : "OpenAI request failed";
}

function shouldTranslateToArabic(text: string) {
  if (!text.trim()) return false;
  const hasArabic = /[\u0600-\u06ff]/.test(text);
  const hasLatin = /[A-Za-z]{3,}/.test(text);
  return hasLatin && !hasArabic;
}

function fallbackArabicText(text: string) {
  const exact = fallbackDictionary[text.trim()];
  if (exact) return exact;
  return text;
}

const fallbackDictionary: Record<string, string> = {
  "Official sources report a developing regional ceasefire agreement": "مصادر رسمية تفيد بتطورات حول اتفاق إقليمي لوقف إطلاق النار",
  "regional ceasefire agreement": "اتفاق إقليمي لوقف إطلاق النار",
  "Major agency coverage is supported by an official source.": "تدعم تغطية وكالة كبرى هذه القصة مع وجود مصدر رسمي.",
  "Monitoring reports indicate an explosion near a government facility": "تقارير رصد تشير إلى انفجار قرب منشأة حكومية",
  "explosion near government facility": "انفجار قرب منشأة حكومية",
  "Only one monitoring source is available; official confirmation is required.": "يتوفر مصدر رصد واحد فقط، ولا يزال التأكيد الرسمي مطلوبا."
};
