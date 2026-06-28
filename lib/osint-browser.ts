"use client";

import type { OsintCaseBundle } from "@/types/app";

export type LocalFrame = {
  name: string;
  blob: Blob;
  timeSeconds: number;
  sha256: string;
};

export type LocalFileAnalysis = {
  fileName: string;
  fileSize: number;
  declaredMime: string;
  detectedMime: string;
  sha256: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  metadata: Record<string, unknown>;
  c2pa: Record<string, unknown> | null;
  warnings: string[];
  analyzedAt: string;
};

export async function analyzeLocalFile(file: File): Promise<{ analysis: LocalFileAnalysis; frames: LocalFrame[] }> {
  const sha256 = await sha256Blob(file);
  const detectedMime = await detectMime(file);
  const warnings: string[] = [];
  if (file.type && detectedMime !== "application/octet-stream" && file.type !== detectedMime) {
    warnings.push(`نوع الملف المعلن (${file.type}) لا يطابق التوقيع الداخلي (${detectedMime}).`);
  }

  let width: number | undefined;
  let height: number | undefined;
  let durationSeconds: number | undefined;
  let metadata: Record<string, unknown> = {};
  let frames: LocalFrame[] = [];

  if (file.type.startsWith("image/") || detectedMime.startsWith("image/")) {
    const dimensions = await getImageDimensions(file);
    width = dimensions.width;
    height = dimensions.height;
    try {
      const exifr = await import("exifr");
      metadata = sanitizeJson(
        (await exifr.parse(file, {
          tiff: true,
          exif: true,
          gps: true,
          xmp: true,
          iptc: true,
          jfif: true,
          ihdr: true,
          sanitize: true,
          mergeOutput: true
        })) ?? {}
      ) as Record<string, unknown>;
    } catch {
      warnings.push("تعذر استخراج EXIF/IPTC/XMP أو أن الملف لا يحتوي عليها.");
    }
  } else if (file.type.startsWith("video/") || detectedMime.startsWith("video/")) {
    const video = await inspectVideo(file);
    width = video.width;
    height = video.height;
    durationSeconds = video.durationSeconds;
    frames = video.frames;
    metadata = {
      videoWidth: width,
      videoHeight: height,
      durationSeconds,
      frameCountExtracted: frames.length
    };
  }

  const c2pa = await inspectC2pa(file, warnings);
  if (!Object.keys(metadata).length) warnings.push("غياب البيانات الوصفية لا يثبت التلاعب أو الأصالة.");
  if (!c2pa) warnings.push("لم يتم العثور على Content Credentials قابلة للتحقق؛ هذا لا يعني أن الملف مزيف.");

  return {
    analysis: {
      fileName: file.name,
      fileSize: file.size,
      declaredMime: file.type || "application/octet-stream",
      detectedMime,
      sha256,
      width,
      height,
      durationSeconds,
      metadata,
      c2pa,
      warnings,
      analyzedAt: new Date().toISOString()
    },
    frames
  };
}

export async function runLocalOcr(file: Blob, onProgress?: (progress: number, status: string) => void) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker(["ara", "eng"], 1, {
    logger: (message) => {
      onProgress?.(typeof message.progress === "number" ? message.progress : 0, message.status ?? "");
    }
  });
  try {
    const result = await worker.recognize(file);
    return result.data.text.trim();
  } finally {
    await worker.terminate();
  }
}

export async function sha256Blob(blob: Blob) {
  const buffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function createEncryptedCaseBundle(input: {
  bundle: OsintCaseBundle;
  password: string;
  reportHtml: string;
  originalFile?: File | null;
  frames?: LocalFrame[];
  localAnalysis?: LocalFileAnalysis | null;
}) {
  const { BlobReader, BlobWriter, TextReader, ZipReader, ZipWriter } = await import("@zip.js/zip.js");
  const output = new BlobWriter("application/zip");
  const zip = new ZipWriter(output, { password: input.password, encryptionStrength: 3 });
  const passwordOptions = { password: input.password, encryptionStrength: 3 as const };
  let originalEntryName: string | null = null;
  let originalHashBefore: string | null = null;

  if (input.originalFile) {
    originalHashBefore = await sha256Blob(input.originalFile);
    originalEntryName = `evidence/original/${safeArchiveName(input.originalFile.name)}`;
    await zip.add(originalEntryName, new BlobReader(input.originalFile), passwordOptions);
  }

  for (const frame of input.frames ?? []) {
    await zip.add(`evidence/frames/${safeArchiveName(frame.name)}`, new BlobReader(frame.blob), passwordOptions);
  }

  const manifest = {
    schema: "rasd-osint-case-bundle/v1",
    exportedAt: new Date().toISOString(),
    case: input.bundle.case,
    claims: input.bundle.claims,
    evidence: input.bundle.evidence,
    findings: input.bundle.findings,
    events: input.bundle.events,
    localAnalysis: input.localAnalysis ?? null,
    localFrames: (input.frames ?? []).map((frame) => ({
      name: frame.name,
      timeSeconds: frame.timeSeconds,
      sha256: frame.sha256
    })),
    integrity: {
      algorithm: "SHA-256",
      originalEntryName,
      originalHashBefore,
      originalHashAfterExtraction: null,
      matched: null
    }
  };

  await zip.add("manifest.json", new TextReader(JSON.stringify(manifest, null, 2)), passwordOptions);
  await zip.add("report/report.html", new TextReader(input.reportHtml), passwordOptions);
  await zip.add(
    "README.txt",
    new TextReader(
      "حزمة قضية OSINT من رصد. جميع الملفات مشفرة بكلمة المرور التي اختارها المستخدم. manifest.json يتضمن بصمات SHA-256 وسجل التحقيق."
    ),
    passwordOptions
  );
  const zipBlob = await zip.close();

  let verified = !input.originalFile;
  let originalHashAfterExtraction: string | null = null;
  if (input.originalFile && originalEntryName) {
    const reader = new ZipReader(new BlobReader(zipBlob));
    try {
      const entries = await reader.getEntries();
      const originalEntry = entries.find((entry) => !entry.directory && entry.filename === originalEntryName);
      if (originalEntry && !originalEntry.directory && "getData" in originalEntry) {
        const extracted = await originalEntry.getData(new BlobWriter(), { password: input.password });
        originalHashAfterExtraction = await sha256Blob(extracted);
        verified = originalHashAfterExtraction === originalHashBefore;
      }
    } finally {
      await reader.close();
    }
  }

  return { blob: zipBlob, verified, originalHashBefore, originalHashAfterExtraction };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function inspectC2pa(file: File, warnings: string[]) {
  try {
    const { createC2pa } = await import("@contentauth/c2pa-web");
    const c2pa = await createC2pa({
      wasmSrc: "https://cdn.jsdelivr.net/npm/@contentauth/c2pa-web@0.12.0/dist/resources/c2pa_bg.wasm"
    });
    const reader = await c2pa.reader.fromBlob(file.type || "application/octet-stream", file);
    if (!reader) return null;
    try {
      return sanitizeJson(await reader.manifestStore()) as Record<string, unknown>;
    } finally {
      await reader.free();
    }
  } catch {
    warnings.push("تعذر تشغيل فحص C2PA في هذا المتصفح أو لهذه الصيغة.");
    return null;
  }
}

async function inspectVideo(file: File) {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "metadata";
  video.muted = true;
  video.src = url;
  await once(video, "loadedmetadata");

  const durationSeconds = Number.isFinite(video.duration) ? video.duration : 0;
  const times = Array.from(new Set([0, durationSeconds * 0.1, durationSeconds * 0.5, durationSeconds * 0.9]))
    .filter((time) => Number.isFinite(time) && time >= 0 && time <= durationSeconds)
    .slice(0, 4);
  const frames: LocalFrame[] = [];
  for (let index = 0; index < times.length; index += 1) {
    const time = times[index];
    video.currentTime = time;
    await once(video, "seeked");
    const scale = Math.min(1, 1280 / Math.max(video.videoWidth, 1));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await canvasToBlob(canvas);
    frames.push({
      name: `frame-${String(index + 1).padStart(2, "0")}-${time.toFixed(2)}s.jpg`,
      blob,
      timeSeconds: time,
      sha256: await sha256Blob(blob)
    });
  }
  URL.revokeObjectURL(url);
  return { width: video.videoWidth, height: video.videoHeight, durationSeconds, frames };
}

async function getImageDimensions(file: File) {
  const image = new Image();
  const url = URL.createObjectURL(file);
  image.src = url;
  await once(image, "load");
  URL.revokeObjectURL(url);
  return { width: image.naturalWidth, height: image.naturalHeight };
}

async function detectMime(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (matches(bytes, [0x89, 0x50, 0x4e, 0x47])) return "image/png";
  if (matches(bytes, [0x47, 0x49, 0x46, 0x38])) return "image/gif";
  if (matches(bytes, [0x52, 0x49, 0x46, 0x46]) && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") {
    return "image/webp";
  }
  if (String.fromCharCode(...bytes.slice(4, 8)) === "ftyp") {
    const brand = String.fromCharCode(...bytes.slice(8, 12)).toLowerCase();
    return brand.includes("qt") ? "video/quicktime" : "video/mp4";
  }
  if (matches(bytes, [0x25, 0x50, 0x44, 0x46])) return "application/pdf";
  return "application/octet-stream";
}

function matches(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

function once(target: EventTarget, event: string) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      target.removeEventListener(event, done);
      target.removeEventListener("error", failed);
    };
    const done = () => {
      cleanup();
      resolve();
    };
    const failed = () => {
      cleanup();
      reject(new Error(`Failed while waiting for ${event}.`));
    };
    target.addEventListener(event, done, { once: true });
    target.addEventListener("error", failed, { once: true });
  });
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Frame extraction failed."))), "image/jpeg", 0.9);
  });
}

function sanitizeJson(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (_key, item) => {
      if (item instanceof Date) return item.toISOString();
      if (item instanceof Uint8Array) return `[binary ${item.byteLength} bytes]`;
      if (typeof item === "bigint") return item.toString();
      return item;
    })
  );
}

function safeArchiveName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "_").slice(0, 180) || "file";
}
