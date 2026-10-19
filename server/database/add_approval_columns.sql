-- Add approval_status and notes columns to spare_parts table
-- Run this in pgAdmin Query Tool on your Render PostgreSQL database

ALTER TABLE spare_parts ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE spare_parts ADD COLUMN IF NOT EXISTS notes TEXT;
