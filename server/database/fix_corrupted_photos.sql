-- Fix corrupted data in incident_reports table
-- This script repairs records where photos or involved_parties columns contain "[object Object]" instead of valid JSON

-- First, let's see what we have
SELECT id, incident_id, photos, involved_parties FROM incident_reports WHERE photos IS NOT NULL AND photos != '';

-- Set photos to NULL for corrupted records
UPDATE incident_reports
SET photos = NULL
WHERE photos = '[object Object]'
   OR photos LIKE '%[object Object]%';

-- Set involved_parties to NULL for corrupted records
UPDATE incident_reports
SET involved_parties = NULL
WHERE involved_parties = '[object Object]'
   OR involved_parties LIKE '%[object Object]%';

-- For records with data as array objects stored incorrectly, reset them
-- (This is a safety measure - users will need to re-enter data for these incidents)
