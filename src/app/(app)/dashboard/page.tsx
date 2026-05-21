"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 5000);
    return () => clearInterval(t);
  }, []);

  async function load() {
    const res = await fetch("/api/dashboard");
    if (res.ok) setData(await res.json());
  }

  if (!data) {
    return <p className="text-sm text-slate-500">กำลังโหลด...</p>;
  }

  const { draw, live } = data;

  return (
    <>
      <h1 className="text-xl font-bold text-white">แดชบอร์ด</h1>
      <p className="text-xs text-slate-400">{data.house.name} · {draw.label}</p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card label="ยอดรับวันนี้" value={`฿${live.totalReceived.toLocaleString()}`} accent />
        <Card label="โพยรวม" value={String(live.totalBets)} />
        <Card label="เลขไม่ซ้ำ" value={String(live.uniqueNumbers)} />
        <Card label="เลขเต็ม" value={String(live.fullCount)} warn={live.fullCount > 0} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Link
          href="/key"
          className="rounded-2xl border border-amber-500/30 bg-amber-950/30 p-4 transition hover:bg-amber-950/50"
        >
          <p className="text-sm font-bold text-amber-300">✏️ คีย์หวย</p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
            คัดลอกจาก LINE มาวาง · iPad/คอม
          </p>
        </Link>
        <Link
          href="/results"
          className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-4 transition hover:bg-emerald-950/50"
        >
          <p className="text-sm font-bold text-emerald-300">🎯 ออกผล / ตรวจรางวัล</p>
          <p className="mt-1 text-xs text-slate-400">
            {draw.result4 ? `ผลล่าสุด ${draw.result4}` : "ใส่เลขออก · คำนวณจ่าย"}
          </p>
        </Link>
      </div>

      <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-sm font-semibold text-slate-200">Top 10 เลขรับเยอะ</h2>
        {data.top10.length === 0 ? (
          <p className="mt-3 text-xs text-slate-500">ยังไม่มีโพย — ไปคีย์หวย</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.top10.map((r, i) => (
              <li key={r.number} className="flex items-center justify-between text-sm">
                <span className="text-slate-500">{i + 1}.</span>
                <span className="font-mono font-bold text-amber-200">{r.number}</span>
                <span className="text-slate-400">{r.sets} ชุด</span>
                <span className="tabular-nums text-white">฿{r.totalAmount.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.recentDraws.length > 0 && (
        <section className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm font-semibold text-slate-200">งวดที่ออกผลแล้ว</h2>
          <ul className="mt-3 space-y-2">
            {data.recentDraws.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-950/50 px-3 py-2 text-xs">
                <span className="text-slate-300">{d.label}</span>
                <span className="font-mono font-bold text-emerald-300">{d.result4}</span>
                <span className="text-slate-400">รับ ฿{(d.totalReceived ?? 0).toLocaleString()}</span>
                <span className="text-red-300">จ่าย ฿{(d.totalPayout ?? 0).toLocaleString()}</span>
                <span className={d.profit >= 0 ? "text-emerald-400" : "text-red-400"}>
                  กำไร ฿{d.profit.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function Card({
  label,
  value,
  accent,
  warn,
}: {
  label: string;
  value: string;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        warn
          ? "border-red-500/30 bg-red-950/30"
          : accent
            ? "border-amber-500/30 bg-amber-950/30"
            : "border-white/10 bg-white/5"
      }`}
    >
      <p className="text-[10px] uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums text-white">{value}</p>
    </div>
  );
}
