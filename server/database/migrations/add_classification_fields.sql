-- Migration: Add restrictions, age_limit, and height_limit columns to ticket_classifications table
-- Run this migration to add the necessary columns for classification details

ALTER TABLE ticket_classifications 
ADD COLUMN IF NOT EXISTS restrictions TEXT,
ADD COLUMN IF NOT EXISTS age_limit VARCHAR(255) DEFAULT 'Custom',
ADD COLUMN IF NOT EXISTS height_limit VARCHAR(255) DEFAULT 'Custom',
ADD COLUMN IF NOT EXISTS description TEXT;

