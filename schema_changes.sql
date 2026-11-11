-- Add approval_status and approval_date columns to ride_repairs table
ALTER TABLE ride_repairs ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE ride_repairs ADD COLUMN IF NOT EXISTS approval_date TIMESTAMP;

-- Add approval_status and approval_date columns to part_deployments table
ALTER TABLE part_deployments ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE part_deployments ADD COLUMN IF NOT EXISTS approval_date TIMESTAMP;

-- Add approval_status and approval_date columns to part_removals table
ALTER TABLE part_removals ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE part_removals ADD COLUMN IF NOT EXISTS approval_date TIMESTAMP;
