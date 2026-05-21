import Link from "next/link";
import type { ReactNode } from "react";

/** คลาสมาตรฐาน light/dark สำหรับทุกหน้า */
export const ui = {
  page: "min-h-0",
  title: "text-xl font-bold text-slate-900 dark:text-white",
  subtitle: "text-sm text-slate-500 dark:text-slate-400",
  card: "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900",
  cardPad: "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900",
  input:
    "w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white",
  inputSm:
    "w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white",
  btnPrimary:
    "rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50 dark:bg-amber-500 dark:text-slate-900 dark:hover:bg-amber-400",
  btnSuccess:
    "rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-50",
  btnGhost:
    "rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",
  statCard:
    "rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900",
  tableWrap: "overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900",
  th: "bg-slate-100 px-3 py-2 text-left text-[10px] font-semibold uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  td: "border-t border-slate-100 px-3 py-3 text-sm dark:border-slate-800",
};

export function PageHeader({
  title,
  subtitle,
  backHref,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
      <div>
        <h1 className={ui.title}>{title}</h1>
        {subtitle && <p className={ui.subtitle}>{subtitle}</p>}
      </div>
      {backHref && (
        <Link href={backHref} className="text-sm text-blue-600 dark:text-amber-400">
          ← กลับ
        </Link>
      )}
    </div>
  );
}

export function StatBox({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: string | number;
  variant?: "default" | "accent" | "danger" | "success";
}) {
  const styles = {
    default: "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900",
    accent: "border-blue-200 bg-blue-50 dark:border-amber-500/30 dark:bg-amber-950/40",
    danger: "border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-950/40",
    success: "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-950/40",
  };
  const text = {
    default: "text-slate-900 dark:text-white",
    accent: "text-blue-700 dark:text-amber-300",
    danger: "text-red-600 dark:text-red-300",
    success: "text-emerald-700 dark:text-emerald-300",
  };
  return (
    <div className={`rounded-2xl border p-4 text-center shadow-sm ${styles[variant]}`}>
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-bold tabular-nums ${text[variant]}`}>{value}</p>
    </div>
  );
}

export function QuickLink({
  href,
  title,
  desc,
  color,
}: {
  href: string;
  title: string;
  desc?: string;
  color: "blue" | "green" | "amber";
}) {
  const bg = {
    blue: "border-blue-200 bg-blue-50 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-950/30",
    green: "border-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-950/30",
    amber: "border-amber-200 bg-amber-50 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-950/30",
  };
  const titleColor = {
    blue: "text-blue-700 dark:text-blue-300",
    green: "text-emerald-700 dark:text-emerald-300",
    amber: "text-amber-700 dark:text-amber-300",
  };
  return (
    <Link href={href} className={`block rounded-2xl border p-5 transition ${bg[color]}`}>
      <p className={`text-base font-bold ${titleColor[color]}`}>{title}</p>
      {desc ? (
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{desc}</p>
      ) : null}
    </Link>
  );
}

export function Loading() {
  return <p className="py-8 text-center text-sm text-slate-500">กำลังโหลด...</p>;
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">{children}</p>
  );
}
