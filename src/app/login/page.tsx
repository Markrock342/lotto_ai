"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme-provider";

export default function LoginPage() {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [sessionHint, setSessionHint] = useState("");

  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get("reason");
    if (reason === "session") {
      setSessionHint("เซสชันหมดอายุ — ล็อกอินใหม่ด้านล่าง");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
      });

      let data: { error?: string } = {};
      try {
        data = (await res.json()) as { error?: string };
      } catch {
        setError(`เซิร์ฟเวอร์ตอบผิดรูปแบบ (${res.status}) — ลองใหม่`);
        return;
      }

      if (!res.ok) {
        setError(
          data.error ||
            (res.status === 401
              ? "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"
              : `เข้าสู่ระบบไม่สำเร็จ (${res.status})`),
        );
        return;
      }

      setSessionHint("");

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("เชื่อมต่อไม่สำเร็จ — เช็กเน็ตหรือลอง /api/health/db");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4 dark:bg-slate-950">
      <button
        type="button"
        onClick={toggle}
        className="absolute right-4 top-4 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
      >
        {theme === "light" ? "🌙 โหมดมืด" : "☀️ โหมดสว่าง"}
      </button>

      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-2xl text-white shadow-lg">
            🇱🇦
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-amber-400">
            หวยลาวชุด
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            เข้าสู่ระบบ
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              ชื่อผู้ใช้
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              autoComplete="username"
              placeholder="admin หรือ staff1"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              รหัสผ่าน
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              autoComplete="current-password"
              required
            />
          </div>
          {sessionHint && !error && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              {sessionHint}
            </p>
          )}
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-300">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-3.5 text-base font-bold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-60 dark:bg-amber-500 dark:text-slate-900 dark:hover:bg-amber-400"
          >
            {loading ? "กำลังเข้า..." : "เข้าสู่ระบบ"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-400">
          ลืมรหัส — ติดต่อเจ้ามือรีเซ็ตที่เมนู「ผู้ใช้」
        </p>
      </div>
    </div>
  );
}
