"use client";

import { useEffect, useState } from "react";
import { PageHeader, ui, Loading } from "@/components/ui";
import { PASSWORD_MIN_LENGTH } from "@/lib/password";
import { RATE_LABELS, type PayoutRates } from "@/lib/rates";

type HouseData = {
  name: string;
  pricePerSet: number;
  defaultMaxRisk: number | null;
  defaultMaxSets: number | null;
  rates: PayoutRates;
  customerList: string[];
};

export default function SettingsPage() {
  const [house, setHouse] = useState<HouseData | null>(null);
  const [canEditSettings, setCanEditSettings] = useState(false);
  const [saved, setSaved] = useState(false);
  const [defaultMaxRisk, setDefaultMaxRisk] = useState("");
  const [defaultMaxSets, setDefaultMaxSets] = useState("");
  const [customerList, setCustomerList] = useState<string[]>([]);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [pw, setPw] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [pwError, setPwError] = useState("");
  const [pwOk, setPwOk] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      const [meRes, setRes] = await Promise.all([fetch("/api/me"), fetch("/api/settings")]);
      if (meRes.ok) {
        const me = await meRes.json();
        setCanEditSettings(
          Array.isArray(me.permissions) && me.permissions.includes("settings:write"),
        );
      }
      if (setRes.ok) {
        const { house: h } = await setRes.json();
        setHouse(h);
        setDefaultMaxRisk(h.defaultMaxRisk != null ? String(h.defaultMaxRisk) : "");
        setDefaultMaxSets(h.defaultMaxSets != null ? String(h.defaultMaxSets) : "");
        setCustomerList(Array.isArray(h.customerList) ? h.customerList : []);
      }
    })();
  }, []);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    setPwOk(false);
    setPwLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: pw.current,
          newPassword: pw.next,
          confirmPassword: pw.confirm,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwError(data.error || "เปลี่ยนรหัสผ่านไม่สำเร็จ");
        return;
      }
      setPw({ current: "", next: "", confirm: "" });
      setPwOk(true);
      setTimeout(() => setPwOk(false), 4000);
    } catch {
      setPwError("เชื่อมต่อไม่สำเร็จ");
    } finally {
      setPwLoading(false);
    }
  }

  async function handleSave() {
    if (!house) return;
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: house.name,
        pricePerSet: house.pricePerSet,
        rates: house.rates,
        defaultMaxRisk: defaultMaxRisk.trim() ? Number(defaultMaxRisk) : null,
        defaultMaxSets: defaultMaxSets.trim() ? Number(defaultMaxSets) : null,
        customerList,
      }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  if (!house) return <Loading />;

  return (
    <>
      <PageHeader
        title="ตั้งค่าระบบ"
        subtitle={
          canEditSettings
            ? "เจ้ามือ — แก้เรทและตั้งค่าบ้านได้"
            : "ลูกมือ — ดูอย่างเดียว (แก้ไขไม่ได้)"
        }
      />

      <section className={`${ui.cardPad} space-y-4`}>
        <Field label="ชื่อบ้าน">
          <input
            value={house.name}
            disabled={!canEditSettings}
            onChange={(e) => setHouse({ ...house, name: e.target.value })}
            className={ui.inputSm}
          />
        </Field>
        <Field label="ราคาต่อ 1 ชุด (บาท)">
          <input
            type="number"
            min={1}
            disabled={!canEditSettings}
            value={house.pricePerSet}
            onChange={(e) =>
              setHouse({ ...house, pricePerSet: Math.max(1, Number(e.target.value) || 1) })
            }
            className={`${ui.inputSm} max-w-[160px]`}
          />
        </Field>
        <Field label="เสี่ยงจ่ายสูงสุดต่อเลข">
          <input
            type="number"
            disabled={!canEditSettings}
            value={defaultMaxRisk}
            onChange={(e) => setDefaultMaxRisk(e.target.value)}
            className={ui.inputSm}
          />
        </Field>
        <Field label="ชุดสูงสุดต่อเลข">
          <input
            type="number"
            disabled={!canEditSettings}
            value={defaultMaxSets}
            onChange={(e) => setDefaultMaxSets(e.target.value)}
            className={ui.inputSm}
          />
        </Field>
      </section>

      <section className={`mt-4 ${ui.cardPad}`}>
        <h2 className="text-sm font-bold text-blue-700 dark:text-amber-300">อัตราจ่าย (บาท/ชุด)</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {RATE_LABELS.map(({ key, label }) => (
            <div key={key}>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
              <input
                type="number"
                min={0}
                disabled={!canEditSettings}
                value={house.rates[key]}
                onChange={(e) =>
                  setHouse({
                    ...house,
                    rates: { ...house.rates, [key]: Math.max(0, Number(e.target.value) || 0) },
                  })
                }
                className={`${ui.inputSm} mt-1 font-mono`}
              />
            </div>
          ))}
        </div>
      </section>

      {canEditSettings && (
        <button type="button" onClick={handleSave} className={`${ui.btnPrimary} mt-4 w-full`}>
          {saved ? "บันทึกแล้ว ✓" : "บันทึกการตั้งค่า"}
        </button>
      )}

      <section className={`mt-4 ${ui.cardPad}`}>
        <h2 className="text-sm font-bold text-blue-700 dark:text-amber-300">รายชื่อลูกค้าประจำ</h2>
        <p className="mt-1 text-xs text-slate-500">ใช้เพื่อแสดงปุ่มเลือกด่วนในหน้าคีย์หวย</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {customerList.map((name) => (
            <span
              key={name}
              className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-amber-900/40 dark:text-amber-300"
            >
              #{name}
              {canEditSettings && (
                <button
                  type="button"
                  aria-label={`ลบ ${name}`}
                  onClick={() => setCustomerList((prev) => prev.filter((n) => n !== name))}
                  className="ml-1 rounded-full text-blue-500 hover:text-red-500 dark:text-amber-400 dark:hover:text-red-400"
                >
                  ✕
                </button>
              )}
            </span>
          ))}
          {customerList.length === 0 && (
            <p className="text-xs text-slate-400">ยังไม่มีรายชื่อ</p>
          )}
        </div>
        {canEditSettings && (
          <div className="mt-3 flex gap-2">
            <input
              value={newCustomerName}
              onChange={(e) => setNewCustomerName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const trimmed = newCustomerName.trim();
                  if (trimmed && !customerList.includes(trimmed)) {
                    setCustomerList((prev) => [...prev, trimmed]);
                  }
                  setNewCustomerName("");
                }
              }}
              placeholder="ชื่อลูกค้า..."
              className={`${ui.inputSm} flex-1`}
            />
            <button
              type="button"
              onClick={() => {
                const trimmed = newCustomerName.trim();
                if (trimmed && !customerList.includes(trimmed)) {
                  setCustomerList((prev) => [...prev, trimmed]);
                }
                setNewCustomerName("");
              }}
              className={ui.btnGhost}
            >
              เพิ่ม
            </button>
          </div>
        )}
      </section>

      <section className={`mt-6 ${ui.cardPad}`}>
        <h2 className="text-sm font-bold text-blue-700 dark:text-amber-300">เปลี่ยนรหัสผ่าน</h2>
        <p className="mt-1 text-xs text-slate-500">
          ใช้ได้ทุกบทบาท · หลังเปลี่ยน เครื่องอื่นที่ login อยู่จะออกอัตโนมัติ
        </p>
        <form onSubmit={handleChangePassword} className="mt-4 space-y-3">
          <Field label="รหัสผ่านปัจจุบัน">
            <input
              type="password"
              value={pw.current}
              onChange={(e) => setPw({ ...pw, current: e.target.value })}
              className={ui.inputSm}
              autoComplete="current-password"
              required
            />
          </Field>
          <Field label={`รหัสผ่านใหม่ (อย่างน้อย ${PASSWORD_MIN_LENGTH} ตัว · มีตัวอักษร+เลข)`}>
            <input
              type="password"
              value={pw.next}
              onChange={(e) => setPw({ ...pw, next: e.target.value })}
              className={ui.inputSm}
              autoComplete="new-password"
              minLength={PASSWORD_MIN_LENGTH}
              required
            />
          </Field>
          <Field label="ยืนยันรหัสผ่านใหม่">
            <input
              type="password"
              value={pw.confirm}
              onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
              className={ui.inputSm}
              autoComplete="new-password"
              minLength={PASSWORD_MIN_LENGTH}
              required
            />
          </Field>
          {pwError && <p className="text-sm text-red-600 dark:text-red-300">{pwError}</p>}
          {pwOk && (
            <p className="text-sm text-emerald-600 dark:text-emerald-300">
              เปลี่ยนรหัสผ่านแล้ว — เครื่องอื่นต้อง login ใหม่
            </p>
          )}
          <button type="submit" disabled={pwLoading} className={`${ui.btnGhost} w-full`}>
            {pwLoading ? "กำลังบันทึก..." : "เปลี่ยนรหัสผ่าน"}
          </button>
        </form>
      </section>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
