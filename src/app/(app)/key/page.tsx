"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SetCapDialog } from "@/components/set-cap-dialog";
import { SAMPLE_LINE } from "@/lib/sample";
import type { NumberSummaryWithLimit, RiskLimitsConfig } from "@/lib/limits";
import { getCapForNumber } from "@/lib/limits";

type SummaryResponse = {
  draw: { id: string; label: string; status?: string };
  totals: {
    totalSets: number;
    totalReceived: number;
    totalRisk: number;
    uniqueNumbers: number;
    fullCount: number;
  };
  rows: NumberSummaryWithLimit[];
};

function StatusBadge({ status }: { status: string }) {
  if (status === "full")
    return (
      <span className="rounded-md bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-300">
        เต็ม
      </span>
    );
  if (status === "warning")
    return (
      <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
        ใกล้เต็ม
      </span>
    );
  if (status === "ok")
    return (
      <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-300">
        ปกติ
      </span>
    );
  return null;
}

export default function KeyPage() {
  const [rawText, setRawText] = useState("");
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [search, setSearch] = useState("");
  const [onlyFull, setOnlyFull] = useState(false);
  const [capNumber, setCapNumber] = useState<string | null>(null);
  const [limitsConfig, setLimitsConfig] = useState<RiskLimitsConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [blockedList, setBlockedList] = useState<{ number: string; reason?: string }[]>([]);

  const loadSummary = useCallback(async () => {
    const res = await fetch("/api/summary");
    if (res.ok) {
      const data = (await res.json()) as SummaryResponse;
      setSummary(data);
      const settingsRes = await fetch("/api/settings");
      if (settingsRes.ok) {
        const { house } = await settingsRes.json();
        const limRes = await fetch("/api/limits");
        const perNumber: RiskLimitsConfig["perNumber"] = {};
        if (limRes.ok) {
          const { limits } = await limRes.json();
          for (const l of limits) {
            perNumber[l.number] = { maxRisk: l.maxRisk, maxSets: l.maxSets };
          }
        }
        setLimitsConfig({
          defaultMaxRisk: house.defaultMaxRisk,
          defaultMaxSets: house.defaultMaxSets,
          perNumber,
        });
      }
    }
  }, []);

  useEffect(() => {
    void loadSummary();
    const t = setInterval(() => void loadSummary(), 4000);
    return () => clearInterval(t);
  }, [loadSummary]);

  async function handleImport() {
    setLoading(true);
    setMessage("");
    setBlockedList([]);
    try {
      const res = await fetch("/api/bets/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "บันทึกไม่สำเร็จ");
        if (data.blocked) setBlockedList(data.blocked);
        return;
      }
      setMessage(
        `บันทึก ${data.added} รายการ` +
          (data.skipped > 0 ? ` · ข้ามเลขเต็ม ${data.skipped}` : ""),
      );
      if (data.blocked?.length) setBlockedList(data.blocked);
      setRawText("");
      await loadSummary();
    } finally {
      setLoading(false);
    }
  }

  async function handleNewDraw() {
    if (!confirm("ปิดงวดเดิมและเปิดงวดใหม่? (โพยงวดเก่ายังดูได้ที่ออกผล/ประวัติ)")) return;
    await fetch("/api/draw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "new" }),
    });
    await loadSummary();
    setMessage("เปิดงวดใหม่แล้ว — เริ่มรับโพยงวดใหม่");
  }

  const rows = (summary?.rows ?? []).filter((r) => {
    if (onlyFull && r.status !== "full") return false;
    if (search.trim() && !r.number.includes(search.trim())) return false;
    return true;
  });

  const capForDialog =
    capNumber && limitsConfig
      ? getCapForNumber(capNumber, limitsConfig)
      : { maxRisk: null, maxSets: null };

  const drawClosed = summary?.draw.status === "settled";

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-white">คีย์หวย</h1>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {summary?.draw.label ?? "—"} · วางจาก LINE เท่านั้น ·{" "}
            {drawClosed ? "ปิดรับแล้ว" : "รับโพยอยู่"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/results"
            className="rounded-lg bg-white/10 px-2 py-1 text-[10px] text-amber-300"
          >
            ออกผล →
          </Link>
          <button
            type="button"
            onClick={handleNewDraw}
            className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-slate-400"
          >
            งวดใหม่
          </button>
        </div>
      </div>

      {drawClosed && (
        <p className="mb-3 rounded-xl bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
          งวดนี้ออกผลแล้ว — กด「งวดใหม่」เพื่อรับโพยรอบถัดไป
        </p>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          disabled={drawClosed}
          placeholder={`คัดลอกจาก LINE วางที่นี่...\n2476\n8210\n20 ชุด`}
          rows={8}
          className="w-full resize-y rounded-xl border border-white/10 bg-slate-950/80 px-3 py-3 font-mono text-sm text-amber-50 outline-none focus:ring-2 focus:ring-amber-500/40 disabled:opacity-50"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleImport}
            disabled={loading || !rawText.trim() || drawClosed}
            className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50"
          >
            {loading ? "กำลังบันทึก..." : "บันทึกโพย"}
          </button>
          <button
            type="button"
            onClick={() => setRawText(SAMPLE_LINE)}
            className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-400"
          >
            ตัวอย่าง
          </button>
        </div>
        {message && <p className="mt-2 text-xs text-amber-200/90">{message}</p>}
        {blockedList.length > 0 && (
          <ul className="mt-2 space-y-1 rounded-lg bg-red-950/40 px-3 py-2 text-xs text-red-300">
            {blockedList.map((b) => (
              <li key={b.number}>{b.reason ?? b.number}</li>
            ))}
          </ul>
        )}
      </section>

      {summary && (
        <>
          <section className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[
              { l: "โพย", v: summary.totals.totalSets },
              { l: "เลข", v: summary.totals.uniqueNumbers },
              { l: "ยอดรับ", v: `฿${summary.totals.totalReceived.toLocaleString()}` },
              { l: "เสี่ยง", v: `฿${summary.totals.totalRisk.toLocaleString()}`, w: true },
              { l: "เลขเต็ม", v: summary.totals.fullCount, w: summary.totals.fullCount > 0 },
            ].map((c) => (
              <div
                key={c.l}
                className={`rounded-2xl border p-3 text-center ${c.w ? "border-red-500/30 bg-red-950/30" : "border-white/10 bg-white/5"}`}
              >
                <p className="text-[10px] text-slate-400">{c.l}</p>
                <p className="mt-1 text-sm font-bold tabular-nums">{c.v}</p>
              </div>
            ))}
          </section>

          <section className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3">
              <label className="flex items-center gap-1 text-[11px] text-slate-400">
                <input type="checkbox" checked={onlyFull} onChange={(e) => setOnlyFull(e.target.checked)} />
                เฉพาะเลขเต็ม
              </label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหา..."
                className="ml-auto w-24 rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-xs"
              />
            </div>
            <div className="max-h-[45vh] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-900 text-[10px] uppercase text-slate-500">
                  <tr>
                    <th className="px-2 py-2">เลข</th>
                    <th className="px-2 py-2 text-right">ชุด</th>
                    <th className="px-2 py-2 text-right">รับ</th>
                    <th className="px-2 py-2">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.number}
                      onClick={() => setCapNumber(row.number)}
                      className={`cursor-pointer border-t border-white/5 hover:bg-amber-500/10 ${row.status === "full" ? "bg-red-950/25" : ""}`}
                    >
                      <td className="px-2 py-3 font-mono font-bold text-amber-200">{row.number}</td>
                      <td className="px-2 py-3 text-right tabular-nums">{row.sets}</td>
                      <td className="px-2 py-3 text-right tabular-nums">{row.totalAmount.toLocaleString()}</td>
                      <td className="px-2 py-3"><StatusBadge status={row.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {capNumber && limitsConfig && (
        <SetCapDialog
          number={capNumber}
          current={capForDialog}
          onSave={async (cap) => {
            await fetch("/api/limits", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ number: capNumber, maxRisk: cap.maxRisk, maxSets: cap.maxSets }),
            });
            setCapNumber(null);
            await loadSummary();
          }}
          onClear={async () => {
            await fetch(`/api/limits?number=${capNumber}`, { method: "DELETE" });
            setCapNumber(null);
            await loadSummary();
          }}
          onClose={() => setCapNumber(null)}
        />
      )}
    </>
  );
}
