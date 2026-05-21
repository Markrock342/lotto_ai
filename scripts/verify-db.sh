#!/usr/bin/env bash
# ตรวจ seed หลังรัน supabase/setup.sql — โหลด DATABASE_URL จาก .env
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "ไม่พบ .env — cp .env.example .env แล้วใส่ DATABASE_URL"
  exit 1
fi

# shellcheck disable=SC1091
set -a
source .env
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL ว่าง"
  exit 1
fi

if [[ "$DATABASE_URL" == *":6543"* ]]; then
  echo "⚠️  DATABASE_URL ใช้ port 6543 (Transaction pooler) — Prisma มักค้าง"
  echo "   แก้: Supabase Connect → Session pooler → port 5432"
  echo "   ตัวอย่าง: ...pooler.supabase.com:5432/postgres"
  exit 1
fi

echo "→ ตรวจการเชื่อมต่อ + จำนวนแถว (House / User / Draw) …"
npx prisma db execute --stdin <<'SQL'
SELECT
  (SELECT COUNT(*)::int FROM "House") AS houses,
  (SELECT COUNT(*)::int FROM "User") AS users,
  (SELECT COUNT(*)::int FROM "Draw") AS draws;
SQL

echo ""
echo "คาดหวัง: houses=1, users=4, draws=1"
echo "login ทดสอบ: admin / Admin@2026 (ถ้ารัน seed ใน setup.sql)"
