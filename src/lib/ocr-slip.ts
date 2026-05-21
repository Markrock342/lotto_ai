import { createWorker, PSM } from "tesseract.js";

const SET_COUNT_RE = /(?:^|[=\s#])(\d+)\s*ชุด/i;
const NUMBER_SETS_LINE_RE = /^(\d{2,4})\s*=\s*(\d+)\s*(?:ชุด)?\s*$/i;

/** ปรับข้อความจาก OCR ให้ใกล้รูปแบบโพย LINE */
export function normalizeOcrText(raw: string): string {
  return raw
    .replace(/\r/g, "")
    .split("\n")
    .map((line) =>
      line
        .trim()
        .replace(/[０-９]/g, (c) =>
          String.fromCharCode(c.charCodeAt(0) - 0xff10 + 0x30),
        )
        .replace(/ช[ํุู]/g, "ชุด")
        .replace(/(\d)[Oo](\d)/g, "$10$2")
        .replace(/(\d)[Oo]/g, "$10")
        .replace(/[Oo](\d)/g, "0$1")
        .replace(/(\d)[Il|](\d)/g, "$11$2")
        .replace(/[|:;.,]+$/g, ""),
    )
    .filter(Boolean)
    .join("\n");
}

/** ดึงเฉพาะบรรทัดเลขโพย — ตัดขยะจาก UI / อีโมจิ / อักษร */
export function extractSlipLinesFromOcr(raw: string): string {
  const lines = normalizeOcrText(raw).split("\n");
  const out: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const digits = trimmed.replace(/\D/g, "");
    const letters = trimmed.replace(/[^a-zA-Z]/g, "");

    if (SET_COUNT_RE.test(trimmed)) {
      out.push(trimmed);
      continue;
    }

    if (NUMBER_SETS_LINE_RE.test(trimmed)) {
      out.push(trimmed);
      continue;
    }

    // ขยะชัด: ตัวอักษรเยอะ ตัวเลขน้อย
    if (letters.length >= 2 && digits.length < 3) continue;
    if (digits.length === 0) continue;

    // บรรทัดเดียว = เลข 2–4 หลัก (รูปแบบลิสต์ LINE)
    if (/^[\d\s:.,=\-]*$/.test(trimmed) && digits.length >= 2 && digits.length <= 4) {
      if (letters.length === 0) {
        out.push(digits.padStart(4, "0"));
        continue;
      }
    }

    // หลายเลข 4 หลักในบรรทัด
    const four = trimmed.match(/\d{4}/g);
    if (four?.length) {
      out.push(...four);
      continue;
    }

    // เลข 3 หลัก — เติม 0 หน้า (เช่น 375 → 0375)
    if (/^\d{3}$/.test(digits) && letters.length === 0) {
      out.push(digits.padStart(4, "0"));
    }
  }

  return out.join("\n");
}

function countSlipLines(text: string): number {
  return extractSlipLinesFromOcr(text).split("\n").filter(Boolean).length;
}

/** ตัดขอบ + ขยาย + contrast ก่อน OCR (รูปแชท LINE) */
export async function preprocessSlipImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const targetWidth = Math.min(2400, Math.max(1200, Math.round(bitmap.width * 2)));
  const scale = targetWidth / bitmap.width;
  const cropX = bitmap.width * 0.02;
  const cropY = bitmap.height * 0.06;
  const cropW = bitmap.width * 0.9;
  const cropH = bitmap.height * 0.86;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(cropW * scale);
  canvas.height = Math.round(cropH * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const contrast = Math.min(255, Math.max(0, (gray - 140) * 2.2 + 140));
    const v = contrast > 175 ? 255 : contrast < 110 ? 0 : contrast;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(imageData, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("preprocess failed"))),
      "image/png",
    );
  });
}

export type OcrProgress = (percent: number, status: string) => void;

/** อ่านรูปโพย (browser) — เหมาะลิสต์เลขทีละบรรทัดจาก LINE */
export async function recognizeSlipImage(
  file: File,
  onProgress?: OcrProgress,
): Promise<string> {
  onProgress?.(0, "เตรียมอ่านรูป...");

  let image: Blob | File = file;
  try {
    onProgress?.(5, "ปรับภาพให้ชัด...");
    image = await preprocessSlipImage(file);
  } catch {
    image = file;
  }

  const passes: PSM[] = [PSM.SINGLE_BLOCK_VERT_TEXT, PSM.SINGLE_COLUMN];

  const worker = await createWorker("eng", 1, {
    logger: (m) => {
      if (m.status === "loading tesseract core") {
        onProgress?.(8, "โหลด OCR...");
      } else if (m.status === "loading language traineddata") {
        onProgress?.(12, "โหลดตัวเลข...");
      } else if (m.status === "recognizing text") {
        onProgress?.(20 + Math.round(m.progress * 70), "อ่านตัวเลข...");
      }
    },
  });

  let bestRaw = "";
  let bestCount = 0;

  try {
    for (const psm of passes) {
      await worker.setParameters({
        tessedit_pageseg_mode: psm,
        tessedit_char_whitelist: "0123456789\n",
      });
      const { data } = await worker.recognize(image);
      const extracted = extractSlipLinesFromOcr(data.text);
      const count = countSlipLines(extracted);
      if (count > bestCount) {
        bestCount = count;
        bestRaw = extracted;
      }
    }

    if (bestCount > 0) {
      onProgress?.(100, "เสร็จ");
      return bestRaw;
    }

    onProgress?.(90, "ลองอ่านแบบผสมภาษา...");
    await worker.reinitialize("tha+eng", 1);
    const { data } = await worker.recognize(image);
    onProgress?.(100, "เสร็จ");
    return extractSlipLinesFromOcr(data.text);
  } finally {
    await worker.terminate();
  }
}
