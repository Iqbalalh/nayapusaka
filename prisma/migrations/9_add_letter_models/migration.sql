-- CreateEnum
CREATE TYPE "LetterStatus" AS ENUM ('draft', 'pending1', 'pending2', 'pending3', 'approved', 'published');

-- CreateTable
CREATE TABLE "letters" (
    "id" SERIAL NOT NULL,
    "letter_type" VARCHAR(100) NOT NULL,
    "letter_number" VARCHAR(100),
    "attachment" VARCHAR(255),
    "subject" TEXT NOT NULL,
    "letter_date" DATE NOT NULL,
    "destination" TEXT NOT NULL,
    "carbon_copy" TEXT,
    "document_path" VARCHAR(500),
    "status" "LetterStatus" NOT NULL DEFAULT 'draft',
    "signer1_id" INTEGER NOT NULL,
    "signer2_id" INTEGER,
    "signer3_id" INTEGER,
    "revision_note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,
    "edited_by" INTEGER,

    CONSTRAINT "letters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "letter_approvals" (
    "id" SERIAL NOT NULL,
    "letter_id" INTEGER NOT NULL,
    "signer_id" INTEGER NOT NULL,
    "signer_level" INTEGER NOT NULL,
    "action" VARCHAR(20) NOT NULL,
    "action_note" TEXT,
    "action_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "letter_approvals_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "letters" ADD CONSTRAINT "letters_signer1_id_fkey" FOREIGN KEY ("signer1_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "letters" ADD CONSTRAINT "letters_signer2_id_fkey" FOREIGN KEY ("signer2_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "letters" ADD CONSTRAINT "letters_signer3_id_fkey" FOREIGN KEY ("signer3_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "letter_approvals" ADD CONSTRAINT "letter_approvals_letter_id_fkey" FOREIGN KEY ("letter_id") REFERENCES "letters"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
