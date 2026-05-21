"use client";

import { useRef, useState } from "react";
import { compressImageForOcr } from "@/lib/compress-image";
import { ui } from "@/components/ui";

async function recognizeWithAiApi(file: File): Promise<
  | { ok: true; text: string; message: string }
  | { ok: false; reason?: string }
> {
  const compressed = await compressImageForOcr(file);
  const form = new FormData();
  form.append("image", compressed);

  const res = await fetch("/api/ocr/slip", { method: "POST", body: form });
  const data = (await res.json()) as {
    text?: string;
    message?: string;
    error?: string;
  };

  if (res.ok && data.text) {
    return {
      ok: true,
      text: data.text,
      message: data.message ?? "อ่านรูปสำเร็จ",
    };
  }

  throw new Error(data.error || "อ่านรูปไม่สำเร็จ");
}

export function ImageOcrUpload({
  disabled,
  onText,
  onStatus,
}: {
  disabled?: boolean;
  onText: (text: string) => void;
  onStatus?: (msg: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");

  function setMsg(msg: string) {
    setStatus(msg);
    onStatus?.(msg);
  }

  async function handleFile(file: File) {
    const isImage =
      file.type.startsWith("image/") ||
      /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
    if (!isImage) {
      setMsg("เลือกไฟล์รูปภาพเท่านั้น");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setMsg("รูปใหญ่เกินไป (สูงสุด 12MB)");
      return;
    }

    setBusy(true);
    setProgress(0);
    setMsg("กำลังอ่านรูป...");

    try {
      setMsg("ส่งรูปให้ AI อ่าน...");
      setProgress(15);

      const ai = await recognizeWithAiApi(file);
      let text: string;
      let doneMsg: string;

      if (ai.ok) {
        text = ai.text;
        doneMsg = ai.message;
        setProgress(100);
      } else {
        throw new Error(ai.reason ?? "AI อ่านไม่สำเร็จ");
      }

      if (!text.trim()) {
        setMsg("อ่านรูปไม่พบตัวเลข — ลองรูปชัดขึ้นหรือวางข้อความแทน");
        return;
      }

      onText(text);
      setMsg(doneMsg);
    } catch (e) {
      const err = e instanceof Error ? e.message : "อ่านรูปไม่สำเร็จ";
      setMsg(`${err} — ลองใหม่หรือคัดลอกข้อความจาก LINE`);
    } finally {
      setBusy(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled || busy}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
        className={ui.btnGhost}
      >
        {busy ? `อ่านรูป ${progress}%` : "📷 เลือกรูปโพย (AI)"}
      </button>
      {status && (
        <span className="text-xs text-slate-500 dark:text-slate-400">{status}</span>
      )}
    </div>
  );
}
