-- Link an alumni back to the anak asuh it was promoted from (internal; enables
-- idempotent auto-promotion). NULL for manually-created alumni.
ALTER TABLE "alumni" ADD COLUMN "source_children_id" INTEGER;

-- At most one alumni per source child (only enforced for non-null links).
CREATE UNIQUE INDEX "alumni_source_children_id_key"
  ON "alumni" ("source_children_id")
  WHERE "source_children_id" IS NOT NULL;
