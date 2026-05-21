import { extractSlipLinesFromOcr } from "@/lib/ocr-slip";

const SLIP_VISION_PROMPT = `Extract every 4-digit lottery number from this image.

Layout hints:
- Often a notebook with 3 columns of handwritten numbers.
- Read order: LEFT column top-to-bottom, then MIDDLE column top-to-bottom, then RIGHT column top-to-bottom.
- LINE chat screenshots: one number per line top-to-bottom.

Output rules (strict):
- Return ONLY 4-digit numbers, one number per line.
- No labels, no bullets, no markdown, no explanation.
- Pad 3-digit numbers with one leading zero (479 → 0479).
- Include ALL visible numbers even if slightly unclear.
- Do not invent numbers that are not visible.`;

export type VisionOcrSource = "openai" | "gemini" | "openrouter";

function parseVisionResponse(raw: string): string {
  const cleaned = raw
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```\w*\n?/g, ""))
    .trim();
  return extractSlipLinesFromOcr(cleaned);
}

async function openAiVision(
  base64: string,
  mime: string,
): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set");

  const model = process.env.OPENAI_OCR_MODEL ?? "gpt-4o-mini";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: SLIP_VISION_PROMPT },
            {
              type: "image_url",
              image_url: { url: `data:${mime};base64,${base64}`, detail: "high" },
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI ${res.status}: ${err.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = json.choices?.[0]?.message?.content ?? "";
  return parseVisionResponse(content);
}

async function geminiVision(
  base64: string,
  mime: string,
): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");

  const model = process.env.GEMINI_OCR_MODEL ?? "gemini-2.0-flash";

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

async function openRouterVision(
  base64: string,
  mime: string,
): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY not set");

  const model =
    process.env.OPENROUTER_OCR_MODEL ?? "google/gemma-4-31b-it:free";
  const siteUrl =
    process.env.OPENROUTER_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": siteUrl,
      "X-Title": "lotto_ai",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: SLIP_VISION_PROMPT },
            {
              type: "image_url",
              image_url: { url: `data:${mime};base64,${base64}` },
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${err.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = json.choices?.[0]?.message?.content ?? "";
  return parseVisionResponse(content);
}

function configuredProvider(): VisionOcrSource | null {
  const prefer = process.env.OCR_VISION_PROVIDER?.trim();
  if (prefer === "openrouter" && process.env.OPENROUTER_API_KEY?.trim()) {
    return "openrouter";
  }
  if (prefer === "gemini" && process.env.GEMINI_API_KEY?.trim()) {
    return "gemini";
  }
  if (prefer === "openai" && process.env.OPENAI_API_KEY?.trim()) {
    return "openai";
  }
  if (process.env.OPENROUTER_API_KEY?.trim()) return "openrouter";
  if (process.env.OPENAI_API_KEY?.trim()) return "openai";
  if (process.env.GEMINI_API_KEY?.trim()) return "gemini";
  return null;
}

export function visionOcrConfigured(): VisionOcrSource | null {
  return configuredProvider();
}

/** อ่านรูปโพยด้วย Vision AI (แม่นกว่า Tesseract สำหรับลายมือ) */
export async function recognizeSlipWithVision(
  buffer: Buffer,
  mime: string,
): Promise<{ text: string; source: VisionOcrSource }> {
  const base64 = buffer.toString("base64");
  const prefer = process.env.OCR_VISION_PROVIDER?.trim();

  const tryOpenAi = async () => ({
    text: await openAiVision(base64, mime),
    source: "openai" as const,
  });
  const tryGemini = async () => ({
    text: await geminiVision(base64, mime),
    source: "gemini" as const,
  });
  const tryOpenRouter = async () => ({
    text: await openRouterVision(base64, mime),
    source: "openrouter" as const,
  });

  if (prefer === "openrouter" && process.env.OPENROUTER_API_KEY) {
    return tryOpenRouter();
  }
  if (prefer === "gemini" && process.env.GEMINI_API_KEY) {
    return tryGemini();
  }
  if (prefer === "openai" && process.env.OPENAI_API_KEY) {
    return tryOpenAi();
  }

  if (process.env.OPENROUTER_API_KEY) {
    return tryOpenRouter();
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      return await tryOpenAi();
    } catch (e) {
      if (process.env.GEMINI_API_KEY) {
        console.warn("OpenAI OCR failed, trying Gemini:", e);
        return tryGemini();
      }
      throw e;
    }
  }

  if (process.env.GEMINI_API_KEY) {
    return tryGemini();
  }

  throw new Error("No vision API key configured");
}
