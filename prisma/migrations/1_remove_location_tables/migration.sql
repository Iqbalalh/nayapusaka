-- Add subdistrict_name column to partners table
ALTER TABLE "partners" ADD COLUMN "subdistrict_name" VARCHAR(150);

-- Add subdistrict_name column to umkm table
ALTER TABLE "umkm" ADD COLUMN "subdistrict_name" VARCHAR(150);

-- Migrate data from subdistricts to partners
UPDATE "partners" p
SET "subdistrict_name" = s.subdistrict_name
FROM "subdistricts" s
WHERE p."subdistrict_id" = s.subdistrict_id;

-- Migrate data from subdistricts to umkm
UPDATE "umkm" u
SET "subdistrict_name" = s.subdistrict_name
FROM "subdistricts" s
WHERE u."subdistrict_id" = s.subdistrict_id;

-- Drop foreign key constraints on subdistrict_id in partners
ALTER TABLE "partners" DROP CONSTRAINT IF EXISTS "partners_subdistrict_id_fkey";

-- Drop foreign key constraints on subdistrict_id in umkm
ALTER TABLE "umkm" DROP CONSTRAINT IF EXISTS "umkm_subdistrict_id_fkey";

-- Drop subdistrict_id column from partners
ALTER TABLE "partners" DROP COLUMN IF EXISTS "subdistrict_id";

-- Drop subdistrict_id column from umkm
ALTER TABLE "umkm" DROP COLUMN IF EXISTS "subdistrict_id";

-- Drop subdistricts table
DROP TABLE IF EXISTS "subdistricts";

-- Drop cities table
DROP TABLE IF EXISTS "cities";

-- Drop provinces table
DROP TABLE IF EXISTS "provinces";