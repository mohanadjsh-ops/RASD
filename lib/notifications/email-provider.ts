import "server-only";
import { serverEnv } from "@/lib/env";

type DigestStory = {
  title: string;
  excerpt?: string | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
  publishedAt?: string | null;
  dashboardUrl?: string;
};

export async function sendEmailDigest(input: {
  to: string;
  stories: DigestStory[];
  periodLabel: string;
}) {
  if (!serverEnv.RESEND_API_KEY) throw new Error("RESEND_API_KEY is missing.");
  if (!serverEnv.ALERT_FROM_EMAIL) throw new Error("ALERT_FROM_EMAIL is missing.");

  const subject = `تقرير رصد الإخباري - ${input.periodLabel}`;
  const html = renderDigestHtml(input.stories, input.periodLabel);
  const text = renderDigestText(input.stories, input.periodLabel);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${serverEnv.RESEND_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      from: serverEnv.ALERT_FROM_EMAIL,
      to: [input.to],
      subject,
      html,
      text
    })
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.message ?? "Resend email send failed.");
  }
  return result;
}

function renderDigestHtml(stories: DigestStory[], periodLabel: string) {
  const items = stories
    .map(
      (story) => `
        <article style="border-bottom:1px solid #e5e7eb;padding:18px 0">
          <h2 style="margin:0 0 8px;font-size:20px;line-height:1.5;color:#111827">${escapeHtml(story.title)}</h2>
          ${story.excerpt ? `<p style="margin:0 0 10px;color:#374151;line-height:1.8">${escapeHtml(story.excerpt)}</p>` : ""}
          <p style="margin:0;color:#6b7280;font-size:13px">
            ${story.sourceName ? `المصدر: ${escapeHtml(story.sourceName)} · ` : ""}
            ${story.publishedAt ? `وقت النشر: ${escapeHtml(formatMakkahTime(story.publishedAt))}` : ""}
          </p>
          ${story.dashboardUrl ? `<p><a href="${escapeHtml(story.dashboardUrl)}" style="color:#4b8f1f">فتح الخبر في رصد</a></p>` : ""}
          ${story.sourceUrl ? `<p><a href="${escapeHtml(story.sourceUrl)}" style="color:#4b8f1f">رابط المصدر</a></p>` : ""}
        </article>
      `
    )
    .join("");

  return `
    <main dir="rtl" style="font-family:Arial,'Segoe UI',sans-serif;background:#f8faf7;padding:24px">
      <section style="max-width:760px;margin:auto;background:#fff;border:1px solid #dfe8d8;padding:24px">
        <h1 style="margin:0 0 6px;color:#111827">تقرير رصد الإخباري</h1>
        <p style="margin:0 0 18px;color:#6b7280">${escapeHtml(periodLabel)}</p>
        ${items || `<p style="color:#374151">لا توجد أخبار مؤكدة جديدة خلال هذه الفترة.</p>`}
      </section>
    </main>
  `;
}

function renderDigestText(stories: DigestStory[], periodLabel: string) {
  const lines = [`تقرير رصد الإخباري - ${periodLabel}`, ""];
  for (const story of stories) {
    lines.push(`- ${story.title}`);
    if (story.excerpt) lines.push(`  ${story.excerpt}`);
    if (story.sourceName || story.publishedAt) lines.push(`  ${story.sourceName ?? ""} ${story.publishedAt ? formatMakkahTime(story.publishedAt) : ""}`.trim());
    if (story.dashboardUrl) lines.push(`  ${story.dashboardUrl}`);
    if (story.sourceUrl) lines.push(`  ${story.sourceUrl}`);
    lines.push("");
  }
  return lines.join("\n");
}

function formatMakkahTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-SA", {
    timeZone: "Asia/Riyadh",
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
