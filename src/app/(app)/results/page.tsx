"use client";

import { useEffect, useState } from "react";
import { PageHeader, StatBox, ui, Loading } from "@/components/ui";
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
  const [canSettle, setCanSettle] = useState(false);
  const [canManageDraw, setCanManageDraw] = useState(false);

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
    void (async () => {
      const res = await fetch("/api/me");
      if (res.ok) {
        const { permissions } = await res.json();
        setCanSettle(permissions.includes("results:settle"));
        setCanManageDraw(permissions.includes("draw:manage"));
      }
    })();
  }, []);

  async function handleSettle() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fourDigit, drawId: data?.draw?.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json.error || "ไม่สำเร็จ");
        return;
      }
      setMessage(data?.draw?.status === "settled" ? "แก้ไขผลและคำนวณใหม่เรียบร้อย" : "ออกผลและคำนวณเรียบร้อย");
      setData({ draw: json.draw, hasResult: true, settlement: json.settlement });
    } finally {
      setLoading(false);
    }
  }

  async function handleNewDraw() {
    if (!confirm("เปิดงวดใหม่?")) return;
    await fetch("/api/draw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "new" }),
    });
    window.location.href = "/key";
  }

  const s = data?.settlement;

  return (
    <>
      <PageHeader
        title="ออกผล / ตรวจรางวัล"
        subtitle={
          canSettle
            ? (data?.draw.label ?? "—")
            : `${data?.draw.label ?? "—"} · ลูกมือดูอย่างเดียว`
        }
        backHref="/dashboard"
      />

      {!canSettle && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-200">
          บันทึกผลออกและเปิดงวดใหม่ — เฉพาะเจ้ามือ (admin)
        </p>
      )}

      <section className={ui.cardPad}>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          ผลหวย 4 ตัว
        </label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={fourDigit}
            onChange={(e) => setFourDigit(e.target.value.replace(/\D/g, "").slice(0, 4))}
            maxLength={4}
            readOnly={!canSettle}
            className="w-full max-w-[180px] rounded-xl border border-slate-300 bg-slate-50 px-4 py-4 text-center font-mono text-3xl font-bold tracking-[0.4em] dark:border-slate-600 dark:bg-slate-800 sm:text-4xl"
          />
          {canSettle && (
            <button
              type="button"
              onClick={handleSettle}
              disabled={loading || fourDigit.length !== 4}
              className={`${data?.draw?.status === "settled" ? ui.btnPrimary : ui.btnSuccess} flex-1`}
            >
              {loading
                ? "กำลังคำนวณ..."
                : data?.draw?.status === "settled"
                  ? "แก้ไขผลรางวัล (คำนวณใหม่)"
                  : "บันทึกผล + ตรวจรางวัล"}
            </button>
          )}
        </div>
        {message && (
          <p
            className={`mt-3 text-sm font-medium ${
              message.includes("ไม่") || message.includes("สิทธิ")
                ? "text-red-600"
                : "text-emerald-600"
            }`}
          >
            {message}
          </p>
        )}
      </section>

      {!data && <Loading />}

      {s && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatBox label="ยอดรับ" value={`฿${s.totalReceived.toLocaleString()}`} />
            <StatBox label="ยอดจ่าย" value={`฿${s.totalPayout.toLocaleString()}`} variant="danger" />
            <StatBox
              label="กำไร/ขาดทุน"
              value={`${s.profit >= 0 ? "+" : ""}฿${s.profit.toLocaleString()}`}
              variant={s.profit >= 0 ? "success" : "danger"}
            />
            <StatBox label="โพยถูก" value={`${s.winningBets} / ${s.totalBets}`} />
          </div>

          <p className="my-4 text-center font-mono text-4xl font-bold tracking-widest text-emerald-600 dark:text-emerald-400">
            ผลออก {s.result.fourDigit}
          </p>

          {s.byPrizeType.length > 0 && (
            <section className={`${ui.tableWrap} mt-4`}>
              <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-bold dark:border-slate-700">
                สรุปแยกประเภทรางวัล
              </h2>
              <div className="overflow-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className={ui.th}>ประเภท</th>
                      <th className={`${ui.th} text-right`}>ถูก (ชุด)</th>
                      <th className={`${ui.th} text-right`}>อัตรา/ชุด</th>
                      <th className={`${ui.th} text-right`}>จ่ายรวม (฿)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.byPrizeType.map((p) => (
                      <tr key={p.type} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                        <td className={ui.td}>{p.label}</td>
                        <td className={`${ui.td} text-right tabular-nums`}>{p.count}</td>
                        <td className={`${ui.td} text-right tabular-nums text-slate-500`}>
                          {p.rate.toLocaleString()}
                        </td>
                        <td className={`${ui.td} text-right font-bold text-red-600 tabular-nums`}>
                          {p.payout.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {s.bySlip.filter((x) => x.customerName || s.bySlip.length > 1).length > 0 && (
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
                    {s.bySlip.map((sl) => (
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

          <section className={`${ui.tableWrap} mt-4`}>
            <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-bold dark:border-slate-700">
              เลขที่ถูกรางวัล
            </h2>
            {s.byNumber.filter((n) => n.payout > 0).length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">ไม่มีโพยถูกรางวัล</p>
            ) : (
              <div className="max-h-[50vh] overflow-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className={ui.th}>เลข</th>
                      <th className={ui.th}>ถูก</th>
                      <th className={`${ui.th} text-right`}>จ่าย (฿)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.byNumber
                      .filter((n) => n.payout > 0)
                      .map((n) => (
                        <tr key={n.number} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                          <td className={`${ui.td} font-mono text-lg font-bold`}>{n.number}</td>
                          <td className={`${ui.td} text-sm text-slate-500`}>
                            {n.wins.map((w) => w.label).join(", ")}
                          </td>
                          <td className={`${ui.td} text-right font-bold text-red-600 tabular-nums`}>
                            {n.payout.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {s.lines.length > 0 && (
            <section className={`${ui.tableWrap} mt-4`}>
              <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-bold dark:border-slate-700">
                ประวัติคนถูกรางวัล (ตามบิล)
              </h2>
              <div className="max-h-[50vh] overflow-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className={ui.th}>ลูกค้า</th>
                      <th className={ui.th}>เลข</th>
                      <th className={ui.th}>ถูก</th>
                      <th className={`${ui.th} text-right`}>จ่าย (฿)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.lines
                      .sort((a, b) => b.payout - a.payout)
                      .map((l, i) => (
                        <tr key={`${l.betId}-${i}`} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                          <td className={ui.td}>
                            {l.customerName ? (
                              <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 dark:bg-amber-900/40 dark:text-amber-300">
                                {l.customerName}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className={`${ui.td} font-mono font-bold`}>{l.number}</td>
                          <td className={`${ui.td} text-sm text-slate-500`}>
                            {l.wins.map((w) => w.label).join(", ")}
                          </td>
                          <td className={`${ui.td} text-right font-bold text-red-600 tabular-nums`}>
                            {l.payout.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {canManageDraw && (
            <button type="button" onClick={handleNewDraw} className={`${ui.btnGhost} mt-4 w-full`}>
              งวดใหม่
            </button>
          )}
        </>
      )}
    </>
  );
}
