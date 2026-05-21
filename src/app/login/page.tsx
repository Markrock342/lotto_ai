"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme-provider";

export default function LoginPage() {
  const router = useRouter();
  const { theme, toggle } = useTheme();
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
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("เชื่อมต่อไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="flex min-h-full flex-col items-center justify-center px-4"
      style={{ background: "var(--bg-page)" }}
    >
      <button
        type="button"
        onClick={toggle}
        className="absolute right-4 top-4 rounded-lg theme-card px-3 py-1.5 text-xs"
        style={{ color: "var(--text-secondary)" }}
      >
        {theme === "light" ? "🌙 โหมดมืด" : "☀️ โหมดสว่าง"}
      </button>

      <div className="theme-card w-full max-w-sm p-8 shadow-xl">
        <p
          className="text-center text-xs font-semibold uppercase tracking-widest"
          style={{ color: "var(--accent)" }}
        >
          🇱🇦 หวยลาวชุด · เจ้ามือ
        </p>
        <h1
          className="mt-2 text-center text-2xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          เข้าสู่ระบบ
        </h1>
        <p className="mt-1 text-center text-xs" style={{ color: "var(--text-secondary)" }}>
          เจ้ามือ/ลูกมือ · iPad & คอม 3–4 เครื่อง · โพยวางจาก LINE
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="text-xs" style={{ color: "var(--text-secondary)" }}>
              ชื่อผู้ใช้
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="theme-input mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/40"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="text-xs" style={{ color: "var(--text-secondary)" }}>
              รหัสผ่าน
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="theme-input mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/40"
              autoComplete="current-password"
              required
            />
          </div>
          {error && (
            <p
              className="rounded-lg px-3 py-2 text-xs"
              style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="theme-btn-primary w-full rounded-xl py-3 text-sm font-bold disabled:opacity-60"
          >
            {loading ? "กำลังเข้า..." : "เข้าสู่ระบบ"}
          </button>
        </form>

        <p className="mt-6 text-center text-[10px]" style={{ color: "var(--text-secondary)" }}>
          ทดลอง: admin / 1234
        </p>
      </div>
    </div>
  );
}
