"use client";

import { useEffect, useState } from "react";
import { PermissionMatrix } from "@/components/permission-matrix";
import { PageHeader, ui } from "@/components/ui";
import { PASSWORD_MIN_LENGTH } from "@/lib/password";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/roles";

type UserRow = {
  id: string;
  username: string;
  displayName: string;
  role: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [maxUsers, setMaxUsers] = useState(5);
  const [currentUserId, setCurrentUserId] = useState("");
  const [form, setForm] = useState({
    username: "",
    password: "",
    displayName: "",
    role: "staff",
  });
  const [error, setError] = useState("");
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [resetPw, setResetPw] = useState("");
  const [resetMsg, setResetMsg] = useState("");

  const adminCount = users.filter((u) => u.role === "admin").length;

  async function load() {
    const [usersRes, meRes] = await Promise.all([fetch("/api/users"), fetch("/api/me")]);
    if (usersRes.ok) {
      const data = await usersRes.json();
      setUsers(data.users);
      setMaxUsers(data.maxUsers);
    }
    if (meRes.ok) {
      const { user } = await meRes.json();
      setCurrentUserId(user.userId);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        username: form.username.trim().toLowerCase(),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "เพิ่มไม่สำเร็จ");
      return;
    }
    setForm({ username: "", password: "", displayName: "", role: "staff" });
    await load();
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!resetTarget) return;
    setResetMsg("");
    const res = await fetch(`/api/users/${resetTarget.id}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword: resetPw }),
    });
    const data = await res.json();
    if (!res.ok) {
      setResetMsg(data.error || "รีเซ็ตไม่สำเร็จ");
      return;
    }
    setResetMsg(data.message);
    setResetPw("");
    setResetTarget(null);
  }

  return (
    <>
      <PageHeader
        title="ผู้ใช้งาน"
        subtitle={`${users.length} / ${maxUsers} บัญชี · 1 คนต่อ 1 login`}
      />

      <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950 dark:border-blue-500/30 dark:bg-blue-950/40 dark:text-blue-100">
        <p className="font-semibold">นโยบายบัญชี (production)</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
          <li>
            <strong>เจ้ามือ (admin)</strong> — สูงสุด 2 บัญชี · ไม่แชร์ให้ลูกมือ · ใช้เครื่องเจ้ามือเท่านั้น
          </li>
          <li>
            <strong>ลูกมือ (staff)</strong> — 1 iPad ต่อ 1 บัญชี (staff1, staff2 …) · คีย์โพยอย่างเดียว
          </li>
          <li>รหัสผ่านอย่างน้อย {PASSWORD_MIN_LENGTH} ตัว · มีตัวอักษร + ตัวเลข</li>
          <li>รีเซ็ตรหัสลูกมือ → เครื่องนั้นต้อง login ใหม่ทันที</li>
        </ul>
      </div>

      <ul className="mt-6 space-y-2">
        {users.map((u) => (
          <li
            key={u.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <div>
              <p className="font-medium text-slate-900 dark:text-white">{u.displayName}</p>
              <p className="text-xs text-slate-500">
                @{u.username} · {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] ?? u.role}
                {u.id === currentUserId && " · คุณ"}
              </p>
            </div>
            {u.id !== currentUserId && (
              <button
                type="button"
                onClick={() => {
                  setResetTarget(u);
                  setResetPw("");
                  setResetMsg("");
                }}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                รีเซ็ตรหัส
              </button>
            )}
          </li>
        ))}
      </ul>

      {resetTarget && (
        <form
          onSubmit={handleReset}
          className={`mt-4 ${ui.cardPad} border-amber-300 dark:border-amber-500/40`}
        >
          <h2 className="text-sm font-bold text-amber-800 dark:text-amber-300">
            รีเซ็ตรหัส @{resetTarget.username}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            แจ้งรหัสใหม่ให้ลูกมือทางปาก · ไม่ส่งผ่าน LINE ถ้าไม่จำเป็น
          </p>
          <input
            type="password"
            value={resetPw}
            onChange={(e) => setResetPw(e.target.value)}
            placeholder={`รหัสใหม่ (${PASSWORD_MIN_LENGTH}+ ตัว, มีตัวอักษร+เลข)`}
            className={`${ui.inputSm} mt-3`}
            minLength={PASSWORD_MIN_LENGTH}
            required
          />
          {resetMsg && (
            <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-300">{resetMsg}</p>
          )}
          <div className="mt-3 flex gap-2">
            <button type="submit" className={ui.btnPrimary}>
              บันทึกรหัสใหม่
            </button>
            <button
              type="button"
              onClick={() => setResetTarget(null)}
              className={ui.btnGhost}
            >
              ยกเลิก
            </button>
          </div>
        </form>
      )}

      {users.length < maxUsers && (
        <form onSubmit={handleAdd} className={`mt-6 space-y-3 ${ui.cardPad}`}>
          <h2 className="text-sm font-bold text-blue-700 dark:text-amber-300">เพิ่มผู้ใช้</h2>
          <label className="block text-sm text-slate-600">ชื่อผู้ใช้ (login)</label>
          <input
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className={ui.inputSm}
            placeholder="staff4"
            pattern="[a-z0-9_]{3,20}"
            required
          />
          <p className="text-xs text-slate-500">a-z, 0-9, _ · 3–20 ตัว</p>
          <label className="block text-sm text-slate-600">ชื่อแสดง</label>
          <input
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            className={ui.inputSm}
            placeholder="ลูกมือ 4"
          />
          <label className="block text-sm text-slate-600">รหัสผ่านเริ่มต้น</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className={ui.inputSm}
            minLength={PASSWORD_MIN_LENGTH}
            required
          />
          <label className="block text-sm text-slate-600">บทบาท</label>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className={ui.inputSm}
          >
            <option value="staff">ลูกมือ — {ROLE_DESCRIPTIONS.staff}</option>
            <option value="admin" disabled={adminCount >= 2}>
              เจ้ามือ — {ROLE_DESCRIPTIONS.admin}
              {adminCount >= 2 ? " (เต็มแล้ว)" : ""}
            </option>
          </select>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className={`${ui.btnPrimary} w-full`}>
            เพิ่มผู้ใช้
          </button>
        </form>
      )}

      <div className={`mt-8 ${ui.cardPad}`}>
        <h2 className="mb-4 text-sm font-bold text-slate-800 dark:text-slate-200">ตารางสิทธิ์การใช้งาน</h2>
        <PermissionMatrix />
      </div>
    </>
  );
}
