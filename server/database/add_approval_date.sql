-- Add approval_date column to spare_parts table
-- Run this migration to add the approval_date field

-- Check if column exists and add it if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'spare_parts' 
        AND column_name = 'approval_date'
    ) THEN
        ALTER TABLE spare_parts ADD COLUMN approval_date TIMESTAMP;
    END IF;
END $$;
