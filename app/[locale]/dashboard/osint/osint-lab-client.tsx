"use client";

import Link from "next/link";
import {
  Bot,
  CheckCircle2,
  Database,
  ExternalLink,
  FileSearch,
  Link2,
  Plus,
  Search,
  Settings2,
  ShieldAlert
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import type { Locale, OsintCase, OsintTool } from "@/types/app";

type TelegramLink = {
  chat_id: string | null;
  telegram_username: string | null;
  verified_at: string | null;
  active_case_id: string | null;
};

export function OsintLabClient({
  locale,
  labels,
  initialCases,
  initialTools,
  initialTelegramLink,
  initialStorageBytes,
  isAdmin,
  isBotConfigured
}: {
  locale: Locale;
  labels: Record<string, string>;
  initialCases: OsintCase[];
  initialTools: OsintTool[];
  initialTelegramLink: TelegramLink | null;
  initialStorageBytes: number;
  isAdmin: boolean;
  isBotConfigured: boolean;
}) {
  const ar = locale === "ar";
  const [cases, setCases] = useState(initialCases);
  const [tools, setTools] = useState(initialTools);
  const [query, setQuery] = useState("");
  const [toolQuery, setToolQuery] = useState("");
  const [telegramLink, setTelegramLink] = useState(initialTelegramLink);
  const [linkCode, setLinkCode] = useState("");
  const [message, setMessage] = useState("");
  const [sensitive, setSensitive] = useState(false);
  const [isPending, startTransition] = useTransition();
  const storagePercentage = Math.min(100, (initialStorageBytes / (1024 * 1024 * 1024)) * 100);

  const filteredCases = useMemo(
    () =>
      cases.filter((item) =>
        `${item.title} ${item.description ?? ""}`.toLowerCase().includes(query.trim().toLowerCase())
      ),
    [cases, query]
  );
  const filteredTools = useMemo(
    () =>
      tools.filter((tool) =>
        `${tool.name} ${tool.category} ${tool.instructions_ar}`.toLowerCase().includes(toolQuery.trim().toLowerCase())
      ),
    [tools, toolQuery]
  );

  function createCase(formData: FormData) {
    startTransition(async () => {
      setMessage("");
      const response = await fetch("/api/osint/cases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: formData.get("title"),
          description: formData.get("description") || null,
          claim: formData.get("claim") || null,
          input_type: formData.get("input_type"),
          sensitive_material: sensitive,
          public_interest_reason: formData.get("public_interest_reason") || null
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error ?? labels.error);
        return;
      }
      setCases((current) => [data as OsintCase, ...current]);
      window.location.href = `/${locale}/dashboard/osint/${data.id}`;
    });
  }

  function requestTelegramLink() {
    startTransition(async () => {
      setMessage("");
      const response = await fetch("/api/osint/telegram/link", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error ?? labels.error);
        return;
      }
      setLinkCode(data.command ?? "");
    });
  }

  function refreshTelegramLink() {
    startTransition(async () => {
      const response = await fetch("/api/osint/telegram/link", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (response.ok) setTelegramLink(data.link ?? null);
    });
  }

  function setupWebhook() {
    startTransition(async () => {
      const response = await fetch("/api/osint/telegram/setup", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      setMessage(response.ok ? (ar ? "تم تفعيل webhook لبوت التحقيقات." : "OSINT bot webhook is active.") : data.error ?? labels.error);
    });
  }

  function toggleTool(tool: OsintTool) {
    startTransition(async () => {
      const response = await fetch(`/api/osint/tools/${tool.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: !tool.enabled })
      });
      if (response.ok) {
        const updated = (await response.json()) as OsintTool;
        setTools((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      }
    });
  }

  function addTool(formData: FormData) {
    startTransition(async () => {
      const response = await fetch("/api/osint/tools", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          category: formData.get("category"),
          url: formData.get("url"),
          execution_mode: formData.get("execution_mode"),
          access_model: formData.get("access_model"),
          instructions_ar: formData.get("instructions_ar"),
          enabled: true
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error ?? labels.error);
        return;
      }
      setTools((current) => [...current, data as OsintTool]);
      setMessage(ar ? "تمت إضافة الأداة." : "Tool added.");
    });
  }

  return (
    <section dir={ar ? "rtl" : "ltr"} className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-md bg-electric text-white">
              <FileSearch className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <h1 className="text-2xl font-semibold text-slate-950">{labels.osintLab}</h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{labels.osintLabNote}</p>
            </div>
          </div>
        </div>
        <div className="min-w-60 border-s-4 border-electric bg-slate-50 px-4 py-3">
          <div className="flex items-center justify-between text-sm text-slate-700">
            <span className="inline-flex items-center gap-2"><Database className="h-4 w-4" />{ar ? "التخزين المؤقت" : "Temporary storage"}</span>
            <b>{storagePercentage.toFixed(1)}%</b>
          </div>
          <div className="mt-2 h-2 overflow-hidden bg-slate-200">
            <div
              className={storagePercentage >= 90 ? "h-full bg-urgent" : storagePercentage >= 80 ? "h-full bg-amber-500" : "h-full bg-electric"}
              style={{ width: `${storagePercentage}%` }}
            />
          </div>
        </div>
      </div>

      {message ? <p className="border border-line bg-white px-4 py-3 text-sm text-slate-700">{message}</p> : null}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
            <h2 className="text-lg font-semibold text-slate-950">{labels.osintCases}</h2>
            <div className="relative w-full max-w-xs">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-10 w-full border border-line bg-white ps-10 pe-3 text-sm outline-none focus:border-electric"
                placeholder={labels.search}
              />
            </div>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {filteredCases.map((item) => (
              <Link
                key={item.id}
                href={`/${locale}/dashboard/osint/${item.id}`}
                className="border border-line bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-electric hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className={verdictClass(item.verdict)}>{verdictLabel(item.verdict, ar)}</span>
                  <span className="text-xs text-slate-500">{formatDate(item.updated_at, locale)}</span>
                </div>
                <h3 className="mt-3 font-semibold leading-7 text-slate-950">{item.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{item.description || (ar ? "لا يوجد وصف بعد." : "No description yet.")}</p>
                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span>{stageLabel(item.workflow_stage, ar)}</span>
                  <span>{item.confidence_score}%</span>
                </div>
              </Link>
            ))}
            {!filteredCases.length ? <p className="py-8 text-center text-sm text-slate-500">{labels.empty}</p> : null}
          </div>
        </div>

        <aside className="border-s border-line ps-5">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-electric" aria-hidden />
            <h2 className="font-semibold text-slate-950">{labels.osintNewCase}</h2>
          </div>
          <form action={createCase} className="mt-4 space-y-3">
            <input name="title" required minLength={3} className="w-full border border-line px-3 py-2 text-sm outline-none focus:border-electric" placeholder={ar ? "عنوان القضية" : "Case title"} />
            <textarea name="claim" className="min-h-24 w-full border border-line px-3 py-2 text-sm outline-none focus:border-electric" placeholder={ar ? "الادعاء الرئيسي المطلوب التحقق منه" : "Primary claim to investigate"} />
            <textarea name="description" className="min-h-20 w-full border border-line px-3 py-2 text-sm outline-none focus:border-electric" placeholder={ar ? "سياق مختصر" : "Short context"} />
            <select name="input_type" defaultValue="mixed" className="w-full border border-line bg-white px-3 py-2 text-sm outline-none focus:border-electric">
              <option value="mixed">{ar ? "مواد متعددة" : "Mixed material"}</option>
              <option value="image">{ar ? "صورة" : "Image"}</option>
              <option value="video">{ar ? "فيديو" : "Video"}</option>
              <option value="url">{ar ? "رابط" : "URL"}</option>
              <option value="text">{ar ? "خبر أو نص" : "Text or story"}</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={sensitive} onChange={(event) => setSensitive(event.target.checked)} />
              <ShieldAlert className="h-4 w-4 text-urgent" aria-hidden />
              {ar ? "تتضمن مادة شخصية أو حساسة" : "Contains sensitive personal material"}
            </label>
            {sensitive ? (
              <textarea name="public_interest_reason" required className="min-h-20 w-full border border-red-200 px-3 py-2 text-sm outline-none focus:border-urgent" placeholder={ar ? "سبب المصلحة العامة الضروري لمعالجة المادة" : "Required public-interest reason"} />
            ) : null}
            <button disabled={isPending} className="inline-flex w-full items-center justify-center gap-2 bg-electric px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-verified disabled:opacity-60">
              <Plus className="h-4 w-4" aria-hidden />
              {labels.osintNewCase}
            </button>
          </form>
        </aside>
      </div>

      <section className="border-t border-line pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-electric" aria-hidden />
            <h2 className="font-semibold text-slate-950">{labels.osintTelegramLink}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {isAdmin ? (
              <button
                type="button"
                onClick={setupWebhook}
                disabled={isPending || !isBotConfigured}
                className="inline-flex items-center gap-2 border border-line bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
              >
                <Settings2 className="h-4 w-4" />{ar ? "تفعيل webhook" : "Activate webhook"}
              </button>
            ) : null}
            <button type="button" onClick={refreshTelegramLink} className="border border-line bg-white px-3 py-2 text-sm font-medium text-slate-700">
              {ar ? "تحديث الحالة" : "Refresh status"}
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="border border-line bg-slate-50 p-4">
            {telegramLink?.verified_at ? (
              <p className="flex items-center gap-2 text-sm text-verified">
                <CheckCircle2 className="h-4 w-4" />
                {ar ? `مرتبط بالحساب @${telegramLink.telegram_username || "Telegram"}` : `Linked to @${telegramLink.telegram_username || "Telegram"}`}
              </p>
            ) : (
              <p className="text-sm leading-6 text-slate-600">
                {ar ? "أنشئ رمزاً مؤقتاً ثم أرسله إلى بوت OSINT المستقل. الرمز صالح 15 دقيقة." : "Generate a temporary code and send it to the separate OSINT bot. It is valid for 15 minutes."}
              </p>
            )}
            <button
              type="button"
              onClick={requestTelegramLink}
              disabled={isPending || !isBotConfigured}
              className="mt-3 inline-flex items-center gap-2 bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Link2 className="h-4 w-4" />{ar ? "إنشاء رمز الربط" : "Generate link code"}
            </button>
            {!isBotConfigured ? <p className="mt-2 text-xs text-urgent">{ar ? "توكن البوت المستقل لم يضف إلى إعدادات الخادم بعد." : "The separate bot token is not configured yet."}</p> : null}
          </div>
          <div className="border border-line bg-white p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">{ar ? "الأمر المطلوب إرساله" : "Command to send"}</p>
            <code className="mt-3 block select-all bg-slate-950 px-4 py-3 text-sm text-lime-300">{linkCode || "/start --------"}</code>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              {ar ? "بعد الربط استخدم /new عنوان القضية ثم أرسل المادة. الملفات المؤقتة تحذف بعد 7 أيام." : "After linking, use /new Case title and send the material. Temporary files are deleted after seven days."}
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-line pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-950">{ar ? "دليل أدوات التحقيق" : "Investigation tool registry"}</h2>
            <p className="mt-1 text-sm text-slate-600">{ar ? "الأدوات الخارجية تفتح يدويا وتُسجل نتيجتها داخل القضية." : "External tools open manually and their results are recorded in the case."}</p>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={toolQuery} onChange={(event) => setToolQuery(event.target.value)} className="h-10 w-full border border-line ps-10 pe-3 text-sm outline-none focus:border-electric" placeholder={labels.search} />
          </div>
        </div>

        {isAdmin ? (
          <details className="mt-4 border border-line bg-slate-50 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-slate-800">{ar ? "إضافة أداة إلى الدليل" : "Add tool to registry"}</summary>
            <form action={addTool} className="mt-4 grid gap-3 lg:grid-cols-3">
              <input name="name" required className="border border-line px-3 py-2 text-sm" placeholder={ar ? "اسم الأداة" : "Tool name"} />
              <input name="category" required className="border border-line px-3 py-2 text-sm" placeholder={ar ? "التصنيف" : "Category"} />
              <input name="url" type="url" required className="border border-line px-3 py-2 text-sm" placeholder="https://..." />
              <select name="execution_mode" className="border border-line bg-white px-3 py-2 text-sm">
                <option value="manual">{ar ? "يدوي" : "Manual"}</option>
                <option value="automatic">{ar ? "آلي" : "Automatic"}</option>
              </select>
              <select name="access_model" className="border border-line bg-white px-3 py-2 text-sm">
                <option value="free">{ar ? "مجاني" : "Free"}</option>
                <option value="account_required">{ar ? "يتطلب حسابا" : "Account required"}</option>
              </select>
              <input name="instructions_ar" className="border border-line px-3 py-2 text-sm" placeholder={ar ? "تعليمات الاستخدام" : "Usage guidance"} />
              <button className="bg-electric px-4 py-2 text-sm font-semibold text-white lg:col-start-3">{ar ? "إضافة" : "Add"}</button>
            </form>
          </details>
        ) : null}

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredTools.map((tool) => (
            <div key={tool.id} className={`border p-4 ${tool.enabled ? "border-line bg-white" : "border-slate-200 bg-slate-50 opacity-60"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-electric">{tool.category}</p>
                  <h3 className="mt-1 font-semibold text-slate-950">{tool.name}</h3>
                </div>
                <a href={tool.url} target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center border border-line text-slate-600 transition hover:border-electric hover:text-electric" title={ar ? "فتح الأداة" : "Open tool"}>
                  <ExternalLink className="h-4 w-4" aria-hidden />
                </a>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{tool.instructions_ar}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>{tool.execution_mode === "automatic" ? (ar ? "آلي" : "Automatic") : (ar ? "يدوي" : "Manual")}</span>
                {isAdmin ? (
                  <button type="button" onClick={() => toggleTool(tool)} className="font-semibold text-slate-700 underline underline-offset-4">
                    {tool.enabled ? (ar ? "تعطيل" : "Disable") : (ar ? "تفعيل" : "Enable")}
                  </button>
                ) : (
                  <span>{tool.access_model === "free" ? (ar ? "مجاني" : "Free") : (ar ? "يتطلب حسابا" : "Account")}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function verdictLabel(verdict: OsintCase["verdict"], ar: boolean) {
  const labels = ar
    ? { inconclusive: "غير محسوم", needs_evidence: "يحتاج أدلة", likely: "مرجح", verified: "متحقق", misleading: "مضلل" }
    : { inconclusive: "Inconclusive", needs_evidence: "Needs evidence", likely: "Likely", verified: "Verified", misleading: "Misleading" };
  return labels[verdict];
}

function verdictClass(verdict: OsintCase["verdict"]) {
  const base = "px-2.5 py-1 text-xs font-semibold";
  if (verdict === "verified") return `${base} bg-green-100 text-green-800`;
  if (verdict === "misleading") return `${base} bg-red-100 text-red-800`;
  if (verdict === "likely") return `${base} bg-amber-100 text-amber-800`;
  return `${base} bg-slate-100 text-slate-700`;
}

function stageLabel(stage: OsintCase["workflow_stage"], ar: boolean) {
  const arLabels: Record<OsintCase["workflow_stage"], string> = {
    planning: "التخطيط",
    preservation: "حفظ الدليل",
    source: "المصدر",
    content: "المضمون",
    geotime: "المكان والزمان",
    specialist: "التحقق المتخصص",
    review: "المراجعة",
    approval: "الاعتماد"
  };
  return ar ? arLabels[stage] : stage;
}

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Riyadh"
  }).format(new Date(value));
}
