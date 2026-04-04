-- Fix medications and allergies columns: convert from text[] (ARRAY) to text (String)
-- These were accidentally created as text[] but Prisma schema defines them as String?

ALTER TABLE "Patient"
  ALTER COLUMN "medications" TYPE TEXT USING CASE WHEN array_length("medications", 1) IS NULL THEN NULL ELSE array_to_json("medications")::TEXT END,
  ALTER COLUMN "allergies" TYPE TEXT USING CASE WHEN array_length("allergies", 1) IS NULL THEN NULL ELSE array_to_json("allergies")::TEXT END;
