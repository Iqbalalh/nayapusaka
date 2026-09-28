-- Add "pengajuan" (submitted/proposed amount) to social_assistance for cross-checking against total_amount (realisasi).
ALTER TABLE "social_assistance" ADD COLUMN "pengajuan" DOUBLE PRECISION;
