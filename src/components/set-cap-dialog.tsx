"use client";

import { useState } from "react";
import type { NumberCap } from "@/lib/limits";

export function SetCapDialog({
  number,
  current,
  onSave,
  onClear,
  onClose,
}: {
  number: string;
  current: NumberCap;
  onSave: (cap: { maxRisk: number | null; maxSets: number | null }) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [maxRisk, setMaxRisk] = useState(
    current.maxRisk != null ? String(current.maxRisk) : "",
  );
  const [maxSets, setMaxSets] = useState(
    current.maxSets != null ? String(current.maxSets) : "",
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-mono text-lg font-bold text-amber-200">{number}</h3>
        <p className="mt-1 text-xs text-slate-400">
          กำหนดเพดานรับความเสี่ยงของเลขนี้ (อั้นเลข)
        </p>

        <label className="mt-4 block text-xs text-slate-400">
          เสี่ยงจ่ายสูงสุด (บาท) — ว่าง = ใช้ค่าทั้งบ้าน
        </label>
        <input
          type="number"
          min={0}
          value={maxRisk}
          onChange={(e) => setMaxRisk(e.target.value)}
          placeholder="เช่น 500000"
          className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500/50"
        />

        <label className="mt-3 block text-xs text-slate-400">
          จำนวนชุดสูงสุด — ว่าง = ไม่จำกัดชุด
        </label>
        <input
          type="number"
          min={0}
          value={maxSets}
          onChange={(e) => setMaxSets(e.target.value)}
          placeholder="เช่น 50"
          className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500/50"
        />

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() =>
              onSave({
                maxRisk: maxRisk.trim() ? Number(maxRisk) : null,
                maxSets: maxSets.trim() ? Number(maxSets) : null,
              })
            }
            className="rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-slate-950"
          >
            บันทึกเพดานเลขนี้
          </button>
          <button
            type="button"
            onClick={onClear}
            className="rounded-xl border border-white/10 py-2 text-xs text-slate-400"
          >
            ลบเพดานเฉพาะเลข (ใช้ค่าทั้งบ้าน)
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2 text-xs text-slate-500"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}
