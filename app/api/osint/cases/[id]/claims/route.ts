import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { addOsintEvent } from "@/lib/osint";

const schema = z.object({
  claim_text: z.string().min(3).max(4000),
  claim_type: z.enum(["primary", "supporting", "context"]).default("supporting")
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser("ar");
  const { id } = await params;
  const payload = schema.parse(await request.json());
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("osint_claims")
    .insert({ ...payload, case_id: id, created_by: session.user.id })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await addOsintEvent({
    caseId: id,
    userId: session.user.id,
    action: "claim_added",
    description: "تمت إضافة ادعاء إلى التحقيق.",
    metadata: { claim_id: data.id, claim_type: data.claim_type }
  }, supabase);
  return NextResponse.json(data);
}
