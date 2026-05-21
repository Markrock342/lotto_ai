import { createWorker, PSM, type Worker } from "tesseract.js";

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

function extractFromDigitRuns(raw: string): string[] {
  const out: string[] = [];
  for (const line of normalizeOcrText(raw).split("\n")) {
    const digits = line.replace(/\D/g, "");
    if (digits.length >= 8) pushFourDigitChunks(digits, out);
  }
  return out;
}

/** ดึงเลข 4 หลักจากข้อความ OCR ช่องเดียว (สมุด) */
export function pickBestFourDigits(raw: string): string | null {
  const trimmed = normalizeOcrText(raw).replace(/\n/g, " ").trim();
  if (!trimmed) return null;

  const four = trimmed.match(/\d{4}/g);
  if (four?.length === 1) return four[0];
  if (four && four.length > 1) {
    return four.sort((a, b) => b.length - a.length)[0];
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 4) return digits;
  if (digits.length === 3) return digits.padStart(4, "0");
  if (digits.length >= 5 && digits.length % 4 === 0) {
    return digits.slice(0, 4);
  }
  if (digits.length >= 2 && digits.length < 4) {
    return digits.padStart(4, "0");
  }
  return null;
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

function linesToArray(text: string): string[] {
  return extractSlipLinesFromOcr(text).split("\n").filter(Boolean);
}

/** รวมผลหลายรอบ — เก็บลำดับจากรอบแรก แล้วเติมเลขที่ขาดจากรอบถัดไป */
function mergeNumberLists(...lists: string[][]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const list of lists) {
    for (const n of list) {
      const key = n.trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(key);
    }
  }
  return out;
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
    const contrast = Math.min(255, Math.max(0, (gray - 128) * 2.4 + 128));
    const v = contrast > 168 ? 255 : contrast < 115 ? 0 : contrast;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(imageData, 0, 0);
}

async function renderRegion(
  bitmap: ImageBitmap,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  minHeight = 72,
): Promise<Blob | null> {
  const scale = Math.max(2, minHeight / Math.max(1, sh));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(48, Math.round(sw * scale));
  canvas.height = Math.max(minHeight, Math.round(sh * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  applyContrast(ctx, canvas.width, canvas.height);
  return blobFromCanvas(canvas);
}

/** ตัดขอบ + ขยาย + contrast ก่อน OCR */
export async function preprocessSlipImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const targetWidth = Math.min(2800, Math.max(1400, Math.round(bitmap.width * 2.5)));
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

function isNotebookLayout(bitmap: ImageBitmap): boolean {
  return bitmap.height / bitmap.width > 1.05;
}

function estimateRowCount(bitmap: ImageBitmap, cols: number): number {
  const padY = bitmap.height * 0.06;
  const usableH = bitmap.height - padY * 2;
  const colW = (bitmap.width - bitmap.width * 0.08) / cols;
  const approxRowH = colW * 0.42;
  return Math.max(20, Math.min(34, Math.round(usableH / approxRowH)));
}

/** OCR สมุด 3 คอลัมน์ — แยกทีละช่อง (แถว×คอลัมน์) */
async function ocrNotebookGrid(
  image: Blob,
  worker: Worker,
  onProgress?: OcrProgress,
): Promise<string[]> {
  const bitmap = await createImageBitmap(image);
  if (!isNotebookLayout(bitmap)) {
    bitmap.close();
    return [];
  }

  const cols = 3;
  const padX = bitmap.width * 0.04;
  const padY = bitmap.height * 0.06;
  const usableW = bitmap.width - padX * 2;
  const usableH = bitmap.height - padY * 2;
  const colW = usableW / cols;
  const rows = estimateRowCount(bitmap, cols);
  const rowH = usableH / rows;
  const nums: string[] = [];
  const total = cols * rows;
  let done = 0;

  await worker.setParameters({
    tessedit_pageseg_mode: PSM.SINGLE_LINE,
    tessedit_char_whitelist: "0123456789",
  });

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sx = Math.max(0, padX + c * colW - colW * 0.06);
      const sy = Math.max(0, padY + r * rowH - rowH * 0.1);
      const sw = Math.min(bitmap.width - sx, colW * 1.12);
      const sh = Math.min(bitmap.height - sy, rowH * 1.2);

      const patch = await renderRegion(bitmap, sx, sy, sw, sh, 80);
      if (patch) {
        const { data } = await worker.recognize(patch);
        const n = pickBestFourDigits(data.text);
        if (n) nums.push(n);
      }

      done += 1;
      if (done % 9 === 0 || done === total) {
        onProgress?.(
          72 + Math.round((done / total) * 22),
          `อ่านช่อง ${done}/${total}…`,
        );
      }
    }
  }

  bitmap.close();
  return nums;
}

async function ocrColumnPasses(
  image: Blob,
  worker: Worker,
): Promise<string[]> {
  const bitmap = await createImageBitmap(image);
  const cols = 3;
  const padX = bitmap.width * 0.03;
  const usableW = bitmap.width - padX * 2;
  const colW = usableW / cols;
  const all: string[] = [];

  await worker.setParameters({
    tessedit_pageseg_mode: PSM.SINGLE_COLUMN,
    tessedit_char_whitelist: "0123456789\n ",
  });

  for (let c = 0; c < cols; c++) {
    const sx = padX + c * colW;
    const patch = await renderRegion(bitmap, sx, 0, colW, bitmap.height, 200);
    if (!patch) continue;
    const { data } = await worker.recognize(patch);
    all.push(...linesToArray(data.text));
  }

  bitmap.close();
  return all;
}

export type OcrProgress = (percent: number, status: string) => void;

/** อ่านรูปโพย — ลิสต์ LINE + สมุดหลายคอลัมน์ */
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

  const worker = await createWorker("eng", 1, {
    logger: (m) => {
      if (m.status === "loading tesseract core") {
        onProgress?.(8, "โหลด OCR...");
      } else if (m.status === "loading language traineddata") {
        onProgress?.(12, "โหลดตัวเลข...");
      } else if (m.status === "recognizing text") {
        onProgress?.(15 + Math.round(m.progress * 50), "อ่านตัวเลข...");
      }
    },
  });

  const candidates: string[][] = [];

  try {
    await worker.setParameters({
      tessedit_char_whitelist: "0123456789\n ",
    });

    const passes: PSM[] = [
      PSM.SINGLE_COLUMN,
      PSM.SPARSE_TEXT,
      PSM.SINGLE_BLOCK_VERT_TEXT,
    ];

    for (const psm of passes) {
      await worker.setParameters({ tessedit_pageseg_mode: psm });
      const { data } = await worker.recognize(image);
      candidates.push(linesToArray(data.text));
    }

    onProgress?.(62, "อ่านทีละคอลัมน์...");
    candidates.push(await ocrColumnPasses(image, worker));

    onProgress?.(68, "อ่านทีละช่อง (สมุด)...");
    const gridNums = await ocrNotebookGrid(image, worker, onProgress);
    if (gridNums.length > 0) candidates.push(gridNums);

    const merged = mergeNumberLists(...candidates);
    if (merged.length > 0) {
      onProgress?.(100, `อ่านได้ ${merged.length} เลข — ตรวจก่อนบันทึก`);
      return merged.join("\n");
    }

    onProgress?.(92, "ลองอ่านแบบผสมภาษา...");
    await worker.reinitialize("tha+eng", 1);
    const { data } = await worker.recognize(image);
    const extracted = extractSlipLinesFromOcr(data.text);
    onProgress?.(100, "เสร็จ");
    return extracted;
  } finally {
    await worker.terminate();
  }
}
