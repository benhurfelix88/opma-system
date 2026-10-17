const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'arms_system',
};

async function addRideNameColumn() {
  let connection = null;
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✓ Connected to database');
    
    // First, check if 'ride' column exists, add it if missing
    const [rideColumns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'ticket_records'
      AND COLUMN_NAME = 'ride'
    `);
    
    if (rideColumns.length === 0) {
      await connection.execute(`
        ALTER TABLE ticket_records 
        ADD COLUMN ride VARCHAR(255) DEFAULT NULL
      `);
      console.log('✓ Added ride column');
    } else {
      console.log('✓ Column ride already exists');
    }
    
    // Check if ride_name column exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'ticket_records'
      AND COLUMN_NAME = 'ride_name'
    `);
    
    if (columns.length > 0) {
      console.log('✓ Column ride_name already exists');
    } else {
      // Add the column
      await connection.execute(`
        ALTER TABLE ticket_records 
        ADD COLUMN ride_name VARCHAR(255) DEFAULT NULL AFTER ride
      `);
      console.log('✓ Added ride_name column');
    }
    
    // Update existing records (only if ride column exists and has values)
    try {
      const [updateResult] = await connection.execute(`
        UPDATE ticket_records 
        SET ride_name = ride 
        WHERE ride_name IS NULL AND ride IS NOT NULL
      `);
      console.log(`✓ Updated ${updateResult.affectedRows} existing records`);
    } catch (e) {
      console.log('Note: Could not update existing records:', e.message);
    }
    
    // Add index
    try {
      await connection.execute(`
        CREATE INDEX idx_ride_name ON ticket_records (ride_name)
      `);
      console.log('✓ Added index on ride_name');
    } catch (e) {
      if (e.code === 'ER_DUP_KEYNAME') {
        console.log('✓ Index already exists');
      } else {
        console.log('Note: Could not create index:', e.message);
      }
    }
    
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

addRideNameColumn();

