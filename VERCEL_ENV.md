# Vercel — Environment Variables (Production)

ตั้งใน **Vercel → Project → Settings → Environment Variables** เท่านั้น (ไม่ commit ลง Git)

## บังคับ

| ตัวแปร | ค่า | หมายเหตุ |
|--------|-----|----------|
| `DATABASE_URL` | URI จาก Supabase → **Session pooler port 5432** + ต่อท้าย **`?connection_limit=1`** (บังคับบน Vercel) | อย่าใช้ 6543. **ห้าม**เปิด `npm run dev` คู่กับ Vercel ถ้าใช้ DB ตัวเดียวกัน |
| `SESSION_SECRET` | `openssl rand -hex 32` | คนละค่ากับเครื่อง dev ได้ |
| `SUPABASE_URL` | `https://yfthcrbsexjnvrrfifkw.supabase.co` | backup cron |

## ถ้ารัน `supabase/setup.sql` แล้ว (มี seed ใน SQL)

**ไม่ต้อง** ใส่ `SEED_ADMIN_PASSWORD` / `SEED_STAFF_PASSWORD` บน Vercel — มี House/User/Draw แล้ว

ห้ามรัน `prisma db seed` ซ้ำบน production (ลบข้อมูลเดิมทั้งหมด)

## อ่านรูปโพยด้วย AI (แนะนำ — สมุดลายมือ)

ใส่อย่างใดอย่างหนึ่ง:

| ตัวแปร | ค่า |
|--------|-----|
| `OPENAI_API_KEY` | จาก [platform.openai.com](https://platform.openai.com/api-keys) |
| `GEMINI_API_KEY` | จาก [Google AI Studio](https://aistudio.google.com/apikey) (มี free tier) |

ทางเลือก: `OPENAI_OCR_MODEL` (default `gpt-4o-mini`), `GEMINI_OCR_MODEL`, `OCR_VISION_PROVIDER=openai|gemini`

ค่าใช้จ่ายประมาณ **฿0.1–0.5 ต่อรูป** (OpenAI mini) — ไม่ใส่ key จะ fallback OCR ในเครื่อง (อ่านลายมือได้ไม่ครบ)

## Backup อัตโนมัติ (แนะนำ)

| ตัวแปร | ค่า |
|--------|-----|
| `CRON_SECRET` | `openssl rand -hex 24` — ต้องตรงกับ header ที่ Vercel Cron ส่ง |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → **service_role** (secret) |
| `SUPABASE_BACKUP_BUCKET` | `backups` |

สร้าง bucket **backups** (Private) ใน Supabase Storage ก่อน

## หลังใส่ env

1. **Redeploy** — build บน Vercel **ไม่รัน** `migrate deploy` (กัน DB เต็ม `max clients 15`)
2. อัปเดต schema ครั้งเดียวจาก Mac: `DATABASE_URL="..." npx prisma migrate deploy`
3. เปิด URL → login `admin` / `Admin@2026` (จาก SQL seed)
4. เปลี่ยนรหัส admin/staff ก่อนส่งลูกค้า

## Deploy error `max clients reached` (EMAXCONNSESSION)

- Supabase Session pooler จำกัด **15 connection**
- สาเหตุ: `npm run dev` local + deploy ซ้ำๆ + migrate ตอน build
- แก้: **หยุด dev server** ชั่วคราว → รอ 1–2 นาที → Redeploy
- ถ้ายังไม่ได้: Supabase Dashboard → Database → restart หรือลด connection อื่น

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
