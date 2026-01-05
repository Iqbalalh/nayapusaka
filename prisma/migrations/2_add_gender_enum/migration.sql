-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('M', 'F');

-- Alter the gender column in staffs table to use the Gender enum
ALTER TABLE "staffs" ADD COLUMN "gender_new" "Gender" NOT NULL DEFAULT 'M';
UPDATE "staffs" SET "gender_new" = "gender"::"Gender";
ALTER TABLE "staffs" DROP COLUMN "gender";
ALTER TABLE "staffs" RENAME COLUMN "gender_new" TO "gender";

-- Alter the children_gender column in childrens table to use the Gender enum
ALTER TABLE "childrens" ADD COLUMN "children_gender_new" "Gender";
UPDATE "childrens" SET "children_gender_new" = "children_gender"::"Gender";
ALTER TABLE "childrens" DROP COLUMN "children_gender";
ALTER TABLE "childrens" RENAME COLUMN "children_gender_new" TO "children_gender";

-- Alter the employee_gender column in employees table to use the Gender enum
ALTER TABLE "employees" ADD COLUMN "employee_gender_new" "Gender";
UPDATE "employees" SET "employee_gender_new" = "employee_gender"::"Gender";
ALTER TABLE "employees" DROP COLUMN "employee_gender";
ALTER TABLE "employees" RENAME COLUMN "employee_gender_new" TO "employee_gender";