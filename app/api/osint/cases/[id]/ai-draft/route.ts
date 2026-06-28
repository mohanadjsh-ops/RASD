import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requireUser } from "@/lib/auth";
import { serverEnv } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { getOsintCaseBundle } from "@/lib/osint";
import { describeOpenAiError } from "@/lib/translation";
import { writeAuditLog } from "@/lib/audit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser("ar");
  const limited = rateLimit(`osint-ai:${session.user.id}`, 6, 60_000);
  if (!limited.ok) return NextResponse.json({ error: "طلبات كثيرة، حاول بعد قليل." }, { status: 429 });
  if (!serverEnv.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI غير مفعل. جميع أدوات التحقيق الأساسية ما زالت تعمل بدونه." }, { status: 503 });
  }

  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const bundle = await getOsintCaseBundle(id, supabase);
  if (!bundle) return NextResponse.json({ error: "القضية غير موجودة." }, { status: 404 });

  try {
    const openai = new OpenAI({ apiKey: serverEnv.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "أنت مساعد صياغة لتحقيقات المصادر المفتوحة. اكتب بالعربية المهنية ولا تضف أي حقيقة غير موجودة. افصل بين الادعاء والدليل والاستنتاج والقيود. لا تصدر حكما نهائيا ولا تستخدم كلمات متحقق أو مضلل كقرار؛ الأدمن وحده يعتمد القرار."
        },
        {
          role: "user",
          content: JSON.stringify({
            case: {
              title: bundle.case.title,
              description: bundle.case.description,
              current_verdict: bundle.case.verdict,
              confidence_score: bundle.case.confidence_score,
              limitations: bundle.case.limitations
            },
            claims: bundle.claims.map((claim) => ({
              text: claim.claim_text,
              type: claim.claim_type,
              status: claim.status
            })),
            evidence: bundle.evidence.map((item) => ({
              title: item.title,
              type: item.evidence_type,
              sha256: item.sha256,
              source_url: item.source_url,
              notes: item.notes
            })),
            findings: bundle.findings.map((finding) => ({
              stage: finding.stage,
              title: finding.title,
              body: finding.body,
              stance: finding.stance,
              confidence: finding.confidence_score,
              source_url: finding.source_url
            })),
            instruction:
              "أنشئ مسودة تقرير تشمل: ملخص تنفيذي، الادعاءات، منهج التحقق، الأدلة المؤيدة، الأدلة المعارضة، ما لم يمكن إثباته، وخطوات التحقق التالية."
          })
        }
      ]
    });

    const draft = response.choices[0]?.message.content?.trim();
    if (!draft) return NextResponse.json({ error: "لم يصل رد من النموذج." }, { status: 502 });
    await writeAuditLog({
      userId: session.user.id,
      action: "osint_ai_draft",
      entityType: "osint_case",
      entityId: id,
      metadata: { text_only: true, saved: false }
    });
    return NextResponse.json({ draft });
  } catch (error) {
    return NextResponse.json({ error: `تعذر إعداد المسودة: ${describeOpenAiError(error)}` }, { status: 502 });
  }
}
