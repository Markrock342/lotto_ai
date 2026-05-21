# เช็กลิสต์ส่งงาน + Vercel

## ก่อนส่งลูกค้า

- [ ] Supabase โปรเจกต์สร้างแล้ว
- [ ] Vercel deploy สำเร็จ (ไม่ error build)
- [ ] `npx prisma db seed` รันแล้ว (บ้าน + ผู้ใช้)
- [ ] เปลี่ยนรหัส admin / staff ไม่ใช้ค่า demo
- [ ] ทด: login · คีย์โพย · สรุปยอด · ออกผล · พิมพ์บิล
- [ ] ตั้ง `CRON_SECRET` + bucket `backups` ถ้าต้องการสำรองอัตโนมัติ

## Env บน Vercel (บังคับ)

```
DATABASE_URL=
SESSION_SECRET=
SEED_ADMIN_PASSWORD=     # ใช้ตอน seed ครั้งแรกจากเครื่องคุณ
SEED_STAFF_PASSWORD=
CRON_SECRET=             # backup cron
SUPABASE_URL=            # backup upload
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_BACKUP_BUCKET=backups
```

## หลังส่งงาน (ขายต่อ)

- Supabase **Pro** = backup ระดับแพลตฟอร์ม
- แต่ละลูกค้า = โปรเจกต์ Supabase แยก หรือแยก schema (เฟสถัดไป multi-tenant)
