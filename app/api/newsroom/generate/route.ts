import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { serverEnv } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit";
import { findSupportingSources } from "@/lib/newsroom-sourcing";
import { describeOpenAiError } from "@/lib/translation";

const requestSchema = z.object({
  text: z.string().min(20),
  sourceLinks: z.array(z.string()).default([]),
  category: z.string().optional()
});

type NewsroomOutput = {
  headline_12_words: string;
  lead_line: string;
  summary: string;
  caption: string;
  key_points: string[];
  verification_note: string;
  risk_flags: string[];
  source_links: string[];
};

const fallbackOutput: NewsroomOutput = {
  headline_12_words: "تقرير إخباري يحتاج تحققا إضافيا قبل اعتماده للنشر التحريري النهائي اليوم بدقة",
  lead_line: "رصد: المعلومات المتاحة تحتاج إلى مطابقة أوضح مع مصادر منشورة قبل اعتمادها.",
  summary:
    "يعرض النص معطيات أولية تحتاج إلى مراجعة مصادرها وربطها بسياق واضح قبل النشر. ينبغي التأكد من الروابط الأصلية وتحديد الجهة المسؤولة عن المعلومات وتجنب أي صياغة توحي بتأكيد غير مدعوم.",
  caption:
    "تتابع رصد المعطيات الواردة في النص مع التشديد على ضرورة التحقق من المصادر قبل اعتمادها. لا تقدم هذه الصياغة حكما نهائيا، بل تلخص المعلومات المتاحة وتبرز الحاجة إلى تأكيد مستقل.",
  key_points: ["المعلومات تحتاج إلى تحقق إضافي", "ينبغي مراجعة روابط المصادر", "الصياغة تتجنب الادعاءات غير المدعومة"],
  verification_note: "لم يتوفر مفتاح OpenAI API أو لم تتوفر مصادر كافية، لذلك تم إنتاج صياغة احتياطية محافظة.",
  risk_flags: ["غياب تحقق مستقل", "احتمال نقص روابط المصادر"],
  source_links: []
};

export async function POST(request: Request) {
  try {
    const session = await requireUser("ar");
    const limited = rateLimit(`newsroom:${session.user.id}`, 10, 60_000);
    if (!limited.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const payload = requestSchema.parse(await request.json());
    const supportingSources = await findSupportingSources(payload.text, payload.sourceLinks);
    let output: NewsroomOutput = { ...fallbackOutput, source_links: supportingSources.map((source) => source.url) };

    if (serverEnv.OPENAI_API_KEY) {
      try {
        const openai = new OpenAI({ apiKey: serverEnv.OPENAI_API_KEY });
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You are Rasd's Arabic newsroom editor. Return strict JSON only. Use a professional Arabic newsroom tone. Do not invent facts. Headline must be exactly 12 Arabic words. The lead_line must be formatted as '[person or institution]: main statement'. Summary and caption must each be concise, neutral, and suitable for newsroom/social publishing. Mention when verification is incomplete."
            },
            {
              role: "user",
              content: JSON.stringify({
                required_schema: {
                  headline_12_words: "string",
                  lead_line: "string",
                  summary: "string",
                  caption: "string",
                  key_points: ["string"],
                  verification_note: "string",
                  risk_flags: ["string"],
                  source_links: ["string"]
                },
                reference_format: {
                  headline: "العنوان من 12 كلمة",
                  lead_line: "قال/أعلنت الجهة: التصريح الرئيسي",
                  summary: "الملخص",
                  caption: "الكابشن"
                },
                text: payload.text,
                category: payload.category,
                supporting_sources: supportingSources
              })
            }
          ]
        });
        output = normalizeNewsroomOutput(JSON.parse(response.choices[0]?.message.content ?? JSON.stringify(output)), supportingSources.map((source) => source.url));
      } catch (error) {
        const reason = describeOpenAiError(error);
        console.warn("Newsroom OpenAI fallback used", reason);
        output = {
          ...output,
          verification_note:
            reason.includes("429") || reason.includes("insufficient_quota")
              ? "تعذر استخدام OpenAI لأن حساب API تجاوز الحصة أو يحتاج إلى تفعيل رصيد/فوترة. تم عرض صياغة احتياطية محافظة إلى حين تحديث الفوترة."
              : `تعذر استخدام OpenAI حاليا (${reason}). تم عرض صياغة احتياطية محافظة.`
        };
      }
    }

    const supabase = createSupabaseServiceClient();
    const { error: summaryError } = await supabase.from("summaries").insert({
      input_text: payload.text,
      input_language: "auto",
      output_language: "ar",
      headline_12_words: output.headline_12_words,
      lead_line: output.lead_line,
      summary_35_45_words: output.summary,
      social_caption_35_45_words: output.caption,
      key_points: output.key_points,
      source_links: output.source_links,
      verification_note: output.verification_note,
      risk_flags: output.risk_flags,
      created_by: session.user.id
    });
    if (summaryError) console.warn("Newsroom summary save failed", summaryError.message);

    await writeAuditLog({
      userId: session.user.id,
      action: "newsroom_summary_generation",
      entityType: "summary",
      metadata: { source_count: output.source_links.length, saved: !summaryError }
    });

    return NextResponse.json(output);
  } catch (error) {
    console.error("Newsroom generation failed", error);
    return NextResponse.json({ error: "تعذر توليد الإسناد التحريري حاليا. يرجى المحاولة لاحقا." }, { status: 500 });
  }
}

function normalizeNewsroomOutput(raw: Partial<NewsroomOutput>, sourceLinks: string[]): NewsroomOutput {
  return {
    headline_12_words: coerceHeadline(raw.headline_12_words ?? fallbackOutput.headline_12_words),
    lead_line: raw.lead_line ?? fallbackOutput.lead_line,
    summary: raw.summary ?? fallbackOutput.summary,
    caption: raw.caption ?? fallbackOutput.caption,
    key_points: Array.isArray(raw.key_points) ? raw.key_points : fallbackOutput.key_points,
    verification_note: raw.verification_note ?? fallbackOutput.verification_note,
    risk_flags: Array.isArray(raw.risk_flags) ? raw.risk_flags : fallbackOutput.risk_flags,
    source_links: Array.from(new Set([...(raw.source_links ?? []), ...sourceLinks]))
  };
}

function coerceHeadline(headline: string) {
  const words = headline.trim().split(/\s+/).filter(Boolean);
  if (words.length === 12) return words.join(" ");
  if (words.length > 12) return words.slice(0, 12).join(" ");
  return [...words, ..."وفق المصادر المتاحة الآن".split(/\s+/)].slice(0, 12).join(" ");
}
