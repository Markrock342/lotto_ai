"use client";

import { useRef, useState } from "react";
import { recognizeSlipImage } from "@/lib/ocr-slip";
import { ui } from "@/components/ui";

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
      const text = await recognizeSlipImage(file, (pct, st) => {
        setProgress(pct);
        setStatus(st);
      });
      if (!text.trim()) {
        setMsg("อ่านรูปไม่พบตัวเลข — ลองรูปชัดขึ้นหรือวางข้อความแทน");
        return;
      }
      onText(text);
      const lineCount = text.split("\n").filter(Boolean).length;
      setMsg(
        lineCount > 0
          ? `อ่านได้ ${lineCount} เลข — ตรวจในช่องข้อความก่อนบันทึก (สมุด 3 คอลัมน์: ถ่ายตรง แสงสว่าง)`
          : "อ่านรูปแล้ว — ตรวจข้อความก่อนกดบันทึก",
      );
    } catch {
      setMsg("อ่านรูปไม่สำเร็จ — ลองใหม่หรือคัดลอกข้อความจาก LINE");
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
        {busy ? `อ่านรูป ${progress}%` : "📷 เลือกรูปโพย (แกลเลอรี)"}
      </button>
      {status && (
        <span className="text-xs text-slate-500 dark:text-slate-400">{status}</span>
      )}
    </div>
  );
}
