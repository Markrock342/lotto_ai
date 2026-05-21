"use client";

import { useEffect, useState } from "react";

type UserRow = {
  id: string;
  username: string;
  displayName: string;
  role: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [maxUsers, setMaxUsers] = useState(5);
  const [form, setForm] = useState({
    username: "",
    password: "",
    displayName: "",
    role: "staff",
  });
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
      setMaxUsers(data.maxUsers);
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
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "เพิ่มไม่สำเร็จ");
      return;
    }
    setForm({ username: "", password: "", displayName: "", role: "staff" });
    await load();
  }

  return (
    <>
      <h1 className="text-lg font-bold text-white">ผู้ใช้งาน</h1>
      <p className="text-xs text-slate-400">
        รองรับสูงสุด {maxUsers} บัญชี (3–4 คน + สำรอง) · ยอดรวมงวดเดียวกัน
      </p>

      <ul className="mt-4 space-y-2">
        {users.map((u) => (
          <li
            key={u.id}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
          >
            <div>
              <p className="font-medium text-white">{u.displayName}</p>
              <p className="text-xs text-slate-400">
                @{u.username} · {u.role === "admin" ? "เจ้ามือ" : "ลูกมือ"}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {users.length < maxUsers && (
        <form
          onSubmit={handleAdd}
          className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4"
        >
          <h2 className="text-sm font-semibold text-amber-300">เพิ่มผู้ใช้</h2>
          <input
            placeholder="ชื่อผู้ใช้ (login)"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm"
            required
          />
          <input
            placeholder="ชื่อแสดง"
            value={form.displayName}
            onChange={(e) =>
              setForm({ ...form, displayName: e.target.value })
            }
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm"
          />
          <input
            type="password"
            placeholder="รหัสผ่าน"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm"
            required
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm"
          >
            <option value="staff">ลูกมือ</option>
            <option value="admin">เจ้ามือ</option>
          </select>
          {error && <p className="text-xs text-red-300">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-slate-950"
          >
            เพิ่มผู้ใช้
          </button>
        </form>
      )}
    </>
  );
}
