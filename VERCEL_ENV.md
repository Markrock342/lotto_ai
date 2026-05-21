# Vercel — Environment Variables (Production)

ตั้งใน **Vercel → Project → Settings → Environment Variables** เท่านั้น (ไม่ commit ลง Git)

## บังคับ

| ตัวแปร | ค่า | หมายเหตุ |
|--------|-----|----------|
| `DATABASE_URL` | URI จาก Supabase → **Connect → Session pooler (port 5432)** | โปรเจกต์ใช้ Prisma — **อย่าใช้ Transaction 6543** (ค้าง/ล้ม) |
| `SESSION_SECRET` | `openssl rand -hex 32` | คนละค่ากับเครื่อง dev ได้ |
| `SUPABASE_URL` | `https://yfthcrbsexjnvrrfifkw.supabase.co` | backup cron |

## ถ้ารัน `supabase/setup.sql` แล้ว (มี seed ใน SQL)

**ไม่ต้อง** ใส่ `SEED_ADMIN_PASSWORD` / `SEED_STAFF_PASSWORD` บน Vercel — มี House/User/Draw แล้ว

ห้ามรัน `prisma db seed` ซ้ำบน production (ลบข้อมูลเดิมทั้งหมด)

## Backup อัตโนมัติ (แนะนำ)

| ตัวแปร | ค่า |
|--------|-----|
| `CRON_SECRET` | `openssl rand -hex 24` — ต้องตรงกับ header ที่ Vercel Cron ส่ง |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → **service_role** (secret) |
| `SUPABASE_BACKUP_BUCKET` | `backups` |

สร้าง bucket **backups** (Private) ใน Supabase Storage ก่อน

## หลังใส่ env

1. **Redeploy** (Deployments → … → Redeploy) — build รัน `prisma migrate deploy` (ข้ามได้ถ้ามี `_prisma_migrations` จาก SQL แล้ว)
2. เปิด URL → login `admin` / `Admin@2026` (จาก SQL seed)
3. เปลี่ยนรหัส admin/staff ก่อนส่งลูกค้า

## ความปลอดภัย

- รหัส DB เคยอยู่ในแชท/ไฟล์ local → **Reset database password** ที่ Supabase แล้วอัปเดต `DATABASE_URL` ทั้ง `.env` และ Vercel
- `.env` อยู่ใน `.gitignore` แล้ว — ห้าม commit

## ทดในเครื่อง

```bash
./scripts/verify-db.sh
npm run dev
# http://localhost:3000/login — admin / Admin@2026
```

ถ้า direct (`db.*.supabase.co:5432`) ต่อไม่ได้ ให้ใช้ **Transaction pooler** ใน `.env` เหมือน Vercel
