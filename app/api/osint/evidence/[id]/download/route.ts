import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser("ar");
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: evidence } = await supabase
    .from("osint_evidence")
    .select("telegram_object_path,expires_at")
    .eq("id", id)
    .maybeSingle();
  if (!evidence?.telegram_object_path) {
    return NextResponse.json({ error: "الملف المؤقت غير متاح." }, { status: 404 });
  }
  if (evidence.expires_at && new Date(evidence.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "انتهت مدة الملف المؤقت." }, { status: 410 });
  }

  const { data, error } = await supabase.storage
    .from("osint-temp")
    .createSignedUrl(evidence.telegram_object_path, 300, { download: true });
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message ?? "تعذر إنشاء رابط التنزيل." }, { status: 500 });
  }
  return NextResponse.redirect(data.signedUrl);
}
