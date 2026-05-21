import { prisma } from "@/lib/db";

export type BackupPayload = {
  version: 1;
  exportedAt: string;
  counts: {
    houses: number;
    users: number;
    draws: number;
    bets: number;
    limits: number;
  };
  houses: Awaited<ReturnType<typeof prisma.house.findMany>>;
  users: Awaited<ReturnType<typeof prisma.user.findMany>>;
  draws: Awaited<ReturnType<typeof prisma.draw.findMany>>;
  bets: Awaited<ReturnType<typeof prisma.bet.findMany>>;
  numberLimits: Awaited<ReturnType<typeof prisma.numberLimit.findMany>>;
};

export async function exportDatabaseBackup(): Promise<BackupPayload> {
  const [houses, users, draws, bets, numberLimits] = await Promise.all([
    prisma.house.findMany(),
    prisma.user.findMany(),
    prisma.draw.findMany(),
    prisma.bet.findMany(),
    prisma.numberLimit.findMany(),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    counts: {
      houses: houses.length,
      users: users.length,
      draws: draws.length,
      bets: bets.length,
      limits: numberLimits.length,
    },
    houses,
    users,
    draws,
    bets,
    numberLimits,
  };
}

export async function uploadBackupToSupabase(
  json: string,
  filename: string,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_BACKUP_BUCKET ?? "backups";

  if (!url || !key) {
    return { ok: false, error: "ไม่ได้ตั้ง SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY" };
  }

  const objectPath = `${filename}`;
  const res = await fetch(
    `${url}/storage/v1/object/${bucket}/${objectPath}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "x-upsert": "true",
      },
      body: json,
    },
  );

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: text || res.statusText };
  }

  return { ok: true, path: `${bucket}/${objectPath}` };
}
