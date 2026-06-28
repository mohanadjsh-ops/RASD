import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { addOsintEvent } from "@/lib/osint";

const schema = z.object({
  evidence_type: z.enum(["image", "video", "frame", "url", "text", "document", "telegram_file"]),
  title: z.string().min(2).max(240),
  source_url: z.string().url().nullable().optional(),
  original_filename: z.string().max(260).nullable().optional(),
  mime_type: z.string().max(160).nullable().optional(),
  file_size: z.number().int().nonnegative().nullable().optional(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/i).nullable().optional(),
  metadata: z.record(z.unknown()).default({}),
  notes: z.string().max(4000).nullable().optional(),
  local_only: z.boolean().default(true)
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser("ar");
  const { id } = await params;
  const payload = schema.parse(await request.json());
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("osint_evidence")
    .insert({ ...payload, case_id: id, created_by: session.user.id })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await addOsintEvent({
    caseId: id,
    userId: session.user.id,
    action: "evidence_added",
    description: `تمت إضافة دليل: ${payload.title}.`,
    metadata: { evidence_id: data.id, local_only: payload.local_only, sha256: payload.sha256 }
  }, supabase);
  return NextResponse.json(data);
}
