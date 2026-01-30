# Migration: Add schoolName to ChildAssistance

## Description
This migration adds a `school_name` column to the `child_assistance` table to track the school name for each child assistance record.

## Changes
- Added `school_name VARCHAR(200)` column to `child_assistance` table

## Backend Changes Made
1. **Prisma Schema** ([`nayapusaka/prisma/schema.prisma`](nayapusaka/prisma/schema.prisma:382))
   - Added `schoolName` field to `ChildAssistance` model

2. **Controller** ([`nayapusaka/src/controllers/childassistance.controller.ts`](nayapusaka/src/controllers/childassistance.controller.ts:148))
   - Updated `postChildAssistance` to accept and save `schoolName`
   - Updated `patchChildAssistance` to accept and update `schoolName`

3. **Prisma Client**
   - Regenerated with `npx prisma generate`

## Frontend Changes Made
1. **Type Definitions** ([`sipusaka/src/types/models/childassistance.ts`](sipusaka/src/types/models/childassistance.ts:11))
   - Added `schoolName?: string | null` to `ChildAssistance` interface

2. **Service Types** ([`sipusaka/src/utils/services/childassistance.service.ts`](sipusaka/src/utils/services/childassistance.service.ts:20))
   - Added `schoolName?: string | null` to `ChildAssistance` interface

## How to Apply the Migration

### Option 1: Using Prisma Migrate (Recommended if database is accessible)
```bash
cd nayapusaka
npx prisma migrate deploy
```

### Option 2: Manual SQL Execution
If you cannot run Prisma migrate, execute the SQL manually:

```sql
ALTER TABLE "child_assistance" ADD COLUMN "school_name" VARCHAR(200);
```

### Option 3: Using Docker Compose
If using Docker, run:
```bash
docker-compose exec nayapusaka npx prisma migrate deploy
```

## Verification
After applying the migration, verify the column exists:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'child_assistance' 
AND column_name = 'school_name';
```

## API Impact
The API endpoints now accept an optional `schoolName` field:
- `POST /api/child-assistance` - Create child assistance
- `PATCH /api/child-assistance/:id` - Update child assistance

The field is optional and defaults to `NULL` if not provided.

## Notes
- This is a non-breaking change (optional field)
- Existing records will have `NULL` for `school_name`
- The field is nullable to maintain backward compatibility