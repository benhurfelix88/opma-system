-- Remove parts and quantity columns from part_deployments and part_removals tables
-- Run this in pgAdmin Query Tool on your Render PostgreSQL database

-- Drop parts and quantity columns from part_deployments
ALTER TABLE part_deployments DROP COLUMN IF EXISTS parts;
ALTER TABLE part_deployments DROP COLUMN IF EXISTS quantity;

-- Drop parts and quantity columns from part_removals
ALTER TABLE part_removals DROP COLUMN IF EXISTS parts;
ALTER TABLE part_removals DROP COLUMN IF EXISTS quantity;
