"use client";

import { useEffect, useState } from "react";
import { PageHeader, QuickLink, StatBox, Loading, Empty } from "@/components/ui";
import { ui } from "@/components/ui";

type DashboardData = {
  house: { name: string; pricePerSet: number };
  draw: { id: string; label: string; status: string; result4: string | null };
  live: {
    totalBets: number;
    totalReceived: number;
    totalRisk: number;
    uniqueNumbers: number;
    fullCount: number;
  };
  top10: { number: string; sets: number; totalAmount: number }[];
  nearFull: { number: string; sets: number; totalAmount: number }[];
  recentDraws: {
    id: string;
    label: string;
    result4: string | null;
    totalReceived: number | null;
    totalPayout: number | null;
    profit: number;
  }[];
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 5000);
    return () => clearInterval(t);
  }, []);

  async function load() {
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const detail =
          typeof body?.detail === "string" ? ` (${body.detail})` : "";
        setError((body?.error || "โหลดแดชบอร์ดไม่สำเร็จ") + detail);
        return;
      }
      setError("");
      setData(await res.json());
    } catch {
      setError("เชื่อมต่อแดชบอร์ดไม่สำเร็จ");
    }
  }

  if (error && !data) {
    return <Empty>{error}</Empty>;
  }

  if (!data) return <Loading />;

  const { draw, live } = data;
  const statusLabel =
    draw.status === "open"
      ? "เปิดรับโพย"
      : draw.status === "settled"
        ? `ออกผลแล้ว ${draw.result4}`
        : "ปิดงวด";

  function copyLineSummary() {
    const profit = live.totalReceived - live.totalRisk;
    const top3 = data!.top10.slice(0, 3).map((r) => `${r.number}(${r.sets}ชุด)`).join(", ");
    const text = [
      `🎯 หวยลาว — ${draw.label}`,
      `━━━━━━━━━━━━━━`,
      `รับรวม:   ฿${live.totalReceived.toLocaleString()}`,
      `เสี่ยงคาด:  ฿${live.totalRisk.toLocaleString()}`,
      `กำไร: ${profit >= 0 ? "+" : ""}฿${profit.toLocaleString()}`,
      `━━━━━━━━━━━━━━`,
      `โพย: ${live.totalBets} ชุด / เลข: ${live.uniqueNumbers} เลข`,
      top3 ? `เลขดัง: ${top3}` : "",
      draw.result4 ? `ผลออก: ${draw.result4}` : "ยังไม่ออกผล",
    ].filter(Boolean).join("\n");
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <PageHeader
        title="แดชบอร์ด"
        subtitle={`${data.house.name} · ${draw.label} · ${statusLabel} · ราคา ${data.house.pricePerSet} บาท/ชุด`}
      />
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={copyLineSummary}
          className="flex items-center gap-1.5 rounded-xl border border-green-300 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100 dark:border-green-700/50 dark:bg-green-950/40 dark:text-green-300 transition-colors"
        >
          {copied ? "✅ คัดลอกแล้ว" : "📋 คัดลอกสรุปยอด LINE"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBox label="ยอดรับงวดนี้" value={`฿${live.totalReceived.toLocaleString()}`} variant="accent" />
        <StatBox label="โพยรวม" value={live.totalBets} />
        <StatBox label="เลขไม่ซ้ำ" value={live.uniqueNumbers} />
        <StatBox label="เลขเต็ม" value={live.fullCount} variant={live.fullCount > 0 ? "danger" : "default"} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <QuickLink href="/key" color="blue" title="คีย์หวย" />
        <QuickLink
          href="/results"
          color="green"
          title="ออกผล"
          desc={draw.result4 ? draw.result4 : undefined}
        />
      </div>

      <section className={`mt-6 ${ui.cardPad}`}>
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Top 10 เลขรับเยอะ</h2>
        {data.top10.length === 0 ? (
          <Empty>ยังไม่มีโพย</Empty>
        ) : (
          <ul className="mt-4 space-y-3">
            {data.top10.map((r, i) => (
              <li
                key={r.number}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800"
              >
                <span className="w-6 text-sm text-slate-400">{i + 1}</span>
                <span className="font-mono text-lg font-bold tracking-widest text-slate-900 dark:text-amber-200">
                  {r.number}
                </span>
                <span className="text-sm text-slate-500">{r.sets} ชุด</span>
                <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
                  ฿{r.totalAmount.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.nearFull.length > 0 && (
        <section className={`mt-4 ${ui.cardPad}`}>
          <h2 className="text-sm font-bold text-amber-700 dark:text-amber-300">⚠️ เลขใกล้เต็ม ({data.nearFull.length} เลข)</h2>
          <ul className="mt-3 space-y-2">
            {data.nearFull.map((r) => (
              <li
                key={r.number}
                className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-2 dark:bg-amber-900/20"
              >
                <span className="font-mono font-bold tracking-widest text-amber-800 dark:text-amber-200">{r.number}</span>
                <span className="text-sm text-amber-700 dark:text-amber-300">{r.sets} ชุด</span>
                <span className="font-semibold text-amber-800 dark:text-amber-200">฿{r.totalAmount.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.recentDraws.length > 0 && (
        <section className={`mt-4 ${ui.cardPad}`}>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">ประวัติผลรางวัล ({data.recentDraws.length} งวด)</h2>
          <ul className="mt-3 space-y-2">
            {data.recentDraws.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <span className="w-28 font-medium text-slate-700 dark:text-slate-300">{d.label}</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{d.result4 ?? "—"}</span>
                <span className="text-slate-500">฿{(d.totalReceived ?? 0).toLocaleString()}</span>
                <span className={d.profit >= 0 ? "font-bold text-emerald-600" : "font-bold text-red-500"}>
                  {d.profit >= 0 ? "+" : ""}฿{d.profit.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
