import { getMessages, isLocale } from "@/lib/i18n";

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = isLocale(localeParam) ? localeParam : "ar";
  const t = await getMessages(locale);

  return (
    <section className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-slate-950">{t.settings}</h1>
      <form className="mt-5 space-y-4 rounded-md border border-line bg-panel p-5 shadow-sm shadow-slate-200">
        <label className="block text-sm font-medium text-slate-500">{t.emailAlerts}<input disabled className="mt-2 w-full rounded-md border border-line bg-slate-50 px-3 py-2 text-slate-500" placeholder={t.disabled} /></label>
        <label className="block text-sm font-medium text-slate-700">{t.keywords}<textarea className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2 text-slate-950 shadow-sm outline-none transition hover:border-electric/60 focus:border-electric" /></label>
        <label className="block text-sm font-medium text-slate-700">{t.minimumConfidence}<input type="number" min="0" max="100" className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2 text-slate-950 shadow-sm outline-none transition hover:border-electric/60 focus:border-electric" /></label>
        <label className="flex items-center gap-3 text-sm text-slate-500"><input type="checkbox" disabled /> {t.emailAlertsDisabled}</label>
        <label className="flex items-center gap-3 text-sm font-medium text-slate-700"><input type="checkbox" defaultChecked /> {t.telegramAlerts}</label>
        <button className="rounded-md bg-electric px-4 py-2 font-semibold text-white shadow-lg shadow-electric/25 transition hover:-translate-y-0.5 hover:bg-verified">{t.save}</button>
      </form>
    </section>
  );
}
