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

function pushFourDigitChunks(digits: string, out: string[]) {
  if (digits.length < 4) return;
  if (digits.length % 4 === 0) {
    for (let i = 0; i < digits.length; i += 4) {
      out.push(digits.slice(i, i + 4));
    }
    return;
  }
  const four = digits.match(/\d{4}/g);
  if (four?.length) out.push(...four);
}

/** ดึงเลขจากบล็อกตัวเลขยาว (เช่น OCR รวมหลายคอลัมน์เป็นบรรทัดเดียว) */
function extractFromDigitRuns(raw: string): string[] {
  const out: string[] = [];
  for (const line of normalizeOcrText(raw).split("\n")) {
    const digits = line.replace(/\D/g, "");
    if (digits.length >= 8) pushFourDigitChunks(digits, out);
  }
  return out;
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

    if (letters.length >= 2 && digits.length < 3) continue;
    if (digits.length === 0) continue;

    if (/^[\d\s:.,=\-]*$/.test(trimmed) && letters.length === 0) {
      if (digits.length >= 2 && digits.length <= 4) {
        out.push(digits.padStart(4, "0"));
        continue;
      }
      if (digits.length > 4) {
        pushFourDigitChunks(digits, out);
        continue;
      }
    }

    const four = trimmed.match(/\d{4}/g);
    if (four?.length) {
      out.push(...four);
      continue;
    }

    if (/^\d{3}$/.test(digits) && letters.length === 0) {
      out.push(digits.padStart(4, "0"));
    }
  }

  const runFallback = extractFromDigitRuns(raw);
  if (runFallback.length > out.length) {
    return runFallback.join("\n");
  }

  return out.join("\n");
}

function countSlipLines(text: string): number {
  return extractSlipLinesFromOcr(text).split("\n").filter(Boolean).length;
}

async function blobFromCanvas(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("canvas blob failed"))),
      "image/png",
    );
  });
}

function applyContrast(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const contrast = Math.min(255, Math.max(0, (gray - 140) * 2.2 + 140));
    const v = contrast > 175 ? 255 : contrast < 110 ? 0 : contrast;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(imageData, 0, 0);
}

/** ตัดขอบ + ขยาย + contrast ก่อน OCR */
export async function preprocessSlipImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const targetWidth = Math.min(2400, Math.max(1200, Math.round(bitmap.width * 2)));
  const scale = targetWidth / bitmap.width;
  const cropX = bitmap.width * 0.02;
  const cropY = bitmap.height * 0.03;
  const cropW = bitmap.width * 0.96;
  const cropH = bitmap.height * 0.94;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(cropW * scale);
  canvas.height = Math.round(cropH * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  applyContrast(ctx, canvas.width, canvas.height);

  return blobFromCanvas(canvas);
}

/** แยกรูปเป็นคอลัมน์ (สมุด 3 คอลัมน์) แล้ว OCR ทีละคอลัมน์ */
async function splitColumnBlobs(image: Blob, columns = 3): Promise<Blob[]> {
  const bitmap = await createImageBitmap(image);
  const padX = bitmap.width * 0.03;
  const usableW = bitmap.width - padX * 2;
  const colW = usableW / columns;
  const blobs: Blob[] = [];

  for (let c = 0; c < columns; c++) {
    const sx = padX + c * colW;
    const targetWidth = Math.min(1200, Math.max(480, Math.round(colW * 2)));
    const scale = targetWidth / colW;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(colW * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      bitmap,
      sx,
      0,
      colW,
      bitmap.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    applyContrast(ctx, canvas.width, canvas.height);
    blobs.push(await blobFromCanvas(canvas));
  }

  bitmap.close();
  return blobs;
}

export type OcrProgress = (percent: number, status: string) => void;

/** อ่านรูปโพย — รองรับลิสต์ LINE แนวตั้ง + สมุดหลายคอลัมน์ */
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

  const passes: PSM[] = [
    PSM.SINGLE_COLUMN,
    PSM.SINGLE_BLOCK_VERT_TEXT,
    PSM.SPARSE_TEXT,
    PSM.AUTO,
  ];

  const worker = await createWorker("eng", 1, {
    logger: (m) => {
      if (m.status === "loading tesseract core") {
        onProgress?.(8, "โหลด OCR...");
      } else if (m.status === "loading language traineddata") {
        onProgress?.(12, "โหลดตัวเลข...");
      } else if (m.status === "recognizing text") {
        onProgress?.(20 + Math.round(m.progress * 65), "อ่านตัวเลข...");
      }
    },
  });

  let bestRaw = "";
  let bestCount = 0;

  function tryExtract(rawText: string) {
    const extracted = extractSlipLinesFromOcr(rawText);
    const count = countSlipLines(extracted);
    if (count > bestCount) {
      bestCount = count;
      bestRaw = extracted;
    }
  }

  try {
    await worker.setParameters({
      tessedit_char_whitelist: "0123456789\n ",
    });

    for (const psm of passes) {
      await worker.setParameters({ tessedit_pageseg_mode: psm });
      const { data } = await worker.recognize(image);
      tryExtract(data.text);
    }

    onProgress?.(75, "อ่านทีละคอลัมน์ (สมุด 3 ช่อง)...");
    const colBlobs = await splitColumnBlobs(image, 3);
    let colRaw = "";
    for (let i = 0; i < colBlobs.length; i++) {
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_COLUMN });
      const { data } = await worker.recognize(colBlobs[i]);
      colRaw += `${data.text}\n`;
      onProgress?.(78 + i * 5, `คอลัมน์ ${i + 1}/3...`);
    }
    tryExtract(colRaw);

    if (bestCount > 0) {
      onProgress?.(100, `อ่านได้ ${bestCount} เลข — ตรวจก่อนบันทึก`);
      return bestRaw;
    }

    onProgress?.(90, "ลองอ่านแบบผสมภาษา...");
    await worker.reinitialize("tha+eng", 1);
    const { data } = await worker.recognize(image);
    const extracted = extractSlipLinesFromOcr(data.text);
    onProgress?.(100, "เสร็จ");
    return extracted;
  } finally {
    await worker.terminate();
  }
}
