-- Add location column to maintenance_records table
-- Run this in pgAdmin Query Tool on your Render PostgreSQL database

ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS location VARCHAR(255);
