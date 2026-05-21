# เช็กลิสต์ส่งงาน + Vercel

## ก่อนส่งลูกค้า

- [ ] Supabase โปรเจกต์สร้างแล้ว
- [ ] Vercel deploy สำเร็จ (ไม่ error build)
- [ ] `npx prisma db seed` รันแล้ว (บ้าน + ผู้ใช้)
- [ ] เปลี่ยนรหัส admin / staff ไม่ใช้ค่า demo
- [ ] ทด: login · คีย์โพย · สรุปยอด · ออกผล · พิมพ์บิล
- [ ] ตั้ง `CRON_SECRET` + bucket `backups` ถ้าต้องการสำรองอัตโนมัติ

## Env บน Vercel (บังคับ)

รายละเอียดเต็ม: **[VERCEL_ENV.md](./VERCEL_ENV.md)**

```
DATABASE_URL=            # Transaction pooler จาก Supabase Connect
SESSION_SECRET=          # openssl rand -hex 32
SUPABASE_URL=            # backup upload
CRON_SECRET=             # backup cron (ถ้าใช้)
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_BACKUP_BUCKET=backups
```

ถ้ารัน `supabase/setup.sql` แล้ว → **ไม่ใส่** `SEED_*` บน Vercel

## ยืนยัน SQL / seed

```bash
./scripts/verify-db.sh
```

คาดหวัง: House 1 · User 4 · Draw 1

## หลังส่งงาน (ขายต่อ)

- Supabase **Pro** = backup ระดับแพลตฟอร์ม
- แต่ละลูกค้า = โปรเจกต์ Supabase แยก หรือแยก schema (เฟสถัดไป multi-tenant)
