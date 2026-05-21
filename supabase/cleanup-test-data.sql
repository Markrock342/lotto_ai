-- ลบข้อมูลเทส (โพย + งวด) — เก็บบ้าน + ผู้ใช้ไว้
-- รันใน Supabase → SQL Editor → New query → Run
-- หลังรัน: เปิดเว็บ → จะมีงวดเปิดใหม่ 1 งวด โพย 0

DELETE FROM "Bet";
DELETE FROM "Draw";

INSERT INTO "Draw" ("id", "houseId", "label", "status")
SELECT
    'draw_' || floor(extract(epoch from now()))::text,
    id,
    'งวดเปิดรับ',
    'open'
FROM "House"
LIMIT 1;

-- ตรวจ
SELECT (SELECT COUNT(*) FROM "Bet") AS bets,
       (SELECT COUNT(*) FROM "Draw") AS draws;
