import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { serverEnv } from "@/lib/env";
import { writeAuditLog } from "@/lib/audit";
import { describeOpenAiError } from "@/lib/translation";

const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(6000)
      })
    )
    .min(1)
    .max(20)
});

export async function POST(request: Request) {
  const session = await requireUser("ar");
  const limited = rateLimit(`newsroom-chat:${session.user.id}`, 20, 60_000);
  if (!limited.ok) return NextResponse.json({ error: "طلبات كثيرة، حاول بعد قليل." }, { status: 429 });

  const payload = requestSchema.parse(await request.json());
  if (!serverEnv.OPENAI_API_KEY) {
    return NextResponse.json({ error: "مفتاح OpenAI API غير مفعّل على الخادم." }, { status: 503 });
  }

  try {
    const openai = new OpenAI({ apiKey: serverEnv.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "أنت مساعد تحرير داخل منصة رصد. أجب بالعربية الفصحى المهنية. ساعد في صياغة الأخبار، الترجمة، التدقيق، وتلخيص المصادر. لا تخترع معلومات، واذكر بوضوح عندما تحتاج إلى مصدر."
        },
        ...payload.messages
      ]
    });

    const reply = response.choices[0]?.message.content?.trim() || "لم يصل رد من النموذج. حاول مجددا.";
    await writeAuditLog({
      userId: session.user.id,
      action: "newsroom_chat",
      entityType: "openai_chat",
      metadata: { message_count: payload.messages.length }
    });
    return NextResponse.json({ reply });
  } catch (error) {
    const reason = describeOpenAiError(error);
    return NextResponse.json({ error: `تعذر الاتصال بخدمة OpenAI حاليا: ${reason}` }, { status: 502 });
  }
}
