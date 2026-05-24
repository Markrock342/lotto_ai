"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BetRecentList } from "@/components/bet-recent-list";
import { ImageOcrUpload } from "@/components/image-ocr-upload";
import { SetCapDialog } from "@/components/set-cap-dialog";
import { PageHeader, StatBox, ui } from "@/components/ui";
import { formatBillText } from "@/lib/format-bill";
import type { NumberSummaryWithLimit, RiskLimitsConfig } from "@/lib/limits";
import { getCapForNumber } from "@/lib/limits";
import { parseSlipText } from "@/lib/parse-slip";
import {
  compareNumbers,
  compareStrings,
  sortIndicator,
  toggleSortDir,
  type SortDir,
} from "@/lib/table-sort";

type SummarySortKey = "number" | "sets" | "totalAmount" | "status";

const STATUS_RANK: Record<string, number> = {
  full: 0,
  warning: 1,
  ok: 2,
  unlimited: 3,
};

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
    return <span className="rounded-md bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600 dark:bg-red-900/50 dark:text-red-300">เต็ม</span>;
  if (status === "warning")
    return <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">ใกล้เต็ม</span>;
  if (status === "ok")
    return <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">ปกติ</span>;
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
  const [reloadBets, setReloadBets] = useState(0);
  const [canEditLimits, setCanEditLimits] = useState(false);
  const [pricePerSet, setPricePerSet] = useState<number | null>(null);
  const [customerList, setCustomerList] = useState<string[]>([]);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [canEditSettings, setCanEditSettings] = useState(false);
  const [summarySortKey, setSummarySortKey] = useState<SummarySortKey>("totalAmount");
  const [summarySortDir, setSummarySortDir] = useState<SortDir>("desc");
  const [selectedNumbers, setSelectedNumbers] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const previewResult = useMemo(() => {
    if (!rawText.trim() || pricePerSet == null) return null;
    return parseSlipText(rawText, pricePerSet);
  }, [rawText, pricePerSet]);

  const previewTotal = useMemo(() => {
    if (!previewResult) return 0;
    return previewResult.sections.reduce((sum, s) => {
      return sum + s.entries.reduce((s2, e) => s2 + e.amount, 0);
    }, 0);
  }, [previewResult]);

  // เช็คว่าเลขไหนใน preview เกิน cap แล้ว
  const previewBlockedNumbers = useMemo(() => {
    if (!previewResult || !limitsConfig || !summary) return [];
    // รวมจำนวนชุดปัจจุบันจาก summary
    const currentSets = new Map(summary.rows.map((r) => [r.number, r.sets]));
    const blocked: { number: string; current: number; incoming: number; max: number }[] = [];
    const seen = new Map<string, number>(); // นับใน preview เอง
    for (const sec of previewResult.sections) {
      for (const entry of sec.entries) {
        seen.set(entry.number, (seen.get(entry.number) ?? 0) + 1);
      }
    }
    for (const [number, incomingSets] of seen.entries()) {
      const currentSet = currentSets.get(number) ?? 0;
      const maxSets = limitsConfig.perNumber?.[number]?.maxSets
        ?? limitsConfig.defaultMaxSets;
      if (maxSets != null && currentSet + incomingSets > maxSets) {
        blocked.push({ number, current: currentSet, incoming: incomingSets, max: maxSets });
      }
    }
    return blocked;
  }, [previewResult, limitsConfig, summary]);

  const loadStaticData = useCallback(async () => {
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
      setPricePerSet(house.pricePerSet);
      setCustomerList(Array.isArray(house.customerList) ? house.customerList : []);
      const meRes = await fetch("/api/me");
      if (meRes.ok) {
        const { permissions } = await meRes.json();
        setCanEditSettings(permissions.includes("settings:write"));
      }
    }
  }, []);

  const loadSummary = useCallback(async () => {
    const res = await fetch("/api/summary");
    if (res.ok) {
      const data = (await res.json()) as SummaryResponse;
      setSummary(data);
    }
  }, []);

  useEffect(() => {
    void loadStaticData();
    void loadSummary();
    const t = setInterval(() => void loadSummary(), 4000);
    return () => clearInterval(t);
  }, [loadStaticData, loadSummary]);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/me");
      if (res.ok) {
        const { permissions } = await res.json();
        setCanEditLimits(permissions.includes("limits:write"));
      }
    })();
  }, []);

  async function handleImport() {
    // แจ้งเตือนถ้ามีเลขเกิน cap
    if (previewBlockedNumbers.length > 0) {
      const list = previewBlockedNumbers
        .map((b) => `${b.number} (มี ${b.current} + เพิ่ม ${b.incoming} = ${b.current + b.incoming} ชุด เกิน cap ${b.max})`)
        .join("\n");
      const ok = confirm(`⚠️ เลขเกิน Cap ${previewBlockedNumbers.length} รายการ:\n\n${list}\n\nบันทึกต่อไหม? (เลขที่เกินจะถูกตัดออกอัตโนมัติ)`);
      if (!ok) return;
    }
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
      const slipNote =
        data.sectionCount > 1
          ? ` · แยก ${data.sectionCount} บิล`
          : data.slips?.[0]?.customerName
            ? ` · ${data.slips[0].customerName}`
            : "";
      setMessage(
        `บันทึก ${data.added} ชุด` +
          slipNote +
          (data.skipped > 0 ? ` · ข้าม ${data.skipped}` : ""),
      );
      if (data.blocked?.length) setBlockedList(data.blocked);
      setRawText("");
      await loadSummary();
      setReloadBets((n) => n + 1);
    } finally {
      setLoading(false);
    }
  }

  async function handleNewDraw() {
    if (!confirm("ปิดงวดนี้และเปิดงวดใหม่?")) return;
    await fetch("/api/draw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "new" }),
    });
    await loadSummary();
    setMessage("เปิดงวดใหม่แล้ว");
  }

  function handleCopySummary() {
    if (!summary) return;
    const lines = summary.rows.map(
      (r) => `${r.number}\t${r.sets} ชุด\t฿${r.totalAmount.toLocaleString()}\t${r.status}`,
    );
    void navigator.clipboard.writeText(lines.join("\n"));
    setMessage("คัดลอกสรุปแล้ว");
  }

  const filteredRows = useMemo(
    () =>
      (summary?.rows ?? []).filter((r) => {
        if (onlyFull && r.status !== "full") return false;
        if (search.trim() && !r.number.includes(search.trim())) return false;
        return true;
      }),
    [summary?.rows, onlyFull, search],
  );

  const rows = useMemo(() => {
    const list = [...filteredRows];
    list.sort((a, b) => {
      if (summarySortKey === "number") {
        return compareStrings(a.number, b.number, summarySortDir);
      }
      if (summarySortKey === "sets") {
        return compareNumbers(a.sets, b.sets, summarySortDir);
      }
      if (summarySortKey === "status") {
        const ra = STATUS_RANK[a.status] ?? 9;
        const rb = STATUS_RANK[b.status] ?? 9;
        return compareNumbers(ra, rb, summarySortDir);
      }
      return compareNumbers(a.totalAmount, b.totalAmount, summarySortDir);
    });
    return list;
  }, [filteredRows, summarySortKey, summarySortDir]);

  const allNumbersSelected =
    rows.length > 0 && rows.every((r) => selectedNumbers.has(r.number));

  function toggleSummarySort(key: SummarySortKey) {
    if (summarySortKey === key) setSummarySortDir(toggleSortDir(summarySortDir));
    else {
      setSummarySortKey(key);
      setSummarySortDir(key === "number" ? "asc" : "desc");
    }
  }

  function toggleNumberSelect(number: string) {
    setSelectedNumbers((prev) => {
      const next = new Set(prev);
      if (next.has(number)) next.delete(number);
      else next.add(number);
      return next;
    });
  }

  function toggleSelectAllNumbers() {
    if (allNumbersSelected) setSelectedNumbers(new Set());
    else setSelectedNumbers(new Set(rows.map((r) => r.number)));
  }

  async function handleBulkCancelByNumber() {
    if (selectedNumbers.size === 0) return;
    if (!confirm(`ยกเลิกโพยเลขที่เลือก ${selectedNumbers.size} เลข (ทุกชุดของเลขนั้น)?`))
      return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/bets/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numbers: [...selectedNumbers] }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "ยกเลิกไม่สำเร็จ");
        return;
      }
      setMessage(`ยกเลิกแล้ว ${data.cancelled} รายการ`);
      setSelectedNumbers(new Set());
      await loadSummary();
      setReloadBets((n) => n + 1);
    } finally {
      setBulkLoading(false);
    }
  }

  const drawClosed = summary?.draw.status === "settled";

  function SummarySortTh({
    label,
    col,
    align,
  }: {
    label: string;
    col: SummarySortKey;
    align?: "right";
  }) {
    return (
      <th className={`${ui.th} ${align === "right" ? "text-right" : ""}`}>
        <button
          type="button"
          onClick={() => toggleSummarySort(col)}
          className="inline-flex items-center gap-1 font-semibold hover:text-blue-600 dark:hover:text-amber-300"
        >
          {label}
          <span className="text-[10px] opacity-60">
            {sortIndicator(summarySortKey === col, summarySortDir)}
          </span>
        </button>
      </th>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <PageHeader
          title="คีย์หวย"
          subtitle={`${summary?.draw.label ?? "—"} · ${drawClosed ? "ปิดรับ" : "เปิดรับ"}`}
        />
        <div className="flex flex-wrap gap-2">
          {summary && (
            <>
              <button
                type="button"
                onClick={() =>
                  window.open(
                    `/reports/print?drawId=${summary.draw.id}`,
                    "_blank",
                  )
                }
                className={ui.btnGhost}
              >
                พิมพ์บิล
              </button>
              <button
                type="button"
                onClick={async () => {
                  const res = await fetch(
                    `/api/reports/bill?drawId=${summary.draw.id}`,
                  );
                  if (!res.ok) return;
                  const data = await res.json();
                  await navigator.clipboard.writeText(
                    formatBillText({
                      houseName: data.houseName,
                      drawLabel: data.draw.label,
                      pricePerSet: data.pricePerSet,
                      result4: data.draw.result4,
                      rows: data.rows,
                      totalSets: data.totalSets,
                      totalReceived: data.totalReceived,
                      printedAt: data.printedAt,
                    }),
                  );
                  setMessage("คัดลอกบิลแล้ว");
                }}
                className={ui.btnGhost}
              >
                คัดลอกบิล
              </button>
            </>
          )}
          <Link href="/results" className={ui.btnGhost}>
            ออกผล
          </Link>
          <button type="button" onClick={handleNewDraw} className={ui.btnGhost}>
            งวดใหม่
          </button>
        </div>
      </div>

      {drawClosed && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-200">
          งวดนี้ปิดรับแล้ว
        </div>
      )}

      <section className={ui.cardPad}>
        <ImageOcrUpload
          disabled={drawClosed}
          onText={(text) => setRawText((prev) => (prev.trim() ? `${prev}\n${text}` : text))}
          onStatus={setMessage}
        />
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          แยกบิลตามชื่อ: ใส่บรรทัดหัวข้อ เช่น <span className="font-mono">#สมชาย</span> หรือ{" "}
          <span className="font-mono">ลูกค้า: น้องหมิว</span> ก่อนเลขแต่ละกลุ่ม
        </p>
        {/* Customer quick-select */}
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-800/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">เลือกลูกค้า</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {customerList.map((name) => (
              <span
                key={name}
                className="group flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-amber-900/40 dark:text-amber-300"
              >
                <button
                  type="button"
                  disabled={drawClosed}
                  onClick={() => {
                    setRawText((prev) => {
                      const prefix = `#${name}\n`;
                      if (!prev.trim()) return prefix;
                      if (prev.endsWith(prefix)) return prev;
                      return prev.trimEnd() + `\n\n#${name}\n`;
                    });
                  }}
                  className="disabled:opacity-40"
                >
                  #{name}
                </button>
                {canEditSettings && (
                  <button
                    type="button"
                    aria-label={`ลบ ${name}`}
                    onClick={async () => {
                      const next = customerList.filter((n) => n !== name);
                      setCustomerList(next);
                      await fetch("/api/settings", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ customerList: next }),
                      });
                    }}
                    className="ml-0.5 text-blue-400 hover:text-red-500 dark:text-amber-500 dark:hover:text-red-400"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
            {canEditSettings && (
              <form
                className="flex items-center gap-1"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const trimmed = newCustomerName.trim();
                  if (!trimmed || customerList.includes(trimmed)) {
                    setNewCustomerName("");
                    return;
                  }
                  const next = [...customerList, trimmed];
                  setCustomerList(next);
                  setNewCustomerName("");
                  await fetch("/api/settings", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ customerList: next }),
                  });
                }}
              >
                <input
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="+ เพิ่มชื่อ..."
                  className="w-28 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
                <button
                  type="submit"
                  className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300"
                >
                  บันทึก
                </button>
              </form>
            )}
            {customerList.length === 0 && !canEditSettings && (
              <span className="text-xs text-slate-400">ยังไม่มีรายชื่อ — เพิ่มได้ที่หน้าตั้งค่า</span>
            )}
          </div>
        </div>
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          disabled={drawClosed}
          rows={10}
          placeholder={"#ลูกค้า A\n1234 5678\n\n#ลูกค้า B\n9012=2ชุด"}
          className={`${ui.input} mt-2 min-h-[200px] resize-y font-mono disabled:opacity-50`}
        />
        {previewResult && previewTotal > 0 && (
          <div className={`mt-4 rounded-xl border px-4 py-3 ${
            previewBlockedNumbers.length > 0
              ? "border-red-300 bg-red-50 text-red-900 dark:border-red-700/50 dark:bg-red-950/40 dark:text-red-200"
              : "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-200"
          }`}>
            <div className="flex items-center justify-between font-bold">
              <span>ยอดรวมที่จะบันทึก:</span>
              <span className="text-xl text-blue-700 dark:text-amber-300">฿{previewTotal.toLocaleString()}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs opacity-80">
              <span>จำนวน: {previewResult.sections.reduce((c, s) => c + s.entries.length, 0)} ชุด</span>
              {previewResult.sections.length > 1 && <span>แยกเป็น {previewResult.sections.length} บิล</span>}
            </div>
            {previewBlockedNumbers.length > 0 && (
              <div className="mt-2 border-t border-red-200 pt-2 dark:border-red-700/50">
                <p className="text-xs font-bold text-red-600 dark:text-red-300">⚠️ เลขเกิน Cap {previewBlockedNumbers.length} รายการ — จะถูกตัดออก:</p>
                <ul className="mt-1 space-y-0.5">
                  {previewBlockedNumbers.map((b) => (
                    <li key={b.number} className="font-mono text-xs text-red-700 dark:text-red-300">
                      {b.number}: มี {b.current} + เพิ่ม {b.incoming} = {b.current + b.incoming} ชุด (cap: {b.max})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleImport}
            disabled={loading || !rawText.trim() || drawClosed}
            className={ui.btnPrimary}
          >
            {loading ? "กำลังบันทึก..." : "บันทึกโพย"}
          </button>
        </div>
        {message && (
          <p className="mt-3 text-sm text-blue-600 dark:text-amber-300">{message}</p>
        )}
        {blockedList.length > 0 && (
          <ul className="mt-2 space-y-1 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-300">
            {blockedList.map((b) => (
              <li key={b.number}>{b.reason ?? b.number}</li>
            ))}
          </ul>
        )}
      </section>

      {summary && (
        <>
          {pricePerSet != null && (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              ราคาต่อชุด (ยอดรับเริ่มต้น):{" "}
              <strong className="text-slate-900 dark:text-white">
                {pricePerSet} บาท
              </strong>
              {" · "}
              <Link href="/settings" className="text-blue-600 underline dark:text-amber-400">
                แก้ที่ตั้งค่า
              </Link>
              {" "}
              — โพยแบบ <code className="text-xs">เลข ยอด</code> ใช้ยอดในข้อความแทน
            </p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <StatBox label="โพย" value={summary.totals.totalSets} />
            <StatBox label="เลข" value={summary.totals.uniqueNumbers} />
            <StatBox label="ยอดรับ" value={`฿${summary.totals.totalReceived.toLocaleString()}`} variant="accent" />
            <StatBox label="เสี่ยง" value={`฿${summary.totals.totalRisk.toLocaleString()}`} variant="danger" />
            <StatBox label="เลขเต็ม" value={summary.totals.fullCount} variant={summary.totals.fullCount > 0 ? "danger" : "default"} />
          </div>

          <section className={`mt-4 ${ui.tableWrap}`}>
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">สรุปต่อเลข</span>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={onlyFull} onChange={(e) => setOnlyFull(e.target.checked)} />
                เฉพาะเลขเต็ม
              </label>
              {!drawClosed && selectedNumbers.size > 0 && (
                <button
                  type="button"
                  disabled={bulkLoading}
                  onClick={() => void handleBulkCancelByNumber()}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {bulkLoading ? "กำลังลบ..." : `ลบเลขที่เลือก (${selectedNumbers.size})`}
                </button>
              )}
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาเลข"
                className="ml-auto w-32 rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
              />
              <button type="button" onClick={handleCopySummary} className={ui.btnGhost}>
                คัดลอก
              </button>
            </div>
            <div className="max-h-[50vh] overflow-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    {!drawClosed && (
                      <th className={`${ui.th} w-10`}>
                        <input
                          type="checkbox"
                          checked={allNumbersSelected}
                          onChange={toggleSelectAllNumbers}
                          aria-label="เลือกเลขทั้งหมด"
                        />
                      </th>
                    )}
                    <SummarySortTh label="เลข" col="number" />
                    <SummarySortTh label="ชุด" col="sets" align="right" />
                    <SummarySortTh label="ยอดรับ" col="totalAmount" align="right" />
                    <SummarySortTh label="สถานะ" col="status" />
                    {canEditLimits && <th className={ui.th} />}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={
                          4 + (drawClosed ? 0 : 1) + (canEditLimits ? 1 : 0)
                        }
                        className="py-10 text-center text-sm text-slate-500"
                      >
                        ยังไม่มีโพย
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => {
                      const isSelected = selectedNumbers.has(row.number);
                      return (
                      <tr
                        key={row.number}
                        className={`${row.status === "full" ? "bg-red-50 dark:bg-red-950/30" : ""} ${
                          isSelected ? "bg-blue-50/80 dark:bg-blue-950/30" : "hover:bg-blue-50/50 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        {!drawClosed && (
                          <td className={ui.td}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleNumberSelect(row.number)}
                              aria-label={`เลือก ${row.number}`}
                            />
                          </td>
                        )}
                        <td className={`${ui.td} font-mono text-lg font-bold tracking-widest`}>
                          {!drawClosed ? (
                            <button
                              type="button"
                              onClick={() => toggleNumberSelect(row.number)}
                              className="cursor-pointer hover:text-blue-600 dark:hover:text-amber-300"
                            >
                              {row.number}
                            </button>
                          ) : (
                            row.number
                          )}
                        </td>
                        <td className={`${ui.td} text-right tabular-nums`}>
                          {row.sets}
                          {row.capSets != null && (
                            <span className="text-xs text-slate-400">/{row.capSets}</span>
                          )}
                        </td>
                        <td className={`${ui.td} text-right font-medium tabular-nums`}>
                          {row.totalAmount.toLocaleString()}
                        </td>
                        <td className={ui.td}>
                          <StatusBadge status={row.status} />
                        </td>
                        {canEditLimits && (
                          <td className={ui.td}>
                            <button
                              type="button"
                              onClick={() => setCapNumber(row.number)}
                              className="text-xs text-blue-600 hover:underline dark:text-amber-400"
                            >
                              เพดาน
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <BetRecentList
        key={reloadBets}
        drawClosed={drawClosed}
        onChanged={() => void loadSummary()}
      />

      {capNumber && limitsConfig && (
        <SetCapDialog
          number={capNumber}
          current={getCapForNumber(capNumber, limitsConfig)}
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
