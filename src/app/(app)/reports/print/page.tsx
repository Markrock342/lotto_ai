"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { formatBillText, type BillData } from "@/lib/format-bill";

export default function PrintBillPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-sm">กำลังโหลด...</p>}>
      <PrintBillContent />
    </Suspense>
  );
}

function PrintBillContent() {

type BillResponse = {
  houseName: string;
  pricePerSet: number;
  draw: { id: string; label: string; result4: string | null };
  rows: { number: string; sets: number; totalAmount: number }[];
  totalSets: number;
  totalReceived: number;
  bets: { number: string; amount: number; at: string; by: string }[];
  printedAt: string;
};

  const searchParams = useSearchParams();
  const drawId = searchParams.get("drawId");
  const [data, setData] = useState<BillResponse | null>(null);

  const load = useCallback(async () => {
    const q = drawId ? `?drawId=${drawId}` : "";
    const res = await fetch(`/api/reports/bill${q}`);
    if (res.ok) setData(await res.json());
  }, [drawId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (data) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [data]);

  function handleCopy() {
    if (!data) return;
    const bill: BillData = {
      houseName: data.houseName,
      drawLabel: data.draw.label,
      pricePerSet: data.pricePerSet,
      result4: data.draw.result4,
      rows: data.rows,
      totalSets: data.totalSets,
      totalReceived: data.totalReceived,
      printedAt: data.printedAt,
    };
    void navigator.clipboard.writeText(formatBillText(bill));
  }

  if (!data) {
    return <p className="p-8 text-center text-sm text-slate-500">กำลังโหลด...</p>;
  }

  return (
    <div className="mx-auto max-w-md bg-white p-6 text-black print:mx-auto print:max-w-none print:p-0 print:shadow-none">
      <div className="mb-4 flex gap-2 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white"
        >
          พิมพ์
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
        >
          คัดลอกส่งลูกค้า
        </button>
        <button
          type="button"
          onClick={() => window.close()}
          className="rounded-lg px-4 py-2 text-sm text-slate-500"
        >
          ปิด
        </button>
      </div>

      <header className="border-b border-black pb-3 text-center">
        <h1 className="text-lg font-bold">{data.houseName}</h1>
        <p className="text-sm">{data.draw.label}</p>
        {data.draw.result4 && (
          <p className="mt-1 font-mono text-base font-bold">ผลออก {data.draw.result4}</p>
        )}
        <p className="mt-1 text-xs text-slate-600">{data.printedAt}</p>
      </header>

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b border-black">
            <th className="py-1 text-left">เลข</th>
            <th className="py-1 text-right">ชุด</th>
            <th className="py-1 text-right">ยอด (บาท)</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r.number} className="border-b border-slate-200">
              <td className="py-1.5 font-mono font-bold tracking-widest">{r.number}</td>
              <td className="py-1.5 text-right">{r.sets}</td>
              <td className="py-1.5 text-right tabular-nums">{r.totalAmount.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <footer className="mt-4 border-t border-black pt-3 text-sm">
        <p className="flex justify-between font-bold">
          <span>รวม {data.totalSets} ชุด</span>
          <span>{data.totalReceived.toLocaleString()} บาท</span>
        </p>
        <p className="mt-2 text-xs text-slate-500">
          ราคา {data.pricePerSet} บาท/ชุด · รายการ {data.bets.length} บรรทัด
        </p>
      </footer>
    </div>
  );
}
