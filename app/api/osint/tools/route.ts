import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  name: z.string().min(2).max(160),
  category: z.string().min(2).max(80),
  url: z.string().url(),
  execution_mode: z.enum(["automatic", "manual"]),
  access_model: z.enum(["free", "account_required"]),
  instructions_ar: z.string().max(2000).default(""),
  enabled: z.boolean().default(true)
});

export async function GET() {
  await requireUser("ar");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("osint_tools").select("*").order("category").order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tools: data ?? [] });
}

export async function POST(request: Request) {
  const session = await requireAdmin("ar");
  const payload = schema.parse(await request.json());
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("osint_tools")
    .insert({ ...payload, last_verified_at: new Date().toISOString() })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await writeAuditLog({
    userId: session.user.id,
    action: "osint_tool_create",
    entityType: "osint_tool",
    entityId: data.id
  });
  return NextResponse.json(data);
}
