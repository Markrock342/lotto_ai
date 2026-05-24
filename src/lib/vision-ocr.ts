import { extractSlipLinesFromOcr } from "@/lib/ocr-slip";

const SLIP_VISION_PROMPT = `You are a high-accuracy OCR assistant. Read and extract all text and numbers from this image exactly as they are written.

Instructions:
1. If the image is a notebook with columns of handwritten numbers, read column by column: LEFT column top-to-bottom, then MIDDLE column top-to-bottom, then RIGHT column top-to-bottom.
2. Maintain the format as written (e.g., "23=5", "1234=10", "479 = 2 ชุด").
3. Do not add any explanations, markdown code blocks, or extra text. Return ONLY the transcribed text.`;

export type VisionOcrSource = "gemini";

function parseVisionResponse(raw: string): string {
  const cleaned = raw
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```\w*\n?/g, ""))
    .trim();
  return extractSlipLinesFromOcr(cleaned);
}

async function geminiVision(base64: string, mime: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");

  const model = process.env.GEMINI_OCR_MODEL ?? "gemini-2.5-flash";

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        generationConfig: { temperature: 0, maxOutputTokens: 4096 },
        contents: [
          {
            parts: [
              { text: SLIP_VISION_PROMPT },
              { inline_data: { mime_type: mime, data: base64 } },
            ],
          },
        ],
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini ${res.status}: ${err.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const content =
    json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  return parseVisionResponse(content);
}

export function visionOcrConfigured(): VisionOcrSource | null {
  return process.env.GEMINI_API_KEY?.trim() ? "gemini" : null;
}

/** อ่านรูปโพยด้วย Gemini Vision */
export async function recognizeSlipWithVision(
  buffer: Buffer,
  mime: string,
): Promise<{ text: string; source: VisionOcrSource }> {
  const text = await geminiVision(buffer.toString("base64"), mime);
  return { text, source: "gemini" };
}
