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
    date_performed TIMESTAMP,
    next_maintenance_date TIMESTAMP,
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
    location VARCHAR(255),
    created_by INTEGER,
    approval_status VARCHAR(50) DEFAULT 'Pending',
    approval_date TIMESTAMP,
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
    approval_status VARCHAR(50) DEFAULT 'Pending',
    approval_date TIMESTAMP,
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
    approval_status VARCHAR(50) DEFAULT 'Pending',
    approval_date TIMESTAMP,
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

-- Insert actual rides with their locations from Manager's Ride Status
INSERT INTO rides (name, status, location) VALUES
('Balloon Wheel', 'operational', 'Langkiwa'),
('Baloon Wheel', 'operational', 'Sta.Rosa, Laguna'),
('Caterpillar', 'operational', 'Sta.Rosa'),
('Caterpillar', 'operational', 'Cavite'),
('Ferris Wheel', 'operational', 'Manila'),
('Ferris Wheel', 'operational', 'Carmona'),
('Flash Dance', 'operational', 'Calabuso'),
('Freesbee', 'operational', 'Sta.Rosa, Laguna'),
('Funslides', 'operational', 'Sta.Rosa, Laguna'),
('Gwapo Ako', 'operational', 'Manila'),
('Moon Rocket', 'operational', 'Sta.Rosa, Laguna'),
('Viking', 'operational', 'Sta.Rosa, Laguna')
ON CONFLICT (name, location) DO NOTHING;

-- Insert spare parts for each ride with their actual locations
INSERT INTO spare_parts (part_name, part_number, category, quantity, unit, location, supplier, cost, status, ride, ride_location) VALUES
-- Moon Rocket (Sta.Rosa, Laguna)
('Rocket Motor', 'MR-M-001', 'Motor System', 2, 'pcs', 'Warehouse A', 'Motor Solutions', 4500.00, 'In Stock', 'Moon Rocket', 'Sta.Rosa, Laguna'),
('Launch Control Board', 'MR-LCB-002', 'Electronics', 1, 'pcs', 'Warehouse A', 'Electronics Corp', 5500.00, 'In Stock', 'Moon Rocket', 'Sta.Rosa, Laguna'),
('Safety Harness', 'MR-SH-003', 'Safety Equipment', 8, 'pcs', 'Warehouse A', 'Safety Systems Inc.', 4000.00, 'In Stock', 'Moon Rocket', 'Sta.Rosa, Laguna'),
('Sensor Set', 'MR-SS-004', 'Electronics', 6, 'pcs', 'Warehouse A', 'Sensor Solutions', 1500.00, 'In Stock', 'Moon Rocket', 'Sta.Rosa, Laguna'),

-- Balloon Wheel (Langkiwa)
('Balloon Motor', 'BW-BM-001', 'Motor System', 2, 'pcs', 'Warehouse A', 'Motor Solutions', 4500.00, 'In Stock', 'Balloon Wheel', 'Langkiwa'),
('Lifting Mechanism', 'BW-LM-001', 'Mechanical', 1, 'set', 'Warehouse A', 'Lift Solutions', 8000.00, 'In Stock', 'Balloon Wheel', 'Langkiwa'),
('Basket Safety Net', 'BW-BSN-001', 'Safety Equipment', 2, 'pcs', 'Warehouse A', 'Safety Systems Inc.', 1800.00, 'In Stock', 'Balloon Wheel', 'Langkiwa'),
('Control System', 'BW-CS-001', 'Electronics', 1, 'pcs', 'Warehouse A', 'Electronics Corp', 3500.00, 'In Stock', 'Balloon Wheel', 'Langkiwa'),

-- Baloon Wheel (Sta.Rosa, Laguna)
('Balloon Motor', 'BW-BM-002', 'Motor System', 2, 'pcs', 'Warehouse B', 'Motor Solutions', 4500.00, 'In Stock', 'Baloon Wheel', 'Sta.Rosa, Laguna'),
('Lifting Mechanism', 'BW-LM-002', 'Mechanical', 1, 'set', 'Warehouse B', 'Lift Solutions', 8000.00, 'In Stock', 'Baloon Wheel', 'Sta.Rosa, Laguna'),
('Basket Safety Net', 'BW-BSN-002', 'Safety Equipment', 2, 'pcs', 'Warehouse B', 'Safety Systems Inc.', 1800.00, 'In Stock', 'Baloon Wheel', 'Sta.Rosa, Laguna'),
('Control System', 'BW-CS-002', 'Electronics', 1, 'pcs', 'Warehouse B', 'Electronics Corp', 3500.00, 'In Stock', 'Baloon Wheel', 'Sta.Rosa, Laguna'),

-- Caterpillar (Sta.Rosa)
('Track Motor', 'C-TM-001', 'Motor System', 4, 'pcs', 'Warehouse A', 'Motor Solutions', 800.00, 'In Stock', 'Caterpillar', 'Sta.Rosa'),
('Track Bearings', 'C-TB-001', 'Mechanical', 16, 'pcs', 'Warehouse A', 'Bearing Masters', 800.00, 'In Stock', 'Caterpillar', 'Sta.Rosa'),
('Controller', 'C-C-001', 'Electronics', 20, 'pcs', 'Warehouse A', 'Electronics Corp', 400.00, 'In Stock', 'Caterpillar', 'Sta.Rosa'),
('Wheel', 'C-W-001', 'Mechanical', 48, 'pcs', 'Warehouse A', 'Wheel Masters', 250.00, 'In Stock', 'Caterpillar', 'Sta.Rosa'),

-- Caterpillar (Cavite)
('Track Motor', 'C-TM-002', 'Motor System', 4, 'pcs', 'Warehouse B', 'Motor Solutions', 800.00, 'In Stock', 'Caterpillar', 'Cavite'),
('Track Bearings', 'C-TB-002', 'Mechanical', 16, 'pcs', 'Warehouse B', 'Bearing Masters', 800.00, 'In Stock', 'Caterpillar', 'Cavite'),
('Controller', 'C-C-002', 'Electronics', 20, 'pcs', 'Warehouse B', 'Electronics Corp', 400.00, 'In Stock', 'Caterpillar', 'Cavite'),
('Wheel', 'C-W-002', 'Mechanical', 48, 'pcs', 'Warehouse B', 'Wheel Masters', 250.00, 'In Stock', 'Caterpillar', 'Cavite'),

-- Ferris Wheel (Manila)
('Motor Gear', 'FW-MG-001', 'Motor System', 6, 'pcs', 'Warehouse A', 'Gear Works', 1800.00, 'In Stock', 'Ferris Wheel', 'Manila'),
('Cabin Door Latch', 'FW-CD-001', 'Safety Equipment', 20, 'pcs', 'Warehouse A', 'Safety Systems Inc.', 400.00, 'In Stock', 'Ferris Wheel', 'Manila'),
('Structural Bolts', 'FW-SB-001', 'Structural', 100, 'pcs', 'Warehouse A', 'Fastener Supply', 200.00, 'In Stock', 'Ferris Wheel', 'Manila'),
('Drive Chain', 'FW-DC-001', 'Mechanical', 8, 'pcs', 'Warehouse A', 'Chain Masters', 900.00, 'In Stock', 'Ferris Wheel', 'Manila'),

-- Ferris Wheel (Carmona)
('Motor Gear', 'FW-MG-002', 'Motor System', 6, 'pcs', 'Warehouse B', 'Gear Works', 1800.00, 'In Stock', 'Ferris Wheel', 'Carmona'),
('Cabin Door Latch', 'FW-CD-002', 'Safety Equipment', 20, 'pcs', 'Warehouse B', 'Safety Systems Inc.', 400.00, 'In Stock', 'Ferris Wheel', 'Carmona'),
('Structural Bolts', 'FW-SB-002', 'Structural', 100, 'pcs', 'Warehouse B', 'Fastener Supply', 200.00, 'In Stock', 'Ferris Wheel', 'Carmona'),
('Drive Chain', 'FW-DC-002', 'Mechanical', 8, 'pcs', 'Warehouse B', 'Chain Masters', 900.00, 'In Stock', 'Ferris Wheel', 'Carmona'),

-- Flash Dance (Calabuso)
('Rotation Motor', 'FD-RM-001', 'Motor System', 3, 'pcs', 'Warehouse A', 'Motor Solutions', 3800.00, 'In Stock', 'Flash Dance', 'Calabuso'),
('LED Lights', 'FD-LED-001', 'Lighting', 40, 'm', 'Warehouse A', 'Lighting Solutions', 500.00, 'In Stock', 'Flash Dance', 'Calabuso'),
('Control Panel', 'FD-CP-001', 'Electronics', 1, 'pcs', 'Warehouse A', 'Electronics Corp', 3200.00, 'In Stock', 'Flash Dance', 'Calabuso'),
('Platform Bearings', 'FD-PB-001', 'Mechanical', 12, 'pcs', 'Warehouse A', 'Bearing Masters', 1600.00, 'In Stock', 'Flash Dance', 'Calabuso'),

-- Freesbee (Sta.Rosa, Laguna)
('Rotation Bearings', 'FR-RB-001', 'Mechanical', 12, 'pcs', 'Warehouse A', 'Bearing Masters', 1600.00, 'In Stock', 'Freesbee', 'Sta.Rosa, Laguna'),
('Drive Belt', 'FR-DB-001', 'Mechanical', 6, 'pcs', 'Warehouse A', 'Belt Masters', 600.00, 'In Stock', 'Freesbee', 'Sta.Rosa, Laguna'),
('Control Panel', 'FR-CP-001', 'Electronics', 1, 'pcs', 'Warehouse A', 'Electronics Corp', 3200.00, 'In Stock', 'Freesbee', 'Sta.Rosa, Laguna'),
('Safety System', 'FR-SS-001', 'Safety Equipment', 8, 'pcs', 'Warehouse A', 'Safety Systems Inc.', 1200.00, 'In Stock', 'Freesbee', 'Sta.Rosa, Laguna'),

-- Funslides (Sta.Rosa, Laguna)
('Pump', 'FS-P-001', 'Pumping System', 4, 'pcs', 'Warehouse A', 'Pump Solutions', 3500.00, 'In Stock', 'Funslides', 'Sta.Rosa, Laguna'),
('Filter', 'FS-F-001', 'Filtration', 8, 'pcs', 'Warehouse A', 'Filter Masters', 1200.00, 'In Stock', 'Funslides', 'Sta.Rosa, Laguna'),
('Surface Sealant', 'FS-SS-001', 'Maintenance', 20, 'gal', 'Warehouse A', 'Chemical Supply', 400.00, 'In Stock', 'Funslides', 'Sta.Rosa, Laguna'),
('Flow Meter', 'FS-FM-001', 'Electronics', 4, 'pcs', 'Warehouse A', 'Flow Solutions', 900.00, 'In Stock', 'Funslides', 'Sta.Rosa, Laguna'),

-- Gwapo Ako (Manila)
('Motor', 'GA-M-001', 'Motor System', 2, 'pcs', 'Warehouse A', 'Motor Solutions', 4500.00, 'In Stock', 'Gwapo Ako', 'Manila'),
('Control Panel', 'GA-CP-001', 'Electronics', 1, 'pcs', 'Warehouse A', 'Electronics Corp', 3200.00, 'In Stock', 'Gwapo Ako', 'Manila'),
('Safety Restraints', 'GA-SR-001', 'Safety Equipment', 20, 'pcs', 'Warehouse A', 'Safety Systems Inc.', 450.00, 'In Stock', 'Gwapo Ako', 'Manila'),
('Structural Frame', 'GA-SF-001', 'Structural', 8, 'pcs', 'Warehouse A', 'Frame Masters', 2500.00, 'In Stock', 'Gwapo Ako', 'Manila'),

-- Viking (Sta.Rosa, Laguna)
('Swing Motor', 'V-SM-001', 'Motor System', 2, 'pcs', 'Warehouse A', 'Motor Solutions', 4200.00, 'In Stock', 'Viking', 'Sta.Rosa, Laguna'),
('Safety Restraints', 'V-SR-001', 'Safety Equipment', 20, 'pcs', 'Warehouse A', 'Safety Systems Inc.', 450.00, 'In Stock', 'Viking', 'Sta.Rosa, Laguna'),
('Cables', 'V-C-001', 'Structural', 24, 'pcs', 'Warehouse A', 'Cable Masters', 600.00, 'In Stock', 'Viking', 'Sta.Rosa, Laguna'),
('Control Board', 'V-CB-001', 'Electronics', 1, 'pcs', 'Warehouse A', 'Electronics Corp', 5500.00, 'In Stock', 'Viking', 'Sta.Rosa, Laguna')
ON CONFLICT (part_name, part_number) DO NOTHING;

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

-- ============================================
-- MIGRATION: Add approval columns to parts inventory tables
-- ============================================
-- Run these ALTER TABLE statements if the columns don't exist in existing databases

ALTER TABLE ride_repairs ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE ride_repairs ADD COLUMN IF NOT EXISTS approval_date TIMESTAMP;

ALTER TABLE part_deployments ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE part_deployments ADD COLUMN IF NOT EXISTS approval_date TIMESTAMP;

ALTER TABLE part_removals ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE part_removals ADD COLUMN IF NOT EXISTS approval_date TIMESTAMP;

-- ============================================
-- SAMPLE DATA: Ride Repairs
-- ============================================
INSERT INTO ride_repairs (ride, date, issue, parts_replaced, cost, technician, status, notes, location, approval_status) VALUES
('Moon Rocket', '2026-01-15', 'Hydraulic system malfunction', 'Hydraulic pump, seals', 15000.00, 'John Doe', 'Completed', 'Replaced main hydraulic pump', 'Mandaluyong Area', 'Approved'),
('Flash Dance', '2026-01-16', 'Electrical wiring issue', 'Wiring harness, fuses', 5000.00, 'Jane Smith', 'In Progress', 'Rewiring control panel', 'Sta. Rosa Laguna Area', 'Pending'),
('Viking', '2026-01-17', 'Safety belt replacement', 'Safety belts, buckles', 8000.00, 'Mike Johnson', 'Completed', 'Updated all safety belts', 'Tarlac Area', 'Approved'),
('Caterpillar', '2026-01-18', 'Engine overheating', 'Coolant system, radiator', 12000.00, 'Sarah Williams', 'Pending', 'Needs further diagnosis', 'Mandaluyong Area', 'Pending'),
('Ferris Wheel', '2026-01-19', 'Lighting system failure', 'LED lights, controller', 3000.00, 'Tom Brown', 'Completed', 'Replaced LED strips', 'Sta. Rosa Laguna Area', 'Approved'),
('Balloon Wheel', '2026-01-20', 'Motor replacement', 'Electric motor, bearings', 20000.00, 'Emily Davis', 'In Progress', 'Installing new motor', 'Tarlac Area', 'Pending'),
('Horror Cab', '2026-01-21', 'Sound system repair', 'Speakers, amplifier', 4000.00, 'Chris Wilson', 'Completed', 'Upgraded audio system', 'Mandaluyong Area', 'Approved'),
('Freesbee', '2026-01-22', 'Structural crack', 'Steel plates, welding', 10000.00, 'Amanda Miller', 'Pending', 'Reinforcement needed', 'Sta. Rosa Laguna Area', 'Pending'),
('Funslides', '2026-01-23', 'Water pump failure', 'Water pump, hoses', 6000.00, 'David Garcia', 'Completed', 'Replaced pump assembly', 'Tarlac Area', 'Approved'),
('Moon Rocket', '2026-01-24', 'Control panel issue', 'Circuit board, buttons', 7000.00, 'Lisa Anderson', 'In Progress', 'Troubleshooting electronics', 'Mandaluyong Area', 'Pending')
ON CONFLICT DO NOTHING;

-- ============================================
-- SAMPLE DATA: Part Deployments
-- ============================================
INSERT INTO part_deployments (date, place, ride, status, missing_parts, encoded_by, approval_status) VALUES
('2026-01-15', 'Mandaluyong Area', 'Moon Rocket', 'Complete', '', 'John Doe', 'Approved'),
('2026-01-16', 'Sta. Rosa Laguna Area', 'Flash Dance', 'Complete', '', 'Jane Smith', 'Approved'),
('2026-01-17', 'Tarlac Area', 'Viking', 'Complete', '', 'Mike Johnson', 'Approved'),
('2026-01-18', 'Mandaluyong Area', 'Caterpillar', 'With missing parts', 'Safety belts', 'Sarah Williams', 'Pending'),
('2026-01-19', 'Sta. Rosa Laguna Area', 'Ferris Wheel', 'Complete', '', 'Tom Brown', 'Approved'),
('2026-01-20', 'Tarlac Area', 'Balloon Wheel', 'Complete', '', 'Emily Davis', 'Approved'),
('2026-01-21', 'Mandaluyong Area', 'Horror Cab', 'With missing parts', 'Audio cables', 'Chris Wilson', 'Pending'),
('2026-01-22', 'Sta. Rosa Laguna Area', 'Freesbee', 'Complete', '', 'Amanda Miller', 'Approved'),
('2026-01-23', 'Tarlac Area', 'Funslides', 'Complete', '', 'David Garcia', 'Approved'),
('2026-01-24', 'Mandaluyong Area', 'Moon Rocket', 'With missing parts', 'Control switches', 'Lisa Anderson', 'Pending')
ON CONFLICT DO NOTHING;

-- ============================================
-- SAMPLE DATA: Part Removals
-- ============================================
INSERT INTO part_removals (date, place, ride, status, missing_parts, encoded_by, approval_status) VALUES
('2026-01-15', 'Mandaluyong Area', 'Moon Rocket', 'Complete', '', 'John Doe', 'Approved'),
('2026-01-16', 'Sta. Rosa Laguna Area', 'Flash Dance', 'Complete', '', 'Jane Smith', 'Approved'),
('2026-01-17', 'Tarlac Area', 'Viking', 'Complete', '', 'Mike Johnson', 'Approved'),
('2026-01-18', 'Mandaluyong Area', 'Caterpillar', 'With missing parts', 'Old parts', 'Sarah Williams', 'Pending'),
('2026-01-19', 'Sta. Rosa Laguna Area', 'Ferris Wheel', 'Complete', '', 'Tom Brown', 'Approved'),
('2026-01-20', 'Tarlac Area', 'Balloon Wheel', 'Complete', '', 'Emily Davis', 'Approved'),
('2026-01-21', 'Mandaluyong Area', 'Horror Cab', 'With missing parts', 'Removed components', 'Chris Wilson', 'Pending'),
('2026-01-22', 'Sta. Rosa Laguna Area', 'Freesbee', 'Complete', '', 'Amanda Miller', 'Approved'),
('2026-01-23', 'Tarlac Area', 'Funslides', 'Complete', '', 'David Garcia', 'Approved'),
('2026-01-24', 'Mandaluyong Area', 'Moon Rocket', 'With missing parts', 'Motor parts', 'Lisa Anderson', 'Pending')
ON CONFLICT DO NOTHING;
