-- ============================================================
-- Lotto AI — รันใน Supabase → SQL Editor → New query → Run
-- โปรเจกต์: yfthcrbsexjnvrrfifkw
-- ============================================================

-- ลบของเก่า (ระวัง: ข้อมูลหายหมด)
DROP TABLE IF EXISTS "Bet" CASCADE;
DROP TABLE IF EXISTS "Draw" CASCADE;
DROP TABLE IF EXISTS "NumberLimit" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP TABLE IF EXISTS "House" CASCADE;
DROP TABLE IF EXISTS "_prisma_migrations" CASCADE;

-- ===================== ตาราง =====================

CREATE TABLE "House" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pricePerSet" INTEGER NOT NULL DEFAULT 120,
    "defaultMaxRisk" INTEGER,
    "defaultMaxSets" INTEGER,
    "ratesJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "House_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "houseId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'staff',
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "passwordChangedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Draw" (
    "id" TEXT NOT NULL,
    "houseId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "result4" TEXT,
    "settledAt" TIMESTAMP(3),
    "totalReceived" DOUBLE PRECISION,
    "totalPayout" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Draw_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Bet" (
    "id" TEXT NOT NULL,
    "drawId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Bet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NumberLimit" (
    "id" TEXT NOT NULL,
    "houseId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "maxRisk" INTEGER,
    "maxSets" INTEGER,
    CONSTRAINT "NumberLimit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_houseId_username_key" ON "User"("houseId", "username");
CREATE INDEX "Bet_drawId_number_idx" ON "Bet"("drawId", "number");
CREATE INDEX "Bet_drawId_status_idx" ON "Bet"("drawId", "status");
CREATE UNIQUE INDEX "NumberLimit_houseId_number_key" ON "NumberLimit"("houseId", "number");

ALTER TABLE "User" ADD CONSTRAINT "User_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "House"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Draw" ADD CONSTRAINT "Draw_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "House"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_drawId_fkey" FOREIGN KEY ("drawId") REFERENCES "Draw"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NumberLimit" ADD CONSTRAINT "NumberLimit_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "House"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ให้ Prisma migrate deploy บน Vercel ไม่รันซ้ำ
CREATE TABLE "_prisma_migrations" (
    "id" VARCHAR(36) NOT NULL PRIMARY KEY,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0
);

INSERT INTO "_prisma_migrations" (
    "id", "checksum", "finished_at", "migration_name", "applied_steps_count"
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'manual-supabase-sql',
    now(),
    '20260521100000_init_postgres',
    1
);

-- ===================== ข้อมูลเริ่มต้น (seed) =====================
-- รหัส: admin = Admin@2026 | staff1-3 = Staff@2026

INSERT INTO "House" ("id", "name", "pricePerSet", "defaultMaxRisk", "defaultMaxSets", "ratesJson")
VALUES (
    'house_main',
    'บ้านหวยลาว',
    80,
    NULL,
    NULL,
    '{"fourStraight":120000,"fourTod":4000,"threeStraight":35000,"threeTod":3000,"threeFront":2000,"twoFront":1500,"twoBack":1500}'
);

INSERT INTO "User" ("id", "houseId", "username", "passwordHash", "displayName", "role", "tokenVersion")
VALUES
    ('user_admin', 'house_main', 'admin', '$2b$10$vTbfzigGbp3Krbye7WxiA.1lpoDnDqfmtZWDHiP0B1eG4FDdvovLa', 'เจ้ามือ', 'admin', 0),
    ('user_staff1', 'house_main', 'staff1', '$2b$10$95O5CLw0GN8mLbZNZpNQxO/GwOtK9Af7fI35iOXR7XgVNhzzgLkji', 'ลูกมือ 1', 'staff', 0),
    ('user_staff2', 'house_main', 'staff2', '$2b$10$95O5CLw0GN8mLbZNZpNQxO/GwOtK9Af7fI35iOXR7XgVNhzzgLkji', 'ลูกมือ 2', 'staff', 0),
    ('user_staff3', 'house_main', 'staff3', '$2b$10$95O5CLw0GN8mLbZNZpNQxO/GwOtK9Af7fI35iOXR7XgVNhzzgLkji', 'ลูกมือ 3', 'staff', 0);

INSERT INTO "Draw" ("id", "houseId", "label", "status")
VALUES ('draw_open', 'house_main', 'งวดเริ่มต้น', 'open');
