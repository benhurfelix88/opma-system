const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'arms_system',
};

async function deleteUser(username) {
  let connection = null;
  try {
    console.log(`Connecting to database to delete user: ${username}...`);
    connection = await mysql.createConnection(dbConfig);
    console.log('✓ Connected to database');
    
    // Get user ID first
    const [users] = await connection.execute('SELECT id FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      console.log(`❌ User "${username}" not found`);
      return;
    }
    
    const userId = users[0].id;
    console.log(`Found user ID: ${userId}`);
    
    // Start transaction
    await connection.beginTransaction();
    
    try {
      // 1. Set validated_by to NULL in ticket_records (if column exists)
      try {
        const [checkCol] = await connection.execute(`
          SELECT COLUMN_NAME FROM information_schema.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'ticket_records' 
          AND COLUMN_NAME = 'validated_by'
        `);
        if (checkCol.length > 0) {
          await connection.execute('UPDATE ticket_records SET validated_by = NULL WHERE validated_by = ?', [userId]);
          console.log('✓ Updated ticket_records');
        }
      } catch (e) {
        console.log('Note: validated_by column does not exist in ticket_records');
      }
      
      // 2. Delete tickets
      await connection.execute('DELETE FROM tickets WHERE issued_by = ?', [userId]);
      console.log('✓ Deleted tickets');
      
      // 3. Delete qr_history
      await connection.execute('DELETE FROM qr_history WHERE generated_by = ?', [userId]);
      console.log('✓ Deleted qr_history');
      
      // 4. Set performed_by to NULL in maintenance_records
      try {
        await connection.execute('UPDATE maintenance_records SET performed_by = NULL WHERE performed_by = ?', [userId]);
        console.log('✓ Updated maintenance_records');
      } catch (e) {
        console.log('Note: Could not update maintenance_records:', e.message);
      }
      
      // 5. Delete incident_reports (and handle photos if needed)
      try {
        const [incidents] = await connection.execute('SELECT photos FROM incident_reports WHERE reported_by = ?', [userId]);
        // Note: Photo file deletion would require file system access, skipping for now
        await connection.execute('DELETE FROM incident_reports WHERE reported_by = ?', [userId]);
        console.log(`✓ Deleted ${incidents.length} incident report(s)`);
      } catch (e) {
        console.log('Note: Could not delete incident_reports:', e.message);
      }
      
      // 6. Delete sessions
      await connection.execute('DELETE FROM sessions WHERE user_id = ?', [userId]);
      console.log('✓ Deleted sessions');
      
      // 7. Delete the user
      await connection.execute('DELETE FROM users WHERE id = ?', [userId]);
      console.log(`✅ User "${username}" (ID: ${userId}) deleted successfully`);
      
      // Commit transaction
      await connection.commit();
    } catch (transactionError) {
      await connection.rollback();
      throw transactionError;
    }
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    if (connection) {
      await connection.rollback();
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Get username from command line argument
const username = process.argv[2];
if (!username) {
  console.error('Usage: node delete-user.js <username>');
  process.exit(1);
}

deleteUser(username).then(() => {
  console.log('Done!');
  process.exit(0);
});

