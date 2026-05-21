-- Additive only: existing bets unchanged (slipId stays NULL until new imports).

CREATE TABLE "Slip" (
    "id" TEXT NOT NULL,
    "drawId" TEXT NOT NULL,
    "customerName" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Slip_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Slip_drawId_idx" ON "Slip"("drawId");

ALTER TABLE "Bet" ADD COLUMN "slipId" TEXT;

CREATE INDEX "Bet_slipId_idx" ON "Bet"("slipId");

ALTER TABLE "Bet" ADD CONSTRAINT "Bet_slipId_fkey" FOREIGN KEY ("slipId") REFERENCES "Slip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Slip" ADD CONSTRAINT "Slip_drawId_fkey" FOREIGN KEY ("drawId") REFERENCES "Draw"("id") ON DELETE CASCADE ON UPDATE CASCADE;
