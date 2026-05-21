"use client";

import { useEffect, useState } from "react";

type DrawRow = {
  id: string;
  label: string;
  result4: string | null;
  totalReceived: number | null;
  totalPayout: number | null;
  profit: number;
  settledAt: string | null;
};

export default function ReportsPage() {
  const [draws, setDraws] = useState<DrawRow[]>([]);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const data = await res.json();
        setDraws(data.recentDraws ?? []);
      }
    })();
  }, []);

  const totalReceived = draws.reduce((s, d) => s + (d.totalReceived ?? 0), 0);
  const totalPayout = draws.reduce((s, d) => s + (d.totalPayout ?? 0), 0);
  const totalProfit = draws.reduce((s, d) => s + d.profit, 0);

  return (
    <>
      <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
        รายงาน / บิลย้อนหลัง
      </h1>
      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
        สรุปแพ้ชนะตามงวด (แบบ KD LOT)
      </p>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <SummaryCard label="ยอดรับรวม" value={totalReceived} />
        <SummaryCard label="ยอดจ่ายรวม" value={totalPayout} danger />
        <SummaryCard
          label="กำไรสุทธิ"
          value={totalProfit}
          success={totalProfit >= 0}
          danger={totalProfit < 0}
        />
      </div>

      <section className="theme-card mt-4 overflow-hidden">
        <div
          className="border-b px-4 py-3 text-sm font-semibold"
          style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
        >
          รายการงวดที่ออกผลแล้ว
        </div>
        {draws.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
            ยังไม่มีงวดที่ออกผล — ไปที่「ออกผล」หลังปิดรับโพย
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: "var(--bg-input)", color: "var(--text-secondary)" }}>
                <tr className="text-left text-[10px] uppercase">
                  <th className="px-4 py-2">งวด</th>
                  <th className="px-4 py-2">ผลออก</th>
                  <th className="px-4 py-2 text-right">ยอดรับ</th>
                  <th className="px-4 py-2 text-right">ยอดชนะ</th>
                  <th className="px-4 py-2 text-right">ผลสุทธิ</th>
                  <th className="px-4 py-2">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {draws.map((d) => (
                  <tr
                    key={d.id}
                    className="border-t"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <td className="px-4 py-3" style={{ color: "var(--text-primary)" }}>
                      {d.label}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold" style={{ color: "var(--accent)" }}>
                      {d.result4 ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      ฿{(d.totalReceived ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums" style={{ color: "var(--danger)" }}>
                      ฿{(d.totalPayout ?? 0).toLocaleString()}
                    </td>
                    <td
                      className="px-4 py-3 text-right font-semibold tabular-nums"
                      style={{ color: d.profit >= 0 ? "var(--success)" : "var(--danger)" }}
                    >
                      {d.profit >= 0 ? "+" : ""}
                      ฿{d.profit.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={{
                          background: d.profit >= 0 ? "var(--success-soft)" : "var(--danger-soft)",
                          color: d.profit >= 0 ? "var(--success)" : "var(--danger)",
                        }}
                      >
                        {d.profit >= 0 ? "กำไร" : "ขาดทุน"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function SummaryCard({
  label,
  value,
  success,
  danger,
}: {
  label: string;
  value: number;
  success?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="theme-card p-4 text-center">
      <p className="text-[10px] uppercase" style={{ color: "var(--text-secondary)" }}>
        {label}
      </p>
      <p
        className="mt-1 text-lg font-bold tabular-nums"
        style={{
          color: success ? "var(--success)" : danger ? "var(--danger)" : "var(--text-primary)",
        }}
      >
        ฿{value.toLocaleString()}
      </p>
    </div>
  );
}
