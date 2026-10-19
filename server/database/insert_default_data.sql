-- Insert default data (no ON CONFLICT clauses)
-- Note: Users and rides may already exist - skip if duplicate errors occur

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
('Funslides', 'operational');

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
('Flow Meter', 'FS-FM-004', 'Electronics', 4, 'pcs', 'Warehouse C', 'Flow Solutions', 900.00, 'In Stock');

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
('Viking', 'Preventive Maintenance', 'Lubricated all swing mechanisms', 'Bob Johnson', '2024-01-25', '2024-02-25', 'Completed');
