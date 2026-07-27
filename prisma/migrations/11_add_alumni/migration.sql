-- CreateTable: alumni (standalone; reuses existing "Gender" enum)
CREATE TABLE "alumni" (
  "id"               SERIAL       PRIMARY KEY,
  "alumni_name"      VARCHAR(150) NOT NULL,
  "alumni_gender"    "Gender",
  "alumni_birthdate" DATE,
  "alumni_address"   TEXT,
  "alumni_phone"     VARCHAR(30),
  "education_level"  VARCHAR(100),
  "alumni_job"       VARCHAR(50),
  "nik"              VARCHAR(30),
  "notes"            TEXT,
  "alumni_pict"      VARCHAR(255),
  "created_at"       TIMESTAMP(6) DEFAULT now(),
  "updated_at"       TIMESTAMP(6) DEFAULT now(),
  "created_by"       INTEGER      DEFAULT 2,
  "edited_by"        INTEGER
);
