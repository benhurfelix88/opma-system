/* Update maintenance_records to use TIMESTAMP instead of DATE for date fields
   This allows storing both date and time for maintenance scheduling
   Run this migration on your Render PostgreSQL database */

DO $$
BEGIN
    /* Check and convert date_performed if it's DATE type */
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'maintenance_records'
        AND column_name = 'date_performed'
        AND data_type = 'date'
    ) THEN
        ALTER TABLE maintenance_records ALTER COLUMN date_performed TYPE TIMESTAMP USING date_performed::timestamp;
    END IF;

    /* Check and convert next_maintenance_date if it's DATE type */
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'maintenance_records'
        AND column_name = 'next_maintenance_date'
        AND data_type = 'date'
    ) THEN
        ALTER TABLE maintenance_records ALTER COLUMN next_maintenance_date TYPE TIMESTAMP USING next_maintenance_date::timestamp;
    END IF;
END $$;
