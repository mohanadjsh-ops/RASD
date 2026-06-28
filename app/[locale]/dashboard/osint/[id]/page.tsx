import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { requireUser } from "@/lib/auth";
import { getOsintCaseBundle } from "@/lib/osint";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OsintCaseWorkbench } from "./osint-case-workbench";

export default async function OsintCasePage({
  params
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: localeParam, id } = await params;
  const locale = isLocale(localeParam) ? localeParam : "ar";
  const session = await requireUser(locale);
  const supabase = await createSupabaseServerClient();
  const bundle = await getOsintCaseBundle(id, supabase);
  if (!bundle) notFound();

  return (
    <OsintCaseWorkbench
      locale={locale}
      initialBundle={bundle}
      isAdmin={session.profile?.role === "admin"}
      approverName={session.profile?.full_name ?? session.profile?.email ?? "Rasd Admin"}
    />
  );
}
