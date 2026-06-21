"use client";

import { useState, useTransition } from "react";
import { Copy } from "lucide-react";

type Output = {
  headline_12_words: string;
  lead_line: string;
  summary: string;
  caption: string;
  key_points: string[];
  verification_note: string;
  risk_flags: string[];
  source_links: string[];
};

export function NewsroomTool({ labels }: { labels: Record<string, string> }) {
  const [text, setText] = useState("");
  const [links, setLinks] = useState("");
  const [output, setOutput] = useState<Output | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function generate() {
    startTransition(async () => {
      setError("");
      const response = await fetch("/api/newsroom/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, sourceLinks: links.split("\n").filter(Boolean), category: "general" })
      });
      if (response.ok) {
        setOutput(await response.json());
      } else {
        setError("تعذر توليد الإسناد التحريري. تحقق من الإعدادات وحاول مجددا.");
      }
    });
  }

  const copy = (value: string) => navigator.clipboard.writeText(value);

  return (
    <section>
      <h1 className="text-2xl font-semibold text-white">{labels.newsroomTool}</h1>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-md border border-line bg-panel p-4">
          <label className="block text-sm text-slate-300">
            {labels.sourceText}
            <textarea value={text} onChange={(event) => setText(event.target.value)} className="mt-2 min-h-72 w-full rounded-md border border-line bg-navy p-3 text-white" />
          </label>
          <label className="mt-4 block text-sm text-slate-300">
            {labels.optionalLinks}
            <textarea value={links} onChange={(event) => setLinks(event.target.value)} className="mt-2 min-h-24 w-full rounded-md border border-line bg-navy p-3 text-white" />
          </label>
          <button disabled={pending || text.length < 20} onClick={generate} className="mt-4 rounded-md bg-electric px-4 py-2 font-semibold text-white disabled:opacity-50">
            {pending ? "..." : labels.generate}
          </button>
          {error ? <p className="mt-3 text-sm text-urgent">{error}</p> : null}
        </div>
        <div className="space-y-4">
          {output ? (
            <>
              <OutputCard title={labels.headline} value={output.headline_12_words} onCopy={copy} />
              <OutputCard title={labels.leadLine} value={output.lead_line} onCopy={copy} />
              <OutputCard title={labels.summary} value={output.summary} onCopy={copy} />
              <OutputCard title={labels.caption} value={output.caption} onCopy={copy} />
              <OutputCard title={labels.sourceLinks} value={output.source_links.join("\n")} onCopy={copy} />
              <OutputCard title={labels.keyPoints} value={output.key_points.join("\n")} onCopy={copy} />
              <OutputCard title={labels.verificationNote} value={output.verification_note} onCopy={copy} />
              <OutputCard title={labels.riskFlags} value={output.risk_flags.join("\n")} onCopy={copy} />
            </>
          ) : (
            <div className="rounded-md border border-line bg-panel p-8 text-slate-400">{labels.empty}</div>
          )}
        </div>
      </div>
    </section>
  );
}

function OutputCard({ title, value, onCopy }: { title: string; value: string; onCopy: (value: string) => void }) {
  return (
    <article className="rounded-md border border-line bg-panel p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-white">{title}</h2>
        <button onClick={() => onCopy(value)} className="rounded-md border border-line p-2 text-slate-300 hover:border-electric" title="Copy">
          <Copy className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <p className="mt-3 whitespace-pre-line text-slate-300">{value}</p>
    </article>
  );
}
