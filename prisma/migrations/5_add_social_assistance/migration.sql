-- CreateTable
CREATE TABLE "social_assistance" (
    "id" SERIAL NOT NULL,
    "nip_nipp" VARCHAR(30),
    "recipient_name" VARCHAR(150),
    "ktp_address" TEXT,
    "region" VARCHAR(150),
    "condition" TEXT,
    "medical_equipment" JSONB,
    "cash_amount" DOUBLE PRECISION,
    "total_amount" DOUBLE PRECISION,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER DEFAULT 2,
    "edited_by" INTEGER,

    CONSTRAINT "social_assistance_pkey" PRIMARY KEY ("id")
);
