-- Fix corrupted photos data in incident_reports table
-- This script repairs records where photos column contains "[object Object]" instead of valid JSON

-- First, let's see what we have
SELECT id, incident_id, photos FROM incident_reports WHERE photos IS NOT NULL AND photos != '';

-- Set photos to NULL for corrupted records
UPDATE incident_reports
SET photos = NULL
WHERE photos = '[object Object]'
   OR photos LIKE '%[object Object]%';

-- For records with photos as array objects stored incorrectly, reset them
-- (This is a safety measure - users will need to re-upload photos for these incidents)
