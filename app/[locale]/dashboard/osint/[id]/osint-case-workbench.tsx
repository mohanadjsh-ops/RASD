"use client";

/* eslint-disable @next/next/no-img-element */

import {
  Archive,
  Bot,
  CheckCircle2,
  ChevronLeft,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileSearch,
  Fingerprint,
  ImageIcon,
  Loader2,
  LockKeyhole,
  MessageSquareText,
  Plus,
  Printer,
  Save,
  ScanLine,
  ShieldCheck,
  TriangleAlert,
  Video
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import type {
  Locale,
  OsintCaseBundle,
  OsintEvidence,
  OsintFinding,
  OsintStage,
  OsintVerdict
} from "@/types/app";
import {
  analyzeLocalFile,
  createEncryptedCaseBundle,
  downloadBlob,
  runLocalOcr,
  type LocalFileAnalysis,
  type LocalFrame
} from "@/lib/osint-browser";

const stages: OsintStage[] = [
  "planning",
  "preservation",
  "source",
  "content",
  "geotime",
  "specialist",
  "review",
  "approval"
];

type View = "workspace" | "evidence" | "findings" | "tools" | "report" | "timeline";

export function OsintCaseWorkbench({
  locale,
  initialBundle,
  isAdmin,
  approverName
}: {
  locale: Locale;
  initialBundle: OsintCaseBundle;
  isAdmin: boolean;
  approverName: string;
}) {
  const ar = locale === "ar";
  const [bundle, setBundle] = useState(initialBundle);
  const [view, setView] = useState<View>("workspace");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [localAnalysis, setLocalAnalysis] = useState<LocalFileAnalysis | null>(null);
  const [localFrames, setLocalFrames] = useState<LocalFrame[]>([]);
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const [ocrText, setOcrText] = useState("");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [aiDraft, setAiDraft] = useState("");
  const [zipDialog, setZipDialog] = useState(false);
  const [zipPassword, setZipPassword] = useState("");
  const [zipBusy, setZipBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

  const frameUrls = useMemo(
    () => localFrames.map((frame) => ({ ...frame, url: URL.createObjectURL(frame.blob) })),
    [localFrames]
  );

  useEffect(() => {
    return () => {
      frameUrls.forEach((frame) => URL.revokeObjectURL(frame.url));
    };
  }, [frameUrls]);

  useEffect(() => {
    if (!localFile) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(localFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [localFile]);

  async function reloadCase() {
    const response = await fetch(`/api/osint/cases/${bundle.case.id}`, { cache: "no-store" });
    if (response.ok) setBundle((await response.json()) as OsintCaseBundle);
  }

  function updateCase(formData: FormData) {
    startTransition(async () => {
      setMessage("");
      const response = await fetch(`/api/osint/cases/${bundle.case.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: formData.get("title"),
          description: formData.get("description") || null,
          verdict: formData.get("verdict"),
          confidence_score: Number(formData.get("confidence_score") || 0),
          limitations: formData.get("limitations") || null,
          sensitive_material: formData.get("sensitive_material") === "on",
          public_interest_reason: formData.get("public_interest_reason") || null,
          ai_enabled: formData.get("ai_enabled") === "on"
        })
      });
      const data = await response.json().catch(() => ({}));
      setMessage(response.ok ? (ar ? "تم حفظ بيانات القضية." : "Case saved.") : data.error ?? "Error");
      if (response.ok) await reloadCase();
    });
  }

  function changeStage(stage: OsintStage) {
    startTransition(async () => {
      const response = await fetch(`/api/osint/cases/${bundle.case.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workflow_stage: stage })
      });
      if (response.ok) await reloadCase();
    });
  }

  function addClaim(formData: FormData) {
    startTransition(async () => {
      const response = await fetch(`/api/osint/cases/${bundle.case.id}/claims`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          claim_text: formData.get("claim_text"),
          claim_type: formData.get("claim_type")
        })
      });
      if (response.ok) {
        setMessage(ar ? "تمت إضافة الادعاء." : "Claim added.");
        await reloadCase();
      }
    });
  }

  async function analyzeSelectedFile(file: File) {
    setAnalysisBusy(true);
    setMessage("");
    setLocalAnalysis(null);
    setLocalFrames([]);
    setOcrText("");
    try {
      const result = await analyzeLocalFile(file);
      setLocalAnalysis(result.analysis);
      setLocalFrames(result.frames);
      setMessage(ar ? "اكتمل التحليل محليا ولم يُرفع الملف إلى الخادم." : "Local analysis completed; the file was not uploaded.");
    } catch (error) {
      setMessage(`${ar ? "تعذر تحليل الملف" : "Analysis failed"}: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setAnalysisBusy(false);
    }
  }

  function selectLocalFile(file: File | null) {
    setLocalFile(file);
    if (file) void analyzeSelectedFile(file);
  }

  function saveLocalEvidence() {
    if (!localFile || !localAnalysis) return;
    startTransition(async () => {
      const response = await fetch(`/api/osint/cases/${bundle.case.id}/evidence`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          evidence_type: localFile.type.startsWith("video/") ? "video" : localFile.type.startsWith("image/") ? "image" : "document",
          title: localFile.name,
          original_filename: localFile.name,
          mime_type: localAnalysis.detectedMime,
          file_size: localFile.size,
          sha256: localAnalysis.sha256,
          metadata: {
            declaredMime: localAnalysis.declaredMime,
            detectedMime: localAnalysis.detectedMime,
            width: localAnalysis.width,
            height: localAnalysis.height,
            durationSeconds: localAnalysis.durationSeconds,
            metadata: localAnalysis.metadata,
            c2pa: localAnalysis.c2pa,
            warnings: localAnalysis.warnings,
            frameHashes: localFrames.map((frame) => ({
              name: frame.name,
              timeSeconds: frame.timeSeconds,
              sha256: frame.sha256
            }))
          },
          notes: "تم تحليل الأصل محليا داخل المتصفح. الملف نفسه غير محفوظ على خادم رصد.",
          local_only: true
        })
      });
      const data = await response.json().catch(() => ({}));
      setMessage(response.ok ? (ar ? "حُفظت بصمة الدليل ونتائج التحليل فقط." : "Evidence hash and results saved.") : data.error ?? "Error");
      if (response.ok) await reloadCase();
    });
  }

  async function runOcr() {
    const target = localFile?.type.startsWith("image/") ? localFile : localFrames[0]?.blob;
    if (!target) {
      setMessage(ar ? "اختر صورة أو فيديو يحتوي إطارا أولا." : "Select an image or a video frame first.");
      return;
    }
    setOcrBusy(true);
    setOcrProgress(0);
    try {
      const text = await runLocalOcr(target, (progress) => setOcrProgress(progress));
      setOcrText(text);
    } catch (error) {
      setMessage(`${ar ? "تعذر OCR" : "OCR failed"}: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setOcrBusy(false);
    }
  }

  function saveOcrFinding() {
    if (!ocrText.trim()) return;
    startTransition(async () => {
      const response = await fetch(`/api/osint/cases/${bundle.case.id}/findings`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          stage: "content",
          title: ar ? "نص مستخرج محليا بتقنية OCR" : "Locally extracted OCR text",
          body: ocrText,
          stance: "neutral",
          confidence_score: 50
        })
      });
      if (response.ok) {
        setMessage(ar ? "تم تسجيل نص OCR كنتيجة تحتاج مراجعة بشرية." : "OCR text saved as a finding requiring review.");
        await reloadCase();
      }
    });
  }

  function addEvidence(formData: FormData) {
    const sourceUrl = String(formData.get("source_url") ?? "").trim();
    startTransition(async () => {
      const response = await fetch(`/api/osint/cases/${bundle.case.id}/evidence`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          evidence_type: sourceUrl ? "url" : "text",
          title: formData.get("title"),
          source_url: sourceUrl || null,
          notes: formData.get("notes") || null,
          metadata: {},
          local_only: false
        })
      });
      if (response.ok) {
        setMessage(ar ? "تمت إضافة الدليل." : "Evidence added.");
        await reloadCase();
      }
    });
  }

  function addFinding(formData: FormData) {
    const sourceUrl = String(formData.get("source_url") ?? "").trim();
    startTransition(async () => {
      const response = await fetch(`/api/osint/cases/${bundle.case.id}/findings`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          stage: formData.get("stage"),
          title: formData.get("title"),
          body: formData.get("body"),
          stance: formData.get("stance"),
          confidence_score: Number(formData.get("confidence_score") || 0),
          tool_id: formData.get("tool_id") || null,
          evidence_id: formData.get("evidence_id") || null,
          source_url: sourceUrl || null
        })
      });
      const data = await response.json().catch(() => ({}));
      setMessage(response.ok ? (ar ? "تم تسجيل النتيجة." : "Finding recorded.") : data.error ?? "Error");
      if (response.ok) await reloadCase();
    });
  }

  function generateAiDraft() {
    startTransition(async () => {
      setAiDraft("");
      const response = await fetch(`/api/osint/cases/${bundle.case.id}/ai-draft`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error ?? "Error");
        return;
      }
      setAiDraft(data.draft ?? "");
      setView("report");
    });
  }

  function approveCase(formData: FormData) {
    startTransition(async () => {
      const response = await fetch(`/api/osint/cases/${bundle.case.id}/approve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          verdict: formData.get("verdict"),
          confidence_score: Number(formData.get("confidence_score")),
          limitations: formData.get("limitations")
        })
      });
      const data = await response.json().catch(() => ({}));
      setMessage(response.ok ? (ar ? "تم اعتماد نتيجة التحقيق." : "Investigation approved.") : data.error ?? "Error");
      if (response.ok) await reloadCase();
    });
  }

  async function createZip() {
    if (zipPassword.length < 8) {
      setMessage(ar ? "اختر كلمة مرور لا تقل عن 8 أحرف لهذه القضية." : "Choose a case password with at least 8 characters.");
      return;
    }
    setZipBusy(true);
    try {
      const reportHtml = buildReportHtml(bundle, approverName, aiDraft, ar);
      const result = await createEncryptedCaseBundle({
        bundle,
        password: zipPassword,
        reportHtml,
        originalFile: localFile,
        frames: localFrames,
        localAnalysis
      });
      if (!result.verified) throw new Error(ar ? "فشل التحقق من بصمة الأصل بعد فك الحزمة." : "Original hash verification failed after extraction.");
      downloadBlob(result.blob, `rasd-osint-${safeFileName(bundle.case.title)}.zip`);
      setMessage(ar ? "تم إنشاء الحزمة المشفرة والتحقق من تطابق بصمة الأصل. كلمة المرور لم تُحفظ." : "Encrypted bundle created and original hash verified. The password was not stored.");
      setZipPassword("");
      setZipDialog(false);
    } catch (error) {
      setMessage(`${ar ? "تعذر إنشاء الحزمة" : "Bundle failed"}: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setZipBusy(false);
    }
  }

  const report = buildReportSections(bundle, approverName, aiDraft, ar);

  return (
    <section dir={ar ? "rtl" : "ltr"} className="osint-workbench">
      <div className="print:hidden flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
        <div>
          <Link href={`/${locale}/dashboard/osint`} className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-electric">
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
            {ar ? "مختبر OSINT" : "OSINT Lab"}
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-slate-950">{bundle.case.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span className={verdictClass(bundle.case.verdict)}>{verdictLabel(bundle.case.verdict, ar)}</span>
            <span>{ar ? "الثقة" : "Confidence"}: {bundle.case.confidence_score}%</span>
            <span>{formatDate(bundle.case.updated_at, locale)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 border border-line bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-electric">
            <Printer className="h-4 w-4" />{ar ? "طباعة التقرير" : "Print report"}
          </button>
          <button type="button" onClick={() => setZipDialog(true)} className="inline-flex items-center gap-2 bg-navy px-3 py-2 text-sm font-semibold text-white">
            <Archive className="h-4 w-4" />{ar ? "حزمة القضية" : "Case bundle"}
          </button>
        </div>
      </div>

      {message ? <p className="print:hidden mt-4 border border-line bg-white px-4 py-3 text-sm text-slate-700">{message}</p> : null}

      <div className="print:hidden mt-5 overflow-x-auto border-y border-line bg-slate-50">
        <div className="flex min-w-max">
          {stages.map((stage, index) => {
            const activeIndex = stages.indexOf(bundle.case.workflow_stage);
            const completed = index < activeIndex;
            const active = stage === bundle.case.workflow_stage;
            return (
              <button
                key={stage}
                type="button"
                onClick={() => changeStage(stage)}
                disabled={isPending || (stage === "approval" && !isAdmin)}
                className={[
                  "flex h-14 items-center gap-2 border-s border-line px-4 text-sm font-semibold transition first:border-0",
                  active ? "bg-electric text-white" : completed ? "bg-green-50 text-verified" : "text-slate-600 hover:bg-white"
                ].join(" ")}
              >
                {completed ? <CheckCircle2 className="h-4 w-4" /> : <span className="grid h-5 w-5 place-items-center rounded-full border text-[11px]">{index + 1}</span>}
                {stageLabel(stage, ar)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="print:hidden mt-5 flex flex-wrap gap-2 border-b border-line pb-3">
        {(["workspace", "evidence", "findings", "tools", "report", "timeline"] as View[]).map((item) => (
          <button key={item} type="button" onClick={() => setView(item)} className={view === item ? "bg-navy px-3 py-2 text-sm font-semibold text-white" : "px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"}>
            {viewLabel(item, ar)}
          </button>
        ))}
      </div>

      <div className="print:hidden mt-6">
        {view === "workspace" ? (
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-8">
              <section>
                <div className="flex items-center gap-2 border-b border-line pb-3">
                  <ScanLine className="h-5 w-5 text-electric" />
                  <h2 className="font-semibold text-slate-950">{ar ? "التحليل المحلي للوسائط" : "Local media analysis"}</h2>
                </div>
                <div className="mt-4 border-2 border-dashed border-line bg-slate-50 p-5 text-center">
                  <input
                    type="file"
                    accept="image/*,video/*,.pdf"
                    onChange={(event) => selectLocalFile(event.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-slate-600 file:me-4 file:border-0 file:bg-navy file:px-4 file:py-2 file:font-semibold file:text-white"
                  />
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    {ar ? "يبقى الأصل داخل هذا المتصفح. تُحفظ في رصد البصمة والنتائج النصية فقط." : "The original stays in this browser. Rasd stores only its hash and textual results."}
                  </p>
                </div>

                {analysisBusy ? (
                  <div className="mt-4 flex items-center gap-3 bg-slate-50 p-4 text-sm text-slate-600">
                    <Loader2 className="h-5 w-5 animate-spin text-electric" />{ar ? "جاري حساب البصمة وتحليل الملف..." : "Hashing and analyzing locally..."}
                  </div>
                ) : null}

                {localFile && previewUrl ? (
                  <div className="mt-5">
                    {localFile.type.startsWith("image/") ? (
                      <img src={previewUrl} alt="" className="max-h-[520px] w-full object-contain bg-slate-950" />
                    ) : localFile.type.startsWith("video/") ? (
                      <video src={previewUrl} controls className="max-h-[520px] w-full bg-slate-950" />
                    ) : (
                      <div className="flex items-center gap-3 bg-slate-100 p-4"><FileCheck2 className="h-6 w-6" />{localFile.name}</div>
                    )}
                  </div>
                ) : null}

                {localAnalysis ? (
                  <div className="mt-5 space-y-5">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <Metric label={ar ? "SHA-256" : "SHA-256"} value={`${localAnalysis.sha256.slice(0, 14)}...`} icon={<Fingerprint className="h-4 w-4" />} />
                      <Metric label={ar ? "الحجم" : "Size"} value={formatBytes(localAnalysis.fileSize)} icon={<Archive className="h-4 w-4" />} />
                      <Metric label={ar ? "النوع الداخلي" : "Detected type"} value={localAnalysis.detectedMime} icon={<FileSearch className="h-4 w-4" />} />
                      <Metric label={ar ? "الأبعاد/المدة" : "Dimensions/duration"} value={formatDimensions(localAnalysis)} icon={localAnalysis.durationSeconds ? <Video className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />} />
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="border border-line p-4">
                        <h3 className="font-semibold text-slate-900">{ar ? "البيانات الوصفية" : "Metadata"}</h3>
                        <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words bg-slate-950 p-3 text-xs leading-5 text-slate-200">{JSON.stringify(localAnalysis.metadata, null, 2)}</pre>
                      </div>
                      <div className="border border-line p-4">
                        <h3 className="font-semibold text-slate-900">C2PA / Content Credentials</h3>
                        <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words bg-slate-950 p-3 text-xs leading-5 text-slate-200">{localAnalysis.c2pa ? JSON.stringify(localAnalysis.c2pa, null, 2) : (ar ? "لا توجد بيانات C2PA قابلة للقراءة." : "No readable C2PA data.")}</pre>
                      </div>
                    </div>
                    {localAnalysis.warnings.length ? (
                      <ul className="space-y-2 border-s-4 border-amber-400 bg-amber-50 p-4 text-sm text-amber-900">
                        {localAnalysis.warnings.map((warning) => <li key={warning}>• {warning}</li>)}
                      </ul>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={saveLocalEvidence} disabled={isPending} className="inline-flex items-center gap-2 bg-electric px-4 py-2 text-sm font-semibold text-white">
                        <Save className="h-4 w-4" />{ar ? "حفظ البصمة والنتائج" : "Save hash and results"}
                      </button>
                      <button type="button" onClick={runOcr} disabled={ocrBusy} className="inline-flex items-center gap-2 border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                        {ocrBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquareText className="h-4 w-4" />}
                        {ar ? "استخراج النص OCR" : "Run OCR"}
                      </button>
                    </div>
                  </div>
                ) : null}

                {frameUrls.length ? (
                  <div className="mt-6">
                    <h3 className="font-semibold text-slate-900">{ar ? "إطارات الفيديو المستخرجة محليا" : "Locally extracted video frames"}</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {frameUrls.map((frame) => (
                        <figure key={frame.sha256} className="border border-line bg-white p-2">
                          <img src={frame.url} alt="" className="aspect-video w-full object-cover bg-slate-950" />
                          <figcaption className="mt-2 break-all text-xs text-slate-500">{frame.timeSeconds.toFixed(2)}s · {frame.sha256.slice(0, 18)}...</figcaption>
                        </figure>
                      ))}
                    </div>
                  </div>
                ) : null}

                {ocrBusy || ocrText ? (
                  <div className="mt-6 border border-line p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-slate-900">OCR</h3>
                      <span className="text-xs text-slate-500">{Math.round(ocrProgress * 100)}%</span>
                    </div>
                    <textarea value={ocrText} onChange={(event) => setOcrText(event.target.value)} className="mt-3 min-h-40 w-full border border-line p-3 text-sm leading-7 outline-none focus:border-electric" placeholder={ar ? "النص المستخرج يظهر هنا..." : "Extracted text appears here..."} />
                    <button type="button" onClick={saveOcrFinding} disabled={!ocrText.trim() || isPending} className="mt-3 bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                      {ar ? "تسجيله كنتيجة تحتاج مراجعة" : "Record as a finding requiring review"}
                    </button>
                  </div>
                ) : null}
              </section>

              <section>
                <h2 className="border-b border-line pb-3 font-semibold text-slate-950">{ar ? "الادعاءات" : "Claims"}</h2>
                <div className="mt-3 space-y-2">
                  {bundle.claims.map((claim) => (
                    <div key={claim.id} className="border-s-4 border-electric bg-slate-50 px-4 py-3">
                      <p className="text-sm leading-7 text-slate-800">{claim.claim_text}</p>
                      <span className="mt-1 block text-xs text-slate-500">{claim.claim_type} · {claim.status}</span>
                    </div>
                  ))}
                </div>
                <form action={addClaim} className="mt-4 grid gap-2 md:grid-cols-[160px_1fr_44px]">
                  <select name="claim_type" className="border border-line bg-white px-3 py-2 text-sm">
                    <option value="supporting">{ar ? "ادعاء مساعد" : "Supporting claim"}</option>
                    <option value="primary">{ar ? "ادعاء رئيسي" : "Primary claim"}</option>
                    <option value="context">{ar ? "سياق" : "Context"}</option>
                  </select>
                  <input name="claim_text" required className="border border-line px-3 py-2 text-sm outline-none focus:border-electric" placeholder={ar ? "أضف ادعاء محددا قابلا للتحقق" : "Add a specific, testable claim"} />
                  <button className="grid place-items-center bg-electric text-white" title={ar ? "إضافة" : "Add"}><Plus className="h-4 w-4" /></button>
                </form>
              </section>
            </div>

            <aside className="border-s border-line ps-5">
              <h2 className="font-semibold text-slate-950">{ar ? "بيانات القضية" : "Case details"}</h2>
              <form key={bundle.case.updated_at} action={updateCase} className="mt-4 space-y-3">
                <label className="block text-xs font-semibold text-slate-600">
                  {ar ? "العنوان" : "Title"}
                  <input name="title" defaultValue={bundle.case.title} required className="mt-1 w-full border border-line px-3 py-2 text-sm font-normal text-slate-900" />
                </label>
                <label className="block text-xs font-semibold text-slate-600">
                  {ar ? "الوصف والسياق" : "Description and context"}
                  <textarea name="description" defaultValue={bundle.case.description ?? ""} className="mt-1 min-h-24 w-full border border-line p-3 text-sm font-normal leading-6 text-slate-900" />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-xs font-semibold text-slate-600">
                    {ar ? "التقييم الأولي" : "Preliminary verdict"}
                    <select name="verdict" defaultValue={nonFinalVerdict(bundle.case.verdict)} className="mt-1 w-full border border-line bg-white px-3 py-2 text-sm font-normal">
                      <option value="inconclusive">{verdictLabel("inconclusive", ar)}</option>
                      <option value="needs_evidence">{verdictLabel("needs_evidence", ar)}</option>
                      <option value="likely">{verdictLabel("likely", ar)}</option>
                    </select>
                  </label>
                  <label className="block text-xs font-semibold text-slate-600">
                    {ar ? "الثقة %" : "Confidence %"}
                    <input name="confidence_score" type="number" min="0" max="100" defaultValue={bundle.case.confidence_score} className="mt-1 w-full border border-line px-3 py-2 text-sm font-normal" />
                  </label>
                </div>
                <label className="block text-xs font-semibold text-slate-600">
                  {ar ? "حدود التحقيق وما لم يثبت" : "Limitations and unresolved points"}
                  <textarea name="limitations" defaultValue={bundle.case.limitations ?? ""} className="mt-1 min-h-24 w-full border border-line p-3 text-sm font-normal leading-6 text-slate-900" />
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input name="sensitive_material" type="checkbox" defaultChecked={bundle.case.sensitive_material} />
                  <TriangleAlert className="h-4 w-4 text-urgent" />
                  {ar ? "مادة حساسة" : "Sensitive material"}
                </label>
                <label className="block text-xs font-semibold text-slate-600">
                  {ar ? "سبب المصلحة العامة" : "Public-interest reason"}
                  <textarea name="public_interest_reason" defaultValue={bundle.case.public_interest_reason ?? ""} className="mt-1 min-h-20 w-full border border-line p-3 text-sm font-normal leading-6 text-slate-900" />
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input name="ai_enabled" type="checkbox" defaultChecked={bundle.case.ai_enabled} />
                  <Bot className="h-4 w-4 text-electric" />
                  {ar ? "السماح بمسودة AI نصية اختيارية" : "Allow optional text-only AI draft"}
                </label>
                <button disabled={isPending} className="inline-flex w-full items-center justify-center gap-2 bg-electric px-4 py-2.5 text-sm font-semibold text-white">
                  <Save className="h-4 w-4" />{ar ? "حفظ" : "Save"}
                </button>
              </form>
            </aside>
          </div>
        ) : null}

        {view === "evidence" ? (
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div>
              <h2 className="border-b border-line pb-3 font-semibold text-slate-950">{ar ? "سجل الأدلة" : "Evidence register"}</h2>
              <div className="mt-4 space-y-3">
                {bundle.evidence.map((evidence) => (
                  <EvidenceRow key={evidence.id} evidence={evidence} ar={ar} />
                ))}
                {!bundle.evidence.length ? <p className="py-8 text-center text-sm text-slate-500">{ar ? "لا توجد أدلة مسجلة بعد." : "No evidence recorded yet."}</p> : null}
              </div>
            </div>
            <aside className="border-s border-line ps-5">
              <h2 className="font-semibold text-slate-950">{ar ? "إضافة رابط أو دليل نصي" : "Add URL or text evidence"}</h2>
              <form action={addEvidence} className="mt-4 space-y-3">
                <input name="title" required className="w-full border border-line px-3 py-2 text-sm" placeholder={ar ? "عنوان الدليل" : "Evidence title"} />
                <input name="source_url" type="url" className="w-full border border-line px-3 py-2 text-sm" placeholder="https://..." />
                <textarea name="notes" className="min-h-28 w-full border border-line p-3 text-sm" placeholder={ar ? "المحتوى أو الملاحظات وسياق الحصول عليه" : "Content, notes, and acquisition context"} />
                <button className="w-full bg-electric px-4 py-2 text-sm font-semibold text-white">{ar ? "إضافة الدليل" : "Add evidence"}</button>
              </form>
            </aside>
          </div>
        ) : null}

        {view === "findings" ? (
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_400px]">
            <div>
              <h2 className="border-b border-line pb-3 font-semibold text-slate-950">{ar ? "نتائج التحقيق" : "Investigation findings"}</h2>
              <div className="mt-4 space-y-3">
                {bundle.findings.map((finding) => <FindingRow key={finding.id} finding={finding} ar={ar} tools={bundle.tools} />)}
                {!bundle.findings.length ? <p className="py-8 text-center text-sm text-slate-500">{ar ? "لم تسجل نتائج بعد." : "No findings recorded yet."}</p> : null}
              </div>
            </div>
            <aside className="border-s border-line ps-5">
              <h2 className="font-semibold text-slate-950">{ar ? "تسجيل نتيجة" : "Record a finding"}</h2>
              <form action={addFinding} className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <select name="stage" defaultValue={bundle.case.workflow_stage} className="border border-line bg-white px-3 py-2 text-sm">
                    {stages.filter((stage) => stage !== "approval").map((stage) => <option key={stage} value={stage}>{stageLabel(stage, ar)}</option>)}
                  </select>
                  <select name="stance" className="border border-line bg-white px-3 py-2 text-sm">
                    <option value="neutral">{ar ? "محايد" : "Neutral"}</option>
                    <option value="supporting">{ar ? "مؤيد للادعاء" : "Supporting"}</option>
                    <option value="opposing">{ar ? "معارض للادعاء" : "Opposing"}</option>
                  </select>
                </div>
                <input name="title" required className="w-full border border-line px-3 py-2 text-sm" placeholder={ar ? "عنوان النتيجة" : "Finding title"} />
                <textarea name="body" required className="min-h-36 w-full border border-line p-3 text-sm leading-7" placeholder={ar ? "ما الذي فُحص؟ ماذا وجدت؟ وما حدود الاستنتاج؟" : "What was checked, what was found, and what are the limits?"} />
                <select name="tool_id" className="w-full border border-line bg-white px-3 py-2 text-sm">
                  <option value="">{ar ? "الأداة المستخدمة، إن وجدت" : "Tool used, if any"}</option>
                  {bundle.tools.map((tool) => <option key={tool.id} value={tool.id}>{tool.name}</option>)}
                </select>
                <select name="evidence_id" className="w-full border border-line bg-white px-3 py-2 text-sm">
                  <option value="">{ar ? "الدليل المرتبط، إن وجد" : "Linked evidence, if any"}</option>
                  {bundle.evidence.map((evidence) => <option key={evidence.id} value={evidence.id}>{evidence.title}</option>)}
                </select>
                <input name="source_url" type="url" className="w-full border border-line px-3 py-2 text-sm" placeholder={ar ? "رابط النتيجة أو المصدر" : "Finding or source URL"} />
                <label className="block text-xs font-semibold text-slate-600">
                  {ar ? "الثقة في هذه النتيجة" : "Finding confidence"}
                  <input name="confidence_score" type="range" min="0" max="100" defaultValue="50" className="mt-2 w-full accent-[#76b82a]" />
                </label>
                <button className="w-full bg-electric px-4 py-2 text-sm font-semibold text-white">{ar ? "تسجيل النتيجة" : "Record finding"}</button>
              </form>
            </aside>
          </div>
        ) : null}

        {view === "tools" ? (
          <div>
            <h2 className="border-b border-line pb-3 font-semibold text-slate-950">{ar ? "أدوات التحقق الموصى بها" : "Recommended verification tools"}</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {bundle.tools.map((tool) => (
                <div key={tool.id} className="border border-line bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs font-medium text-electric">{tool.category}</span>
                      <h3 className="mt-1 font-semibold text-slate-950">{tool.name}</h3>
                    </div>
                    <a href={tool.url} target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center border border-line text-slate-600 hover:border-electric hover:text-electric">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{tool.instructions_ar}</p>
                  <p className="mt-3 text-xs text-slate-500">{tool.execution_mode === "automatic" ? (ar ? "آلي" : "Automatic") : (ar ? "يدوي" : "Manual")} · {tool.access_model === "free" ? (ar ? "مجاني" : "Free") : (ar ? "يتطلب حسابا" : "Account required")}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {view === "report" ? (
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
            <ReportContent report={report} ar={ar} />
            <aside className="border-s border-line ps-5">
              <h2 className="font-semibold text-slate-950">{ar ? "المراجعة والاعتماد" : "Review and approval"}</h2>
              {bundle.case.ai_enabled ? (
                <button type="button" onClick={generateAiDraft} disabled={isPending} className="mt-4 inline-flex w-full items-center justify-center gap-2 border border-electric bg-white px-4 py-2 text-sm font-semibold text-verified">
                  <Bot className="h-4 w-4" />{ar ? "إعداد مسودة AI نصية" : "Prepare text-only AI draft"}
                </button>
              ) : (
                <p className="mt-3 text-sm leading-6 text-slate-500">{ar ? "مسودة AI معطلة. فعّلها من بيانات القضية إن احتجتها؛ لا تؤثر في الحكم." : "AI draft is disabled. Enable it in case details if needed; it cannot approve a verdict."}</p>
              )}
              {isAdmin ? (
                <form action={approveCase} className="mt-6 space-y-3 border-t border-line pt-5">
                  <select name="verdict" className="w-full border border-line bg-white px-3 py-2 text-sm">
                    <option value="verified">{verdictLabel("verified", ar)}</option>
                    <option value="misleading">{verdictLabel("misleading", ar)}</option>
                  </select>
                  <input name="confidence_score" type="number" min="60" max="100" defaultValue={Math.max(60, bundle.case.confidence_score)} className="w-full border border-line px-3 py-2 text-sm" />
                  <textarea name="limitations" required minLength={10} defaultValue={bundle.case.limitations ?? ""} className="min-h-28 w-full border border-line p-3 text-sm leading-6" placeholder={ar ? "حدود التحقيق وما لم يثبت" : "Limitations and unresolved points"} />
                  <button className="inline-flex w-full items-center justify-center gap-2 bg-navy px-4 py-2.5 text-sm font-semibold text-white">
                    <ShieldCheck className="h-4 w-4" />{ar ? "اعتماد النتيجة النهائية" : "Approve final verdict"}
                  </button>
                  <p className="text-xs leading-5 text-slate-500">{ar ? "لن يقبل النظام الاعتماد دون ادعاء ودليل ونتائج لمرحلتي المصدر والمضمون." : "Approval requires a claim, evidence, and source/content findings."}</p>
                </form>
              ) : (
                <p className="mt-5 border-s-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900">{ar ? "الأدمن وحده يستطيع اعتماد متحقق أو مضلل." : "Only an admin can approve Verified or Misleading."}</p>
              )}
            </aside>
          </div>
        ) : null}

        {view === "timeline" ? (
          <div className="max-w-4xl">
            <h2 className="border-b border-line pb-3 font-semibold text-slate-950">{ar ? "سجل الإجراءات" : "Activity log"}</h2>
            <div className="relative mt-5 space-y-4 ps-8">
              <div className="absolute inset-y-0 start-2 w-px bg-line" />
              {bundle.events.map((event) => (
                <div key={event.id} className="relative border border-line bg-white p-4">
                  <span className="absolute -start-[27px] top-5 h-3 w-3 rounded-full bg-electric ring-4 ring-green-100" />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{event.description}</h3>
                    <span className="text-xs text-slate-500">{formatDate(event.created_at, locale)}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{event.action}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="osint-print-report hidden print:block">
        <ReportContent report={report} ar={ar} />
      </div>

      {zipDialog ? (
        <div className="print:hidden fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md bg-white p-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center bg-navy text-white"><LockKeyhole className="h-5 w-5" /></span>
              <div>
                <h2 className="font-semibold text-slate-950">{ar ? "تشفير حزمة القضية" : "Encrypt case bundle"}</h2>
                <p className="mt-1 text-xs text-slate-500">{ar ? "اختر كلمة مختلفة لهذه القضية. لن تُرسل أو تُحفظ." : "Choose a unique password. It will not be sent or stored."}</p>
              </div>
            </div>
            <input type="password" value={zipPassword} onChange={(event) => setZipPassword(event.target.value)} minLength={8} autoFocus className="mt-5 w-full border border-line px-3 py-3 text-sm outline-none focus:border-electric" placeholder={ar ? "8 أحرف على الأقل" : "At least 8 characters"} />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => { setZipDialog(false); setZipPassword(""); }} className="border border-line px-4 py-2 text-sm font-semibold text-slate-700">{ar ? "إلغاء" : "Cancel"}</button>
              <button type="button" onClick={createZip} disabled={zipBusy || zipPassword.length < 8} className="inline-flex items-center gap-2 bg-electric px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {zipBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {ar ? "إنشاء وتنزيل" : "Create and download"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="border border-line bg-white p-3">
      <div className="flex items-center gap-2 text-xs text-slate-500">{icon}{label}</div>
      <p className="mt-2 break-all text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function EvidenceRow({ evidence, ar }: { evidence: OsintEvidence; ar: boolean }) {
  return (
    <div className="border border-line bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="text-xs font-medium text-electric">{evidence.evidence_type}</span>
          <h3 className="mt-1 font-semibold text-slate-950">{evidence.title}</h3>
        </div>
        <div className="flex gap-2">
          {evidence.source_url ? <a href={evidence.source_url} target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center border border-line text-slate-600"><ExternalLink className="h-4 w-4" /></a> : null}
          {evidence.telegram_object_path ? <a href={`/api/osint/evidence/${evidence.id}/download`} className="inline-flex items-center gap-2 bg-navy px-3 py-2 text-xs font-semibold text-white"><Download className="h-4 w-4" />{ar ? "تنزيل مؤقت" : "Temporary download"}</a> : null}
        </div>
      </div>
      {evidence.notes ? <p className="mt-3 text-sm leading-6 text-slate-600">{evidence.notes}</p> : null}
      <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
        {evidence.sha256 ? <span className="break-all">SHA-256: {evidence.sha256}</span> : null}
        {evidence.file_size ? <span>{formatBytes(evidence.file_size)}</span> : null}
        {evidence.expires_at ? <span>{ar ? "ينتهي" : "Expires"}: {new Date(evidence.expires_at).toLocaleString()}</span> : null}
        <span>{evidence.local_only ? (ar ? "الأصل محلي فقط" : "Original is local only") : (ar ? "مادة مسجلة" : "Recorded material")}</span>
      </div>
    </div>
  );
}

function FindingRow({ finding, ar, tools }: { finding: OsintFinding; ar: boolean; tools: OsintCaseBundle["tools"] }) {
  const tool = tools.find((item) => item.id === finding.tool_id);
  return (
    <div className={`border-s-4 bg-white p-4 ${finding.stance === "supporting" ? "border-green-500" : finding.stance === "opposing" ? "border-urgent" : "border-slate-300"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-medium text-slate-500">{stageLabel(finding.stage, ar)}{tool ? ` · ${tool.name}` : ""}</span>
          <h3 className="mt-1 font-semibold text-slate-950">{finding.title}</h3>
        </div>
        <span className="text-sm font-semibold text-slate-700">{finding.confidence_score}%</span>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{finding.body}</p>
      {finding.source_url ? <a href={finding.source_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-electric underline"><ExternalLink className="h-3.5 w-3.5" />{ar ? "فتح المصدر" : "Open source"}</a> : null}
    </div>
  );
}

type ReportSections = ReturnType<typeof buildReportSections>;

function ReportContent({ report, ar }: { report: ReportSections; ar: boolean }) {
  return (
    <article className="osint-report max-w-4xl bg-white">
      <header className="border-b-4 border-electric pb-5">
        <p className="text-sm font-semibold text-electric">RASD · OSINT</p>
        <h1 className="mt-2 text-3xl font-bold leading-tight text-slate-950">{report.title}</h1>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
          <span>{report.verdict}</span><span>{report.confidence}</span><span>{report.date}</span>
        </div>
      </header>
      {report.sections.map((section) => (
        <section key={section.title} className="mt-7 break-inside-avoid">
          <h2 className="border-b border-line pb-2 text-lg font-semibold text-slate-950">{section.title}</h2>
          {section.items.length ? (
            <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
              {section.items.map((item, index) => <li key={`${section.title}-${index}`} className="whitespace-pre-wrap">{item}</li>)}
            </ul>
          ) : <p className="mt-3 text-sm text-slate-500">{ar ? "لم تسجل معلومات بعد." : "No information recorded yet."}</p>}
        </section>
      ))}
      <footer className="mt-10 border-t border-line pt-4 text-xs leading-6 text-slate-500">
        {report.footer}
      </footer>
    </article>
  );
}

function buildReportSections(bundle: OsintCaseBundle, approverName: string, aiDraft: string, ar: boolean) {
  const supporting = bundle.findings.filter((finding) => finding.stance === "supporting");
  const opposing = bundle.findings.filter((finding) => finding.stance === "opposing");
  const methods = bundle.findings.map((finding) => `${stageLabel(finding.stage, ar)}: ${finding.title} - ${finding.body}`);
  return {
    title: bundle.case.title,
    verdict: `${ar ? "الحكم" : "Verdict"}: ${verdictLabel(bundle.case.verdict, ar)}`,
    confidence: `${ar ? "درجة الثقة" : "Confidence"}: ${bundle.case.confidence_score}%`,
    date: new Date(bundle.case.updated_at).toLocaleString(ar ? "ar-SA" : "en-US", { timeZone: "Asia/Riyadh" }),
    sections: [
      {
        title: ar ? "الملخص التنفيذي" : "Executive summary",
        items: [bundle.case.description || (ar ? "لا يوجد ملخص بعد." : "No summary yet.")]
      },
      {
        title: ar ? "الادعاءات" : "Claims",
        items: bundle.claims.map((claim) => `${claim.claim_text} (${claim.status})`)
      },
      {
        title: ar ? "منهج التحقق" : "Verification method",
        items: methods
      },
      {
        title: ar ? "الأدلة المؤيدة" : "Supporting evidence",
        items: supporting.map((finding) => `${finding.title}: ${finding.body}`)
      },
      {
        title: ar ? "الأدلة المعارضة أو المتعارضة" : "Opposing or conflicting evidence",
        items: opposing.map((finding) => `${finding.title}: ${finding.body}`)
      },
      {
        title: ar ? "سجل الأدلة والبصمات" : "Evidence and hashes",
        items: bundle.evidence.map((evidence) => `${evidence.title}${evidence.sha256 ? ` · SHA-256 ${evidence.sha256}` : ""}${evidence.source_url ? ` · ${evidence.source_url}` : ""}`)
      },
      {
        title: ar ? "حدود التحقيق وما لم يثبت" : "Limitations and unresolved points",
        items: [bundle.case.limitations || (ar ? "لم تُسجل الحدود بعد." : "Limitations have not been recorded.")]
      },
      ...(aiDraft ? [{ title: ar ? "مسودة صياغة AI غير معتمدة" : "Unapproved AI drafting aid", items: [aiDraft] }] : [])
    ],
    footer: bundle.case.approved_at
      ? `${ar ? "اعتمد التقرير" : "Approved by"}: ${approverName} · ${new Date(bundle.case.approved_at).toLocaleString(ar ? "ar-SA" : "en-US")}`
      : ar
        ? "هذه مسودة تحقيق غير معتمدة. لا تمثل حكما نهائيا قبل توقيع الأدمن."
        : "This is an unapproved investigation draft and is not a final verdict until signed by an admin."
  };
}

function buildReportHtml(bundle: OsintCaseBundle, approverName: string, aiDraft: string, ar: boolean) {
  const report = buildReportSections(bundle, approverName, aiDraft, ar);
  return `<!doctype html><html lang="${ar ? "ar" : "en"}" dir="${ar ? "rtl" : "ltr"}"><meta charset="utf-8"><title>${escapeHtml(report.title)}</title><style>body{font-family:Arial,sans-serif;max-width:900px;margin:40px auto;color:#172012;line-height:1.8}header{border-bottom:4px solid #76b82a}h2{border-bottom:1px solid #dfe8d8;padding-bottom:6px;margin-top:28px}small{color:#64748b}li{margin:8px 0;white-space:pre-wrap}</style><header><small>RASD · OSINT</small><h1>${escapeHtml(report.title)}</h1><p>${escapeHtml(report.verdict)} · ${escapeHtml(report.confidence)} · ${escapeHtml(report.date)}</p></header>${report.sections.map((section) => `<section><h2>${escapeHtml(section.title)}</h2><ul>${section.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>`).join("")}<footer><small>${escapeHtml(report.footer)}</small></footer></html>`;
}

function viewLabel(view: View, ar: boolean) {
  const labels: Record<View, [string, string]> = {
    workspace: ["مساحة العمل", "Workspace"],
    evidence: ["الأدلة", "Evidence"],
    findings: ["النتائج", "Findings"],
    tools: ["الأدوات", "Tools"],
    report: ["التقرير والاعتماد", "Report & approval"],
    timeline: ["سجل الإجراءات", "Activity log"]
  };
  return labels[view][ar ? 0 : 1];
}

function stageLabel(stage: OsintStage, ar: boolean) {
  const labels: Record<OsintStage, [string, string]> = {
    planning: ["التخطيط", "Planning"],
    preservation: ["حفظ الدليل", "Preservation"],
    source: ["المصدر", "Source"],
    content: ["المضمون", "Content"],
    geotime: ["المكان والزمان", "Place & time"],
    specialist: ["التحقق المتخصص", "Specialist checks"],
    review: ["المراجعة", "Review"],
    approval: ["الاعتماد", "Approval"]
  };
  return labels[stage][ar ? 0 : 1];
}

function verdictLabel(verdict: OsintVerdict, ar: boolean) {
  const labels: Record<OsintVerdict, [string, string]> = {
    inconclusive: ["غير محسوم", "Inconclusive"],
    needs_evidence: ["يحتاج أدلة", "Needs evidence"],
    likely: ["مرجح", "Likely"],
    verified: ["متحقق", "Verified"],
    misleading: ["مضلل", "Misleading"]
  };
  return labels[verdict][ar ? 0 : 1];
}

function verdictClass(verdict: OsintVerdict) {
  const base = "px-2.5 py-1 text-xs font-semibold";
  if (verdict === "verified") return `${base} bg-green-100 text-green-800`;
  if (verdict === "misleading") return `${base} bg-red-100 text-red-800`;
  if (verdict === "likely") return `${base} bg-amber-100 text-amber-800`;
  return `${base} bg-slate-100 text-slate-700`;
}

function nonFinalVerdict(verdict: OsintVerdict): "inconclusive" | "needs_evidence" | "likely" {
  return verdict === "verified" || verdict === "misleading" ? "likely" : verdict;
}

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Riyadh"
  }).format(new Date(value));
}

function formatBytes(value: number) {
  if (value >= 1024 * 1024 * 1024) return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(2)} MB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${value} B`;
}

function formatDimensions(analysis: LocalFileAnalysis) {
  if (analysis.durationSeconds) return `${analysis.width ?? "?"}×${analysis.height ?? "?"} · ${analysis.durationSeconds.toFixed(1)}s`;
  return analysis.width && analysis.height ? `${analysis.width}×${analysis.height}` : "—";
}

function safeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "_").slice(0, 80) || "case";
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
