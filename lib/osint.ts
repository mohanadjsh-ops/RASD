import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type {
  OsintCase,
  OsintCaseEvent,
  OsintClaim,
  OsintCaseBundle,
  OsintEvidence,
  OsintFinding,
  OsintTool
} from "@/types/app";

export async function getOsintCaseBundle(
  caseId: string,
  client?: SupabaseClient
): Promise<OsintCaseBundle | null> {
  const supabase = client ?? createSupabaseServiceClient();
  const [caseResult, claimsResult, evidenceResult, findingsResult, eventsResult, toolsResult] = await Promise.all([
    supabase.from("osint_cases").select("*").eq("id", caseId).maybeSingle(),
    supabase.from("osint_claims").select("*").eq("case_id", caseId).order("created_at"),
    supabase.from("osint_evidence").select("*").eq("case_id", caseId).order("created_at", { ascending: false }),
    supabase.from("osint_findings").select("*").eq("case_id", caseId).order("created_at", { ascending: false }),
    supabase.from("osint_case_events").select("*").eq("case_id", caseId).order("created_at", { ascending: false }),
    supabase.from("osint_tools").select("*").eq("enabled", true).order("category").order("name")
  ]);

  if (!caseResult.data) return null;
  return {
    case: caseResult.data as OsintCase,
    claims: (claimsResult.data ?? []) as OsintClaim[],
    evidence: (evidenceResult.data ?? []) as OsintEvidence[],
    findings: (findingsResult.data ?? []) as OsintFinding[],
    events: (eventsResult.data ?? []) as OsintCaseEvent[],
    tools: (toolsResult.data ?? []) as OsintTool[]
  };
}

export async function addOsintEvent(input: {
  caseId: string;
  userId?: string | null;
  action: string;
  description: string;
  metadata?: Record<string, unknown>;
}, client?: SupabaseClient) {
  const supabase = client ?? createSupabaseServiceClient();
  await supabase.from("osint_case_events").insert({
    case_id: input.caseId,
    created_by: input.userId ?? null,
    action: input.action,
    description: input.description,
    metadata: input.metadata ?? {}
  });
  await supabase
    .from("osint_cases")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", input.caseId);
}

export function validateApproval(bundle: OsintCaseBundle) {
  const errors: string[] = [];
  const stages = new Set(bundle.findings.map((finding) => finding.stage));

  if (!bundle.claims.length) errors.push("أضف ادعاء رئيسيا واحدا على الأقل.");
  if (!bundle.evidence.length) errors.push("أضف دليلا واحدا على الأقل.");
  if (!stages.has("source")) errors.push("أكمل نتيجة التحقق من المصدر.");
  if (!stages.has("content")) errors.push("أكمل نتيجة التحقق من المضمون.");
  if (!bundle.case.limitations?.trim()) errors.push("سجل حدود التحقيق وما لم يمكن إثباته.");
  if (bundle.case.sensitive_material && !bundle.case.public_interest_reason?.trim()) {
    errors.push("المادة الحساسة تحتاج إلى سبب مصلحة عامة موثق.");
  }
  if (bundle.case.confidence_score < 60) errors.push("درجة الثقة للاعتماد النهائي يجب ألا تقل عن 60%.");
  return errors;
}

export function newTelegramLinkCode() {
  return randomBytes(4).toString("hex").toUpperCase();
}

export function hashTelegramLinkCode(code: string) {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}
