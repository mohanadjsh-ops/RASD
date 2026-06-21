"use client";

import { Plus, Save } from "lucide-react";
import { useState, useTransition } from "react";
import type { Source, SourceType } from "@/types/app";

type Labels = Record<string, string>;

const sourceTypes: SourceType[] = ["official", "major_agency", "trusted_media", "monitoring_only"];

export function SourcesAdmin({ labels, initialSources, isAdmin }: { labels: Labels; initialSources: Source[]; isAdmin: boolean }) {
  const [sources, setSources] = useState(initialSources);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function updateLocal(id: string, patch: Partial<Source>) {
    setSources((current) => current.map((source) => (source.id === id ? { ...source, ...patch } : source)));
  }

  function saveSource(source: Source) {
    startTransition(async () => {
      setMessage("");
      const response = await fetch(`/api/sources/${source.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source_type: source.source_type,
          credibility_weight: Number(source.credibility_weight),
          enabled: Boolean(source.enabled)
        })
      });
      setMessage(response.ok ? labels.saved : labels.error);
    });
  }

  function createSource(formData: FormData) {
    startTransition(async () => {
      setMessage("");
      const response = await fetch("/api/sources", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          url: formData.get("url"),
          feed_url: formData.get("feed_url"),
          source_type: formData.get("source_type"),
          language: formData.get("language"),
          country: formData.get("country") || "global",
          category: formData.get("category") || "general",
          credibility_weight: Number(formData.get("credibility_weight") || 80),
          enabled: true
        })
      });
      if (response.ok) {
        const created = (await response.json()) as Source;
        setSources((current) => [created, ...current]);
        setMessage(labels.saved);
      } else {
        setMessage(labels.error);
      }
    });
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-950">{labels.sources}</h1>
      </div>

      {isAdmin ? (
        <form action={createSource} className="mt-5 grid gap-3 rounded-md border border-line bg-white p-4 shadow-sm shadow-slate-200 lg:grid-cols-6">
          <input name="name" required className="rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-electric" placeholder={labels.sourceName} />
          <input name="url" required className="rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-electric" placeholder="https://example.com" />
          <input name="feed_url" required className="rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-electric lg:col-span-2" placeholder="RSS URL" />
          <select name="source_type" className="rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-electric" defaultValue="trusted_media">
            {sourceTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <div className="grid grid-cols-[1fr_88px_44px] gap-2 lg:col-span-6">
            <input name="language" required defaultValue="ar" className="rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-electric" placeholder={labels.language} />
            <input name="credibility_weight" type="number" min="0" max="100" defaultValue="80" className="rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-electric" />
            <button disabled={isPending} className="grid place-items-center rounded-md bg-electric text-white transition hover:bg-verified disabled:opacity-60" title={labels.addSource}>
              <Plus className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </form>
      ) : null}

      {message ? <p className="mt-3 rounded-md border border-line bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">{message}</p> : null}

      <div className="mt-5 overflow-hidden rounded-md border border-line bg-panel shadow-sm shadow-slate-200">
        {sources.map((source) => (
          <div key={source.id} className="grid gap-3 border-b border-line p-4 last:border-0 lg:grid-cols-[1fr_180px_120px_110px_44px]">
            <div>
              <h2 className="font-medium text-slate-950">{source.name}</h2>
              <p className="mt-1 break-all text-sm text-slate-600">{source.feed_url}</p>
            </div>
            <select
              disabled={!isAdmin}
              value={source.source_type}
              onChange={(event) => updateLocal(source.id, { source_type: event.target.value as SourceType })}
              className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-electric disabled:bg-slate-50"
            >
              {sourceTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <input
              disabled={!isAdmin}
              type="number"
              min="0"
              max="100"
              value={source.credibility_weight}
              onChange={(event) => updateLocal(source.id, { credibility_weight: Number(event.target.value) })}
              className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-electric disabled:bg-slate-50"
            />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input disabled={!isAdmin} type="checkbox" checked={source.enabled} onChange={(event) => updateLocal(source.id, { enabled: event.target.checked })} />
              {source.enabled ? labels.enabled : labels.disabled}
            </label>
            {isAdmin ? (
              <button disabled={isPending} onClick={() => saveSource(source)} className="grid h-10 place-items-center rounded-md bg-electric text-white transition hover:bg-verified disabled:opacity-60" title={labels.save}>
                <Save className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
