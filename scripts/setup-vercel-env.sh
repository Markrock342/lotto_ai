#!/usr/bin/env bash
# อัปโหลด env จาก .env ไป Vercel (ต้อง vercel login + vercel link ก่อน)
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "ไม่พบ .env"
  exit 1
fi

if ! command -v vercel >/dev/null 2>&1 && ! npx vercel --version >/dev/null 2>&1; then
  echo "ติดตั้ง Vercel CLI: npm i -g vercel  หรือใช้วิธีคลิกใน SETUP_ส่งงาน.md"
  exit 1
fi

VCMD="vercel"
command -v vercel >/dev/null 2>&1 || VCMD="npx vercel"

if [[ ! -f .vercel/project.json ]]; then
  echo "ยังไม่ link โปรเจกต์ — รัน: $VCMD link"
  exit 1
fi

# shellcheck disable=SC1091
set -a
source .env
set +a

add_env() {
  local name="$1"
  local value="$2"
  if [[ -z "$value" ]]; then
    echo "ข้าม $name (ว่าง)"
    return
  fi
  echo "→ $name"
  printf '%s' "$value" | $VCMD env add "$name" production --force 2>/dev/null || \
    printf '%s' "$value" | $VCMD env add "$name" production
}

add_env DATABASE_URL "${DATABASE_URL:-}"
add_env SESSION_SECRET "${SESSION_SECRET:-}"
add_env SUPABASE_URL "${SUPABASE_URL:-}"
add_env CRON_SECRET "${CRON_SECRET:-}"
add_env SUPABASE_BACKUP_BUCKET "${SUPABASE_BACKUP_BUCKET:-backups}"
add_env SUPABASE_SERVICE_ROLE_KEY "${SUPABASE_SERVICE_ROLE_KEY:-}"

echo ""
echo "เสร็จ — รัน deploy: $VCMD --prod"
echo "หรือ Redeploy ในเว็บ Vercel"
