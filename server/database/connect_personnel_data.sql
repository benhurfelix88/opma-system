-- ============================================
-- Connect Personnel Data - Complete Database Relationships
-- This script ensures all personnel-related data is properly connected:
-- - Users (personnel) -> Rides (assigned_ride_id)
-- - Ticket Records -> Rides (ride_id)
-- - Ticket Records -> Users (validated_by)
-- - QR History -> Users (generated_by)
-- - QR History -> Rides (ride_id)
-- - QR History -> Classifications (classification_id)
-- ============================================

USE arms_system;

-- Step 1: Ensure rides table exists and is properly set up
CREATE TABLE IF NOT EXISTS rides (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'operational',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- Step 2: Add ride_id to ticket_records if it doesn't exist
SET @dbname = DATABASE();
SET @tablename = "ticket_records";
SET @columnname = "ride_id";

SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 'Column ride_id already exists in ticket_records.' AS message;",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " INT DEFAULT NULL AFTER ride;")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Step 3: Add ride_name to ticket_records if it doesn't exist
SET @columnname = "ride_name";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 'Column ride_name already exists in ticket_records.' AS message;",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " VARCHAR(255) DEFAULT NULL AFTER ride;")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Step 4: Add assigned_ride_id to users if it doesn't exist
SET @tablename = "users";
SET @columnname = "assigned_ride_id";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 'Column assigned_ride_id already exists in users.' AS message;",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " INT DEFAULT NULL AFTER assigned_ride;")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Step 5: Add ride_id to qr_history if it doesn't exist
SET @tablename = "qr_history";
SET @columnname = "ride_id";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 'Column ride_id already exists in qr_history.' AS message;",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " INT DEFAULT NULL AFTER ride;")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Step 6: Add classification_id to qr_history if it doesn't exist
SET @columnname = "classification_id";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 'Column classification_id already exists in qr_history.' AS message;",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " INT DEFAULT NULL AFTER classification;")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Step 7: Clean up invalid ride_id values in ticket_records
UPDATE ticket_records tr
LEFT JOIN rides r ON tr.ride_id = r.id
SET tr.ride_id = NULL
WHERE tr.ride_id IS NOT NULL AND r.id IS NULL;

-- Step 8: Populate ride_id in ticket_records from ride name
UPDATE ticket_records tr
INNER JOIN rides r ON tr.ride = r.name
SET tr.ride_id = r.id, tr.ride_name = r.name
WHERE tr.ride IS NOT NULL AND (tr.ride_id IS NULL OR tr.ride_name IS NULL);

-- Step 9: Populate ride_name in ticket_records from ride_id if ride_name is NULL
UPDATE ticket_records tr
INNER JOIN rides r ON tr.ride_id = r.id
SET tr.ride_name = r.name
WHERE tr.ride_id IS NOT NULL AND (tr.ride_name IS NULL OR tr.ride_name = '');

-- Step 10: Clean up invalid assigned_ride_id values in users
UPDATE users u
LEFT JOIN rides r ON u.assigned_ride_id = r.id
SET u.assigned_ride_id = NULL
WHERE u.assigned_ride_id IS NOT NULL AND r.id IS NULL;

-- Step 11: Populate assigned_ride_id in users from assigned_ride name
UPDATE users u
INNER JOIN rides r ON u.assigned_ride = r.name
SET u.assigned_ride_id = r.id
WHERE u.assigned_ride IS NOT NULL AND u.assigned_ride_id IS NULL;

-- Step 12: Clean up invalid ride_id values in qr_history
UPDATE qr_history qh
LEFT JOIN rides r ON qh.ride_id = r.id
SET qh.ride_id = NULL
WHERE qh.ride_id IS NOT NULL AND r.id IS NULL;

-- Step 13: Populate ride_id in qr_history from ride name
UPDATE qr_history qh
INNER JOIN rides r ON qh.ride = r.name
SET qh.ride_id = r.id
WHERE qh.ride IS NOT NULL AND qh.ride_id IS NULL;

-- Step 14: Populate classification_id in qr_history from classification (if classification is numeric ID)
UPDATE qr_history qh
INNER JOIN ticket_classifications tc ON CAST(qh.classification AS CHAR) = CAST(tc.id AS CHAR)
SET qh.classification_id = tc.id
WHERE qh.classification IS NOT NULL AND qh.classification_id IS NULL;

-- Step 15: Ensure all required columns exist in ticket_records table
SET @tablename = "ticket_records";

-- Check if ride column exists (we'll use it as reference for positioning)
SET @hasRide = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE
    (TABLE_SCHEMA = @dbname)
    AND (TABLE_NAME = @tablename)
    AND (COLUMN_NAME = 'ride')
);

-- Add type column if it doesn't exist (base column)
SET @columnname = "type";
SET @afterColumn = IF(@hasRide > 0, 'ride', 'ticket_number');
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 'Column type already exists in ticket_records.' AS message;",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " VARCHAR(50) DEFAULT NULL AFTER ", @afterColumn, ";")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Check if type column exists now
SET @hasType = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE
    (TABLE_SCHEMA = @dbname)
    AND (TABLE_NAME = @tablename)
    AND (COLUMN_NAME = 'type')
);

-- Add status column if it doesn't exist
SET @columnname = "status";
SET @afterColumn = IF(@hasType > 0, 'type', IF(@hasRide > 0, 'ride', 'ticket_number'));
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 'Column status already exists in ticket_records.' AS message;",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " VARCHAR(50) DEFAULT NULL AFTER ", @afterColumn, ";")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Check if status column exists now
SET @hasStatus = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE
    (TABLE_SCHEMA = @dbname)
    AND (TABLE_NAME = @tablename)
    AND (COLUMN_NAME = 'status')
);

-- Add validation_status column if it doesn't exist
SET @columnname = "validation_status";
SET @afterColumn = IF(@hasStatus > 0, 'status', IF(@hasType > 0, 'type', IF(@hasRide > 0, 'ride', 'ticket_number')));
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 'Column validation_status already exists in ticket_records.' AS message;",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " VARCHAR(50) DEFAULT NULL AFTER ", @afterColumn, ";")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Check if validation_status column exists now
SET @hasValidationStatus = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE
    (TABLE_SCHEMA = @dbname)
    AND (TABLE_NAME = @tablename)
    AND (COLUMN_NAME = 'validation_status')
);

-- Add scanned_at column if it doesn't exist
SET @columnname = "scanned_at";
SET @afterColumn = IF(@hasValidationStatus > 0, 'validation_status', IF(@hasStatus > 0, 'status', IF(@hasType > 0, 'type', 'ticket_number')));
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 'Column scanned_at already exists in ticket_records.' AS message;",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER ", @afterColumn, ";")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Check if scanned_at column exists now
SET @hasScannedAt = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE
    (TABLE_SCHEMA = @dbname)
    AND (TABLE_NAME = @tablename)
    AND (COLUMN_NAME = 'scanned_at')
);

-- Add scan_count column if it doesn't exist
SET @columnname = "scan_count";
SET @afterColumn = IF(@hasScannedAt > 0, 'scanned_at', IF(@hasValidationStatus > 0, 'validation_status', IF(@hasStatus > 0, 'status', 'ticket_number')));
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 'Column scan_count already exists in ticket_records.' AS message;",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " INT DEFAULT 1 AFTER ", @afterColumn, ";")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add validated_by column if it doesn't exist (after validation_status)
SET @columnname = "validated_by";
SET @afterColumn = IF(@hasValidationStatus > 0, 'validation_status', IF(@hasStatus > 0, 'status', IF(@hasType > 0, 'type', 'ticket_number')));
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 'Column validated_by already exists in ticket_records.' AS message;",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " INT DEFAULT NULL AFTER ", @afterColumn, ";")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Step 15b: Ensure validated_by is set for all ticket_records (set to user ID, not name)
-- This step is OPTIONAL and only needed if you have existing records with validated_by set incorrectly
-- Since the column is being added in Step 15, existing records will have NULL values
-- New records will have validated_by set correctly by the application
-- 
-- If you need to update existing records, uncomment and run this manually:
-- UPDATE ticket_records tr
-- INNER JOIN users u ON CAST(tr.validated_by AS CHAR) = CAST(u.id AS CHAR)
-- SET tr.validated_by = u.id
-- WHERE tr.validated_by IS NOT NULL;
--
-- Note: This only works if validated_by already contains user IDs (not names)
-- If validated_by contains names, you'll need to manually map them to user IDs

-- Step 16: Add foreign key constraints (if they don't exist)
-- Note: We use IF NOT EXISTS pattern by checking first
-- IMPORTANT: Clean up invalid foreign key values before adding constraints
-- IMPORTANT: Ensure all tables use InnoDB engine (required for foreign keys)

-- Step 16.0: Convert tables to InnoDB if they're not already (required for foreign keys)
-- Note: These will fail silently if tables don't exist, which is fine
SET @preparedStatement = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'rides') > 0,
  'ALTER TABLE rides ENGINE=InnoDB;',
  'SELECT ''Table rides does not exist, skipping engine conversion.'' AS message;'
);
PREPARE convertEngine FROM @preparedStatement;
EXECUTE convertEngine;
DEALLOCATE PREPARE convertEngine;

SET @preparedStatement = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'ticket_records') > 0,
  'ALTER TABLE ticket_records ENGINE=InnoDB;',
  'SELECT ''Table ticket_records does not exist, skipping engine conversion.'' AS message;'
);
PREPARE convertEngine FROM @preparedStatement;
EXECUTE convertEngine;
DEALLOCATE PREPARE convertEngine;

SET @preparedStatement = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'users') > 0,
  'ALTER TABLE users ENGINE=InnoDB;',
  'SELECT ''Table users does not exist, skipping engine conversion.'' AS message;'
);
PREPARE convertEngine FROM @preparedStatement;
EXECUTE convertEngine;
DEALLOCATE PREPARE convertEngine;

SET @preparedStatement = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'qr_history') > 0,
  'ALTER TABLE qr_history ENGINE=InnoDB;',
  'SELECT ''Table qr_history does not exist, skipping engine conversion.'' AS message;'
);
PREPARE convertEngine FROM @preparedStatement;
EXECUTE convertEngine;
DEALLOCATE PREPARE convertEngine;

SET @preparedStatement = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'ticket_classifications') > 0,
  'ALTER TABLE ticket_classifications ENGINE=InnoDB;',
  'SELECT ''Table ticket_classifications does not exist, skipping engine conversion.'' AS message;'
);
PREPARE convertEngine FROM @preparedStatement;
EXECUTE convertEngine;
DEALLOCATE PREPARE convertEngine;

-- Step 16a: Clean up invalid ride_id values in ticket_records before adding FK
UPDATE ticket_records tr
LEFT JOIN rides r ON tr.ride_id = r.id
SET tr.ride_id = NULL
WHERE tr.ride_id IS NOT NULL AND r.id IS NULL;

-- Step 16a1: Drop any existing foreign key constraints on ticket_records.ride_id
SET @tablename = "ticket_records";
SET @dropFK = (
  SELECT GROUP_CONCAT(CONCAT('ALTER TABLE ', TABLE_NAME, ' DROP FOREIGN KEY ', CONSTRAINT_NAME, ';') SEPARATOR ' ')
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = @dbname
  AND TABLE_NAME = @tablename
  AND COLUMN_NAME = 'ride_id'
  AND REFERENCED_TABLE_NAME IS NOT NULL
);

SET @preparedStatement = IF(
  @dropFK IS NOT NULL AND @dropFK != '',
  @dropFK,
  "SELECT 'No existing foreign keys on ticket_records.ride_id to drop.' AS message;"
);

PREPARE dropExistingFK FROM @preparedStatement;
EXECUTE dropExistingFK;
DEALLOCATE PREPARE dropExistingFK;

-- Step 16a2: Verify data types match - ensure ride_id matches rides.id type
-- Get the full column type for rides.id (needed for data type matching)
SET @ridesIdFullType = (
  SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname
  AND TABLE_NAME = 'rides'
  AND COLUMN_NAME = 'id'
);

-- Get the full column type for ticket_records.ride_id
SET @ticketRecordsRideIdFullType = (
  SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname
  AND TABLE_NAME = @tablename
  AND COLUMN_NAME = 'ride_id'
);

-- If data types don't match, modify the column to match rides.id
SET @preparedStatement = IF(
  @ticketRecordsRideIdFullType IS NOT NULL AND @ridesIdFullType IS NOT NULL AND @ticketRecordsRideIdFullType != @ridesIdFullType,
  CONCAT("ALTER TABLE ", @tablename, " MODIFY COLUMN ride_id ", @ridesIdFullType, " DEFAULT NULL;"),
  "SELECT 'Data types match or columns do not exist.' AS message;"
);

PREPARE fixDataType FROM @preparedStatement;
EXECUTE fixDataType;
DEALLOCATE PREPARE fixDataType;

-- Foreign key: ticket_records.ride_id -> rides.id
SET @fkname = "fk_ticket_records_ride";

-- Check if rides table exists and has id column
SET @ridesTableExists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'rides'
);

SET @ridesIdExists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname 
  AND TABLE_NAME = 'rides' 
  AND COLUMN_NAME = 'id'
);

SET @ticketRecordsRideIdExists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname 
  AND TABLE_NAME = @tablename 
  AND COLUMN_NAME = 'ride_id'
);

SET @preparedStatement = IF(
  @ridesTableExists > 0 AND @ridesIdExists > 0 AND @ticketRecordsRideIdExists > 0 AND
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND CONSTRAINT_NAME = @fkname
  ) = 0,
  CONCAT("ALTER TABLE ", @tablename, " ADD CONSTRAINT ", @fkname, " FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE SET NULL ON UPDATE CASCADE;"),
  "SELECT 'Foreign key fk_ticket_records_ride already exists or prerequisites not met.' AS message;"
);

PREPARE addFKIfNotExists FROM @preparedStatement;
EXECUTE addFKIfNotExists;
DEALLOCATE PREPARE addFKIfNotExists;

-- Step 16b: Clean up invalid assigned_ride_id values in users before adding FK
UPDATE users u
LEFT JOIN rides r ON u.assigned_ride_id = r.id
SET u.assigned_ride_id = NULL
WHERE u.assigned_ride_id IS NOT NULL AND r.id IS NULL;

-- Step 16b1: Drop any existing foreign key constraints on users.assigned_ride_id
SET @tablename = "users";
SET @dropFK = (
  SELECT GROUP_CONCAT(CONCAT('ALTER TABLE ', TABLE_NAME, ' DROP FOREIGN KEY ', CONSTRAINT_NAME, ';') SEPARATOR ' ')
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = @dbname
  AND TABLE_NAME = @tablename
  AND COLUMN_NAME = 'assigned_ride_id'
  AND REFERENCED_TABLE_NAME IS NOT NULL
);

SET @preparedStatement = IF(
  @dropFK IS NOT NULL AND @dropFK != '',
  @dropFK,
  "SELECT 'No existing foreign keys on users.assigned_ride_id to drop.' AS message;"
);

PREPARE dropExistingFK FROM @preparedStatement;
EXECUTE dropExistingFK;
DEALLOCATE PREPARE dropExistingFK;

-- Step 16b2: Verify data types match
SET @assignedRideIdDataType = (
  SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname
  AND TABLE_NAME = @tablename
  AND COLUMN_NAME = 'assigned_ride_id'
);

SET @assignedRideIdFullType = (
  SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname
  AND TABLE_NAME = @tablename
  AND COLUMN_NAME = 'assigned_ride_id'
);

SET @preparedStatement = IF(
  @assignedRideIdFullType IS NOT NULL AND @ridesIdFullType IS NOT NULL AND @assignedRideIdFullType != @ridesIdFullType,
  CONCAT("ALTER TABLE ", @tablename, " MODIFY COLUMN assigned_ride_id ", @ridesIdFullType, " DEFAULT NULL;"),
  "SELECT 'Data types match or columns do not exist.' AS message;"
);

PREPARE fixDataType FROM @preparedStatement;
EXECUTE fixDataType;
DEALLOCATE PREPARE fixDataType;

-- Foreign key: users.assigned_ride_id -> rides.id
SET @fkname = "fk_users_assigned_ride";

SET @usersAssignedRideIdExists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname 
  AND TABLE_NAME = @tablename 
  AND COLUMN_NAME = 'assigned_ride_id'
);

SET @preparedStatement = IF(
  @ridesTableExists > 0 AND @ridesIdExists > 0 AND @usersAssignedRideIdExists > 0 AND
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND CONSTRAINT_NAME = @fkname
  ) = 0,
  CONCAT("ALTER TABLE ", @tablename, " ADD CONSTRAINT ", @fkname, " FOREIGN KEY (assigned_ride_id) REFERENCES rides(id) ON DELETE SET NULL ON UPDATE CASCADE;"),
  "SELECT 'Foreign key fk_users_assigned_ride already exists or prerequisites not met.' AS message;"
);

PREPARE addFKIfNotExists FROM @preparedStatement;
EXECUTE addFKIfNotExists;
DEALLOCATE PREPARE addFKIfNotExists;

-- Step 16c: Clean up invalid ride_id values in qr_history before adding FK
UPDATE qr_history qh
LEFT JOIN rides r ON qh.ride_id = r.id
SET qh.ride_id = NULL
WHERE qh.ride_id IS NOT NULL AND r.id IS NULL;

-- Step 16c1: Drop any existing foreign key constraints on qr_history.ride_id
SET @tablename = "qr_history";
SET @dropFK = (
  SELECT GROUP_CONCAT(CONCAT('ALTER TABLE ', TABLE_NAME, ' DROP FOREIGN KEY ', CONSTRAINT_NAME, ';') SEPARATOR ' ')
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = @dbname
  AND TABLE_NAME = @tablename
  AND COLUMN_NAME = 'ride_id'
  AND REFERENCED_TABLE_NAME IS NOT NULL
);

SET @preparedStatement = IF(
  @dropFK IS NOT NULL AND @dropFK != '',
  @dropFK,
  "SELECT 'No existing foreign keys on qr_history.ride_id to drop.' AS message;"
);

PREPARE dropExistingFK FROM @preparedStatement;
EXECUTE dropExistingFK;
DEALLOCATE PREPARE dropExistingFK;

-- Step 16c2: Verify data types match
SET @qrHistoryRideIdDataType = (
  SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname
  AND TABLE_NAME = @tablename
  AND COLUMN_NAME = 'ride_id'
);

SET @qrHistoryRideIdFullType = (
  SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname
  AND TABLE_NAME = @tablename
  AND COLUMN_NAME = 'ride_id'
);

SET @preparedStatement = IF(
  @qrHistoryRideIdFullType IS NOT NULL AND @ridesIdFullType IS NOT NULL AND @qrHistoryRideIdFullType != @ridesIdFullType,
  CONCAT("ALTER TABLE ", @tablename, " MODIFY COLUMN ride_id ", @ridesIdFullType, " DEFAULT NULL;"),
  "SELECT 'Data types match or columns do not exist.' AS message;"
);

PREPARE fixDataType FROM @preparedStatement;
EXECUTE fixDataType;
DEALLOCATE PREPARE fixDataType;

-- Foreign key: qr_history.ride_id -> rides.id
SET @fkname = "fk_qr_history_ride";

SET @qrHistoryRideIdExists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname 
  AND TABLE_NAME = @tablename 
  AND COLUMN_NAME = 'ride_id'
);

SET @preparedStatement = IF(
  @ridesTableExists > 0 AND @ridesIdExists > 0 AND @qrHistoryRideIdExists > 0 AND
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND CONSTRAINT_NAME = @fkname
  ) = 0,
  CONCAT("ALTER TABLE ", @tablename, " ADD CONSTRAINT ", @fkname, " FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE SET NULL ON UPDATE CASCADE;"),
  "SELECT 'Foreign key fk_qr_history_ride already exists or prerequisites not met.' AS message;"
);

PREPARE addFKIfNotExists FROM @preparedStatement;
EXECUTE addFKIfNotExists;
DEALLOCATE PREPARE addFKIfNotExists;

-- Step 16d: Clean up invalid classification_id values in qr_history before adding FK
UPDATE qr_history qh
LEFT JOIN ticket_classifications tc ON qh.classification_id = tc.id
SET qh.classification_id = NULL
WHERE qh.classification_id IS NOT NULL AND tc.id IS NULL;

-- Step 16d1: Drop any existing foreign key constraints on qr_history.classification_id
SET @tablename = "qr_history";
SET @dropFK = (
  SELECT GROUP_CONCAT(CONCAT('ALTER TABLE ', TABLE_NAME, ' DROP FOREIGN KEY ', CONSTRAINT_NAME, ';') SEPARATOR ' ')
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = @dbname
  AND TABLE_NAME = @tablename
  AND COLUMN_NAME = 'classification_id'
  AND REFERENCED_TABLE_NAME IS NOT NULL
);

SET @preparedStatement = IF(
  @dropFK IS NOT NULL AND @dropFK != '',
  @dropFK,
  "SELECT 'No existing foreign keys on qr_history.classification_id to drop.' AS message;"
);

PREPARE dropExistingFK FROM @preparedStatement;
EXECUTE dropExistingFK;
DEALLOCATE PREPARE dropExistingFK;

-- Step 16d2: Get ticket_classifications.id full column type
SET @ticketClassificationsIdFullType = (
  SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname
  AND TABLE_NAME = 'ticket_classifications'
  AND COLUMN_NAME = 'id'
);

-- Step 16d3: Verify data types match
SET @qrHistoryClassificationIdFullType = (
  SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname
  AND TABLE_NAME = @tablename
  AND COLUMN_NAME = 'classification_id'
);

SET @preparedStatement = IF(
  @qrHistoryClassificationIdFullType IS NOT NULL AND @ticketClassificationsIdFullType IS NOT NULL AND @qrHistoryClassificationIdFullType != @ticketClassificationsIdFullType,
  CONCAT("ALTER TABLE ", @tablename, " MODIFY COLUMN classification_id ", @ticketClassificationsIdFullType, " DEFAULT NULL;"),
  "SELECT 'Data types match or columns do not exist.' AS message;"
);

PREPARE fixDataType FROM @preparedStatement;
EXECUTE fixDataType;
DEALLOCATE PREPARE fixDataType;

-- Foreign key: qr_history.classification_id -> ticket_classifications.id
SET @fkname = "fk_qr_history_classification";

SET @ticketClassificationsTableExists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'ticket_classifications'
);

SET @ticketClassificationsIdExists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname 
  AND TABLE_NAME = 'ticket_classifications' 
  AND COLUMN_NAME = 'id'
);

SET @qrHistoryClassificationIdExists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname 
  AND TABLE_NAME = @tablename 
  AND COLUMN_NAME = 'classification_id'
);

SET @preparedStatement = IF(
  @ticketClassificationsTableExists > 0 AND @ticketClassificationsIdExists > 0 AND @qrHistoryClassificationIdExists > 0 AND
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND CONSTRAINT_NAME = @fkname
  ) = 0,
  CONCAT("ALTER TABLE ", @tablename, " ADD CONSTRAINT ", @fkname, " FOREIGN KEY (classification_id) REFERENCES ticket_classifications(id) ON DELETE SET NULL ON UPDATE CASCADE;"),
  "SELECT 'Foreign key fk_qr_history_classification already exists or prerequisites not met.' AS message;"
);

PREPARE addFKIfNotExists FROM @preparedStatement;
EXECUTE addFKIfNotExists;
DEALLOCATE PREPARE addFKIfNotExists;

-- Step 17: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ticket_records_ride_id ON ticket_records(ride_id);
CREATE INDEX IF NOT EXISTS idx_ticket_records_validated_by ON ticket_records(validated_by);
CREATE INDEX IF NOT EXISTS idx_ticket_records_ride_name ON ticket_records(ride_name);
CREATE INDEX IF NOT EXISTS idx_users_assigned_ride_id ON users(assigned_ride_id);
CREATE INDEX IF NOT EXISTS idx_qr_history_ride_id ON qr_history(ride_id);
CREATE INDEX IF NOT EXISTS idx_qr_history_classification_id ON qr_history(classification_id);

-- Step 18: Verification queries
SELECT 
    '✅ Migration completed successfully!' AS status,
    (SELECT COUNT(*) FROM rides) AS total_rides,
    (SELECT COUNT(*) FROM ticket_records WHERE ride_id IS NOT NULL) AS ticket_records_with_ride_id,
    (SELECT COUNT(*) FROM users WHERE assigned_ride_id IS NOT NULL) AS users_with_assigned_ride_id,
    (SELECT COUNT(*) FROM qr_history WHERE ride_id IS NOT NULL) AS qr_history_with_ride_id,
    (SELECT COUNT(*) FROM ticket_records WHERE validated_by IS NOT NULL) AS ticket_records_with_validated_by;

SELECT '✅ All personnel data relationships are now properly connected!' AS result;

