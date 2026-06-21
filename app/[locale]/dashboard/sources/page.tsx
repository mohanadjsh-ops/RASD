import { requireUser } from "@/lib/auth";
import { getMessages, isLocale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { demoSources } from "@/lib/demo-data";

export default async function SourcesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = isLocale(localeParam) ? localeParam : "ar";
  const t = await getMessages(locale);
  const session = await requireUser(locale);
  const isAdmin = session.profile?.role === "admin";
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("sources").select("*").order("name");
  const sources = data?.length ? data : demoSources;

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-950">{t.sources}</h1>
        {isAdmin ? <button className="rounded-md bg-electric px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-electric/25 transition hover:-translate-y-0.5 hover:bg-verified">{t.addSource}</button> : null}
      </div>
      <div className="mt-5 overflow-hidden rounded-md border border-line bg-panel shadow-sm shadow-slate-200">
        {sources.map((source) => (
          <div key={source.id} className="grid gap-3 border-b border-line p-4 last:border-0 md:grid-cols-[1fr_auto_auto]">
            <div>
              <h2 className="font-medium text-slate-950">{source.name}</h2>
              <p className="mt-1 break-all text-sm text-slate-600">{source.feed_url}</p>
            </div>
            <span className="rounded-full border border-line bg-navy px-2.5 py-1 text-xs text-slate-600">{source.source_type}</span>
            <span className={source.enabled ? "text-verified" : "text-slate-500"}>{source.enabled ? t.enabled : t.disabled}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
