import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { addOsintEvent } from "@/lib/osint";

const schema = z.object({
  evidence_id: z.string().uuid().nullable().optional(),
  tool_id: z.string().uuid().nullable().optional(),
  stage: z.enum(["planning", "preservation", "source", "content", "geotime", "specialist", "review", "approval"]),
  title: z.string().min(2).max(240),
  body: z.string().min(3).max(8000),
  stance: z.enum(["supporting", "opposing", "neutral"]).default("neutral"),
  confidence_score: z.number().int().min(0).max(100).default(0),
  source_url: z.string().url().nullable().optional()
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser("ar");
  const { id } = await params;
  const payload = schema.parse(await request.json());
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("osint_findings")
    .insert({ ...payload, case_id: id, created_by: session.user.id })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await addOsintEvent({
    caseId: id,
    userId: session.user.id,
    action: "finding_added",
    description: `تم تسجيل نتيجة في مرحلة ${payload.stage}: ${payload.title}.`,
    metadata: { finding_id: data.id, stance: payload.stance, confidence_score: payload.confidence_score }
  }, supabase);
  return NextResponse.json(data);
}
