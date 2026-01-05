-- Migration: Remove Subdistricts, Provinces, and Cities tables and replace with text-based fields

-- Step 1: Add subdistrict_name columns to partners and umkm tables
ALTER TABLE partners ADD COLUMN subdistrict_name VARCHAR(150);
ALTER TABLE umkm ADD COLUMN subdistrict_name VARCHAR(150);

-- Step 2: Populate subdistrict_name with data from subdistricts table
UPDATE partners
SET subdistrict_name = (SELECT subdistrict_name FROM subdistricts WHERE subdistrict_id = partners.subdistrict_id)
WHERE subdistrict_id IS NOT NULL;

UPDATE umkm
SET subdistrict_name = (SELECT subdistrict_name FROM subdistricts WHERE subdistrict_id = umkm.subdistrict_id)
WHERE subdistrict_id IS NOT NULL;

-- Step 3: Drop foreign key constraints and columns
-- Drop subdistrict_id from partners
ALTER TABLE partners DROP CONSTRAINT IF EXISTS partners_subdistrict_id_fkey;
ALTER TABLE partners DROP COLUMN IF EXISTS subdistrict_id;

-- Drop subdistrict_id from umkm
ALTER TABLE umkm DROP CONSTRAINT IF EXISTS umkm_subdistrict_id_fkey;
ALTER TABLE umkm DROP COLUMN IF EXISTS subdistrict_id;

-- Step 4: Drop the subdistricts, cities, and provinces tables
DROP TABLE IF EXISTS subdistricts;
DROP TABLE IF EXISTS cities;
DROP TABLE IF EXISTS provinces;