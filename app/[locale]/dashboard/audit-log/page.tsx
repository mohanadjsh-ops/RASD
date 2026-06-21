import { requireAdmin } from "@/lib/auth";
import { getMessages, isLocale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AuditLogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = isLocale(localeParam) ? localeParam : "ar";
  const t = await getMessages(locale);
  await requireAdmin(locale);
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100);

  return (
    <section>
      <h1 className="text-2xl font-semibold text-white">{t.auditLog}</h1>
      <div className="mt-5 rounded-md border border-line bg-panel">
        {data?.length ? data.map((log) => (
          <div key={log.id} className="grid gap-2 border-b border-line p-4 text-sm last:border-0 md:grid-cols-5">
            <span>{log.action}</span>
            <span>{log.user_id}</span>
            <span>{log.entity_type}</span>
            <span>{log.entity_id}</span>
            <span>{log.created_at}</span>
          </div>
        )) : <p className="p-6 text-slate-400">{t.empty}</p>}
      </div>
    </section>
  );
}
