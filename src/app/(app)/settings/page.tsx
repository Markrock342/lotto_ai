"use client";

import { useEffect, useState } from "react";
import { DEFAULT_RATES, RATE_LABELS, type PayoutRates } from "@/lib/rates";

type HouseData = {
  name: string;
  pricePerSet: number;
  defaultMaxRisk: number | null;
  defaultMaxSets: number | null;
  rates: PayoutRates;
};

export default function SettingsPage() {
  const [house, setHouse] = useState<HouseData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [saved, setSaved] = useState(false);
  const [defaultMaxRisk, setDefaultMaxRisk] = useState("");
  const [defaultMaxSets, setDefaultMaxSets] = useState("");

  useEffect(() => {
    void (async () => {
      const [meRes, setRes] = await Promise.all([
        fetch("/api/me"),
        fetch("/api/settings"),
      ]);
      if (meRes.ok) {
        const { user } = await meRes.json();
        setIsAdmin(user.role === "admin");
      }
      if (setRes.ok) {
        const { house: h } = await setRes.json();
        setHouse(h);
        setDefaultMaxRisk(
          h.defaultMaxRisk != null ? String(h.defaultMaxRisk) : "",
        );
        setDefaultMaxSets(
          h.defaultMaxSets != null ? String(h.defaultMaxSets) : "",
        );
      }
    })();
  }, []);

  async function handleSave() {
    if (!house) return;
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: house.name,
        pricePerSet: house.pricePerSet,
        rates: house.rates,
        defaultMaxRisk: defaultMaxRisk.trim()
          ? Number(defaultMaxRisk)
          : null,
        defaultMaxSets: defaultMaxSets.trim()
          ? Number(defaultMaxSets)
          : null,
      }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  if (!house) {
    return <p className="text-sm text-slate-500">กำลังโหลด...</p>;
  }

  return (
    <>
      <h1 className="text-lg font-bold text-white">ตั้งค่าระบบ</h1>
      <p className="text-xs text-slate-400">
        เรทจ่าย + เพดานความเสี่ยงทั้งบ้าน
        {!isAdmin && " (ดูอย่างเดียว — แก้ไขต้องเป็นแอดมิน)"}
      </p>

      <section className="mt-4 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div>
          <label className="text-xs text-slate-400">ชื่อบ้าน</label>
          <input
            value={house.name}
            disabled={!isAdmin}
            onChange={(e) => setHouse({ ...house, name: e.target.value })}
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm disabled:opacity-60"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400">ราคาต่อ 1 ชุด (บาท)</label>
          <input
            type="number"
            min={1}
            disabled={!isAdmin}
            value={house.pricePerSet}
            onChange={(e) =>
              setHouse({
                ...house,
                pricePerSet: Math.max(1, Number(e.target.value) || 1),
              })
            }
            className="mt-1 w-32 rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm disabled:opacity-60"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400">
            เสี่ยงจ่ายสูงสุดต่อเลข (บาท) — ว่าง = ไม่จำกัด
          </label>
          <input
            type="number"
            disabled={!isAdmin}
            value={defaultMaxRisk}
            onChange={(e) => setDefaultMaxRisk(e.target.value)}
            placeholder="500000"
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm disabled:opacity-60"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400">
            ชุดสูงสุดต่อเลข — เช่น 2357 ไม่เกิน 10 ชุด
          </label>
          <input
            type="number"
            disabled={!isAdmin}
            value={defaultMaxSets}
            onChange={(e) => setDefaultMaxSets(e.target.value)}
            placeholder="10"
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm disabled:opacity-60"
          />
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-sm font-semibold text-amber-300">อัตราจ่าย</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {RATE_LABELS.map(({ key, label }) => (
            <div key={key}>
              <label className="text-xs text-slate-400">{label}</label>
              <input
                type="number"
                min={0}
                disabled={!isAdmin}
                value={house.rates[key]}
                onChange={(e) =>
                  setHouse({
                    ...house,
                    rates: {
                      ...house.rates,
                      [key]: Math.max(0, Number(e.target.value) || 0),
                    },
                  })
                }
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 font-mono text-sm disabled:opacity-60"
              />
            </div>
          ))}
        </div>
      </section>

      {isAdmin && (
        <button
          type="button"
          onClick={handleSave}
          className="mt-4 w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-3.5 text-sm font-bold text-slate-950"
        >
          {saved ? "บันทึกแล้ว ✓" : "บันทึกการตั้งค่า"}
        </button>
      )}
    </>
  );
}
