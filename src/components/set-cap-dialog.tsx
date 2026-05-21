"use client";

import { useState } from "react";
import type { NumberCap } from "@/lib/limits";
import { ui } from "@/components/ui";

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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-mono text-2xl font-bold tracking-widest text-slate-900 dark:text-amber-200">
          {number}
        </h3>

        <label className="mt-4 block text-sm text-slate-600 dark:text-slate-400">
          เสี่ยงจ่ายสูงสุด (บาท)
        </label>
        <input
          type="number"
          min={0}
          value={maxRisk}
          onChange={(e) => setMaxRisk(e.target.value)}
          className={`${ui.inputSm} mt-1`}
        />

        <label className="mt-3 block text-sm text-slate-600 dark:text-slate-400">
          จำนวนชุดสูงสุด
        </label>
        <input
          type="number"
          min={0}
          value={maxSets}
          onChange={(e) => setMaxSets(e.target.value)}
          className={`${ui.inputSm} mt-1`}
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
            className={ui.btnPrimary}
          >
            บันทึก
          </button>
          <button type="button" onClick={onClear} className={ui.btnGhost}>
            ลบเพดานเฉพาะเลข
          </button>
          <button type="button" onClick={onClose} className="py-2 text-sm text-slate-500">
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}
