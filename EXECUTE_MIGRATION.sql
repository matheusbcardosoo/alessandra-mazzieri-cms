-- Migration: Add new fields to SiteSettings
-- Date: 2026-06-18
-- Status: Execute this in your PostgreSQL database (e.g., Supabase SQL Editor)

ALTER TABLE "SiteSettings"
ADD COLUMN "phone" TEXT,
ADD COLUMN "address" JSONB,
ADD COLUMN "officeHours" JSONB,
ADD COLUMN "metaDescription" VARCHAR(320),
ADD COLUMN "ogImageUrl" TEXT,
ADD COLUMN "gaId" TEXT,
ADD COLUMN "gscVerification" TEXT;

-- Verify the columns were created
SELECT column_name FROM information_schema.columns
WHERE table_name = 'SiteSettings'
ORDER BY ordinal_position;
