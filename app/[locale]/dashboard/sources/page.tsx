import { requireUser } from "@/lib/auth";
import { getMessages, isLocale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { demoSources } from "@/lib/demo-data";
import { SourcesAdmin } from "./sources-admin";

export default async function SourcesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = isLocale(localeParam) ? localeParam : "ar";
  const t = await getMessages(locale);
  const session = await requireUser(locale);
  const isAdmin = session.profile?.role === "admin";
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("sources").select("*").order("name");
  const sources = data?.length ? data : demoSources;

  return <SourcesAdmin labels={t} initialSources={sources} isAdmin={isAdmin} />;
}
