"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, StatBox, ui } from "@/components/ui";
import { PeriodFilter } from "@/components/period-filter";
import type { ReportPeriod } from "@/lib/date-period";
import { formatBillText } from "@/lib/format-bill";
import type { DrawSettlement } from "@/lib/settlement";

type DrawRow = {
  id: string;
  label: string;
  status: string;
  result4: string | null;
  totalReceived: number | null;
  totalPayout: number | null;
  betCount: number;
  profit: number;
};

type BetRow = {
  id: string;
  number: string;
  amount: number;
  status: string;
  at: string;
  by: string;
  customerName?: string | null;
};

export default function ReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>("month");
  const [draws, setDraws] = useState<DrawRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bets, setBets] = useState<BetRow[]>([]);
  const [showCancelled, setShowCancelled] = useState(false);
  const [msg, setMsg] = useState("");
  const [slips, setSlips] = useState<
    { id: string; customerName: string | null; betCount: number }[]
  >([]);
  const [billSlipId, setBillSlipId] = useState<string | "all">("all");
  const [settlement, setSettlement] = useState<DrawSettlement | null>(null);

  const loadDraws = useCallback(async () => {
    const res = await fetch(`/api/draws?period=${period}`);
    if (res.ok) {
      const { draws: d } = await res.json();
      setDraws(d);
      setSelectedId((prev) => {
        if (prev && d.some((x: DrawRow) => x.id === prev)) return prev;
        return d[0]?.id ?? null;
      });
    }
  }, [period]);

  useEffect(() => {
    void loadDraws();
  }, [loadDraws]);

  useEffect(() => {
    if (!selectedId) return;
    void (async () => {
      const status = showCancelled ? "all" : "active";
      const res = await fetch(
        `/api/bets?drawId=${selectedId}&status=${status}&period=${period}`,
      );
      if (res.ok) {
        const { bets: b } = await res.json();
        setBets(b);
      }
      const slipRes = await fetch(`/api/slips?drawId=${selectedId}`);
      if (slipRes.ok) {
        const { slips: s } = await slipRes.json();
        setSlips(s);
        setBillSlipId("all");
      } else {
        setSlips([]);
      }

      const drawInfo = draws.find((d) => d.id === selectedId);
      if (drawInfo && drawInfo.status === "settled") {
        const resResult = await fetch(`/api/results?drawId=${selectedId}`);
        if (resResult.ok) {
          const resultJson = await resResult.json();
          if (resultJson.hasResult && resultJson.settlement) {
            setSettlement(resultJson.settlement);
          } else {
            setSettlement(null);
          }
        } else {
          setSettlement(null);
        }
      } else {
        setSettlement(null);
      }
    })();
  }, [selectedId, period, showCancelled, draws]);

  const selected = draws.find((d) => d.id === selectedId);
  const settled = draws.filter((d) => d.status === "settled");
  const totalProfit = settled.reduce((s, d) => s + d.profit, 0);

  function openPrint() {
    if (!selectedId) return;
    window.open(`/reports/print?drawId=${selectedId}`, "_blank");
  }

  async function handleCopyBill() {
    if (!selectedId) return;
    const q = new URLSearchParams({ drawId: selectedId });
    if (billSlipId !== "all") q.set("slipId", billSlipId);
    const res = await fetch(`/api/reports/bill?${q}`);
    if (!res.ok) return;
    const data = await res.json();
    const text = formatBillText({
      houseName: data.houseName,
      drawLabel: data.draw.label,
      customerName: data.customerName,
      pricePerSet: data.pricePerSet,
      result4: data.draw.result4,
      rows: data.rows,
      totalSets: data.totalSets,
      totalReceived: data.totalReceived,
      printedAt: data.printedAt,
    });
    await navigator.clipboard.writeText(text);
    setMsg("คัดลอกบิลแล้ว — วางส่งลูกค้าใน LINE ได้");
    setTimeout(() => setMsg(""), 3000);
  }

  function handleExport() {
    const q = new URLSearchParams({ period });
    if (selectedId) q.set("drawId", selectedId);
    if (showCancelled) q.set("includeCancelled", "1");
    window.location.href = `/api/reports/export?${q}`;
  }

  if (draws.length === 0) {
    return (
      <>
        <PageHeader title="รายงาน" />
        <PeriodFilter value={period} onChange={setPeriod} />
        <p className="mt-6 text-center text-sm text-slate-500">ไม่มีงวดในช่วงนี้</p>
      </>
    );
  }

  return (
    <>
      <PageHeader title="รายงาน" />

      <PeriodFilter value={period} onChange={setPeriod} />

      {slips.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-600 dark:text-slate-400">บิล:</span>
          <select
            value={billSlipId}
            onChange={(e) => setBillSlipId(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
          >
            <option value="all">รวมทั้งงวด</option>
            {slips.map((s) => (
              <option key={s.id} value={s.id}>
                {s.customerName ?? "(ไม่ระบุชื่อ)"} ({s.betCount} รายการ)
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={openPrint} disabled={!selectedId} className={ui.btnPrimary}>
          พิมพ์บิล
        </button>
        <button type="button" onClick={handleCopyBill} disabled={!selectedId} className={ui.btnGhost}>
          คัดลอกส่งลูกค้า
        </button>
        <button type="button" onClick={handleExport} className={ui.btnGhost}>
          ส่งออก Excel (CSV)
        </button>
      </div>
      {msg && <p className="mt-2 text-sm text-emerald-600">{msg}</p>}

      <div className="mt-4 grid grid-cols-3 gap-3">
        <StatBox label="งวดในช่วง" value={draws.length} />
        <StatBox label="ออกผลแล้ว" value={settled.length} />
        <StatBox
          label="กำไรรวม"
          value={`${totalProfit >= 0 ? "+" : ""}฿${totalProfit.toLocaleString()}`}
          variant={totalProfit >= 0 ? "success" : "danger"}
        />
      </div>

      <section className={`mt-4 ${ui.tableWrap}`}>
        <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-bold dark:border-slate-700">
          เลือกงวด
        </h2>
        <div className="max-h-[40vh] overflow-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className={ui.th}>งวด</th>
                <th className={ui.th}>สถานะ</th>
                <th className={ui.th}>ผล</th>
                <th className={`${ui.th} text-right`}>โพย</th>
                <th className={`${ui.th} text-right`}>รับ</th>
                <th className={`${ui.th} text-right`}>จ่าย</th>
                <th className={`${ui.th} text-right`}>ผลสุทธิ</th>
              </tr>
            </thead>
            <tbody>
              {draws.map((d) => (
                <tr
                  key={d.id}
                  onClick={() => setSelectedId(d.id)}
                  className={`cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-800 ${
                    selectedId === d.id ? "bg-blue-100 dark:bg-slate-800" : ""
                  }`}
                >
                  <td className={ui.td}>{d.label}</td>
                  <td className={ui.td}>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        d.status === "open"
                          ? "bg-blue-100 text-blue-700"
                          : d.status === "settled"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {d.status === "open" ? "เปิด" : d.status === "settled" ? "ออกผล" : "ปิด"}
                    </span>
                  </td>
                  <td className={`${ui.td} font-mono font-bold`}>{d.result4 ?? "—"}</td>
                  <td className={`${ui.td} text-right`}>{d.betCount}</td>
                  <td className={`${ui.td} text-right`}>฿{(d.totalReceived ?? 0).toLocaleString()}</td>
                  <td className={`${ui.td} text-right text-red-600`}>
                    ฿{(d.totalPayout ?? 0).toLocaleString()}
                  </td>
                  <td
                    className={`${ui.td} text-right font-bold ${
                      d.profit >= 0 ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {d.profit >= 0 ? "+" : ""}฿{d.profit.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selected && settlement && settlement.bySlip.filter((x) => x.customerName || settlement.bySlip.length > 1).length > 0 && (
        <section className={`${ui.tableWrap} mt-4`}>
          <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-bold dark:border-slate-700">
            สรุปแยกบิล / ลูกค้า
          </h2>
          <div className="max-h-[40vh] overflow-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className={ui.th}>ลูกค้า</th>
                  <th className={`${ui.th} text-right`}>รับ</th>
                  <th className={`${ui.th} text-right`}>จ่าย</th>
                  <th className={`${ui.th} text-right`}>กำไร</th>
                  <th className={ui.th}>ถูกรางวัล</th>
                </tr>
              </thead>
              <tbody>
                {settlement.bySlip.map((sl) => (
                  <tr
                    key={sl.slipId ?? "_none"}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <td className={`${ui.td} font-medium`}>
                      {sl.customerName ?? "(ไม่ระบุชื่อ)"}
                    </td>
                    <td className={`${ui.td} text-right tabular-nums`}>
                      {sl.totalReceived.toLocaleString()}
                    </td>
                    <td className={`${ui.td} text-right tabular-nums text-red-600`}>
                      {sl.totalPayout.toLocaleString()}
                    </td>
                    <td
                      className={`${ui.td} text-right tabular-nums font-medium ${
                        sl.profit >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {sl.profit >= 0 ? "+" : ""}
                      {sl.profit.toLocaleString()}
                    </td>
                    <td className={`${ui.td} text-sm text-slate-500`}>
                      {sl.byPrizeType.length > 0
                        ? sl.byPrizeType
                            .map((p) => `${p.label} ${p.count}ชุด`)
                            .join(" · ")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {selected && (
        <section className={`mt-4 ${ui.cardPad}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold">
              รายการโพย — {selected.label} ({bets.length} รายการ)
            </h2>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={showCancelled}
                onChange={(e) => setShowCancelled(e.target.checked)}
              />
              รวมที่ยกเลิก
            </label>
          </div>
          {bets.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">ไม่มีโพยในช่วงนี้</p>
          ) : (
            <div className="mt-3 max-h-[35vh] overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className={ui.th}>วันที่</th>
                    <th className={ui.th}>เวลา</th>
                    <th className={ui.th}>ลูกค้า</th>
                    <th className={ui.th}>เลข</th>
                    <th className={`${ui.th} text-right`}>ยอด</th>
                    <th className={ui.th}>คีย์โดย</th>
                    <th className={ui.th}>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {bets.map((b) => (
                    <tr
                      key={b.id}
                      className={b.status === "cancelled" ? "opacity-50" : ""}
                    >
                      <td className={ui.td}>
                        {new Date(b.at).toLocaleDateString("th-TH")}
                      </td>
                      <td className={ui.td}>
                        {new Date(b.at).toLocaleTimeString("th-TH", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className={ui.td}>
                        {b.customerName ? (
                          <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 dark:bg-amber-900/40 dark:text-amber-300">
                            {b.customerName}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className={`${ui.td} font-mono font-bold`}>{b.number}</td>
                      <td className={`${ui.td} text-right`}>{b.amount.toLocaleString()}</td>
                      <td className={ui.td}>{b.by}</td>
                      <td className={ui.td}>
                        {b.status === "cancelled" ? (
                          <span className="text-xs text-red-500">ยกเลิก</span>
                        ) : (
                          <span className="text-xs text-slate-400">ปกติ</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </>
  );
}
