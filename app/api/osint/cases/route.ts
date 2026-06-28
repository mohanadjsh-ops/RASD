import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { addOsintEvent } from "@/lib/osint";
import { writeAuditLog } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

const createSchema = z.object({
  title: z.string().min(3).max(180),
  description: z.string().max(4000).optional().nullable(),
  claim: z.string().max(4000).optional().nullable(),
  input_type: z.enum(["image", "video", "url", "text", "mixed"]).default("mixed"),
  sensitive_material: z.boolean().default(false),
  public_interest_reason: z.string().max(2000).optional().nullable()
});

export async function GET() {
  await requireUser("ar");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("osint_cases")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cases: data ?? [] });
}

export async function POST(request: Request) {
  const session = await requireUser("ar");
  const limited = rateLimit(`osint-case-create:${session.user.id}`, 12, 60_000);
  if (!limited.ok) return NextResponse.json({ error: "طلبات كثيرة، حاول بعد قليل." }, { status: 429 });

  const payload = createSchema.parse(await request.json());
  if (payload.sensitive_material && !payload.public_interest_reason?.trim()) {
    return NextResponse.json({ error: "سجل سبب المصلحة العامة للمادة الحساسة." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: createdCase, error } = await supabase
    .from("osint_cases")
    .insert({
      title: payload.title,
      description: payload.description ?? null,
      input_type: payload.input_type,
      sensitive_material: payload.sensitive_material,
      public_interest_reason: payload.public_interest_reason ?? null,
      created_by: session.user.id
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (payload.claim?.trim()) {
    await supabase.from("osint_claims").insert({
      case_id: createdCase.id,
      claim_text: payload.claim.trim(),
      claim_type: "primary",
      created_by: session.user.id
    });
  }

  await addOsintEvent({
    caseId: createdCase.id,
    userId: session.user.id,
    action: "case_created",
    description: "تم إنشاء قضية تحقيق جديدة.",
    metadata: { input_type: payload.input_type, sensitive: payload.sensitive_material }
  }, supabase);
  await writeAuditLog({
    userId: session.user.id,
    action: "osint_case_create",
    entityType: "osint_case",
    entityId: createdCase.id
  });

  return NextResponse.json(createdCase);
}
