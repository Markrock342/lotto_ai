import { NextResponse } from "next/server";
import { requireSession } from "@/lib/permissions";
import {
  recognizeSlipWithVision,
  visionOcrConfigured,
} from "@/lib/vision-ocr";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 12 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = await requireSession("bets:write");
  if (auth.error) return auth.error;

  const provider = visionOcrConfigured();
  if (!provider) {
    return NextResponse.json(
      {
        error:
          "ยังไม่ได้ตั้ง AI อ่านรูป — ใส่ GEMINI_API_KEY ในการตั้งค่าระบบ",
      },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "รูปไม่ถูกต้อง" }, { status: 400 });
  }

  const file = form.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "ไม่พบไฟล์รูป" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "รูปใหญ่เกินไป (สูงสุด 12MB)" }, { status: 400 });
  }

  const mime = file.type || "image/jpeg";
  if (!mime.startsWith("image/")) {
    return NextResponse.json({ error: "เลือกไฟล์รูปภาพเท่านั้น" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { text, source } = await recognizeSlipWithVision(buffer, mime);
    const lineCount = text.split("\n").filter(Boolean).length;

    if (lineCount === 0) {
      return NextResponse.json(
        { error: "AI อ่านรูปไม่พบเลข — ลองถ่ายใหม่หรือวางข้อความจาก LINE" },
        { status: 422 },
      );
    }

    const sourceLabel = "Gemini";

    return NextResponse.json({
      text,
      lineCount,
      source,
      message: `อ่านได้ ${lineCount} เลข (${sourceLabel}) — ตรวจก่อนบันทึก`,
    });
  } catch (e) {
    console.error("vision ocr:", e);
    return NextResponse.json(
      {
        error: "AI อ่านรูปไม่สำเร็จ — ลองใหม่อีกครั้ง",
      },
      { status: 500 },
    );
  }
}
