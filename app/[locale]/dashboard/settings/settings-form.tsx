"use client";

import { Mail, Save, Send } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

type Labels = Record<string, string>;

export function SettingsForm({ labels }: { labels: Labels }) {
  const [email, setEmail] = useState("");
  const [enableEmail, setEnableEmail] = useState(false);
  const [enableTelegram, setEnableTelegram] = useState(true);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const response = await fetch("/api/settings", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (!alive) return;
        setEmail(data.alert_email ?? "");
        setEnableEmail(Boolean(data.enable_email_alerts));
        setEnableTelegram(Boolean(data.enable_telegram_alerts));
      } catch {
        // Leave defaults in place if settings cannot be loaded.
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, []);

  function save() {
    startTransition(async () => {
      setMessage("");
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          alert_email: email || null,
          enable_email_alerts: enableEmail,
          enable_telegram_alerts: enableTelegram
        })
      });
      setMessage(response.ok ? labels.saved : labels.error);
    });
  }

  return (
    <section className="max-w-3xl" dir="rtl">
      <h1 className="text-2xl font-semibold text-slate-950">{labels.settings}</h1>
      <div className="mt-5 space-y-5 rounded-md border border-line bg-panel p-5 shadow-sm shadow-slate-200">
        <label className="block text-sm font-medium text-slate-700">
          <span className="inline-flex items-center gap-2">
            <Mail className="h-4 w-4 text-electric" aria-hidden />
            {labels.emailAlerts}
          </span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            className="mt-2 w-full rounded-md border border-line bg-white px-3 py-3 text-slate-950 shadow-sm outline-none transition hover:border-electric/60 focus:border-electric"
            placeholder="name@example.com"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center justify-between rounded-md border border-line bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm">
            <span>{labels.enableEmailAlerts}</span>
            <input type="checkbox" checked={enableEmail} onChange={(event) => setEnableEmail(event.target.checked)} />
          </label>
          <label className="flex items-center justify-between rounded-md border border-line bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm">
            <span className="inline-flex items-center gap-2">
              <Send className="h-4 w-4 text-electric" aria-hidden />
              {labels.telegramAlerts}
            </span>
            <input type="checkbox" checked={enableTelegram} onChange={(event) => setEnableTelegram(event.target.checked)} />
          </label>
        </div>
        <button onClick={save} disabled={isPending} className="inline-flex items-center gap-2 rounded-md bg-electric px-4 py-2 font-semibold text-white shadow-lg shadow-electric/25 transition hover:-translate-y-0.5 hover:bg-verified disabled:opacity-60">
          <Save className="h-4 w-4" aria-hidden />
          {labels.save}
        </button>
        {message ? <p className="rounded-md border border-line bg-white px-4 py-3 text-sm text-slate-600">{message}</p> : null}
      </div>
    </section>
  );
}
