import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { addOsintEvent, getOsintCaseBundle, validateApproval } from "@/lib/osint";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  verdict: z.enum(["verified", "misleading"]),
  confidence_score: z.number().int().min(60).max(100),
  limitations: z.string().min(10).max(4000)
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin("ar");
  const { id } = await params;
  const payload = schema.parse(await request.json());
  const supabase = await createSupabaseServerClient();
  const current = await getOsintCaseBundle(id, supabase);
  if (!current) return NextResponse.json({ error: "القضية غير موجودة." }, { status: 404 });

  current.case.confidence_score = payload.confidence_score;
  current.case.limitations = payload.limitations;
  const errors = validateApproval(current);
  if (errors.length) return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("osint_cases")
    .update({
      verdict: payload.verdict,
      confidence_score: payload.confidence_score,
      limitations: payload.limitations,
      workflow_stage: "approval",
      approved_by: session.user.id,
      approved_at: now,
      updated_at: now
    })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await addOsintEvent({
    caseId: id,
    userId: session.user.id,
    action: "case_approved",
    description: payload.verdict === "verified" ? "اعتمد الأدمن القضية بوصفها متحققة." : "اعتمد الأدمن القضية بوصفها مضللة.",
    metadata: { verdict: payload.verdict, confidence_score: payload.confidence_score }
  }, supabase);
  await writeAuditLog({
    userId: session.user.id,
    action: "osint_case_approve",
    entityType: "osint_case",
    entityId: id,
    metadata: { verdict: payload.verdict, confidence_score: payload.confidence_score }
  });
  return NextResponse.json(data);
}
