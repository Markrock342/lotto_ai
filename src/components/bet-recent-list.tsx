"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ui } from "@/components/ui";
import {
  compareNumbers,
  compareStrings,
  sortIndicator,
  toggleSortDir,
  type SortDir,
} from "@/lib/table-sort";

type BetRow = {
  id: string;
  number: string;
  amount: number;
  status: string;
  at: string;
  by: string;
  customerName?: string | null;
};

type BetSortKey = "at" | "number" | "amount";

export function BetRecentList({
  drawClosed,
  onChanged,
}: {
  drawClosed: boolean;
  onChanged: () => void;
}) {
  const [bets, setBets] = useState<BetRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNumber, setEditNumber] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [msg, setMsg] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<BetSortKey>("at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [bulkLoading, setBulkLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/bets?status=active");
    if (res.ok) {
      const { bets: b } = await res.json();
      setBets(b);
      setSelected(new Set());
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sorted = useMemo(() => {
    const rows = [...bets];
    rows.sort((a, b) => {
      if (sortKey === "at") {
        return compareNumbers(
          new Date(a.at).getTime(),
          new Date(b.at).getTime(),
          sortDir,
        );
      }
      if (sortKey === "number") {
        return compareStrings(a.number, b.number, sortDir);
      }
      return compareNumbers(a.amount, b.amount, sortDir);
    });
    return rows;
  }, [bets, sortKey, sortDir]);

  const allSelected =
    sorted.length > 0 && sorted.every((b) => selected.has(b.id));

  function toggleSort(key: BetSortKey) {
    if (sortKey === key) setSortDir(toggleSortDir(sortDir));
    else {
      setSortKey(key);
      setSortDir(key === "at" ? "desc" : "asc");
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(sorted.map((b) => b.id)));
  }

  async function handleBulkCancel() {
    if (selected.size === 0) return;
    if (!confirm(`ยกเลิกโพยที่เลือก ${selected.size} รายการ?`)) return;
    setBulkLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/bets/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected] }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "ยกเลิกไม่สำเร็จ");
        return;
      }
      setMsg(`ยกเลิกแล้ว ${data.cancelled} รายการ`);
      await load();
      onChanged();
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleCancel(id: string) {
    if (!confirm("ยกเลิกโพยนี้?")) return;
    const res = await fetch(`/api/bets/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "ยกเลิกไม่สำเร็จ");
      return;
    }
    setMsg("ยกเลิกแล้ว");
    await load();
    onChanged();
  }

  async function handleSave(id: string) {
    const res = await fetch(`/api/bets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        number: editNumber,
        amount: Number(editAmount),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "แก้ไขไม่สำเร็จ");
      return;
    }
    setEditingId(null);
    setMsg("บันทึกแล้ว");
    await load();
    onChanged();
  }

  function startEdit(b: BetRow) {
    setEditingId(b.id);
    setEditNumber(b.number);
    setEditAmount(String(b.amount));
  }

  function SortTh({
    label,
    col,
    align,
  }: {
    label: string;
    col: BetSortKey;
    align?: "right";
  }) {
    return (
      <th className={`${ui.th} ${align === "right" ? "text-right" : ""}`}>
        <button
          type="button"
          onClick={() => toggleSort(col)}
          className="inline-flex items-center gap-1 font-semibold hover:text-blue-600 dark:hover:text-amber-300"
        >
          {label}
          <span className="text-[10px] opacity-60">
            {sortIndicator(sortKey === col, sortDir)}
          </span>
        </button>
      </th>
    );
  }

  if (bets.length === 0) return null;

  return (
    <section className={`mt-4 ${ui.tableWrap}`}>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          โพยล่าสุด ({bets.length})
        </h2>
        {!drawClosed && selected.size > 0 && (
          <button
            type="button"
            disabled={bulkLoading}
            onClick={() => void handleBulkCancel()}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {bulkLoading ? "กำลังลบ..." : `ลบที่เลือก (${selected.size})`}
          </button>
        )}
      </div>
      {msg && (
        <p className="px-4 py-2 text-sm text-blue-600 dark:text-amber-300">{msg}</p>
      )}
      <div className="max-h-[40vh] overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {!drawClosed && (
                <th className={`${ui.th} w-10`}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    aria-label="เลือกทั้งหมด"
                  />
                </th>
              )}
              <SortTh label="เวลา" col="at" />
              <th className={ui.th}>ลูกค้า</th>
              <SortTh label="เลข" col="number" />
              <SortTh label="ยอด" col="amount" align="right" />
              <th className={ui.th} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((b) => {
              const isSelected = selected.has(b.id);
              return (
                <tr
                  key={b.id}
                  className={`border-t border-slate-100 dark:border-slate-800 ${
                    isSelected ? "bg-blue-50/80 dark:bg-blue-950/30" : ""
                  }`}
                >
                  {!drawClosed && (
                    <td className={ui.td}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(b.id)}
                        aria-label={`เลือก ${b.number}`}
                      />
                    </td>
                  )}
                  <td className={ui.td}>
                    {new Date(b.at).toLocaleString("th-TH", {
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
                  <td className={ui.td}>
                    {editingId === b.id ? (
                      <input
                        value={editNumber}
                        onChange={(e) => setEditNumber(e.target.value)}
                        className="w-20 rounded border px-1 font-mono dark:bg-slate-800"
                        maxLength={4}
                      />
                    ) : (
                      <button
                        type="button"
                        disabled={drawClosed}
                        onClick={() => !drawClosed && toggleSelect(b.id)}
                        className={`font-mono font-bold tracking-wider ${
                          drawClosed
                            ? ""
                            : "cursor-pointer hover:text-blue-600 dark:hover:text-amber-300"
                        }`}
                      >
                        {b.number}
                      </button>
                    )}
                  </td>
                  <td className={`${ui.td} text-right tabular-nums`}>
                    {editingId === b.id ? (
                      <input
                        type="number"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="w-20 rounded border px-1 text-right dark:bg-slate-800"
                      />
                    ) : (
                      b.amount.toLocaleString()
                    )}
                  </td>
                  <td className={`${ui.td} text-right`}>
                    {!drawClosed && (
                      <div className="flex justify-end gap-1">
                        {editingId === b.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSave(b.id)}
                              className="rounded px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50"
                            >
                              บันทึก
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="rounded px-2 py-1 text-xs text-slate-500"
                            >
                              ยกเลิก
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(b)}
                              className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:text-amber-400"
                            >
                              แก้
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancel(b.id)}
                              className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                            >
                              ลบ
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
