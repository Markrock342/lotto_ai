# ระบบคีย์หวยลาวชุด

เว็บรับโพยจาก LINE · สรุปยอดต่อเลข · เรทจ่าย · ออกผล · หลายเครื่อง (admin / ลูกมือ)

## Tech

- Next.js 16 · Prisma · **PostgreSQL (Supabase)** · Deploy บน **Vercel**

> **สำคัญ:** Vercel ใช้ SQLite ไม่ได้ — ต้องใช้ Supabase (หรือ Postgres อื่น)

---

## 1) Supabase (ฐานข้อมูล + backup)

1. สร้างโปรเจกต์ที่ [supabase.com](https://supabase.com)
2. **Database → Connection string → URI**
   - `DATABASE_URL` = **Transaction Pooler** สำหรับ runtime บน Vercel
   - `DIRECT_URL` = **Direct connection** สำหรับ `prisma migrate` / seed / tooling
3. **Storage → New bucket** ชื่อ `backups` (Private)
4. **Settings → API** คัดลอก `URL` และ `service_role` key (เก็บเป็นความลับ)

Backup อัตโนมัติ:

| ช่องทาง | รายละเอียด |
|--------|-------------|
| Supabase Pro | backup รายวันของแพลตฟอร์ม |
| Vercel Cron | ทุกวัน 02:00 เรียก `/api/cron/backup` → อัป JSON ขึ้น bucket `backups` |
| มือ | `npm run db:backup` → ไฟล์ในโฟลเดอร์ `backups/` |

---

## 2) Vercel Deploy

1. Push โค้ดขึ้น GitHub แล้ว Import ใน Vercel
2. ตั้ง **Environment Variables** (Production):

| ตัวแปร | ค่า |
|--------|-----|
| `DATABASE_URL` | Transaction pooler connection string จาก Supabase |
| `DIRECT_URL` | Direct connection string สำหรับ migration / seed |
| `SESSION_SECRET` | สุ่มยาว ≥ 32 ตัว |
| `CRON_SECRET` | สุ่ม (ให้ตรงกับที่ Vercel Cron ส่ง) |
| `SUPABASE_URL` | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key |
| `SUPABASE_BACKUP_BUCKET` | `backups` |
| `SEED_ADMIN_PASSWORD` | รหัสเจ้ามือ (ตั้งครั้งแรกเท่านั้น) |
| `SEED_STAFF_PASSWORD` | รหัสลูกมือ |

3. Deploy — build รัน `prisma generate && next build` (migrate รันจากเครื่องคุณ ไม่รันบน Vercel — กัน pool เต็ม)

4. **Migrate + seed ครั้งแรก** (จากเครื่องคุณ):

```bash
DATABASE_URL="postgresql://..." DIRECT_URL="postgresql://..." npx prisma migrate deploy
DATABASE_URL="postgresql://..." DIRECT_URL="postgresql://..." npx prisma db seed
```

5. เปิด URL ของ Vercel → login `admin` / รหัสที่ตั้งใน `SEED_ADMIN_PASSWORD`

6. **Cron Jobs** ใน Vercel ต้องเปิดใช้ (Pro หรือตามแผน) — `vercel.json` ตั้ง schedule แล้ว

---

## พัฒนาในเครื่อง

```bash
cp .env.example .env
# ใส่ DATABASE_URL (pooler) และ DIRECT_URL (direct) จาก Supabase

npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

เปิด http://localhost:3000

---

## คำสั่ง

| คำสั่ง | ใช้เมื่อ |
|--------|---------|
| `npm run dev` | พัฒนา |
| `npm run build` | build + migrate (production) |
| `npm run db:backup` | สำรอง JSON ใน `backups/` |
| `npm run db:seed` | สร้างบ้าน + admin + staff |

---

## บัญชีเริ่มต้น (หลัง seed)

| ผู้ใช้ | บทบาท |
|--------|--------|
| `admin` | เจ้ามือ |
| `staff1`–`staff3` | ลูกมือ |

เปลี่ยนรหัสทันทีหลังส่งมอบลูกค้า

---

## ส่งมอบลูกค้า

- URL เว็บ · บัญชี admin · ลิงก์ **วิธีใช้** (`/guide`)
- บอก: โพยจากรูปให้ตรวจก่อนบันทึก · คัดลอกข้อความ LINE แม่นสุด
- ราคาต่อชุด (ยอดรับ) ตั้งที่ **ตั้งค่า**
