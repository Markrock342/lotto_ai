import { NextResponse } from "next/server";
import {
  exportDatabaseBackup,
  uploadBackupToSupabase,
} from "@/lib/backup-export";

/** Vercel Cron — สำรองข้อมูลรายวัน (ตั้ง CRON_SECRET ใน Vercel) */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 503 },
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await exportDatabaseBackup();
    const json = JSON.stringify(payload);
    const filename = `backup-${payload.exportedAt.slice(0, 10)}.json`;

    const upload = await uploadBackupToSupabase(json, filename);

    return NextResponse.json({
      ok: true,
      exportedAt: payload.exportedAt,
      counts: payload.counts,
      storage: upload.ok ? { path: upload.path } : { error: upload.error },
      note: upload.ok
        ? "อัปโหลด Supabase Storage แล้ว"
        : "สำรองใน DB สำเร็จ แต่ยังไม่อัป Storage — ตั้ง SUPABASE_SERVICE_ROLE_KEY และสร้าง bucket backups",
    });
  } catch (err) {
    console.error("[cron/backup]", err);
    return NextResponse.json(
      { error: "Backup failed" },
      { status: 500 },
    );
  }
}
