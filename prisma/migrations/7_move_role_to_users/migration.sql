-- Add role column to users table
ALTER TABLE "users" ADD COLUMN "role" VARCHAR(50) DEFAULT 'staff';

-- Copy role from staffs to users
UPDATE "users" u
SET "role" = r."role_name"
FROM "staffs" s
JOIN "roles" r ON s."role_id" = r."id"
WHERE u."staff_id" = s."id";

-- Set default role for users without staff
UPDATE "users" SET "role" = 'staff' WHERE "role" IS NULL;

-- Make role column NOT NULL
ALTER TABLE "users" ALTER COLUMN "role" SET NOT NULL;

-- Remove roleId from staffs table
ALTER TABLE "staffs" DROP COLUMN "role_id";
