"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
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
  const [summaryMode, setSummaryMode] = useState<string>("4 ตัวตรง");
  const [msg, setMsg] = useState("");
  const [slips, setSlips] = useState<
    { id: string; customerName: string | null; betCount: number }[]
  >([]);
  const [billSlipId, setBillSlipId] = useState<string | "all">("all");
  const [settlement, setSettlement] = useState<DrawSettlement | null>(null);
  const [searchPrize, setSearchPrize] = useState("");
  const [searchSummary, setSearchSummary] = useState("");
  const [searchBets, setSearchBets] = useState("");

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
        `/api/bets?drawId=${selectedId}&status=${status}&period=${period}&limit=all`,
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

  const betSummary = useMemo(() => {
    if (!bets) return [];
    const activeBets = bets.filter((b) => b.status !== "cancelled");
    const map = new Map<string, { count: number; amount: number }>();

    for (const b of activeBets) {
      if (summaryMode === "4 ตัวโต๊ด" && b.number.length < 4) continue;
      if (summaryMode === "3 ตัวโต๊ด" && b.number.length < 3) continue;
      if (summaryMode === "3 ตัวท้าย" && b.number.length < 3) continue;
      if (summaryMode === "3 ตัวหน้า" && b.number.length < 3) continue;
      if (summaryMode === "2 ตัวท้าย" && b.number.length < 2) continue;
      if (summaryMode === "2 ตัวหน้า" && b.number.length < 2) continue;

      let key = b.number;
      if (summaryMode === "4 ตัวโต๊ด") key = key.slice(-4).split('').sort().join('');
      else if (summaryMode === "3 ตัวโต๊ด") key = key.slice(-3).split('').sort().join('');
      else if (summaryMode === "3 ตัวท้าย") key = key.slice(-3);
      else if (summaryMode === "3 ตัวหน้า") key = key.slice(0, 3);
      else if (summaryMode === "2 ตัวท้าย") key = key.slice(-2);
      else if (summaryMode === "2 ตัวหน้า") key = key.slice(0, 2);

      const existing = map.get(key) || { count: 0, amount: 0 };
      existing.count += 1;
      existing.amount += b.amount;
      map.set(key, existing);
    }

    return Array.from(map.entries())
      .map(([number, data]) => ({ number, ...data }))
      .sort((a, b) => b.amount - a.amount);
  }, [bets, summaryMode]);

  /** สรุปยอดทุกประเภทรางวัลพร้อมกัน */
  const prizeCategorySummary = useMemo(() => {
    const activeBets = bets.filter((b) => b.status !== "cancelled");
    const pad4 = (n: string) => n.replace(/\D/g, "").padStart(4, "0").slice(-4);

    // ประเภทที่ต้องการแสดง: key => { label, extractor(num4) }
    const categories: { key: string; label: string; extract: (n: string) => string }[] = [
      { key: "fourStraight", label: "4 ตัวตรง", extract: (n) => n },
      { key: "threeStraight", label: "3 ตัวตรง", extract: (n) => n.slice(-3) },
      { key: "twoFront", label: "2 ตัวหน้า", extract: (n) => n.slice(0, 2) },
      { key: "twoBack", label: "2 ตัวหลัง", extract: (n) => n.slice(-2) },
    ];

    return categories.map(({ key, label, extract }) => {
      // นับชุดแยกตามเลข
      const map = new Map<string, { sets: number; amount: number }>();
      for (const b of activeBets) {
        const num4 = pad4(b.number);
        const digit = extract(num4);
        const existing = map.get(digit) ?? { sets: 0, amount: 0 };
        existing.sets += 1;
        existing.amount += b.amount;
        map.set(digit, existing);
      }
      const rows = Array.from(map.entries())
        .map(([number, data]) => ({ number, ...data }))
        .sort((a, b) => b.sets - a.sets);
      const totalSets = rows.reduce((s, r) => s + r.sets, 0);
      const uniqueNumbers = rows.length;
      return { key, label, extract, rows, totalSets, uniqueNumbers };
    });
  }, [bets]);

  /** เลขผลลัพธ์ ถ้าออกแล้ว */
  const resultDigits = useMemo(() => {
    if (!selected?.result4) return null;
    const r = selected.result4.replace(/\D/g, "").padStart(4, "0").slice(-4);
    return {
      full: r,
      back3: r.slice(-3),
      front3: r.slice(0, 3),
      front2: r.slice(0, 2),
      back2: r.slice(-2),
    };
  }, [selected]);

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
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold">
              สรุปยอดตามประเภทรางวัล
              {resultDigits && (
                <span className="ml-2 font-mono text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                  ผล: {resultDigits.full}
                </span>
              )}
            </h2>
            <input
              type="text"
              placeholder="🔍 ค้นหาเลข..."
              value={searchPrize}
              onChange={(e) => setSearchPrize(e.target.value)}
              className="w-36 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {prizeCategorySummary.map((cat) => {
              const filteredRows = searchPrize.trim()
                ? cat.rows.filter((r) => r.number.includes(searchPrize.trim()))
                : cat.rows;
              const winDigit =
                cat.key === "fourStraight" ? resultDigits?.full
                : cat.key === "threeStraight" ? resultDigits?.back3
                : cat.key === "twoFront" ? resultDigits?.front2
                : cat.key === "twoBack" ? resultDigits?.back2
                : undefined;

              const winRow = winDigit ? cat.rows.find((r) => r.number === winDigit) : undefined;
              const showWinBanner = winRow && (!searchPrize.trim() || winRow.number.includes(searchPrize.trim()));

              return (
                <div
                  key={cat.key}
                  className={`rounded-xl border p-3 ${
                    winRow
                      ? "border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/30"
                      : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {cat.label}
                    </span>
                    <div className="text-right">
                      <span className="text-lg font-extrabold text-blue-700 dark:text-amber-300">
                        {cat.uniqueNumbers}
                      </span>
                      <span className="ml-1 text-xs text-slate-500">เลข</span>
                      <span className="ml-2 text-base font-bold text-slate-800 dark:text-slate-200">
                        {cat.totalSets}
                      </span>
                      <span className="ml-1 text-xs text-slate-500">ชุด</span>
                    </div>
                  </div>
                  {showWinBanner && (
                    <div className="mb-2 rounded-lg bg-emerald-100 px-3 py-1.5 dark:bg-emerald-900/50">
                      <span className="text-xs text-emerald-700 dark:text-emerald-300">🎯 ถูกรางวัล: </span>
                      <span className="font-mono font-bold text-emerald-800 dark:text-emerald-200">
                        {winRow.number}
                      </span>
                      <span className="ml-2 text-xs text-emerald-700 dark:text-emerald-300">
                        {winRow.sets} ชุด
                      </span>
                    </div>
                  )}
                  <div className="max-h-[150px] overflow-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr>
                          <th className="py-1 text-left text-slate-500">เลข</th>
                          <th className="py-1 text-right text-slate-500">ชุด</th>
                          <th className="py-1 text-right text-slate-500">ยอดรับ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.length === 0 ? (
                          <tr><td colSpan={3} className="py-2 text-center text-slate-400">ไม่พบเลข "{searchPrize}"</td></tr>
                        ) : filteredRows.map((r) => (
                          <tr
                            key={r.number}
                            className={`${
                              r.number === winDigit
                                ? "font-bold text-emerald-700 dark:text-emerald-300"
                                : "text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            <td className="py-0.5 font-mono">
                              {r.number === winDigit && "🎯 "}{r.number}
                            </td>
                            <td className="py-0.5 text-right">{r.sets}</td>
                            <td className="py-0.5 text-right">{r.amount.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {selected && (
        <section className={`mt-4 ${ui.cardPad}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold">สรุปยอดรับแยกตามเลข</h2>
              <input
                type="text"
                placeholder="🔍 ค้นหาเลข..."
                value={searchSummary}
                onChange={(e) => setSearchSummary(e.target.value)}
                className="w-36 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
            <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              {["4 ตัวตรง", "4 ตัวโต๊ด", "3 ตัวโต๊ด", "3 ตัวท้าย", "3 ตัวหน้า", "2 ตัวท้าย", "2 ตัวหน้า"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSummaryMode(m)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    summaryMode === m
                      ? "bg-white text-blue-700 shadow-sm dark:bg-slate-700 dark:text-amber-300"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          {betSummary.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">ไม่มีข้อมูลเลขในหมวดหมู่นี้</p>
          ) : (
            <div className="mt-3 max-h-[40vh] overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className={ui.th}>เลข</th>
                    <th className={`${ui.th} text-right`}>จำนวนรายการ</th>
                    <th className={`${ui.th} text-right`}>ยอดรับรวม</th>
                  </tr>
                </thead>
                <tbody>
                  {betSummary
                    .filter((s) => !searchSummary.trim() || s.number.includes(searchSummary.trim()))
                    .map((s) => (
                    <tr key={s.number} className="hover:bg-blue-50 dark:hover:bg-slate-800">
                      <td className={`${ui.td} font-mono font-bold text-slate-900 dark:text-amber-200`}>
                        {s.number}
                      </td>
                      <td className={`${ui.td} text-right text-slate-600 dark:text-slate-400`}>
                        {s.count} รายการ
                      </td>
                      <td className={`${ui.td} text-right font-bold text-blue-700 dark:text-amber-400`}>
                        ฿{s.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {selected && (
        <section className={`mt-4 ${ui.cardPad}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold">
                รายการโพย — {selected.label} ({bets.length} รายการ)
              </h2>
              <input
                type="text"
                placeholder="🔍 ค้นหาเลข/ชื่อ..."
                value={searchBets}
                onChange={(e) => setSearchBets(e.target.value)}
                className="w-40 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
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
                  {bets
                    .filter((b) => {
                      if (!searchBets.trim()) return true;
                      const q = searchBets.trim();
                      return b.number.includes(q) || (b.customerName ?? "").includes(q);
                    })
                    .map((b) => (
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
