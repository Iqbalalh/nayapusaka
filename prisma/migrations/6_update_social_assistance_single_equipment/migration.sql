-- AlterTable: Change medicalEquipment from JSON to separate columns for single equipment
-- Step 1: Add new columns with different names first
ALTER TABLE "social_assistance" ADD COLUMN IF NOT EXISTS "equipment_name" VARCHAR(100);
ALTER TABLE "social_assistance" ADD COLUMN IF NOT EXISTS "equipment_quantity" INTEGER;
ALTER TABLE "social_assistance" ADD COLUMN IF NOT EXISTS "equipment_nominal" DOUBLE PRECISION;

-- Step 2: Drop the old JSON column
ALTER TABLE "social_assistance" DROP COLUMN IF EXISTS "medical_equipment";

-- Step 3: Rename the new column to match the schema
ALTER TABLE "social_assistance" RENAME COLUMN "equipment_name" TO "medical_equipment";
