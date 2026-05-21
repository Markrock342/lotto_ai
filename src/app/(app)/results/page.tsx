"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { DrawSettlement } from "@/lib/settlement";

type ResultsData = {
  draw: { id: string; label: string; status: string; result4?: string };
  hasResult: boolean;
  settlement?: DrawSettlement;
};

export default function ResultsPage() {
  const [fourDigit, setFourDigit] = useState("");
  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch("/api/results");
    if (res.ok) {
      const json = await res.json();
      setData(json);
      if (json.draw?.result4) setFourDigit(json.draw.result4);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleSettle() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fourDigit }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json.error || "ไม่สำเร็จ");
        return;
      }
      setMessage("ออกผลและคำนวณเรียบร้อย");
      setData({
        draw: json.draw,
        hasResult: true,
        settlement: json.settlement,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleNewDraw() {
    if (!confirm("เปิดงวดใหม่? งวดนี้จะปิดรับโพยแล้ว")) return;
    await fetch("/api/draw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "new" }),
    });
    setMessage("เปิดงวดใหม่แล้ว");
    window.location.href = "/key";
  }

  const s = data?.settlement;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-white">ออกผล / ตรวจรางวัล</h1>
          <p className="text-xs text-slate-400">{data?.draw.label ?? "—"}</p>
        </div>
        <Link href="/dashboard" className="text-[10px] text-slate-500">
          ← แดชบอร์ด
        </Link>
      </div>

      <section className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <label className="text-xs text-slate-400">ผลหวย 4 ตัว (หวยลาวชุด)</label>
        <div className="mt-2 flex gap-2">
          <input
            value={fourDigit}
            onChange={(e) => setFourDigit(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="0000"
            maxLength={4}
            className="w-32 rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-center font-mono text-2xl font-bold tracking-[0.3em] text-amber-200 outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          <button
            type="button"
            onClick={handleSettle}
            disabled={loading || fourDigit.length !== 4}
            className="flex-1 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {loading ? "กำลังคำนวณ..." : "บันทึกผล + ตรวจรางวัล"}
          </button>
        </div>
        {message && <p className="mt-2 text-xs text-emerald-300">{message}</p>}
      </section>

      {s && (
        <>
          <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="ยอดรับ" value={s.totalReceived} />
            <Stat label="ยอดจ่าย" value={s.totalPayout} red />
            <Stat
              label="กำไร/ขาดทุน"
              value={s.profit}
              green={s.profit >= 0}
              red={s.profit < 0}
            />
            <Stat label="โพยถูก" value={s.winningBets} plain />
          </section>

          <p className="mt-2 text-center font-mono text-3xl font-bold tracking-widest text-emerald-300">
            ผลออก {s.result.fourDigit}
          </p>

          <section className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <h2 className="border-b border-white/10 px-4 py-3 text-sm font-semibold text-slate-200">
              เลขที่ถูกรางวัล ({s.lines.length} รายการ)
            </h2>
            {s.lines.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">ไม่มีโพยถูกรางวัล</p>
            ) : (
              <div className="max-h-[50vh] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-900 text-[10px] uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">เลข</th>
                      <th className="px-3 py-2">ถูก</th>
                      <th className="px-3 py-2 text-right">จ่าย (฿)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.byNumber
                      .filter((n) => n.payout > 0)
                      .map((n) => (
                        <tr key={n.number} className="border-t border-white/5">
                          <td className="px-3 py-2 font-mono font-bold text-amber-200">
                            {n.number}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-400">
                            {n.wins.map((w) => w.label).join(", ")}
                          </td>
                          <td className="px-3 py-2 text-right font-medium tabular-nums text-red-300">
                            {n.payout.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <button
            type="button"
            onClick={handleNewDraw}
            className="mt-4 w-full rounded-2xl border border-white/10 py-3 text-sm text-slate-300 hover:bg-white/5"
          >
            ปิดงวดนี้ → เปิดงวดใหม่ (คีย์โพยต่อ)
          </button>
        </>
      )}
    </>
  );
}

function Stat({
  label,
  value,
  red,
  green,
  plain,
}: {
  label: string;
  value: number;
  red?: boolean;
  green?: boolean;
  plain?: boolean;
}) {
  const display = plain ? String(value) : `฿${value.toLocaleString()}`;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
      <p className="text-[10px] text-slate-400">{label}</p>
      <p
        className={`mt-1 text-sm font-bold tabular-nums ${
          red ? "text-red-300" : green ? "text-emerald-300" : "text-white"
        }`}
      >
        {display}
      </p>
    </div>
  );
}
