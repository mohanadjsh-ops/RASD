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
        <h1 className="text-2xl font-semibold text-white">{t.sources}</h1>
        {isAdmin ? <button className="rounded-md bg-electric px-4 py-2 text-sm font-semibold text-black shadow-sm shadow-electric/20">{t.addSource}</button> : null}
      </div>
      <div className="mt-5 overflow-hidden rounded-md border border-line bg-panel shadow-sm shadow-black/20">
        {sources.map((source) => (
          <div key={source.id} className="grid gap-3 border-b border-line p-4 last:border-0 md:grid-cols-[1fr_auto_auto]">
            <div>
              <h2 className="font-medium text-white">{source.name}</h2>
              <p className="mt-1 text-sm text-slate-400">{source.feed_url}</p>
            </div>
            <span className="rounded-full border border-line bg-black/20 px-2.5 py-1 text-xs text-slate-300">{source.source_type}</span>
            <span className={source.enabled ? "text-verified" : "text-slate-500"}>{source.enabled ? t.enabled : t.disabled}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
