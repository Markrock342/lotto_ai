"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "เข้าสู่ระบบไม่สำเร็จ");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("เชื่อมต่อไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
        <p className="text-center text-xs font-medium uppercase tracking-widest text-amber-400">
          🇱🇦 หวยลาวชุด
        </p>
        <h1 className="mt-2 text-center text-2xl font-bold text-white">
          เข้าสู่ระบบ
        </h1>
        <p className="mt-1 text-center text-xs text-slate-400">
          รองรับ 3–4 เครื่อง · ยอดรวมกลาง
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="text-xs text-slate-400">ชื่อผู้ใช้</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500/50"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">รหัสผ่าน</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500/50"
              autoComplete="current-password"
              required
            />
          </div>
          {error && (
            <p className="rounded-lg bg-red-950/50 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-sm font-bold text-slate-950 disabled:opacity-60"
          >
            {loading ? "กำลังเข้า..." : "เข้าสู่ระบบ"}
          </button>
        </form>

        <p className="mt-6 text-center text-[10px] text-slate-500">
          ทดลอง: admin / 1234
        </p>
      </div>
    </div>
  );
}
