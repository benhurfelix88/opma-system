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

-- Rides table
CREATE TABLE IF NOT EXISTS rides (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'operational',
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
    resolution TEXT,
    photos JSONB,
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
    approval_status VARCHAR(50) DEFAULT 'Pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_part_name ON spare_parts(part_name);
CREATE INDEX IF NOT EXISTS idx_part_category ON spare_parts(category);
CREATE INDEX IF NOT EXISTS idx_part_ride ON spare_parts(ride);

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

-- Insert default rides
INSERT INTO rides (name, status) VALUES
('Moon Rocket', 'operational'),
('Flash Dance', 'operational'),
('Viking', 'operational'),
('Caterpillar', 'operational'),
('Ferris Wheel', 'operational'),
('Balloon Wheel', 'operational'),
('Horror Cab', 'operational'),
('Freesbee', 'operational'),
('Funslides', 'operational')
ON CONFLICT (name) DO NOTHING;

-- Insert ride-specific spare parts
INSERT INTO spare_parts (part_name, part_number, category, quantity, unit, location, supplier, cost, status) VALUES
-- Moon Rocket Parts
('Rocket Motor', 'MR-M-001', 'Motor System', 2, 'pcs', 'Warehouse A', 'Motor Solutions', 4500.00, 'In Stock'),
('Launch Control Board', 'MR-LCB-002', 'Electronics', 1, 'pcs', 'Warehouse A', 'Electronics Corp', 5500.00, 'In Stock'),
('Safety Harness', 'MR-SH-003', 'Safety Equipment', 8, 'pcs', 'Warehouse A', 'Safety Systems Inc.', 4000.00, 'In Stock'),
('Sensor Set', 'MR-SS-004', 'Electronics', 6, 'pcs', 'Warehouse A', 'Sensor Solutions', 1500.00, 'In Stock'),

-- Flash Dance Parts
('Rotation Motor', 'FD-RM-001', 'Motor System', 3, 'pcs', 'Warehouse B', 'Motor Solutions', 3800.00, 'In Stock'),
('LED Lights', 'FD-LED-002', 'Lighting', 40, 'm', 'Warehouse B', 'Lighting Solutions', 500.00, 'In Stock'),
('Control Panel', 'FD-CP-003', 'Electronics', 1, 'pcs', 'Warehouse B', 'Electronics Corp', 3200.00, 'In Stock'),
('Platform Bearings', 'FD-PB-004', 'Mechanical', 12, 'pcs', 'Warehouse B', 'Bearing Masters', 1600.00, 'In Stock'),

-- Viking Parts
('Swing Motor', 'V-SM-001', 'Motor System', 2, 'pcs', 'Warehouse C', 'Motor Solutions', 4200.00, 'In Stock'),
('Safety Restraints', 'V-SR-002', 'Safety Equipment', 20, 'pcs', 'Warehouse C', 'Safety Systems Inc.', 450.00, 'In Stock'),
('Cables', 'V-C-003', 'Structural', 24, 'pcs', 'Warehouse C', 'Cable Masters', 600.00, 'In Stock'),
('Control Board', 'V-CB-004', 'Electronics', 1, 'pcs', 'Warehouse C', 'Electronics Corp', 5500.00, 'In Stock'),

-- Caterpillar Parts
('Track Motor', 'C-TM-001', 'Motor System', 4, 'pcs', 'Warehouse A', 'Motor Solutions', 800.00, 'In Stock'),
('Track Bearings', 'C-TB-002', 'Mechanical', 16, 'pcs', 'Warehouse A', 'Bearing Masters', 800.00, 'In Stock'),
('Controller', 'C-C-003', 'Electronics', 20, 'pcs', 'Warehouse A', 'Electronics Corp', 400.00, 'In Stock'),
('Wheel', 'C-W-004', 'Mechanical', 48, 'pcs', 'Warehouse A', 'Wheel Masters', 250.00, 'In Stock'),

-- Ferris Wheel Parts
('Motor Gear', 'FW-MG-001', 'Motor System', 6, 'pcs', 'Warehouse B', 'Gear Works', 1800.00, 'In Stock'),
('Cabin Door Latch', 'FW-CD-002', 'Safety Equipment', 20, 'pcs', 'Warehouse B', 'Safety Systems Inc.', 400.00, 'In Stock'),
('Structural Bolts', 'FW-SB-003', 'Structural', 100, 'pcs', 'Warehouse B', 'Fastener Supply', 200.00, 'In Stock'),
('Drive Chain', 'FW-DC-004', 'Mechanical', 8, 'pcs', 'Warehouse B', 'Chain Masters', 900.00, 'In Stock'),

-- Balloon Wheel Parts
('Balloon Motor', 'BW-BM-001', 'Motor System', 2, 'pcs', 'Warehouse C', 'Motor Solutions', 4500.00, 'In Stock'),
('Lifting Mechanism', 'BW-LM-002', 'Mechanical', 1, 'set', 'Warehouse C', 'Lift Solutions', 8000.00, 'In Stock'),
('Basket Safety Net', 'BW-BSN-003', 'Safety Equipment', 2, 'pcs', 'Warehouse C', 'Safety Systems Inc.', 1800.00, 'In Stock'),
('Control System', 'BW-CS-004', 'Electronics', 1, 'pcs', 'Warehouse C', 'Electronics Corp', 3500.00, 'In Stock'),

-- Horror Cab Parts
('Effects Controller', 'HC-EC-001', 'Electronics', 1, 'pcs', 'Warehouse A', 'Electronics Corp', 5000.00, 'In Stock'),
('Sound System', 'HC-SS-002', 'Electronics', 1, 'pcs', 'Warehouse A', 'Audio Solutions', 2800.00, 'In Stock'),
('Lighting Set', 'HC-LS-003', 'Lighting', 25, 'm', 'Warehouse A', 'Lighting Solutions', 350.00, 'In Stock'),
('Seat Mechanism', 'HC-SM-004', 'Mechanical', 16, 'pcs', 'Warehouse A', 'Mechanical Parts Co.', 700.00, 'In Stock'),

-- Freesbee Parts
('Rotation Bearings', 'FR-RB-001', 'Mechanical', 12, 'pcs', 'Warehouse B', 'Bearing Masters', 1600.00, 'In Stock'),
('Drive Belt', 'FR-DB-002', 'Mechanical', 6, 'pcs', 'Warehouse B', 'Belt Masters', 600.00, 'In Stock'),
('Control Panel', 'FR-CP-003', 'Electronics', 1, 'pcs', 'Warehouse B', 'Electronics Corp', 3200.00, 'In Stock'),
('Safety System', 'FR-SS-004', 'Safety Equipment', 8, 'pcs', 'Warehouse B', 'Safety Systems Inc.', 1200.00, 'In Stock'),

-- Funslides Parts
('Pump', 'FS-P-001', 'Pumping System', 4, 'pcs', 'Warehouse C', 'Pump Solutions', 3500.00, 'In Stock'),
('Filter', 'FS-F-002', 'Filtration', 8, 'pcs', 'Warehouse C', 'Filter Masters', 1200.00, 'In Stock'),
('Surface Sealant', 'FS-SS-003', 'Maintenance', 20, 'gal', 'Warehouse C', 'Chemical Supply', 400.00, 'In Stock'),
('Flow Meter', 'FS-FM-004', 'Electronics', 4, 'pcs', 'Warehouse C', 'Flow Solutions', 900.00, 'In Stock')
ON CONFLICT (part_name) DO NOTHING;

-- Update ride assignments for the inserted parts using part_number prefixes
UPDATE spare_parts SET ride = 'Moon Rocket' WHERE part_number LIKE 'MR-%';
UPDATE spare_parts SET ride = 'Flash Dance' WHERE part_number LIKE 'FD-%';
UPDATE spare_parts SET ride = 'Viking' WHERE part_number LIKE 'V-%';
UPDATE spare_parts SET ride = 'Caterpillar' WHERE part_number LIKE 'C-%';
UPDATE spare_parts SET ride = 'Ferris Wheel' WHERE part_number LIKE 'FW-%';
UPDATE spare_parts SET ride = 'Balloon Wheel' WHERE part_number LIKE 'BW-%';
UPDATE spare_parts SET ride = 'Horror Cab' WHERE part_number LIKE 'HC-%';
UPDATE spare_parts SET ride = 'Freesbee' WHERE part_number LIKE 'FR-%';
UPDATE spare_parts SET ride = 'Funslides' WHERE part_number LIKE 'FS-%';

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
