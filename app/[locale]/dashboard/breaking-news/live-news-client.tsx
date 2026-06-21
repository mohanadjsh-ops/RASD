"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { StatusBadge } from "@/components/status-badge";
import type { LiveStory, Locale, VerificationStatus } from "@/types/app";

type Labels = Record<string, string>;

export function LiveNewsClient({
  locale,
  labels,
  initialStories
}: {
  locale: Locale;
  labels: Labels;
  initialStories: LiveStory[];
}) {
  const [stories, setStories] = useState(initialStories);
  const [pendingStories, setPendingStories] = useState<LiveStory[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [notice, setNotice] = useState("");
  const [isPending, startTransition] = useTransition();
  const firstResultRef = useRef<HTMLAnchorElement | null>(null);

  const latestSeenAt = useMemo(() => stories[0]?.lastSeenAt ?? null, [stories]);

  useEffect(() => {
    let alive = true;
    async function poll() {
      if (!latestSeenAt) return;
      try {
        const response = await fetch(`/api/stories/live?since=${encodeURIComponent(latestSeenAt)}`, { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { stories?: LiveStory[] };
        if (alive && data.stories?.length) {
          setPendingStories((current) => mergeStories(data.stories ?? [], current));
        }
      } catch {
        // Keep the current feed if a polling request fails.
      }
    }
    const timer = window.setInterval(poll, 15_000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [latestSeenAt]);

  function applyPending() {
    setStories((current) => mergeStories(pendingStories, current));
    setPendingStories([]);
    setNotice("");
  }

  function runSearch() {
    startTransition(async () => {
      setNotice("");
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (status) params.set("status", status);
      const response = await fetch(`/api/stories/live?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) {
        setNotice(labels.searchFailed);
        return;
      }
      const data = (await response.json()) as { stories?: LiveStory[] };
      const next = data.stories ?? [];
      setStories(next);
      if (next.length) {
        window.setTimeout(() => firstResultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
      } else {
        setNotice(labels.noSearchResults);
      }
    });
  }

  return (
    <section dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-slate-950">{labels.breakingNews}</h1>
        {pendingStories.length ? (
          <button
            type="button"
            onClick={applyPending}
            className="inline-flex items-center gap-2 rounded-full bg-urgent px-5 py-2 text-sm font-bold text-white shadow-lg shadow-red-200 transition hover:-translate-y-0.5 hover:bg-red-700"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            {labels.newRasd} ({pendingStories.length})
          </button>
        ) : null}
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-[1fr_320px_48px]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-12 rounded-md border border-line bg-white px-4 text-sm text-slate-950 shadow-sm outline-none transition hover:border-electric focus:border-electric"
          placeholder={labels.search}
          onKeyDown={(event) => {
            if (event.key === "Enter") runSearch();
          }}
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-12 rounded-md border border-line bg-white px-4 text-sm text-slate-950 shadow-sm outline-none transition hover:border-electric focus:border-electric"
          aria-label={labels.status}
        >
          <option value="">{labels.allStatuses}</option>
          <option value="confirmed">{labels.confirmed}</option>
          <option value="high_confidence">{labels.highConfidence}</option>
        </select>
        <button
          type="button"
          onClick={runSearch}
          disabled={isPending}
          className="grid h-12 place-items-center rounded-md bg-electric text-white shadow-lg shadow-electric/25 transition hover:-translate-y-0.5 hover:bg-verified disabled:opacity-60"
          aria-label={labels.search}
          title={labels.search}
        >
          <Search className="h-5 w-5" aria-hidden />
        </button>
      </div>

      {notice ? <p className="mt-3 rounded-md border border-line bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">{notice}</p> : null}

      <div className="relative mt-7 max-w-4xl">
        <div className="absolute right-[9px] top-0 h-full w-px bg-sky-200" />
        <div className="space-y-7">
          {stories.map((story, index) => (
            <Link
              key={story.id}
              ref={index === 0 ? firstResultRef : null}
              href={`/${locale}/dashboard/story/${story.id}`}
              className="relative block pe-8"
            >
              <span className="live-dot absolute right-0 top-2 h-5 w-5 rounded-full border-4 border-sky-100 bg-sky-500" />
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-700">
                <b>{relativeArabicTime(story.publishedAt)}</b>
                <span>{formatMakkahTime(story.publishedAt)}</span>
              </div>
              <article className="rounded-md border border-slate-300 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-electric hover:shadow-md">
                <div className="flex justify-end">
                  <span className="rounded-full bg-urgent px-4 py-1 text-sm font-bold text-white">{labels.urgent}</span>
                </div>
                <h2 className="mt-4 text-2xl font-bold leading-relaxed text-slate-950">{story.title}</h2>
                {story.sourceName ? <p className="mt-1 text-lg text-slate-800">{story.sourceName}</p> : null}
                <ul className="mt-4 space-y-2 text-lg leading-9 text-slate-900">
                  {(story.bullets.length ? story.bullets : story.excerpt ? [story.excerpt] : []).map((bullet) => (
                    <li key={bullet} className="flex gap-3">
                      <span className="mt-3 h-2 w-2 shrink-0 rounded-full bg-sky-500" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
                {story.imageUrl ? (
                  <img src={story.imageUrl} alt="" className="mt-5 aspect-video w-full rounded-md object-cover" loading="lazy" />
                ) : null}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                  <StatusBadge status={story.status as VerificationStatus} locale={locale} />
                  <span>{labels.sourcesCount}: {story.sourceCount} - {labels.confidence}: {story.confidenceScore}%</span>
                </div>
              </article>
            </Link>
          ))}
          {!stories.length ? <p className="rounded-md border border-line bg-white p-8 text-center text-slate-500 shadow-sm">{labels.empty}</p> : null}
        </div>
      </div>
    </section>
  );
}

function mergeStories(next: LiveStory[], current: LiveStory[]) {
  const map = new Map<string, LiveStory>();
  for (const story of [...next, ...current]) map.set(story.id, story);
  return Array.from(map.values()).sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime());
}

function formatMakkahTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-SA", {
    timeZone: "Asia/Riyadh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function relativeArabicTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diffMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
  if (diffMinutes < 1) return "الآن";
  if (diffMinutes < 60) return `منذ ${diffMinutes} د`;
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return `منذ ${hours} س`;
  return `منذ ${Math.floor(hours / 24)} يوم`;
}
