"use client";

import type { ReportPeriod } from "@/lib/date-period";
import { PERIOD_LABELS } from "@/lib/date-period";

const PERIODS: ReportPeriod[] = ["today", "week", "month", "all"];

export function PeriodFilter({
  value,
  onChange,
}: {
  value: ReportPeriod;
  onChange: (p: ReportPeriod) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {PERIODS.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
            value === p
              ? "bg-blue-600 text-white dark:bg-amber-500 dark:text-slate-900"
              : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          {PERIOD_LABELS[p]}
        </button>
      ))}
    </div>
  );
}
