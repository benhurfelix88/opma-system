-- Add location column to ride_repairs table
ALTER TABLE ride_repairs ADD COLUMN IF NOT EXISTS location VARCHAR(255);
