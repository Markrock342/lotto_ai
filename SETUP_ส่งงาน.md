# ส่งงานลูกค้า — ทำแค่ 2 หน้าเว็บ (5 นาที)

สิ่งที่ **ทำเสร็จแล้ว** (ไม่ต้องทำซ้ำ):

- โค้ด push GitHub แล้ว
- SQL + ข้อมูล seed ใน Supabase แล้ว
- ทด Mac: `./scripts/verify-db.sh` ผ่าน, login `admin` / `Admin@2026` ได้

เหลือแค่ **ใส่รหัสบน Vercel** แล้วกด Deploy — Agent เข้าเว็บ Vercel แทนคุณไม่ได้ (ต้อง login บัญชีคุณ)

---

## วิธีที่ 1 — คลิกในเว็บ (ง่ายสุด)

### ขั้น A: เปิด Vercel

1. ไป https://vercel.com และ Login
2. เปิดโปรเจกต์ **lotto_ai** (หรือชื่อที่ import จาก GitHub)
3. **Settings** → **Environment Variables**

### ขั้น B: กด Add New ทีละตัว (เลือก Environment = Production)

เปิดไฟล์ `.env` ใน Cursor ข้างๆ นี้ แล้ว ** copy ค่าตามชื่อ **

| Name (พิมพ์ตรงนี้) | Value ( copy จาก `.env` บรรทัดเดียวกัน ) |
|-------------------|------------------------------------------|
| `DATABASE_URL` | บรรทัด `DATABASE_URL=` (ต้องมี **:5432** ไม่ใช่ 6543) |
| `SESSION_SECRET` | บรรทัด `SESSION_SECRET=` |
| `SUPABASE_URL` | บรรทัด `SUPABASE_URL=` |

ถ้าต้องการ backup อัตโนมัติ (bucket สร้างแล้ว) เพิ่มอีก 3 ตัว:

| Name | Value |
|------|-------|
| `CRON_SECRET` | จาก `.env` |
| `SUPABASE_SERVICE_ROLE_KEY` | จาก Supabase → Settings → API → **service_role** (ยังไม่มีใน `.env` ให้ copy มาใส่ทั้ง `.env` และ Vercel) |
| `SUPABASE_BACKUP_BUCKET` | `backups` |

กด **Save** ทุกตัว

### ขั้น C: Deploy

1. แท็บ **Deployments**
2. จุดสามจุดของ deployment ล่าสุด → **Redeploy**
3. รอสถานะ **Ready** (เขียว)

### ขั้น D: ทด + ส่งลูกค้า

1. เปิด URL ที่ Vercel ให้ (เช่น `https://lotto-ai-xxx.vercel.app`)
2. Login: `admin` / `Admin@2026`
3. เปลี่ยนรหัส admin ในระบบ (หรือตาม flow ของแอป)
4. ส่งลูกค้า: **ลิงก์เว็บ + รหัสใหม่** (อย่าส่ง `.env`)

---

## วิธีที่ 2 — รันสคริปต์ (ถ้ามี Vercel CLI)

```bash
cd /Users/code/lotto_ai
npx vercel login          # ครั้งแรก — เปิด browser login
npx vercel link           # เลือกโปรเจกต์ lotto_ai
./scripts/setup-vercel-env.sh
npx vercel --prod
```

---

## ติดอะไร

| อาการ | แก้ |
|--------|-----|
| Login ไม่ได้บนเว็บ Vercel | เช็ก `DATABASE_URL` บน Vercel ตรงกับ `.env` (port 5432) |
| Build แดง | แปะ log จาก Vercel Deployments → Building |
| ลืม service_role | Supabase → Settings → API → service_role → ใส่ Vercel |

---

## ทำไม Agent ทำแทนไม่ได้ทั้งหมด

| ทำได้ | ทำไม่ได้ (ต้องบัญชีคุณ) |
|--------|-------------------------|
| แก้โค้ด, SQL, `.env` ในเครื่อง | Login vercel.com / supabase.com |
| push GitHub | กดปุ่มใน Dashboard |
| ทด DB / dev บนเครื่องคุณ | ใส่ env บน Vercel ถ้าไม่มี CLI login |

ถ้าส่ง **ลิงก์โปรเจกต์ Vercel** หรือ screenshot หน้า Environment Variables (ปิดบังรหัส) มาได้ — จะบอกทีละช่องว่าต้องใส่อะไร
