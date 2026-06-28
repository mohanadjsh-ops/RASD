import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hashTelegramLinkCode, newTelegramLinkCode } from "@/lib/osint";
import { writeAuditLog } from "@/lib/audit";

export async function POST() {
  const session = await requireUser("ar");
  const code = newTelegramLinkCode();
  const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("osint_telegram_links").upsert(
    {
      user_id: session.user.id,
      link_code_hash: hashTelegramLinkCode(code),
      link_code_expires_at: expiresAt,
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await writeAuditLog({
    userId: session.user.id,
    action: "osint_telegram_link_requested",
    entityType: "osint_telegram_link",
    metadata: { expires_at: expiresAt }
  });
  return NextResponse.json({ code, expiresAt, command: `/start ${code}` });
}

export async function GET() {
  const session = await requireUser("ar");
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("osint_telegram_links")
    .select("chat_id,telegram_username,verified_at,active_case_id")
    .eq("user_id", session.user.id)
    .maybeSingle();
  return NextResponse.json({ link: data ?? null });
}
