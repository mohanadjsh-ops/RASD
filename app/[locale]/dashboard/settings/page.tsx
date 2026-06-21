import { getMessages, isLocale } from "@/lib/i18n";

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = isLocale(localeParam) ? localeParam : "ar";
  const t = await getMessages(locale);

  return (
    <section className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-white">{t.settings}</h1>
      <form className="mt-5 space-y-4 rounded-md border border-line bg-panel p-5">
        <label className="block text-sm text-slate-500">Email alerts<input disabled className="mt-2 w-full rounded-md border border-line bg-navy px-3 py-2" placeholder="disabled" /></label>
        <label className="block text-sm text-slate-300">Keywords<textarea className="mt-2 w-full rounded-md border border-line bg-navy px-3 py-2" /></label>
        <label className="block text-sm text-slate-300">Minimum confidence<input type="number" min="0" max="100" className="mt-2 w-full rounded-md border border-line bg-navy px-3 py-2" /></label>
        <label className="flex items-center gap-3 text-sm text-slate-500"><input type="checkbox" disabled /> Email alerts disabled</label>
        <label className="flex items-center gap-3 text-sm text-slate-300"><input type="checkbox" defaultChecked /> Telegram alerts</label>
        <button className="rounded-md bg-electric px-4 py-2 font-semibold text-white">{t.save}</button>
      </form>
    </section>
  );
}
