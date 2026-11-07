-- ARMS System Database Schema (PostgreSQL)
-- Run this in PostgreSQL (pgAdmin, psql, or Render database editor)

-- Create database if it doesn't exist (may need superuser privileges)
-- CREATE DATABASE arms_system;

-- Connect to the database
-- \c arms_system;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    mobile_number VARCHAR(20),
    role VARCHAR(50) NOT NULL CHECK (role IN ('IT Admin', 'IT Encoder', 'Operations Manager', 'Amusement Park Personnel')),
    assigned_ride VARCHAR(255),
    profile_picture VARCHAR(500),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for users
CREATE INDEX IF NOT EXISTS idx_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_status ON users(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sessions table for authentication
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_id ON sessions(user_id);

-- Password Reset Tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires_at ON password_reset_tokens(expires_at);

-- Rides table
CREATE TABLE IF NOT EXISTS rides (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'operational',
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ride_name ON rides(name);
CREATE INDEX IF NOT EXISTS idx_ride_status ON rides(status);

CREATE TRIGGER update_rides_updated_at BEFORE UPDATE ON rides
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Maintenance Records
CREATE TABLE IF NOT EXISTS maintenance_records (
    id SERIAL PRIMARY KEY,
    ride_name VARCHAR(255) NOT NULL,
    maintenance_type VARCHAR(100),
    description TEXT,
    performed_by VARCHAR(255),
    date_performed DATE,
    next_maintenance_date DATE,
    status VARCHAR(50),
    location VARCHAR(255),
    approval_status VARCHAR(50) DEFAULT 'Pending',
    approval_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_maintenance_ride_name ON maintenance_records(ride_name);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_records(status);

CREATE TRIGGER update_maintenance_records_updated_at BEFORE UPDATE ON maintenance_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Incident Reports
CREATE TABLE IF NOT EXISTS incident_reports (
    id SERIAL PRIMARY KEY,
    incident_id VARCHAR(100) UNIQUE NOT NULL,
    ride_name VARCHAR(255),
    incident_type VARCHAR(100),
    severity VARCHAR(50),
    description TEXT,
    reported_by INTEGER NOT NULL,
    date_reported DATE,
    time_reported TIME,
    status VARCHAR(50),
    review_status VARCHAR(50) DEFAULT 'Pending',
    resolution TEXT,
    photos JSONB, -- Expected format: [{"id": 123, "filename": "...", "originalname": "...", "path": "https://...", "mimetype": "...", "size": 123}]
    involved_parties JSONB,
    injuries TEXT,
    property_damage TEXT,
    other_impact TEXT,
    response TEXT,
    actions_taken TEXT,
    follow_up TEXT,
    recommendations TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reported_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_incident_id ON incident_reports(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_ride_name ON incident_reports(ride_name);
CREATE INDEX IF NOT EXISTS idx_incident_status ON incident_reports(status);

CREATE TRIGGER update_incident_reports_updated_at BEFORE UPDATE ON incident_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Spare Parts
CREATE TABLE IF NOT EXISTS spare_parts (
    id SERIAL PRIMARY KEY,
    part_name VARCHAR(255) NOT NULL,
    part_number VARCHAR(100),
    category VARCHAR(100),
    quantity INTEGER DEFAULT 0,
    unit VARCHAR(50),
    location VARCHAR(255),
    supplier VARCHAR(255),
    cost DECIMAL(10, 2),
    status VARCHAR(50),
    ride VARCHAR(255),
    ride_location VARCHAR(255),
    approval_status VARCHAR(50) DEFAULT 'Pending',
    approval_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_part_name ON spare_parts(part_name);
CREATE INDEX IF NOT EXISTS idx_part_category ON spare_parts(category);
CREATE INDEX IF NOT EXISTS idx_part_ride ON spare_parts(ride);
CREATE INDEX IF NOT EXISTS idx_part_ride_location ON spare_parts(ride_location);
CREATE INDEX IF NOT EXISTS idx_part_ride_location_combo ON spare_parts(ride, ride_location);

CREATE TRIGGER update_spare_parts_updated_at BEFORE UPDATE ON spare_parts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Ride Repairs
CREATE TABLE IF NOT EXISTS ride_repairs (
    id SERIAL PRIMARY KEY,
    ride VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    issue TEXT NOT NULL,
    parts_replaced TEXT,
    cost DECIMAL(10, 2) DEFAULT 0,
    technician VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'In Progress',
    notes TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_repairs_ride ON ride_repairs(ride);
CREATE INDEX IF NOT EXISTS idx_repairs_date ON ride_repairs(date);
CREATE INDEX IF NOT EXISTS idx_repairs_status ON ride_repairs(status);

CREATE TRIGGER update_ride_repairs_updated_at BEFORE UPDATE ON ride_repairs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Part Deployments
CREATE TABLE IF NOT EXISTS part_deployments (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    place VARCHAR(255) NOT NULL,
    ride VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'Complete',
    missing_parts TEXT,
    encoded_by VARCHAR(255) NOT NULL,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_deployments_ride ON part_deployments(ride);
CREATE INDEX IF NOT EXISTS idx_deployments_date ON part_deployments(date);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON part_deployments(status);

CREATE TRIGGER update_part_deployments_updated_at BEFORE UPDATE ON part_deployments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Part Removals
CREATE TABLE IF NOT EXISTS part_removals (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    place VARCHAR(255) NOT NULL,
    ride VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'Complete',
    missing_parts TEXT,
    encoded_by VARCHAR(255) NOT NULL,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_removals_ride ON part_removals(ride);
CREATE INDEX IF NOT EXISTS idx_removals_date ON part_removals(date);
CREATE INDEX IF NOT EXISTS idx_removals_status ON part_removals(status);

CREATE TRIGGER update_part_removals_updated_at BEFORE UPDATE ON part_removals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RIDE COUNTERS SYSTEM
-- ============================================

-- Ride Entries table for manual entry tracking
CREATE TABLE IF NOT EXISTS ride_entries (
    id SERIAL PRIMARY KEY,
    ride_id INTEGER NOT NULL,
    ride_name VARCHAR(255) NOT NULL,
    customer_count INTEGER NOT NULL DEFAULT 1,
    entry_time TIME NOT NULL,
    entry_date DATE NOT NULL,
    entry_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    entered_by INTEGER NOT NULL,
    entry_type VARCHAR(20) DEFAULT 'manual' CHECK (entry_type IN ('manual', 'qr_scan', 'automatic')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE,
    FOREIGN KEY (entered_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ride_entries_ride_id ON ride_entries(ride_id);
CREATE INDEX IF NOT EXISTS idx_ride_entries_ride_name ON ride_entries(ride_name);
CREATE INDEX IF NOT EXISTS idx_ride_entries_entry_date ON ride_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_ride_entries_entered_by ON ride_entries(entered_by);
CREATE INDEX IF NOT EXISTS idx_ride_entries_entry_type ON ride_entries(entry_type);

CREATE TRIGGER update_ride_entries_updated_at BEFORE UPDATE ON ride_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Daily Ride Summary table for aggregated data
CREATE TABLE IF NOT EXISTS daily_ride_summary (
    id SERIAL PRIMARY KEY,
    ride_id INTEGER NOT NULL,
    ride_name VARCHAR(255) NOT NULL,
    summary_date DATE NOT NULL,
    total_entries INTEGER NOT NULL DEFAULT 0,
    manual_entries INTEGER NOT NULL DEFAULT 0,
    qr_entries INTEGER NOT NULL DEFAULT 0,
    automatic_entries INTEGER NOT NULL DEFAULT 0,
    peak_hour TIME,
    peak_hour_count INTEGER DEFAULT 0,
    first_entry_time TIME,
    last_entry_time TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (ride_id, summary_date),
    FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_daily_ride_summary_ride_id ON daily_ride_summary(ride_id);
CREATE INDEX IF NOT EXISTS idx_daily_ride_summary_summary_date ON daily_ride_summary(summary_date);

CREATE TRIGGER update_daily_ride_summary_updated_at BEFORE UPDATE ON daily_ride_summary
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INSERT DEFAULT DATA
-- ============================================

-- Insert default users (passwords should be hashed in production)
INSERT INTO users (username, password, email, full_name, role, status) VALUES
('admin1', 'admin123', 'admin1@gmail.com', 'admin1', 'IT Admin', 'approved'),
('admin2', 'admin123', 'admin2@gmail.com', 'admin2', 'IT Encoder', 'approved'),
('admin3', 'admin123', 'admin3@gmail.com', 'admin3', 'Operations Manager', 'approved'),
('admin4', 'admin123', 'admin4@gmail.com', 'admin4', 'Amusement Park Personnel', 'approved')
ON CONFLICT (username) DO NOTHING;

-- Note: Rides should be added through the Manager's Ride Status interface
-- where the manager can specify the ride name and location.
-- No default rides are inserted here to avoid conflicts with user-defined rides.

-- Query to view existing rides and their locations:
-- SELECT id, name, status, location FROM rides ORDER BY name;

-- Note: Spare parts should be added through the Manager's Ride Status interface
-- or manually using the query below. Each part must have ride and ride_location
-- matching the actual rides in the rides table.
--
-- Example query to add parts for a specific ride (replace ride_name and ride_location with actual values from your database):
-- INSERT INTO spare_parts (part_name, part_number, category, quantity, unit, location, supplier, cost, status, ride, ride_location)
-- VALUES
-- ('Part Name', 'PART-001', 'Category', 10, 'pcs', 'Warehouse A', 'Supplier Name', 1000.00, 'In Stock', 'ACTUAL_RIDE_NAME', 'ACTUAL_RIDE_LOCATION');

-- Insert sample maintenance records
INSERT INTO maintenance_records (
  ride_name,
  maintenance_type,
  description,
  performed_by,
  date_performed,
  next_maintenance_date,
  status
)
VALUES
('Moon Rocket', 'Routine Inspection', 'Checked all safety systems and motor performance', 'John Smith', '2024-01-15', '2024-02-15', 'Completed'),
('Flash Dance', 'Emergency Repair', 'Replaced malfunctioning LED lights', 'Jane Doe', '2024-01-20', '2024-02-20', 'Completed'),
('Viking', 'Preventive Maintenance', 'Lubricated all swing mechanisms', 'Bob Johnson', '2024-01-25', '2024-02-25', 'Completed')
ON CONFLICT DO NOTHING;

-- Create ticket types table (if not exists)
CREATE TABLE IF NOT EXISTS ticket_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    validity_days INTEGER,
    ride_access TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ticket_types_name ON ticket_types(name);
CREATE INDEX IF NOT EXISTS idx_ticket_types_status ON ticket_types(status);

CREATE TRIGGER update_ticket_types_updated_at BEFORE UPDATE ON ticket_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create ticket sales table
CREATE TABLE IF NOT EXISTS ticket_sales (
    id SERIAL PRIMARY KEY,
    ticket_type_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    sale_date DATE NOT NULL,
    sold_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id),
    FOREIGN KEY (sold_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_sales_date ON ticket_sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_ticket_sales_type ON ticket_sales(ticket_type_id);

-- Insert default ticket types
INSERT INTO ticket_types (name, description, price, validity_days, ride_access, status) VALUES
('Day Pass', 'Access to all rides for one day', 500.00, 1, 'All rides', 'active'),
('Weekend Pass', 'Access to all rides for weekend', 800.00, 2, 'All rides', 'active'),
('Monthly Pass', 'Unlimited access for 30 days', 3000.00, 30, 'All rides', 'active'),
('VIP Pass', 'Priority access to all rides', 1000.00, 1, 'All rides + VIP areas', 'active')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- IMPORTANT: Photo Data Fix
-- ============================================
-- If photos column contains corrupted data like "[object Object]",
-- run the fix_corrupted_photos.sql migration script
-- The server also automatically fixes this on startup
-- ============================================
