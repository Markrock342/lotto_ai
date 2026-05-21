"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/auth";
import { useTheme } from "./theme-provider";

const NAV = [
  { href: "/dashboard", label: "แดชบอร์ด", icon: "📊" },
  { href: "/key", label: "คีย์หวย", icon: "✏️" },
  { href: "/results", label: "ออกผล", icon: "🎯" },
  { href: "/reports", label: "รายงาน", icon: "📋" },
  { href: "/settings", label: "ตั้งค่า", icon: "⚙️" },
];

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: SessionUser;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const nav = [
    ...NAV,
    ...(user.role === "admin"
      ? [{ href: "/users", label: "ผู้ใช้", icon: "👥" }]
      : []),
  ];

  return (
    <div className="min-h-full" style={{ background: "var(--bg-page)" }}>
      <header className="theme-header sticky top-0 z-20 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold uppercase tracking-widest opacity-80">
              🇱🇦 {user.houseName}
            </p>
            <p className="truncate text-xs opacity-70">
              {user.displayName} · {user.role === "admin" ? "เจ้ามือ" : "ลูกมือ"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={toggle}
              className="rounded-lg border border-white/20 px-2.5 py-1.5 text-[10px] font-medium opacity-90 hover:opacity-100"
              title={theme === "light" ? "โหมดมืด" : "โหมดสว่าง"}
            >
              {theme === "light" ? "🌙 มืด" : "☀️ สว่าง"}
            </button>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-white/20 px-2.5 py-1.5 text-[10px] opacity-80 hover:opacity-100"
            >
              ออก
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-3">
          {nav.map((item) => {
            const active =
              pathname === item.href ||
              (item.href === "/dashboard" && pathname === "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex shrink-0 items-center justify-center gap-1 rounded-xl px-3 py-2 text-[10px] font-semibold transition sm:text-xs ${
                  active ? "theme-nav-active shadow-md" : "theme-nav-idle hover:opacity-80"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-4">{children}</main>
    </div>
  );
}
