-- ============================================
-- RIDE COUNTERS DATABASE SETUP GUIDE
-- ============================================
-- Run these queries in your MySQL database (phpMyAdmin or MySQL CLI)
-- to set up the ride counters system with proper database integration.

-- Step 1: Create the ride_entries table
-- This table stores individual ride entry records (manual entries, QR scans, etc.)
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

-- Step 2: Create the daily_ride_summary table
-- This table stores aggregated daily statistics for each ride
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

-- Step 3: Create a trigger to automatically update daily summaries
-- This trigger runs after every ride entry insertion/updates
DELIMITER //
CREATE TRIGGER update_daily_ride_summary 
AFTER INSERT ON ride_entries
FOR EACH ROW
BEGIN
    INSERT INTO daily_ride_summary 
        (ride_id, ride_name, summary_date, total_entries, manual_entries, qr_entries, automatic_entries, first_entry_time, last_entry_time)
    VALUES 
        (NEW.ride_id, NEW.ride_name, NEW.entry_date, NEW.customer_count, 
         CASE WHEN NEW.entry_type = 'manual' THEN NEW.customer_count ELSE 0 END,
         CASE WHEN NEW.entry_type = 'qr_scan' THEN NEW.customer_count ELSE 0 END,
         CASE WHEN NEW.entry_type = 'automatic' THEN NEW.customer_count ELSE 0 END,
         NEW.entry_time, NEW.entry_time)
    ON DUPLICATE KEY UPDATE
        total_entries = total_entries + NEW.customer_count,
        manual_entries = manual_entries + CASE WHEN NEW.entry_type = 'manual' THEN NEW.customer_count ELSE 0 END,
        qr_entries = qr_entries + CASE WHEN NEW.entry_type = 'qr_scan' THEN NEW.customer_count ELSE 0 END,
        automatic_entries = automatic_entries + CASE WHEN NEW.entry_type = 'automatic' THEN NEW.customer_count ELSE 0 END,
        first_entry_time = LEAST(first_entry_time, NEW.entry_time),
        last_entry_time = GREATEST(last_entry_time, NEW.entry_time),
        updated_at = CURRENT_TIMESTAMP;
END//
DELIMITER ;

-- Step 4: Create a trigger for entry updates
DELIMITER //
CREATE TRIGGER update_daily_ride_summary_on_update
AFTER UPDATE ON ride_entries
FOR EACH ROW
BEGIN
    -- Remove old entry count
    INSERT INTO daily_ride_summary 
        (ride_id, ride_name, summary_date, total_entries, manual_entries, qr_entries, automatic_entries)
    VALUES 
        (OLD.ride_id, OLD.ride_name, OLD.entry_date, -OLD.customer_count, 
         CASE WHEN OLD.entry_type = 'manual' THEN -OLD.customer_count ELSE 0 END,
         CASE WHEN OLD.entry_type = 'qr_scan' THEN -OLD.customer_count ELSE 0 END,
         CASE WHEN OLD.entry_type = 'automatic' THEN -OLD.customer_count ELSE 0 END)
    ON DUPLICATE KEY UPDATE
        total_entries = total_entries - OLD.customer_count,
        manual_entries = manual_entries - CASE WHEN OLD.entry_type = 'manual' THEN OLD.customer_count ELSE 0 END,
        qr_entries = qr_entries - CASE WHEN OLD.entry_type = 'qr_scan' THEN OLD.customer_count ELSE 0 END,
        automatic_entries = automatic_entries - CASE WHEN OLD.entry_type = 'automatic' THEN OLD.customer_count ELSE 0 END,
        updated_at = CURRENT_TIMESTAMP;
    
    -- Add new entry count
    INSERT INTO daily_ride_summary 
        (ride_id, ride_name, summary_date, total_entries, manual_entries, qr_entries, automatic_entries, first_entry_time, last_entry_time)
    VALUES 
        (NEW.ride_id, NEW.ride_name, NEW.entry_date, NEW.customer_count, 
         CASE WHEN NEW.entry_type = 'manual' THEN NEW.customer_count ELSE 0 END,
         CASE WHEN NEW.entry_type = 'qr_scan' THEN NEW.customer_count ELSE 0 END,
         CASE WHEN NEW.entry_type = 'automatic' THEN NEW.customer_count ELSE 0 END,
         NEW.entry_time, NEW.entry_time)
    ON DUPLICATE KEY UPDATE
        total_entries = total_entries + NEW.customer_count,
        manual_entries = manual_entries + CASE WHEN NEW.entry_type = 'manual' THEN NEW.customer_count ELSE 0 END,
        qr_entries = qr_entries + CASE WHEN NEW.entry_type = 'qr_scan' THEN NEW.customer_count ELSE 0 END,
        automatic_entries = automatic_entries + CASE WHEN NEW.entry_type = 'automatic' THEN NEW.customer_count ELSE 0 END,
        first_entry_time = LEAST(first_entry_time, NEW.entry_time),
        last_entry_time = GREATEST(last_entry_time, NEW.entry_time),
        updated_at = CURRENT_TIMESTAMP;
END//
DELIMITER ;

-- Step 5: Create a trigger for entry deletions
DELIMITER //
CREATE TRIGGER update_daily_ride_summary_on_delete
AFTER DELETE ON ride_entries
FOR EACH ROW
BEGIN
    INSERT INTO daily_ride_summary 
        (ride_id, ride_name, summary_date, total_entries, manual_entries, qr_entries, automatic_entries)
    VALUES 
        (OLD.ride_id, OLD.ride_name, OLD.entry_date, -OLD.customer_count, 
         CASE WHEN OLD.entry_type = 'manual' THEN -OLD.customer_count ELSE 0 END,
         CASE WHEN OLD.entry_type = 'qr_scan' THEN -OLD.customer_count ELSE 0 END,
         CASE WHEN OLD.entry_type = 'automatic' THEN -OLD.customer_count ELSE 0 END)
    ON DUPLICATE KEY UPDATE
        total_entries = total_entries - OLD.customer_count,
        manual_entries = manual_entries - CASE WHEN OLD.entry_type = 'manual' THEN OLD.customer_count ELSE 0 END,
        qr_entries = qr_entries - CASE WHEN OLD.entry_type = 'qr_scan' THEN OLD.customer_count ELSE 0 END,
        automatic_entries = automatic_entries - CASE WHEN OLD.entry_type = 'automatic' THEN OLD.customer_count ELSE 0 END,
        updated_at = CURRENT_TIMESTAMP;
END//
DELIMITER ;

-- Step 6: Create sample data for testing
INSERT INTO ride_entries (ride_id, ride_name, customer_count, entry_time, entry_date, entered_by, entry_type, notes) VALUES
-- Roller Coaster entries
(1, 'Roller Coaster', 5, '09:15:00', CURDATE(), 4, 'manual', 'Morning rush'),
(1, 'Roller Coaster', 8, '10:30:00', CURDATE(), 4, 'manual', 'Peak hour'),
(1, 'Roller Coaster', 6, '14:20:00', CURDATE(), 4, 'manual', 'Afternoon'),
(1, 'Roller Coaster', 12, '16:45:00', CURDATE(), 4, 'manual', 'Evening rush'),

-- Ferris Wheel entries
(2, 'Ferris Wheel', 4, '09:30:00', CURDATE(), 4, 'manual', 'Family ride'),
(2, 'Ferris Wheel', 6, '11:15:00', CURDATE(), 4, 'manual', 'Weekend crowd'),
(2, 'Ferris Wheel', 3, '15:00:00', CURDATE(), 4, 'manual', 'Slow period'),
(2, 'Ferris Wheel', 8, '17:30:00', CURDATE(), 4, 'manual', 'Sunset ride'),

-- Carousel entries
(3, 'Carousel', 12, '10:00:00', CURDATE(), 4, 'manual', 'Kids morning session'),
(3, 'Carousel', 15, '13:30:00', CURDATE(), 4, 'manual', 'Afternoon kids'),
(3, 'Carousel', 18, '16:00:00', CURDATE(), 4, 'manual', 'Evening session'),

-- Bumper Cars entries
(4, 'Bumper Cars', 8, '11:00:00', CURDATE(), 4, 'manual', 'Teen group'),
(4, 'Bumper Cars', 10, '14:30:00', CURDATE(), 4, 'manual', 'Afternoon fun'),
(4, 'Bumper Cars', 12, '17:00:00', CURDATE(), 4, 'manual', 'Evening excitement'),

-- Drop Tower entries
(5, 'Drop Tower', 6, '09:45:00', CURDATE(), 4, 'manual', 'Thrill seekers'),
(5, 'Drop Tower', 4, '13:15:00', CURDATE(), 4, 'manual', 'Afternoon drop'),
(5, 'Drop Tower', 8, '16:30:00', CURDATE(), 4, 'manual', 'Evening thrill'),

-- Water Slide entries
(6, 'Water Slide', 10, '10:15:00', CURDATE(), 4, 'manual', 'Water fun'),
(6, 'Water Slide', 14, '12:30:00', CURDATE(), 4, 'manual', 'Peak water time'),
(6, 'Water Slide', 12, '15:45:00', CURDATE(), 4, 'manual', 'Afternoon splash'),

-- Merry-Go-Round entries
(7, 'Merry-Go-Round', 8, '09:00:00', CURDATE(), 4, 'manual', 'Classic start'),
(7, 'Merry-Go-Round', 10, '12:00:00', CURDATE(), 4, 'manual', 'Noon ride'),
(7, 'Merry-Go-Round', 6, '15:30:00', CURDATE(), 4, 'manual', 'Gentle afternoon'),

-- Swing Ride entries
(8, 'Swing Ride', 7, '10:45:00', CURDATE(), 4, 'manual', 'Morning swing'),
(8, 'Swing Ride', 9, '14:00:00', CURDATE(), 4, 'manual', 'Afternoon breeze'),
(8, 'Swing Ride', 11, '17:15:00', CURDATE(), 4, 'manual', 'Evening flight');

-- Step 7: Verify the setup
-- Check if tables were created successfully
SHOW TABLES LIKE 'ride_entries';
SHOW TABLES LIKE 'daily_ride_summary';

-- Check sample data
SELECT COUNT(*) as total_entries FROM ride_entries;
SELECT COUNT(*) as total_summaries FROM daily_ride_summary;

-- View sample entries
SELECT * FROM ride_entries LIMIT 5;
SELECT * FROM daily_ride_summary LIMIT 5;

-- ============================================
-- BACKEND API ENDPOINTS NEEDED
-- ============================================
-- Your backend needs these API endpoints to support the ride counters:

-- GET /api/ride-entries
-- GET /api/ride-entries/ride/:rideId
-- GET /api/ride-entries/user/:userId
-- GET /api/ride-entries/summary
-- GET /api/ride-entries/stats
-- POST /api/ride-entries
-- PUT /api/ride-entries/:id
-- DELETE /api/ride-entries/:id
-- POST /api/ride-entries/bulk

-- ============================================
-- SETUP INSTRUCTIONS
-- ============================================
-- 1. Run this SQL file in your MySQL database
-- 2. Update your backend to include the API endpoints listed above
-- 3. The frontend components are already updated to use the database
-- 4. Test the PersonnelRideCounters component to ensure it works with the database

-- ============================================
-- TROUBLESHOOTING
-- ============================================
-- If you encounter issues:
-- 1. Make sure the rides table exists and has data
-- 2. Make sure the users table exists and user ID 4 exists (Personnel role)
-- 3. Check that foreign key constraints are properly set
-- 4. Verify the triggers are created: SHOW TRIGGERS;
-- 5. Check API endpoints are working in your backend
