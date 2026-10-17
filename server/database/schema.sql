-- ARMS System Database Schema
-- Run this in phpMyAdmin or MySQL command line

CREATE DATABASE IF NOT EXISTS arms_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE arms_system;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    mobile_number VARCHAR(20),
    role ENUM('IT Admin', 'IT Encoder', 'Operations Manager', 'Amusement Park Personnel') NOT NULL,
    assigned_ride VARCHAR(255),
    profile_picture VARCHAR(500) NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_status (status)
);

-- Sessions table for authentication
CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user_id (user_id)
);

-- Rides table
CREATE TABLE IF NOT EXISTS rides (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'operational',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- Maintenance Records
CREATE TABLE IF NOT EXISTS maintenance_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ride_name VARCHAR(255) NOT NULL,
    maintenance_type VARCHAR(100),
    description TEXT,
    performed_by VARCHAR(255),
    date_performed DATE,
    next_maintenance_date DATE,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ride_name (ride_name),
    INDEX idx_status (status)
);

-- Incident Reports
CREATE TABLE IF NOT EXISTS incident_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    incident_id VARCHAR(100) UNIQUE NOT NULL,
    ride_name VARCHAR(255),
    incident_type VARCHAR(100),
    severity VARCHAR(50),
    description TEXT,
    reported_by INT NOT NULL,
    date_reported DATE,
    time_reported TIME,
    status VARCHAR(50),
    resolution TEXT,
    photos JSON,
    involved_parties JSON,
    injuries TEXT,
    property_damage TEXT,
    other_impact TEXT,
    response TEXT,
    actions_taken TEXT,
    follow_up TEXT,
    recommendations TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (reported_by) REFERENCES users(id),
    INDEX idx_incident_id (incident_id),
    INDEX idx_ride_name (ride_name),
    INDEX idx_status (status)
);

-- Spare Parts
CREATE TABLE IF NOT EXISTS spare_parts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    part_name VARCHAR(255) NOT NULL,
    part_number VARCHAR(100),
    category VARCHAR(100),
    quantity INT DEFAULT 0,
    unit VARCHAR(50),
    location VARCHAR(255),
    supplier VARCHAR(255),
    cost DECIMAL(10, 2),
    status VARCHAR(50),
    ride VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_part_name (part_name),
    INDEX idx_category (category),
    INDEX idx_ride (ride)
) ENGINE=InnoDB;

-- Ride Repairs
CREATE TABLE IF NOT EXISTS ride_repairs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ride VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    issue TEXT NOT NULL,
    parts_replaced TEXT,
    cost DECIMAL(10, 2) DEFAULT 0,
    technician VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'In Progress',
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_ride (ride),
    INDEX idx_date (date),
    INDEX idx_status (status)
);

-- Part Deployments
CREATE TABLE IF NOT EXISTS part_deployments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    place VARCHAR(255) NOT NULL,
    ride VARCHAR(255) NOT NULL,
    parts VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    status VARCHAR(50) DEFAULT 'Complete',
    encoded_by VARCHAR(255) NOT NULL,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_ride (ride),
    INDEX idx_date (date),
    INDEX idx_status (status)
);

-- Part Removals
CREATE TABLE IF NOT EXISTS part_removals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    place VARCHAR(255) NOT NULL,
    ride VARCHAR(255) NOT NULL,
    parts VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    status VARCHAR(50) DEFAULT 'Complete',
    encoded_by VARCHAR(255) NOT NULL,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_ride (ride),
    INDEX idx_date (date),
    INDEX idx_status (status)
);

-- ============================================
-- RIDE COUNTERS SYSTEM
-- ============================================

-- Ride Entries table for manual entry tracking
CREATE TABLE IF NOT EXISTS ride_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ride_id INT NOT NULL,
    ride_name VARCHAR(255) NOT NULL,
    customer_count INT NOT NULL DEFAULT 1,
    entry_time TIME NOT NULL,
    entry_date DATE NOT NULL,
    entry_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    entered_by INT NOT NULL,
    entry_type ENUM('manual', 'qr_scan', 'automatic') DEFAULT 'manual',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE,
    FOREIGN KEY (entered_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_ride_id (ride_id),
    INDEX idx_ride_name (ride_name),
    INDEX idx_entry_date (entry_date),
    INDEX idx_entered_by (entered_by),
    INDEX idx_entry_type (entry_type)
) ENGINE=InnoDB;

-- Daily Ride Summary table for aggregated data
CREATE TABLE IF NOT EXISTS daily_ride_summary (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ride_id INT NOT NULL,
    ride_name VARCHAR(255) NOT NULL,
    summary_date DATE NOT NULL,
    total_entries INT NOT NULL DEFAULT 0,
    manual_entries INT NOT NULL DEFAULT 0,
    qr_entries INT NOT NULL DEFAULT 0,
    automatic_entries INT NOT NULL DEFAULT 0,
    peak_hour TIME,
    peak_hour_count INT DEFAULT 0,
    first_entry_time TIME,
    last_entry_time TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_ride_date (ride_id, summary_date),
    FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE,
    INDEX idx_ride_id (ride_id),
    INDEX idx_summary_date (summary_date)
) ENGINE=InnoDB;

-- ============================================
-- INSERT DEFAULT DATA
-- ============================================

-- Insert default users
INSERT INTO users (username, password, email, full_name, role, status) VALUES
('admin1', 'admin123', 'admin1@gmail.com', 'admin1', 'IT Admin', 'approved'),
('admin2', 'admin123', 'admin2@gmail.com', 'admin2', 'IT Encoder', 'approved'),
('admin3', 'admin123', 'admin3@gmail.com', 'admin3', 'Operations Manager', 'approved'),
('admin4', 'admin123', 'admin4@gmail.com', 'admin4', 'Amusement Park Personnel', 'approved')
ON DUPLICATE KEY UPDATE username=username;

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
ON DUPLICATE KEY UPDATE name=name;



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
ON DUPLICATE KEY UPDATE part_name=part_name;

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
  ('Moon Rocket', 'Routine Inspection', 'Checked rocket mechanism, safety restraints, and launch system.', 'John Smith', '2025-01-05', '2025-02-05', 'Completed'),
  ('Flash Dance', 'Lubrication', 'Lubricated rotating platform and verified lighting system.', 'Mike Johnson', '2025-01-08', '2025-02-08', 'Completed'),
  ('Viking', 'Safety System Test', 'Tested swing mechanism and safety harness locks.', 'Sarah Davis', '2025-01-10', '2025-02-10', 'Completed'),
  ('Caterpillar', 'Mechanical Check', 'Inspected caterpillar track movement and drive system.', 'Tom Wilson', '2025-01-12', '2025-02-12', 'Completed'),
  ('Ferris Wheel', 'Electrical Inspection', 'Checked lighting circuits and motor control system.', 'Emily Brown', '2025-01-15', '2025-02-15', 'Completed'),
  ('Balloon Wheel', 'Structural Check', 'Verified balloon basket integrity and lifting mechanism.', 'David Lee', '2025-01-18', '2025-02-18', 'Completed'),
  ('Horror Cab', 'Effects System Check', 'Tested lighting, sound, and special effects systems.', 'John Smith', '2025-01-20', '2025-03-20', 'In Progress'),
  ('Freesbee', 'Mechanical Overhaul', 'Replaced worn bearings and checked rotation system.', 'Mike Johnson', '2025-01-22', '2025-03-22', 'Scheduled'),
  ('Funslides', 'Safety Inspection', 'Checked slide surface, water flow, and landing pool safety.', 'Sarah Davis', '2025-01-25', '2025-02-25', 'Scheduled');

-- Insert sample incident reports
INSERT INTO incident_reports (
  incident_id,
  ride_name,
  incident_type,
  severity,
  description,
  reported_by,
  date_reported,
  time_reported,
  status,
  resolution,
  photos,
  involved_parties,
  injuries,
  property_damage,
  other_impact,
  response,
  actions_taken,
  follow_up,
  recommendations
)
VALUES
  ('INC-2025-0001', 'Moon Rocket', 'Launch Delay', 'Medium', 'Rocket launch mechanism delayed due to sensor calibration.', 1, '2025-01-03', '14:25:00', 'Resolved', 'Sensor recalibrated and system tested successfully.', NULL, NULL, 'No injuries reported.', 'None', NULL, 'Operations team responded within 5 minutes and reassured guests.', 'Replaced faulty position sensor and logged additional test cycles.', 'Monitor launch system performance for 7 days.', 'Schedule additional mid-season inspection of launch mechanisms.'),
  ('INC-2025-0002', 'Flash Dance', 'Lighting Issue', 'Low', 'LED lighting system on rotating platform malfunctioned briefly.', 2, '2025-01-06', '18:10:00', 'Resolved', 'Backup lighting restored operation; ride continued safely.', NULL, NULL, 'No injuries.', 'None', NULL, 'Electrical team inspected lighting circuits.', 'Tightened loose electrical connection; updated maintenance notes.', 'Review backup lighting switchover procedure.', 'Install visual indicator for lighting anomalies in control room.'),
  ('INC-2025-0003', 'Funslides', 'Minor Injury', 'Medium', 'Guest reported minor abrasion after exiting slide landing pool.', 3, '2025-01-09', '11:45:00', 'Resolved', 'First aid administered on-site; guest returned to normal activity.', NULL, NULL, 'Minor abrasion on left arm.', 'None', NULL, 'Lifeguard responded immediately and documented incident.', 'Reviewed slide surface; no sharp edges found; increased monitoring.', 'Check slide surface again during off-hours.', 'Add additional signage reminding guests to keep arms inside slide.'),
  ('INC-2025-0004', 'Caterpillar', 'Track Stuck', 'Low', 'One caterpillar section stopped mid-ride and had to be manually reset.', 1, '2025-01-11', '16:05:00', 'Resolved', 'Track section removed from service and motor reset.', NULL, NULL, 'No injuries.', 'None', NULL, 'Attendants quickly cleared the path and informed guests.', 'Reset faulty motor and checked track alignment.', 'Monitor that section for 2 weeks before full return to fleet.', 'Consider proactive motor testing every weekend.'),
  ('INC-2025-0005', 'Viking', 'Guest Complaint', 'Low', 'Guest reported harness feeling slightly loose but still locked.', 2, '2025-01-14', '15:30:00', 'Resolved', 'Harness inspected and confirmed within manufacturer tolerance.', NULL, NULL, 'No injuries.', 'None', NULL, 'Ride was temporarily closed while checks were performed.', 'Verified all seat harnesses, documented measurements.', 'Re-brief operators on proper harness checks before dispatch.', 'Schedule additional operator training on guest communication.'),
  ('INC-2025-0006', 'Horror Cab', 'Effect Malfunction', 'Medium', 'Special effects system failed during ride sequence.', 3, '2025-01-17', '13:20:00', 'Resolved', 'Effects system repaired and tested successfully.', NULL, NULL, 'Minor disruption to ride experience.', 'None', NULL, 'Operators cleared area and documented the incident.', 'Reset effects controller and updated software.', 'Monitor effects system for further issues.', 'Evaluate effects controller for permanent software update.'),
  ('INC-2025-0007', 'Balloon Wheel', 'Weather Shutdown', 'Low', 'Ride shut down due to high winds exceeding safety threshold.', 1, '2025-01-19', '17:40:00', 'Closed', 'Ride remained closed until wind speeds returned to safe levels.', NULL, NULL, 'No injuries.', 'None', 'Reduced capacity in nearby rides due to guest redistribution.', 'Control room initiated weather protocol.', 'Logged wind speed readings and closure duration.', 'Review weather policy adherence for the week.', 'Consider installing automated wind sensor integration.'),
  ('INC-2025-0008', 'Freesbee', 'Mechanical Noise', 'Low', 'Operator reported unusual grinding noise during rotation.', 2, '2025-01-21', '10:05:00', 'Under Investigation', 'Ride taken out of service pending maintenance inspection.', NULL, NULL, 'No injuries.', 'None', NULL, 'Ride was shut down and guests re-routed to other attractions.', 'Maintenance team scheduled inspection and lubrication.', 'Document findings after inspection.', 'Add this ride to a weekly sound-check checklist.'),
  ('INC-2025-0009', 'Ferris Wheel', 'Structural Issue', 'High', 'Support structure showing signs of stress during high wind conditions.', 1, '2025-01-25', '16:30:00', 'Not Resolved', 'Initial inspection completed, engineering assessment pending.', NULL, NULL, 'No injuries reported.', 'Minor stress marks on support beams.', 'Reduced ride capacity by 50% as precaution.', 'Engineering team dispatched for detailed structural analysis.', 'Installed temporary monitoring sensors on support structure.', 'Awaiting engineering report before resuming full operations.', 'Consider retrofitting support structure for improved wind resistance.')
ON DUPLICATE KEY UPDATE incident_id = incident_id;

-- Insert sample part deployments
INSERT INTO part_deployments (
  date,
  place,
  ride,
  parts,
  quantity,
  status,
  encoded_by,
  created_by
)
VALUES
  ('2025-01-05', 'Warehouse A', 'Moon Rocket', 'Sensor Set', 4, 'Complete', 'admin1', 1),
  ('2025-01-06', 'Station 1', 'Flash Dance', 'LED Lights', 12, 'Complete', 'admin2', 2),
  ('2025-01-07', 'Garage B', 'Caterpillar', 'Wheel', 8, 'Complete', 'admin2', 2),
  ('2025-01-08', 'Maintenance Bay', 'Viking', 'Cables', 6, 'Complete', 'admin3', 3),
  ('2025-01-09', 'Tower Base', 'Ferris Wheel', 'Structural Bolts', 3, 'Complete', 'admin1', 1),
  ('2025-01-10', 'Pump Room', 'Funslides', 'Pump', 2, 'Complete', 'admin1', 1),
  ('2025-01-11', 'Ride Area', 'Horror Cab', 'Effects Controller', 1, 'Complete', 'admin3', 3),
  ('2025-01-12', 'Platform', 'Balloon Wheel', 'Basket Safety Net', 10, 'Complete', 'admin3', 3);

-- Insert sample part removals
INSERT INTO part_removals (
  date,
  place,
  ride,
  parts,
  quantity,
  status,
  encoded_by,
  created_by
)
VALUES
  ('2025-01-13', 'Warehouse A', 'Moon Rocket', 'Old Sensor Set', 4, 'Complete', 'admin1', 1),
  ('2025-01-14', 'Station 1', 'Flash Dance', 'Used LED Lights', 10, 'Complete', 'admin2', 2),
  ('2025-01-15', 'Garage B', 'Caterpillar', 'Worn Wheel', 6, 'Complete', 'admin2', 2),
  ('2025-01-16', 'Maintenance Bay', 'Viking', 'Frayed Cables', 5, 'Complete', 'admin3', 3),
  ('2025-01-17', 'Tower Base', 'Ferris Wheel', 'Worn Structural Bolts', 2, 'Complete', 'admin1', 1),
  ('2025-01-18', 'Pump Room', 'Funslides', 'Contaminated Pump', 3, 'Complete', 'admin1', 1),
  ('2025-01-19', 'Ride Area', 'Horror Cab', 'Damaged Effects Controller', 1, 'Complete', 'admin3', 3),
  ('2025-01-20', 'Platform', 'Balloon Wheel', 'Torn Basket Safety Net', 8, 'Complete', 'admin3', 3);

-- Insert sample ride repairs
INSERT INTO ride_repairs (
  ride,
  date,
  issue,
  parts_replaced,
  cost,
  technician,
  status,
  notes,
  created_by
)
VALUES
  ('Moon Rocket', '2025-01-05', 'Launch system sensor calibration issue', 'Sensor Set (4 units)', 2500.00, 'John Smith', 'Completed', 'Replaced and recalibrated sensor set, tested launch sequence successfully.', 1),
  ('Flash Dance', '2025-01-08', 'LED lighting system malfunction', 'LED Lights (12m)', 800.00, 'Mike Johnson', 'Completed', 'Replaced LED strips and fixed electrical connections.', 2),
  ('Viking', '2025-01-10', 'Swing mechanism irregular movement', 'Cables (6 units)', 1200.00, 'Sarah Davis', 'Completed', 'Replaced worn cables and tested swing motion.', 3),
  ('Caterpillar', '2025-01-12', 'Track motor overheating issue', 'Wheel (8 units)', 960.00, 'Tom Wilson', 'Completed', 'Replaced worn wheels and checked motor cooling system.', 1),
  ('Ferris Wheel', '2025-01-15', 'Structural bolt stress detected', 'Structural Bolts (3 units)', 450.00, 'Emily Brown', 'In Progress', 'Currently replacing stressed bolts and inspecting support structure.', 2),
  ('Balloon Wheel', '2025-01-18', 'Basket safety net wear and tear', 'Basket Safety Net (10 units)', 1800.00, 'David Lee', 'Completed', 'Replaced worn safety net and tested lifting mechanism.', 1),
  ('Horror Cab', '2025-01-20', 'Effects controller intermittent failure', 'Effects Controller (1 unit)', 3200.00, 'John Smith', 'Scheduled', 'Parts ordered, repair scheduled for next week.', 3),
  ('Freesbee', '2025-01-22', 'Rotation bearing noise reported', 'Rotation Bearings (12 units)', 2400.00, 'Mike Johnson', 'Pending', 'Investigating bearing wear and awaiting parts availability.', 2),
  ('Funslides', '2025-01-25', 'Water pump vibration and reduced flow', 'Pump (1 unit)', 3500.00, 'Sarah Davis', 'Completed', 'Replaced faulty pump and verified water flow system.', 1);
