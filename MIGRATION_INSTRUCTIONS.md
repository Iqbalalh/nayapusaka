# Database Migration Instructions

## Overview
This migration will:
1. Add `subdistrict_name` column to `partners` and `umkm` tables
2. Migrate existing data from the `subdistricts` table
3. Drop the `subdistrict_id` columns
4. Drop the `cities`, `provinces`, and `subdistricts` tables

## Prerequisites
- Ensure your database is running
- Ensure you have the correct database credentials in your `.env` file

## Running the Migration

### Option 1: Using the automated script (Recommended)

**For Windows:**
```bash
cd nayapusaka
resolve-and-migrate.bat
```

**For Linux/Mac:**
```bash
cd nayapusaka
chmod +x resolve-and-migrate.sh
./resolve-and-migrate.sh
```

### Option 2: Manual steps

1. **Resolve the failed 0_init migration:**
   ```bash
   npx prisma migrate resolve --applied 0_init
   ```

2. **Apply the new migration:**
   ```bash
   npx prisma migrate deploy
   ```

## What the migration does

The migration script performs the following operations in order:

1. **Marks the failed 0_init migration as applied** - This tells Prisma that the initial schema already exists in the database
2. **Applies the 1_remove_location_tables migration** which:
   - Adds `subdistrict_name VARCHAR(150)` columns to `partners` and `umkm` tables
   - Copies data from `subdistricts.subdistrict_name` to the new columns
   - Drops foreign key constraints on `subdistrict_id`
   - Removes `subdistrict_id` columns from both tables
   - Drops the `subdistricts`, `cities`, and `provinces` tables

## Troubleshooting

### If you get an error about failed migrations
Run the resolve command again:
```bash
npx prisma migrate resolve --applied 0_init
```

### If you want to start fresh
WARNING: This will delete all data in your database!
```bash
npx prisma migrate reset
```

### If you want to check migration status
```bash
npx prisma migrate status
```

## After Migration

After successfully applying the migration, you can regenerate your Prisma client:
```bash
npx prisma generate
```

## Schema Changes

The new schema in `prisma/schema.prisma` now includes:
- `subdistrictName` field in the `Partners` model
- `subdistrictName` field in the `Umkm` model
- No `Cities`, `Provinces`, or `Subdistricts` models

This simplifies the database structure by denormalizing the subdistrict names directly into the tables that reference them.