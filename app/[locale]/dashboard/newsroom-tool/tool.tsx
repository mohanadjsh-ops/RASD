"use client";

import { ExternalLink, MessageCircle, SendHorizontal } from "lucide-react";
import { useRef, useState, useTransition } from "react";

const chatgptRoomUrl = "https://chatgpt.com/c/6a09e357-1d88-83eb-a153-c014998aeef0";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export function NewsroomTool({ labels }: { labels: Record<string, string> }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: labels.newsroomChatWelcome }
  ]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  function send() {
    const content = input.trim();
    if (!content) return;
    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    setInput("");
    setError("");

    startTransition(async () => {
      const response = await fetch("/api/newsroom/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: nextMessages.slice(-12) })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? labels.error);
        return;
      }
      setMessages((current) => [...current, { role: "assistant", content: data.reply ?? labels.error }]);
      window.setTimeout(() => inputRef.current?.focus(), 50);
    });
  }

  return (
    <section dir="rtl" className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">{labels.newsroomTool}</h1>
          <p className="mt-1 text-sm text-slate-600">{labels.newsroomChatNote}</p>
        </div>
        <a
          href={chatgptRoomUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-electric hover:text-electric"
        >
          <MessageCircle className="h-4 w-4" aria-hidden />
          {labels.openChatgptRoom}
          <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
      </div>

      <div className="mt-5 overflow-hidden rounded-md border border-line bg-white shadow-sm shadow-slate-200">
        <div className="h-[58vh] min-h-[420px] space-y-4 overflow-y-auto bg-slate-50 p-5">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={message.role === "user" ? "flex justify-start" : "flex justify-end"}>
              <div
                className={[
                  "max-w-[82%] rounded-md px-4 py-3 text-sm leading-7 shadow-sm",
                  message.role === "user" ? "bg-electric text-white" : "border border-line bg-white text-slate-800"
                ].join(" ")}
              >
                {message.content}
              </div>
            </div>
          ))}
          {isPending ? <div className="text-sm text-slate-500">{labels.chatThinking}</div> : null}
        </div>
        <div className="border-t border-line bg-white p-4">
          {error ? <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          <div className="grid gap-3 md:grid-cols-[1fr_52px]">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  send();
                }
              }}
              className="min-h-24 rounded-md border border-line bg-white p-3 text-slate-950 shadow-sm outline-none transition hover:border-electric/60 focus:border-electric"
              placeholder={labels.newsroomChatPlaceholder}
            />
            <button
              type="button"
              onClick={send}
              disabled={isPending || !input.trim()}
              className="grid h-full min-h-24 place-items-center rounded-md bg-electric text-white shadow-lg shadow-electric/25 transition hover:-translate-y-0.5 hover:bg-verified disabled:opacity-60"
              aria-label={labels.send}
              title={labels.send}
            >
              <SendHorizontal className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
