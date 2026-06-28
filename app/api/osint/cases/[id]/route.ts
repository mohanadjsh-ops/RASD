import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { addOsintEvent, getOsintCaseBundle } from "@/lib/osint";
import { writeAuditLog } from "@/lib/audit";

const patchSchema = z.object({
  title: z.string().min(3).max(180).optional(),
  description: z.string().max(4000).nullable().optional(),
  workflow_stage: z
    .enum(["planning", "preservation", "source", "content", "geotime", "specialist", "review", "approval"])
    .optional(),
  verdict: z.enum(["inconclusive", "needs_evidence", "likely"]).optional(),
  confidence_score: z.number().int().min(0).max(100).optional(),
  sensitive_material: z.boolean().optional(),
  public_interest_reason: z.string().max(2000).nullable().optional(),
  limitations: z.string().max(4000).nullable().optional(),
  ai_enabled: z.boolean().optional()
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser("ar");
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const bundle = await getOsintCaseBundle(id, supabase);
  if (!bundle) return NextResponse.json({ error: "القضية غير موجودة." }, { status: 404 });
  return NextResponse.json(bundle);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser("ar");
  const { id } = await params;
  const payload = patchSchema.parse(await request.json());
  if (payload.sensitive_material && payload.public_interest_reason === null) {
    return NextResponse.json({ error: "المادة الحساسة تحتاج إلى سبب مصلحة عامة." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("osint_cases")
    .update({ ...payload, approved_by: null, approved_at: null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await addOsintEvent({
    caseId: id,
    userId: session.user.id,
    action: payload.workflow_stage ? "stage_changed" : "case_updated",
    description: payload.workflow_stage ? `تم نقل التحقيق إلى مرحلة ${payload.workflow_stage}.` : "تم تحديث بيانات القضية.",
    metadata: payload
  }, supabase);
  await writeAuditLog({
    userId: session.user.id,
    action: "osint_case_update",
    entityType: "osint_case",
    entityId: id,
    metadata: payload
  });
  return NextResponse.json(data);
}
