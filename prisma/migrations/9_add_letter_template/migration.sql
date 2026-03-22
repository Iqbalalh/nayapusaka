-- CreateTable
CREATE TABLE "letter_templates" (
    "id" SERIAL NOT NULL,
    "letter_type" "LetterType" NOT NULL,
    "template_name" VARCHAR(255) NOT NULL,
    "s3_path" VARCHAR(500) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "variables" JSON,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "edited_by" INTEGER,

    CONSTRAINT "letter_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "letter_templates_letter_type_key" ON "letter_templates"("letter_type");

-- Add template_id column to letters table
ALTER TABLE "letters" ADD COLUMN "template_id" INTEGER;

-- Add foreign key constraint for template_id
ALTER TABLE "letters" ADD CONSTRAINT "letters_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "letter_templates"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- Add foreign key constraints for letter_templates
ALTER TABLE "letter_templates" ADD CONSTRAINT "letter_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "letter_templates" ADD CONSTRAINT "letter_templates_edited_by_fkey" FOREIGN KEY ("edited_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
