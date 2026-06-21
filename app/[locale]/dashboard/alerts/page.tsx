import { getMessages, isLocale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export default async function AlertsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = isLocale(localeParam) ? localeParam : "ar";
  const t = await getMessages(locale);
  const session = await requireUser(locale);
  const isAdmin = session.profile?.role === "admin";
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("alerts").select("*").order("created_at", { ascending: false }).limit(50);

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-white">{t.alerts}</h1>
        {isAdmin ? <form action="/api/alerts/telegram/test" method="post"><button className="rounded-md bg-electric px-4 py-2 text-sm font-semibold text-white">{t.testTelegram}</button></form> : null}
      </div>
      <div className="mt-5 rounded-md border border-line bg-panel">
        {data?.length ? data.map((alert) => (
          <div key={alert.id} className="grid gap-2 border-b border-line p-4 text-sm last:border-0 md:grid-cols-5">
            <span>{alert.channel_type}</span>
            <span>{alert.status}</span>
            <span>{alert.sent_to}</span>
            <span>{alert.error_message}</span>
            <span>{alert.created_at}</span>
          </div>
        )) : <p className="p-6 text-slate-400">{t.empty}</p>}
      </div>
    </section>
  );
}
