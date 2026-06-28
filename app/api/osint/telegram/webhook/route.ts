import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { addOsintEvent, hashTelegramLinkCode } from "@/lib/osint";
import {
  downloadOsintTelegramFile,
  escapeTelegramHtml,
  sendOsintTelegramMessage
} from "@/lib/notifications/osint-telegram";

export const maxDuration = 60;

type TelegramFile = {
  file_id: string;
  file_size?: number;
  file_name?: string;
  mime_type?: string;
  width?: number;
  height?: number;
};

type TelegramMessage = {
  message_id: number;
  text?: string;
  caption?: string;
  chat: { id: number | string; username?: string };
  from?: { username?: string };
  document?: TelegramFile;
  video?: TelegramFile;
  photo?: TelegramFile[];
};

type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
};

export async function POST(request: Request) {
  if (
    !serverEnv.TELEGRAM_OSINT_WEBHOOK_SECRET ||
    request.headers.get("x-telegram-bot-api-secret-token") !== serverEnv.TELEGRAM_OSINT_WEBHOOK_SECRET
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!serverEnv.TELEGRAM_OSINT_BOT_TOKEN) {
    return NextResponse.json({ error: "OSINT bot is not configured." }, { status: 503 });
  }

  const update = (await request.json()) as TelegramUpdate;
  if (!update.message) return NextResponse.json({ ok: true });
  const message = update.message;
  const chatId = String(message.chat.id);
  const text = (message.text ?? message.caption ?? "").trim();
  const supabase = createSupabaseServiceClient();

  try {
    if (text.startsWith("/start")) {
      const code = text.split(/\s+/)[1]?.trim().toUpperCase();
      if (!code) {
        await sendOsintTelegramMessage(chatId, "افتح مختبر OSINT داخل رصد وأنشئ رمز الربط، ثم أرسل <code>/start الرمز</code>.");
        return NextResponse.json({ ok: true });
      }
      const { data: link } = await supabase
        .from("osint_telegram_links")
        .select("id,user_id")
        .eq("link_code_hash", hashTelegramLinkCode(code))
        .gt("link_code_expires_at", new Date().toISOString())
        .maybeSingle();
      if (!link) {
        await sendOsintTelegramMessage(chatId, "رمز الربط غير صالح أو انتهت مدته. أنشئ رمزا جديدا من الموقع.");
        return NextResponse.json({ ok: true });
      }
      await supabase
        .from("osint_telegram_links")
        .update({
          chat_id: chatId,
          telegram_username: message.from?.username ?? message.chat.username ?? null,
          verified_at: new Date().toISOString(),
          link_code_hash: null,
          link_code_expires_at: null,
          updated_at: new Date().toISOString()
        })
        .eq("id", link.id);
      await sendOsintTelegramMessage(chatId, "تم ربط حسابك بمختبر OSINT في رصد. استخدم <code>/new عنوان القضية</code> لبدء تحقيق.");
      return NextResponse.json({ ok: true });
    }

    const { data: link } = await supabase
      .from("osint_telegram_links")
      .select("id,user_id,active_case_id")
      .eq("chat_id", chatId)
      .not("verified_at", "is", null)
      .maybeSingle();
    if (!link) {
      await sendOsintTelegramMessage(chatId, "هذا الحساب غير مربوط. أنشئ رمز ربط من مختبر OSINT داخل رصد.");
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/new")) {
      const title = text.replace(/^\/new(?:@\w+)?/i, "").trim();
      if (!title) {
        await sendOsintTelegramMessage(chatId, "اكتب عنوان القضية بعد الأمر، مثال: <code>/new التحقق من فيديو الميناء</code>");
        return NextResponse.json({ ok: true });
      }
      const { data: createdCase, error } = await supabase
        .from("osint_cases")
        .insert({ title: title.slice(0, 180), input_type: "mixed", created_by: link.user_id })
        .select()
        .single();
      if (error) throw error;
      await supabase
        .from("osint_telegram_links")
        .update({ active_case_id: createdCase.id, updated_at: new Date().toISOString() })
        .eq("id", link.id);
      await addOsintEvent({
        caseId: createdCase.id,
        userId: link.user_id,
        action: "case_created_via_telegram",
        description: "تم إنشاء القضية عبر بوت OSINT."
      });
      await sendOsintTelegramMessage(
        chatId,
        `تم إنشاء القضية: <b>${escapeTelegramHtml(createdCase.title)}</b>\nأرسل الآن صورة أو فيديو أو ملفا أو رابطا أو نصا.`
      );
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/cancel")) {
      await supabase
        .from("osint_telegram_links")
        .update({ active_case_id: null, updated_at: new Date().toISOString() })
        .eq("id", link.id);
      await sendOsintTelegramMessage(chatId, "تم إغلاق جلسة الإرسال الحالية. لم تُحذف القضية.");
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/status")) {
      if (!link.active_case_id) {
        await sendOsintTelegramMessage(chatId, "لا توجد قضية نشطة. استخدم <code>/new عنوان القضية</code>.");
        return NextResponse.json({ ok: true });
      }
      const { data: activeCase } = await supabase
        .from("osint_cases")
        .select("id,title,workflow_stage,verdict,confidence_score")
        .eq("id", link.active_case_id)
        .maybeSingle();
      if (!activeCase) {
        await sendOsintTelegramMessage(chatId, "تعذر العثور على القضية النشطة.");
        return NextResponse.json({ ok: true });
      }
      const caseUrl = `${serverEnv.APP_BASE_URL ?? ""}/ar/dashboard/osint/${activeCase.id}`;
      await sendOsintTelegramMessage(
        chatId,
        `<b>${escapeTelegramHtml(activeCase.title)}</b>\nالمرحلة: ${activeCase.workflow_stage}\nالحكم: ${activeCase.verdict}\nالثقة: ${activeCase.confidence_score}%\n<a href="${escapeTelegramHtml(caseUrl)}">فتح القضية في رصد</a>`
      );
      return NextResponse.json({ ok: true });
    }

    if (!link.active_case_id) {
      await sendOsintTelegramMessage(chatId, "ابدأ أولا باستخدام <code>/new عنوان القضية</code>.");
      return NextResponse.json({ ok: true });
    }

    const file = pickTelegramFile(message);
    if (!file) {
      if (!text) return NextResponse.json({ ok: true });
      const isUrl = /^https?:\/\//i.test(text);
      const { data: evidence, error } = await supabase
        .from("osint_evidence")
        .insert({
          case_id: link.active_case_id,
          evidence_type: isUrl ? "url" : "text",
          title: isUrl ? "رابط وارد من تيليغرام" : "نص وارد من تيليغرام",
          source_url: isUrl ? text : null,
          notes: isUrl ? null : text,
          metadata: { telegram_message_id: message.message_id },
          local_only: false,
          created_by: link.user_id
        })
        .select()
        .single();
      if (error) throw error;
      await addOsintEvent({
        caseId: link.active_case_id,
        userId: link.user_id,
        action: "telegram_evidence_added",
        description: "تمت إضافة مادة نصية من بوت OSINT.",
        metadata: { evidence_id: evidence.id }
      });
      await sendOsintTelegramMessage(chatId, "تمت إضافة المادة إلى القضية.");
      return NextResponse.json({ ok: true });
    }

    if ((file.file_size ?? 0) > 20 * 1024 * 1024) {
      const caseUrl = `${serverEnv.APP_BASE_URL ?? ""}/ar/dashboard/osint/${link.active_case_id}`;
      await sendOsintTelegramMessage(
        chatId,
        `حجم الملف أكبر من حد تنزيل بوت تيليغرام (20MB). افتح <a href="${escapeTelegramHtml(caseUrl)}">القضية في رصد</a> وحلله محليا دون رفعه.`
      );
      return NextResponse.json({ ok: true });
    }

    const storageBytes = await getTemporaryStorageBytes();
    const storageRatio = storageBytes / (1024 * 1024 * 1024);
    if (storageRatio >= 0.9) {
      await sendOsintTelegramMessage(chatId, "تم إيقاف استقبال الملفات مؤقتا لأن مساحة OSINT بلغت 90%. استخدم التحليل المحلي داخل الموقع.");
      return NextResponse.json({ ok: true });
    }

    const bytes = await downloadOsintTelegramFile(file.file_id);
    const safeName = sanitizeFileName(file.file_name ?? defaultFileName(file.kind, file.mime_type));
    const objectPath = `${link.active_case_id}/${randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("osint-temp").upload(objectPath, bytes, {
      contentType: file.mime_type ?? "application/octet-stream",
      upsert: false
    });
    if (uploadError) throw uploadError;

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString();
    const { data: evidence, error: evidenceError } = await supabase
      .from("osint_evidence")
      .insert({
        case_id: link.active_case_id,
        evidence_type: "telegram_file",
        title: text || safeName,
        original_filename: safeName,
        mime_type: file.mime_type ?? null,
        file_size: bytes.byteLength,
        metadata: {
          telegram_message_id: message.message_id,
          telegram_file_id: file.file_id,
          original_kind: file.kind,
          width: file.width,
          height: file.height
        },
        local_only: false,
        telegram_object_path: objectPath,
        expires_at: expiresAt,
        created_by: link.user_id
      })
      .select()
      .single();
    if (evidenceError) {
      await supabase.storage.from("osint-temp").remove([objectPath]);
      throw evidenceError;
    }

    await addOsintEvent({
      caseId: link.active_case_id,
      userId: link.user_id,
      action: "telegram_file_received",
      description: `تم استلام ملف مؤقت من تيليغرام: ${safeName}.`,
      metadata: { evidence_id: evidence.id, expires_at: expiresAt, file_size: bytes.byteLength }
    });
    const warning = storageRatio >= 0.8 ? "\nتنبيه: مساحة الملفات المؤقتة تجاوزت 80%." : "";
    await sendOsintTelegramMessage(
      chatId,
      `تم حفظ الملف مؤقتا لمدة 7 أيام وإضافته إلى القضية.${warning}`
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("OSINT Telegram webhook failed", error);
    try {
      await sendOsintTelegramMessage(chatId, "تعذر معالجة المادة حاليا. حاول مجددا أو استخدم مختبر OSINT داخل الموقع.");
    } catch {
      // Telegram may be unavailable; still acknowledge the webhook.
    }
    return NextResponse.json({ ok: true });
  }
}

function pickTelegramFile(message: TelegramMessage) {
  if (message.document) return { ...message.document, kind: "document" as const };
  if (message.video) return { ...message.video, kind: "video" as const };
  const photo = message.photo?.at(-1);
  if (photo) return { ...photo, mime_type: "image/jpeg", file_name: "telegram-photo.jpg", kind: "photo" as const };
  return null;
}

async function getTemporaryStorageBytes() {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase.rpc("osint_temp_storage_bytes");
  return Number(data ?? 0);
}

function sanitizeFileName(name: string) {
  return name.replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 120) || "telegram-file";
}

function defaultFileName(kind: string, mimeType?: string) {
  const extension = mimeType?.split("/")[1]?.replace("jpeg", "jpg") ?? "bin";
  return `telegram-${kind}.${extension}`;
}
