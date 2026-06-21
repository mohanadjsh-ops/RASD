"use client";

import { useState } from "react";
import { Copy, ExternalLink, FileText, Link as LinkIcon, MessageCircle } from "lucide-react";

const chatgptRoomUrl = "https://chatgpt.com/c/6a09e357-1d88-83eb-a153-c014998aeef0";

export function NewsroomTool({ labels }: { labels: Record<string, string> }) {
  const [text, setText] = useState("");
  const [links, setLinks] = useState("");

  const copy = (value: string) => navigator.clipboard.writeText(value);

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">{labels.newsroomTool}</h1>
          <p className="mt-1 text-sm text-slate-600">{labels.chatgptRoomNote}</p>
        </div>
        <a
          href={chatgptRoomUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-md bg-electric px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-electric/25 transition hover:-translate-y-0.5 hover:bg-verified"
        >
          <MessageCircle className="h-4 w-4" aria-hidden />
          {labels.openChatgptRoom}
          <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="rounded-md border border-line bg-panel p-4 shadow-sm shadow-slate-200">
          <label className="block text-sm font-medium text-slate-700">
            <span className="inline-flex items-center gap-2">
              <FileText className="h-4 w-4 text-electric" aria-hidden />
              {labels.sourceText}
            </span>
            <textarea value={text} onChange={(event) => setText(event.target.value)} className="mt-2 min-h-72 w-full rounded-md border border-line bg-white p-3 text-slate-950 shadow-sm outline-none transition hover:border-electric/60 focus:border-electric" />
          </label>
          <label className="mt-4 block text-sm font-medium text-slate-700">
            <span className="inline-flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-electric" aria-hidden />
              {labels.optionalLinks}
            </span>
            <textarea value={links} onChange={(event) => setLinks(event.target.value)} className="mt-2 min-h-24 w-full rounded-md border border-line bg-white p-3 text-slate-950 shadow-sm outline-none transition hover:border-electric/60 focus:border-electric" />
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => copy(text)} disabled={!text} className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-electric hover:text-electric disabled:opacity-50">
              <Copy className="h-4 w-4" aria-hidden />
              {labels.copy} {labels.sourceText}
            </button>
            <button type="button" onClick={() => copy(links)} disabled={!links} className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-electric hover:text-electric disabled:opacity-50">
              <Copy className="h-4 w-4" aria-hidden />
              {labels.copy} {labels.sourceLinks}
            </button>
          </div>
        </div>
        <aside className="rounded-md border border-line bg-white p-5 shadow-sm shadow-slate-200">
          <div className="grid h-12 w-12 place-items-center rounded-md bg-electric/10 text-electric">
            <MessageCircle className="h-6 w-6" aria-hidden />
          </div>
          <h2 className="mt-5 text-lg font-semibold text-slate-950">{labels.chatgptRoomTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{labels.chatgptRoomNote}</p>
          <a
            href={chatgptRoomUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-electric px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-electric/25 transition hover:-translate-y-0.5 hover:bg-verified"
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            {labels.openChatgptRoom}
            <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
        </aside>
      </div>
    </section>
  );
}
