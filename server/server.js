// Load environment variables from .env file
require('dotenv').config();

// ARMS System Backend - Production Deployment

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const db = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'arms_system_secret_key_change_in_production';

// Email transporter configuration
let transporter = null;

// Initialize email transporter if Gmail credentials are available
if (process.env.GMAIL_EMAIL && process.env.GMAIL_APP_PASSWORD) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
  
  // Verify email configuration
  transporter.verify((error, success) => {
    if (error) {
      console.error('Email configuration error:', error);
    } else {
      console.log('✓ Email server is ready to send messages');
    }
  });
} else {
  console.log('⚠️ Email credentials not configured. Password reset emails will not be sent.');
}

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads', 'images');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create profile pictures directory
const profilePicsDir = path.join(__dirname, 'uploads', 'profiles');
if (!fs.existsSync(profilePicsDir)) {
  fs.mkdirSync(profilePicsDir, { recursive: true });
}

// Configure multer for incident photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${uniqueSuffix}-${name}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// Configure multer specifically for profile pictures (PNG and JPG only)
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profilePicsDir);
  },
  filename: (req, file, cb) => {
    const userId = req.user?.id || 'unknown';
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `profile-${userId}-${Date.now()}${ext}`);
  }
});

const uploadProfile = multer({
  storage: profileStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /image\/(jpeg|jpg|png)/.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only PNG and JPG/JPEG image files are allowed for profile pictures'));
  }
});

// Ensure database schema for incident reports has required columns
async function ensureIncidentSchema() {
  try {
    // Columns we expect to exist
    const requiredColumns = [
      'incident_id','ride_name','incident_type','severity','description','date_reported','time_reported','status',
      'photos','involved_parties','injuries','property_damage','other_impact','response','actions_taken','follow_up','recommendations','reported_by'
    ];

    const [rows] = await db.execute(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = current_database() AND TABLE_NAME = 'incident_reports'`
    );

    const existing = new Set(rows.map(r => r.COLUMN_NAME));

    // If table doesn't exist, create minimal structure
    if (rows.length === 0) {
      await db.execute(`
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
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      return;
    }

    // Add missing columns one by one (works across PostgreSQL versions by checking existence first)
    const addColumn = async (name, ddl) => {
      if (!existing.has(name)) {
        await db.execute(`ALTER TABLE incident_reports ADD COLUMN ${ddl}`);
      }
    };

    await addColumn('photos', "photos JSONB NULL");
    await addColumn('involved_parties', "involved_parties JSONB NULL");
    await addColumn('injuries', "injuries TEXT NULL");
    await addColumn('property_damage', "property_damage TEXT NULL");
    await addColumn('other_impact', "other_impact TEXT NULL");
    await addColumn('response', "response TEXT NULL");
    await addColumn('actions_taken', "actions_taken TEXT NULL");
    await addColumn('follow_up', "follow_up TEXT NULL");
    await addColumn('recommendations', "recommendations TEXT NULL");
    await addColumn('resolution', "resolution TEXT NULL");
  } catch (e) {
    console.error('Schema check/update for incident_reports failed:', e.message);
  }
}

// Ensure users table exists and seed a default admin user if missing
async function ensureUsersAndAdmin() {
  try {
    // Create users table if it does not exist (minimal columns needed by app)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        full_name VARCHAR(255),
        mobile_number VARCHAR(50),
        role VARCHAR(100),
        assigned_ride VARCHAR(255),
        status VARCHAR(50) DEFAULT 'approved',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index if it doesn't exist
    try {
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_username ON users(username)`);
    } catch (e) {
      // Index might already exist
    }

    // Seed default IT Admin if none exists
    const [rows] = await db.execute('SELECT id FROM users WHERE username = $1 LIMIT 1', ['admin']);
    if (rows.length === 0) {
      const hashed = bcrypt.hashSync('admin123', 10);
      await db.execute(
        'INSERT INTO users (username, password, email, full_name, role, status) VALUES ($1, $2, $3, $4, $5, $6)',
        ['admin', hashed, 'admin@example.com', 'System Administrator', 'IT Admin', 'approved']
      );
      console.log('✓ Seeded default admin user (admin/admin123)');
    }
  } catch (e) {
    console.error('Users table/admin seed failed:', e.message);
  }
}

// Ensure rides table exists and optionally seed defaults
async function ensureRides() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS rides (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        status VARCHAR(50) DEFAULT 'operational',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // add status column if missing
    const [cols] = await db.execute(`SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = current_database() AND TABLE_NAME = 'rides'`);
    const hasStatus = cols.some(c => c.COLUMN_NAME === 'status');
    if (!hasStatus) {
      await db.execute(`ALTER TABLE rides ADD COLUMN status VARCHAR(50) DEFAULT 'operational'`);
    }
    // No default rides seeding - all rides must be added through the UI
    // This ensures rides are only added by IT Admin/IT Encoder through the system
  } catch (e) {
    console.error('Rides table ensure failed:', e.message);
  }
}

// Ensure ride_entries table exists
async function ensureRideEntries() {
  try {
    await db.execute(`
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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes if they don't exist
    try {
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_ride_entries_ride_id ON ride_entries(ride_id)`);
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_ride_entries_ride_name ON ride_entries(ride_name)`);
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_ride_entries_entry_date ON ride_entries(entry_date)`);
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_ride_entries_entered_by ON ride_entries(entered_by)`);
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_ride_entries_entry_type ON ride_entries(entry_type)`);
    } catch (e) {
      // Indexes might already exist
    }

    // Add foreign key constraints if they don't exist
    try {
      await db.execute(`
        ALTER TABLE ride_entries
        ADD CONSTRAINT fk_ride_entries_ride_id
        FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE
      `);
    } catch (e) {
      // Foreign key might already exist, ignore error
    }

    try {
      await db.execute(`
        ALTER TABLE ride_entries
        ADD CONSTRAINT fk_ride_entries_entered_by
        FOREIGN KEY (entered_by) REFERENCES users(id) ON DELETE CASCADE
      `);
    } catch (e) {
      // Foreign key might already exist, ignore error
    }

    console.log('✓ Ride entries table ensured');
  } catch (e) {
    console.error('Ride entries table ensure failed:', e.message);
  }
}

// Ensure daily_ride_summary table exists
async function ensureDailyRideSummary() {
  try {
    await db.execute(`
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
        UNIQUE (ride_id, summary_date)
      )
    `);

    // Create indexes if they don't exist
    try {
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_daily_ride_summary_ride_id ON daily_ride_summary(ride_id)`);
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_daily_ride_summary_summary_date ON daily_ride_summary(summary_date)`);
    } catch (e) {
      // Indexes might already exist
    }

    // Add foreign key constraint if it doesn't exist
    try {
      await db.execute(`
        ALTER TABLE daily_ride_summary
        ADD CONSTRAINT fk_daily_ride_summary_ride_id
        FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE
      `);
    } catch (e) {
      // Foreign key might already exist, ignore error
    }

    console.log('✓ Daily ride summary table ensured');
  } catch (e) {
    console.error('Daily ride summary table ensure failed:', e.message);
  }
}

// Ensure QR history table exists
async function ensureQRHistory() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS qr_history (
        id SERIAL PRIMARY KEY,
        ticket_number VARCHAR(100) NOT NULL,
        ride VARCHAR(255) NOT NULL,
        type VARCHAR(20) DEFAULT 'one-time' CHECK (type IN ('one-time', 'multi-ride', 'seasonal')),
        customer_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        generated_by INTEGER
      )
    `);

    // Create indexes if they don't exist
    try {
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_qr_history_ticket_number ON qr_history(ticket_number)`);
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_qr_history_ride ON qr_history(ride)`);
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_qr_history_created_at ON qr_history(created_at)`);
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_qr_history_generated_by ON qr_history(generated_by)`);
    } catch (e) {
      // Indexes might already exist
    }

    // Add foreign key constraint if it doesn't exist
    try {
      await db.execute(`
        ALTER TABLE qr_history
        ADD CONSTRAINT fk_qr_history_generated_by
        FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL
      `);
    } catch (e) {
      // Foreign key might already exist, ignore error
    }

    console.log('✓ QR history table ensured');
  } catch (e) {
    console.error('QR history table ensure failed:', e.message);
  }
}

// Ensure password reset tokens table exists
async function ensurePasswordResetTokens() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create indexes if they don't exist
    try {
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token)`);
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_password_reset_user_id ON password_reset_tokens(user_id)`);
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_password_reset_expires_at ON password_reset_tokens(expires_at)`);
    } catch (e) {
      // Indexes might already exist
    }

    console.log('✓ Password reset tokens table ensured');
  } catch (e) {
    console.error('Password reset tokens table ensure failed:', e.message);
  }
}

async function ensureProfilePictureColumn() {
  try {
    const [cols] = await db.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = current_database() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'profile_picture'
    `);
    if (cols.length === 0) {
      await db.execute(`ALTER TABLE users ADD COLUMN profile_picture VARCHAR(500) NULL`);
      console.log('✓ profile_picture column added to users table');
    } else {
      console.log('✓ profile_picture column already exists');
    }
  } catch (e) {
    console.error('Profile picture column ensure failed:', e.message);
  }
}

async function ensureIncidentReviewStatus() {
  try {
    const [cols] = await db.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = current_database() AND TABLE_NAME = 'incident_reports' AND COLUMN_NAME = 'review_status'
    `);
    if (cols.length === 0) {
      await db.execute(`ALTER TABLE incident_reports ADD COLUMN review_status VARCHAR(50) DEFAULT 'Pending'`);
      console.log('✓ review_status column added to incident_reports table');
    }
    await db.execute(`UPDATE incident_reports SET review_status = 'Approved' WHERE review_status = 'Validated'`);
    await db.execute(`UPDATE incident_reports SET review_status = 'Disapproved' WHERE review_status = 'Reviewed'`);
  } catch (e) {
    console.error('Incident review_status column ensure failed:', e.message);
  }
}

async function ensureSparePartsColumns() {
  try {
    const [cols] = await db.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = current_database() AND TABLE_NAME = 'spare_parts'
    `);
    const columnNames = cols.map(c => c.COLUMN_NAME);
    if (!columnNames.includes('approval_status')) {
      await db.execute(`ALTER TABLE spare_parts ADD COLUMN approval_status VARCHAR(50) DEFAULT 'Pending'`);
      console.log('✓ approval_status column added to spare_parts table');
    }
    if (!columnNames.includes('notes')) {
      await db.execute(`ALTER TABLE spare_parts ADD COLUMN notes TEXT NULL`);
      console.log('✓ notes column added to spare_parts table');
    }
  } catch (e) {
    // Table might not exist yet, will be created by ensureSpareParts
    console.log('Spare parts columns check skipped (table may not exist yet)');
  }
}

// Ensure spare_parts table exists
async function ensureSpareParts() {
  try {
    await db.execute(`
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
      )
    `);
    console.log('✓ Spare parts table ensured');
  } catch (e) {
    console.error('Spare parts table ensure failed:', e.message);
  }
}

// Ensure maintenance_records table exists
async function ensureMaintenanceRecords() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS maintenance_records (
        id SERIAL PRIMARY KEY,
        ride_name VARCHAR(255) NOT NULL,
        maintenance_type VARCHAR(100),
        description TEXT,
        performed_by VARCHAR(255),
        date_performed DATE,
        next_maintenance_date DATE,
        status VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Maintenance records table ensured');
  } catch (e) {
    console.error('Maintenance records table ensure failed:', e.message);
  }
}

// Ensure ride_repairs table exists
async function ensureRideRepairs() {
  try {
    await db.execute(`
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
      )
    `);
    console.log('✓ Ride repairs table ensured');
  } catch (e) {
    console.error('Ride repairs table ensure failed:', e.message);
  }
}

// Ensure part_deployments table exists
async function ensurePartDeployments() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS part_deployments (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        place VARCHAR(255) NOT NULL,
        ride VARCHAR(255) NOT NULL,
        parts VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL,
        status VARCHAR(50) DEFAULT 'Complete',
        encoded_by VARCHAR(255) NOT NULL,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);
    console.log('✓ Part deployments table ensured');
  } catch (e) {
    console.error('Part deployments table ensure failed:', e.message);
  }
}

// Ensure part_removals table exists
async function ensurePartRemovals() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS part_removals (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        place VARCHAR(255) NOT NULL,
        ride VARCHAR(255) NOT NULL,
        parts VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL,
        status VARCHAR(50) DEFAULT 'Complete',
        encoded_by VARCHAR(255) NOT NULL,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);
    console.log('✓ Part removals table ensured');
  } catch (e) {
    console.error('Part removals table ensure failed:', e.message);
  }
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Run schema ensure on startup (best-effort)
ensureIncidentSchema();
ensureUsersAndAdmin();
ensureRides();
ensureRideEntries();
ensureDailyRideSummary();
ensurePasswordResetTokens();
ensureProfilePictureColumn();
ensureSpareParts();
ensureSparePartsColumns();
ensureIncidentReviewStatus();
ensureMaintenanceRecords();
ensureRideRepairs();
ensurePartDeployments();
ensurePartRemovals();

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [decoded.userId]);
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = users[0];
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// ==================== AUTH ROUTES ====================

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const inputUsername = (username || '').trim();

    const [users] = await db.execute(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [inputUsername, inputUsername]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = users[0];
    
    // Check password (supports plain text, bcrypt, md5, and optional master admin password)
    let passwordValid = false;
    // 1) Plain text (legacy)
    if (user.password === password) {
      passwordValid = true;
    }
    // 2) Bcrypt hash (normalize $2y$ to $2a$ for compatibility)
    if (!passwordValid && typeof user.password === 'string' && user.password.startsWith('$2')) {
      let hash = user.password;
      if (hash.startsWith('$2y$')) {
        hash = '$2a$' + hash.slice(4);
      }
      try { passwordValid = bcrypt.compareSync(password, hash); } catch {}
    }
    // 3) MD5 legacy hash
    if (!passwordValid && typeof user.password === 'string' && /^[a-f0-9]{32}$/i.test(user.password)) {
      const md5 = crypto.createHash('md5').update(password).digest('hex');
      if (md5 === user.password) passwordValid = true;
    }
    // 4) Master admin password override from env
    if (!passwordValid && user.role === 'IT Admin' && process.env.MASTER_ADMIN_PASSWORD) {
      if (password === process.env.MASTER_ADMIN_PASSWORD) passwordValid = true;
    }
    
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const statusStr = (user.status || '').toString().toLowerCase();
    const isApproved = statusStr === 'approved' || statusStr === 'active' || statusStr === 'enabled';
    const isAdminRole = (user.role || '').toString().toLowerCase() === 'it admin' || (user.role || '').toString().toLowerCase() === 'admin';
    if (!isApproved && !isAdminRole) {
      return res.status(403).json({ error: 'Your account is pending approval' });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user - with proper ride information
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const { password: _, ...userWithoutPassword } = req.user;
    
    // Check if assigned_ride_id column exists and use it, otherwise fall back to assigned_ride string
    const [userColumns] = await db.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = current_database() 
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME IN ('assigned_ride_id', 'assigned_ride')
    `);
    const hasAssignedRideId = userColumns.some(col => col.COLUMN_NAME === 'assigned_ride_id');
    
    // Try to fetch ride details from rides table
    let rideData = null;
    if (hasAssignedRideId && userWithoutPassword.assigned_ride_id) {
      // Use foreign key relationship
      try {
        const [rides] = await db.execute(
          'SELECT id, name, status FROM rides WHERE id = ? LIMIT 1',
          [userWithoutPassword.assigned_ride_id]
        );
        if (rides.length > 0) {
          rideData = {
            id: rides[0].id,
            name: rides[0].name,
            status: rides[0].status
          };
        }
      } catch (rideError) {
        console.error('Error fetching ride by ID:', rideError);
      }
    }
    
    // Fallback to assigned_ride string if ride_id didn't work
    if (!rideData && userWithoutPassword.assigned_ride) {
      try {
        const [rides] = await db.execute(
          'SELECT id, name, status FROM rides WHERE name = ? LIMIT 1',
          [userWithoutPassword.assigned_ride]
        );
        
        if (rides.length > 0) {
          rideData = {
            id: rides[0].id,
            name: rides[0].name,
            status: rides[0].status
          };
        } else {
          // Ride name not found in rides table - still return it but log a warning
          console.warn(`⚠️ User ${userWithoutPassword.id} has assigned_ride "${userWithoutPassword.assigned_ride}" but ride not found in rides table`);
          rideData = {
            id: null,
            name: userWithoutPassword.assigned_ride,
            status: 'unknown'
          };
        }
      } catch (rideError) {
        console.error('Error fetching ride information:', rideError);
        rideData = {
          id: null,
          name: userWithoutPassword.assigned_ride,
          status: 'unknown'
        };
      }
    }
    
    userWithoutPassword.assignedRide = rideData;
    
    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update own profile (text fields)
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { full_name, email, mobile_number, username } = req.body;
    const userId = req.user.id;

    if (!full_name || !email || !username) {
      return res.status(400).json({ error: 'Full name, email, and username are required' });
    }

    await db.execute(
      'UPDATE users SET full_name = ?, email = ?, mobile_number = ?, username = ? WHERE id = ?',
      [full_name, email, mobile_number || null, username, userId]
    );

    const [rows] = await db.execute(
      'SELECT id, username, email, full_name, mobile_number, role, assigned_ride, status, profile_picture FROM users WHERE id = ?',
      [userId]
    );

    res.json({ message: 'Profile updated successfully', user: rows[0] });
  } catch (error) {
    console.error('Update profile error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload profile picture
app.post('/api/auth/profile/picture', authenticateToken, (req, res) => {
  uploadProfile.single('profile_picture')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'File upload failed' });
    }
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded. Only PNG and JPG files are allowed.' });
      }

      const userId = req.user.id;
      const picturePath = `/uploads/profiles/${req.file.filename}`;

      // Delete old profile picture file if it exists
      const [rows] = await db.execute('SELECT profile_picture FROM users WHERE id = ?', [userId]);
      if (rows.length > 0 && rows[0].profile_picture) {
        const oldPath = path.join(__dirname, rows[0].profile_picture);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      await db.execute('UPDATE users SET profile_picture = ? WHERE id = ?', [picturePath, userId]);

      res.json({ message: 'Profile picture updated successfully', profile_picture: picturePath });
    } catch (error) {
      console.error('Upload profile picture error:', error);
      res.status(500).json({ error: error.message || 'Server error' });
    }
  });
});

// Delete profile picture
app.delete('/api/auth/profile/picture', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.execute('SELECT profile_picture FROM users WHERE id = ?', [userId]);

    if (rows.length > 0 && rows[0].profile_picture) {
      const oldPath = path.join(__dirname, rows[0].profile_picture);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
      await db.execute('UPDATE users SET profile_picture = NULL WHERE id = ?', [userId]);
    }

    res.json({ message: 'Profile picture removed successfully' });
  } catch (error) {
    console.error('Delete profile picture error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  // For JWT, logout is handled client-side by removing token
  res.json({ message: 'Logged out successfully' });
});

// Forgot Password - Request password reset
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Find user by email
    const [users] = await db.execute(
      'SELECT id, username, email, full_name FROM users WHERE email = ?',
      [email.trim()]
    );
    
    if (users.length === 0) {
      // Don't reveal if email exists or not for security
      return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    }
    
    const user = users[0];
    
    // Clean up any existing tokens for this user
    await db.execute(
      'DELETE FROM password_reset_tokens WHERE user_id = ? OR expires_at < NOW()',
      [user.id]
    );
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now
    
    // Save token to database
    await db.execute(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, resetToken, expiresAt]
    );
    
    // Send email if transporter is configured
    if (transporter) {
      try {
        const frontendBaseUrl = (process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
        const resetUrl = `${frontendBaseUrl}/forgot-password?token=${resetToken}`;
        
        const mailOptions = {
          from: `"OPMA System" <${process.env.GMAIL_EMAIL}>`,
          to: user.email,
          subject: 'Password Reset Request - OPMA System',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
              <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #6b5b95; margin: 0;">OPMA System</h1>
                  <p style="color: #666; margin: 5px 0 0 0;">Operations And Maintenance Management System</p>
                </div>
                
                <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
                
                <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
                  Hello ${user.full_name || user.username},<br><br>
                  You requested to reset your password for your OPMA System account. Click the button below to reset your password:
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}" 
                     style="background-color: #6b5b95; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                    Reset Password
                  </a>
                </div>
                
                <p style="color: #999; font-size: 14px; line-height: 1.5; margin-top: 30px;">
                  Or copy and paste this link into your browser:<br>
                  <a href="${resetUrl}" style="color: #6b5b95;">${resetUrl}</a>
                </p>
                
                <p style="color: #999; font-size: 14px; margin-top: 25px;">
                  <strong>Important:</strong><br>
                  • This link will expire in 1 hour for security reasons<br>
                  • If you didn't request this password reset, please ignore this email<br>
                  • Your password will remain unchanged if you don't click the link
                </p>
                
                <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center; color: #999; font-size: 12px;">
                  <p>This is an automated message from OPMA System. Please do not reply to this email.</p>
                </div>
              </div>
            </div>
          `
        };
        
        await transporter.sendMail(mailOptions);
        console.log(`✓ Password reset email sent to ${user.email}`);
        
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
        // Continue with the response even if email fails
      }
    }
    
    const frontendBaseUrl = (process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
    res.json({ 
      message: 'If an account with that email exists, a password reset link has been sent.',
      // For development only - helps test reset without email
      devToken: process.env.NODE_ENV === 'development' ? resetToken : undefined,
      devResetUrl: process.env.NODE_ENV === 'development' ? `${frontendBaseUrl}/forgot-password?token=${resetToken}` : undefined,
    });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset Password - Validate token and reset password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    // Find valid token
    const [tokens] = await db.execute(
      'SELECT user_id, used FROM password_reset_tokens WHERE token = ? AND expires_at > NOW()',
      [token]
    );
    
    if (tokens.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    const resetToken = tokens[0];
    
    if (resetToken.used) {
      return res.status(400).json({ error: 'Reset token has already been used' });
    }
    
    // Hash new password
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    
    // Start transaction
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      
      // Update user password
      await connection.execute(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedPassword, resetToken.user_id]
      );
      
      // Mark token as used
      await connection.execute(
        'UPDATE password_reset_tokens SET used = TRUE WHERE token = ?',
        [token]
      );
      
      await connection.commit();
      res.json({ message: 'Password reset successfully. You can now login with your new password.' });
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== USER ROUTES ====================

// Get all users
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const [users] = await db.execute(
      'SELECT id, username, email, full_name, mobile_number, role, assigned_ride, status, profile_picture, created_at, updated_at FROM users'
    );
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user by ID
app.get('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const [users] = await db.execute(
      'SELECT id, username, email, full_name, mobile_number, role, assigned_ride, status, profile_picture, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(users[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create user
app.post('/api/users', authenticateToken, async (req, res) => {
  try {
    const { username, password, email, full_name, mobile_number, role, assigned_ride } = req.body;

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Normalize assigned_ride - ensure it's a ride name from rides table
    let normalizedAssignedRide = assigned_ride || null;

    if (normalizedAssignedRide && role === 'Amusement Park Personnel') {
      // If assigned_ride is an object with name property, extract the name
      if (typeof normalizedAssignedRide === 'object' && normalizedAssignedRide.name) {
        normalizedAssignedRide = normalizedAssignedRide.name;
      }
      // If it's a number (ID), fetch the ride name
      else if (!isNaN(normalizedAssignedRide)) {
        const [rides] = await db.execute('SELECT name FROM rides WHERE id = $1', [normalizedAssignedRide]);
        if (rides.length > 0) {
          normalizedAssignedRide = rides[0].name;
        } else {
          console.warn(`⚠️ Ride ID ${assigned_ride} not found in rides table`);
          normalizedAssignedRide = null;
        }
      }
      // If it's a name, verify it exists in rides table
      else {
        const [rides] = await db.execute('SELECT name FROM rides WHERE name = $1', [normalizedAssignedRide]);
        if (rides.length === 0) {
          console.warn(`⚠️ Ride name "${normalizedAssignedRide}" not found in rides table`);
          // Still allow it, but log warning
        }
      }
    }

    const [result] = await db.execute(
      'INSERT INTO users (username, password, email, full_name, mobile_number, role, assigned_ride, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
      [username, hashedPassword, email, full_name, mobile_number, role, normalizedAssignedRide, 'pending']
    );

    res.json({ id: result[0].id, message: 'User created successfully' });
  } catch (error) {
    console.error('Create user error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user
app.put('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const { username, email, full_name, mobile_number, role, assigned_ride, status, password } = req.body;

    // Normalize assigned_ride - ensure it's a ride name from rides table
    let normalizedAssignedRide = assigned_ride || null;

    if (normalizedAssignedRide && role === 'Amusement Park Personnel') {
      // If assigned_ride is an object with name property, extract the name
      if (typeof normalizedAssignedRide === 'object' && normalizedAssignedRide.name) {
        normalizedAssignedRide = normalizedAssignedRide.name;
      }
      // If it's a number (ID), fetch the ride name
      else if (!isNaN(normalizedAssignedRide)) {
        const [rides] = await db.execute('SELECT name FROM rides WHERE id = $1', [normalizedAssignedRide]);
        if (rides.length > 0) {
          normalizedAssignedRide = rides[0].name;
        } else {
          console.warn(`⚠️ Ride ID ${assigned_ride} not found in rides table`);
          normalizedAssignedRide = null;
        }
      }
      // If it's a name, verify it exists in rides table
      else {
        const [rides] = await db.execute('SELECT name FROM rides WHERE name = $1', [normalizedAssignedRide]);
        if (rides.length === 0) {
          console.warn(`⚠️ Ride name "${normalizedAssignedRide}" not found in rides table`);
          // Still allow it, but log warning
        }
      }
    }

    let updateQuery = 'UPDATE users SET username = $1, email = $2, full_name = $3, mobile_number = $4, role = $5, assigned_ride = $6, status = $7';
    let params = [username, email, full_name, mobile_number, role, normalizedAssignedRide, status];
    let paramIndex = 8;

    if (password) {
      const hashedPassword = bcrypt.hashSync(password, 10);
      updateQuery += `, password = $${paramIndex}`;
      params.push(hashedPassword);
      paramIndex++;
    }

    updateQuery += ` WHERE id = $${paramIndex}`;
    params.push(req.params.id);

    await db.execute(updateQuery, params);
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  let connection = null;
  try {
    const userId = req.params.id;
    
    // Check if user exists
    const [users] = await db.execute('SELECT id, username, role FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = users[0];
    
    // Get a connection from the pool for transaction
    connection = await db.getConnection();
    
    // Start transaction
    await connection.beginTransaction();
    
    try {
      // Temporarily disable foreign key checks to ensure deletion works
      await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
      
      // Set performed_by to NULL in maintenance_records (if table and column exist)
      try {
        const [checkTable] = await connection.execute(`
          SELECT TABLE_NAME FROM information_schema.TABLES 
          WHERE TABLE_SCHEMA = current_database() 
          AND TABLE_NAME = 'maintenance_records'
        `);
        if (checkTable.length > 0) {
          const [checkCol] = await connection.execute(`
            SELECT COLUMN_NAME FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = current_database() 
            AND TABLE_NAME = 'maintenance_records' 
            AND COLUMN_NAME = 'performed_by'
          `);
          if (checkCol.length > 0) {
            await connection.execute('UPDATE maintenance_records SET performed_by = NULL WHERE performed_by = ?', [userId]);
          }
        }
      } catch (e) {
        console.log('Note: Could not update maintenance_records.performed_by:', e.message);
      }
      
      // 5. Delete incident_reports (reported_by is NOT NULL, so we must delete them)
      // Incident reports are tied to the reporter, so deleting them is appropriate
      try {
        const [checkTable] = await connection.execute(`
          SELECT TABLE_NAME FROM information_schema.TABLES 
          WHERE TABLE_SCHEMA = current_database() 
          AND TABLE_NAME = 'incident_reports'
        `);
        if (checkTable.length > 0) {
          const [incidentResult] = await connection.execute('SELECT id, photos FROM incident_reports WHERE reported_by = ?', [userId]);
          if (incidentResult.length > 0) {
            // Delete associated photo files first
            for (const incident of incidentResult) {
              if (incident.photos) {
                try {
                  const photos = JSON.parse(incident.photos);
                  if (Array.isArray(photos)) {
                    photos.forEach(photo => {
                      if (photo.path) {
                        // Extract filename from path
                        const filename = photo.path.includes('/') ? photo.path.split('/').pop() : photo.path;
                        const filePath = path.join(uploadsDir, filename);
                        if (fs.existsSync(filePath)) {
                          fs.unlinkSync(filePath);
                        }
                      }
                    });
                  }
                } catch (parseError) {
                  console.log('Note: Could not parse photos for incident:', parseError.message);
                }
              }
            }
            // Delete incident reports
            await connection.execute('DELETE FROM incident_reports WHERE reported_by = ?', [userId]);
            console.log(`Deleted ${incidentResult.length} incident report(s) for user ${userId}`);
          }
        }
      } catch (e) {
        console.log('Note: Could not delete incident_reports:', e.message);
      }
      
      // 6. Handle other tables that might reference users
      // ride_scans (scanned_by - allows NULL, check if table and column exist)
      try {
        const [checkTable] = await connection.execute(`
          SELECT TABLE_NAME FROM information_schema.TABLES 
          WHERE TABLE_SCHEMA = current_database() 
          AND TABLE_NAME = 'ride_scans'
        `);
        if (checkTable.length > 0) {
          const [checkCol] = await connection.execute(`
            SELECT COLUMN_NAME FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = current_database() 
            AND TABLE_NAME = 'ride_scans' 
            AND COLUMN_NAME = 'scanned_by'
          `);
          if (checkCol.length > 0) {
            await connection.execute('UPDATE ride_scans SET scanned_by = NULL WHERE scanned_by = ?', [userId]);
          }
        }
      } catch (e) {
        console.log('Note: Could not update ride_scans:', e.message);
      }
      
      // ride_repairs (created_by - allows NULL, check if table and column exist)
      try {
        const [checkTable] = await connection.execute(`
          SELECT TABLE_NAME FROM information_schema.TABLES 
          WHERE TABLE_SCHEMA = current_database() 
          AND TABLE_NAME = 'ride_repairs'
        `);
        if (checkTable.length > 0) {
          const [checkCol] = await connection.execute(`
            SELECT COLUMN_NAME FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = current_database() 
            AND TABLE_NAME = 'ride_repairs' 
            AND COLUMN_NAME = 'created_by'
          `);
          if (checkCol.length > 0) {
            await connection.execute('UPDATE ride_repairs SET created_by = NULL WHERE created_by = ?', [userId]);
          }
        }
      } catch (e) {
        console.log('Note: Could not update ride_repairs:', e.message);
      }
      
      // part_deployments (created_by - allows NULL, check if table and column exist)
      try {
        const [checkTable] = await connection.execute(`
          SELECT TABLE_NAME FROM information_schema.TABLES 
          WHERE TABLE_SCHEMA = current_database() 
          AND TABLE_NAME = 'part_deployments'
        `);
        if (checkTable.length > 0) {
          const [checkCol] = await connection.execute(`
            SELECT COLUMN_NAME FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = current_database() 
            AND TABLE_NAME = 'part_deployments' 
            AND COLUMN_NAME = 'created_by'
          `);
          if (checkCol.length > 0) {
            await connection.execute('UPDATE part_deployments SET created_by = NULL WHERE created_by = ?', [userId]);
          }
        }
      } catch (e) {
        console.log('Note: Could not update part_deployments:', e.message);
      }
      
      // part_removals (created_by - allows NULL, check if table and column exist)
      try {
        const [checkTable] = await connection.execute(`
          SELECT TABLE_NAME FROM information_schema.TABLES 
          WHERE TABLE_SCHEMA = current_database() 
          AND TABLE_NAME = 'part_removals'
        `);
        if (checkTable.length > 0) {
          const [checkCol] = await connection.execute(`
            SELECT COLUMN_NAME FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = current_database() 
            AND TABLE_NAME = 'part_removals' 
            AND COLUMN_NAME = 'created_by'
          `);
          if (checkCol.length > 0) {
            await connection.execute('UPDATE part_removals SET created_by = NULL WHERE created_by = ?', [userId]);
          }
        }
      } catch (e) {
        console.log('Note: Could not update part_removals:', e.message);
      }
      
      // 7. Delete sessions (has ON DELETE CASCADE, but delete explicitly for clarity)
      try {
        const [checkTable] = await connection.execute(`
          SELECT TABLE_NAME FROM information_schema.TABLES 
          WHERE TABLE_SCHEMA = current_database() 
          AND TABLE_NAME = 'sessions'
        `);
        if (checkTable.length > 0) {
          await connection.execute('DELETE FROM sessions WHERE user_id = ?', [userId]);
        }
      } catch (e) {
        console.log('Note: Could not delete sessions:', e.message);
      }
      
      // 8. Now delete the user
      await connection.execute('DELETE FROM users WHERE id = ?', [userId]);
      
      // Re-enable foreign key checks
      await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
      
      // Commit transaction
      await connection.commit();
      
      console.log(`✅ User ${user.username} (ID: ${userId}) deleted successfully`);
      res.json({ message: 'User deleted successfully' });
    } catch (transactionError) {
      // Re-enable foreign key checks in case of error
      try {
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
      } catch (fkError) {
        console.log('Note: Could not re-enable foreign key checks:', fkError.message);
      }
      // Rollback on error
      await connection.rollback();
      throw transactionError;
    } finally {
      // Always release the connection
      if (connection) {
        connection.release();
      }
    }
  } catch (error) {
    console.error('Delete user error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    
    // Release connection if still held
    if (connection) {
      connection.release();
    }
    
    // Provide more specific error messages
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ 
        error: 'Cannot delete user: User has associated records that cannot be automatically removed. Please contact an administrator.' 
      });
    }
    
    res.status(500).json({ 
      error: error.message || 'Server error while deleting user',
      details: process.env.NODE_ENV === 'development' ? error.sqlMessage : undefined
    });
  }
});

// Approve/Reject user
app.patch('/api/users/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    await db.execute('UPDATE users SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: 'User status updated successfully' });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== MAINTENANCE ROUTES ====================

// Get maintenance records
app.get('/api/maintenance', authenticateToken, async (req, res) => {
  try {
    const [records] = await db.execute('SELECT * FROM maintenance_records ORDER BY created_at DESC');
    res.json(records);
  } catch (error) {
    console.error('Get maintenance error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create maintenance record
app.post('/api/maintenance', authenticateToken, async (req, res) => {
  try {
    const { ride_name, maintenance_type, description, date_performed, next_maintenance_date, status, performed_by } = req.body;
    const performedByValue = String(performed_by || '').trim();
    
    const [result] = await db.execute(
      'INSERT INTO maintenance_records (ride_name, maintenance_type, description, date_performed, next_maintenance_date, status, performed_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [ride_name, maintenance_type, description, date_performed, next_maintenance_date, status || 'Completed', performedByValue]
    );

    res.json({ id: result.insertId, message: 'Maintenance record created successfully' });
  } catch (error) {
    console.error('Create maintenance error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update maintenance record
app.put('/api/maintenance/:id', authenticateToken, async (req, res) => {
  try {
    const { ride_name, maintenance_type, description, date_performed, next_maintenance_date, status, performed_by } = req.body;
    const performedByValue = String(performed_by || '').trim();

    await db.execute(
      'UPDATE maintenance_records SET ride_name = ?, maintenance_type = ?, description = ?, performed_by = ?, date_performed = ?, next_maintenance_date = ?, status = ? WHERE id = ?',
      [ride_name, maintenance_type, description, performedByValue, date_performed, next_maintenance_date, status, req.params.id]
    );

    res.json({ message: 'Maintenance record updated successfully' });
  } catch (error) {
    console.error('Update maintenance error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete maintenance record
app.delete('/api/maintenance/:id', authenticateToken, async (req, res) => {
  try {
    await db.execute('DELETE FROM maintenance_records WHERE id = ?', [req.params.id]);
    res.json({ message: 'Maintenance record deleted successfully' });
  } catch (error) {
    console.error('Delete maintenance error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== INCIDENT REPORTS ROUTES ====================

// Get incident reports
app.get('/api/incidents', authenticateToken, async (req, res) => {
  try {
    const [incidents] = await db.execute('SELECT * FROM incident_reports ORDER BY created_at DESC');
    // Parse JSON fields and construct full image URLs
    const parsedIncidents = incidents.map(incident => {
      let photos = [];
      if (incident.photos) {
        try {
          photos = JSON.parse(incident.photos);
          // Convert file paths to full URLs if they're relative paths
          photos = photos.map(photo => ({
            ...photo,
            path: photo.path && !photo.path.startsWith('http') 
              ? `${req.protocol}://${req.get('host')}${photo.path}`
              : photo.path,
            preview: photo.path && !photo.path.startsWith('http')
              ? `${req.protocol}://${req.get('host')}${photo.path}`
              : (photo.preview || photo.path)
          }));
        } catch (e) {
          photos = [];
        }
      }
      
      let involved_parties = [];
      if (incident.involved_parties) {
        try {
          involved_parties = JSON.parse(incident.involved_parties);
        } catch (e) {
          involved_parties = [];
        }
      }
      
      // Format date_reported and time_reported as strings
      let date_reported = null;
      let time_reported = null;
      
      if (incident.date_reported) {
        // Convert Date object to YYYY-MM-DD string if needed
        if (incident.date_reported instanceof Date) {
          date_reported = incident.date_reported.toISOString().split('T')[0];
        } else {
          date_reported = String(incident.date_reported).split('T')[0]; // Get date part only
        }
      }
      
      if (incident.time_reported) {
        // Convert Date object or Time object to HH:mm:ss string if needed
        if (incident.time_reported instanceof Date) {
          time_reported = incident.time_reported.toTimeString().split(' ')[0];
        } else {
          // MySQL TIME format is HH:mm:ss or HH:mm:ss.xxx
          time_reported = String(incident.time_reported).split('.')[0]; // Remove milliseconds if present
        }
      }
      
      return {
        ...incident,
        date_reported,
        time_reported,
        photos,
        involved_parties
      };
    });
    res.json(parsedIncidents);
  } catch (error) {
    console.error('Get incidents error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create incident report with file uploads
app.post('/api/incidents', authenticateToken, upload.array('photos', 10), async (req, res) => {
  try {
    const { 
      incident_id, 
      ride_name, 
      incident_type, 
      severity, 
      description, 
      date_reported, 
      time_reported, 
      status,
      involved_parties,
      injuries,
      property_damage,
      other_impact,
      response,
      actions_taken,
      follow_up,
      recommendations
    } = req.body;
    
    // Process uploaded files
    let photosData = [];
    if (req.files && req.files.length > 0) {
      photosData = req.files.map(file => ({
        id: Date.now() + Math.random(),
        filename: file.filename,
        originalname: file.originalname,
        path: `/uploads/images/${file.filename}`,
        mimetype: file.mimetype,
        size: file.size
      }));
    }
    
    // Parse involved_parties if it's a string
    let partiesJson = null;
    if (involved_parties) {
      try {
        const parties = typeof involved_parties === 'string' ? JSON.parse(involved_parties) : involved_parties;
        partiesJson = JSON.stringify(parties);
      } catch (e) {
        partiesJson = JSON.stringify([]);
      }
    }
    
    // Convert photos to JSON string
    const photosJson = photosData.length > 0 ? JSON.stringify(photosData) : null;
    
    // Validate and normalize date_reported and time_reported
    const normalizedDateReported = date_reported && date_reported.trim() !== '' ? date_reported.trim() : null;
    const normalizedTimeReported = time_reported && time_reported.trim() !== '' ? time_reported.trim() : null;
    
    const [result] = await db.execute(
      `INSERT INTO incident_reports 
       (incident_id, ride_name, incident_type, severity, description, date_reported, time_reported, status, 
        photos, involved_parties, injuries, property_damage, other_impact, response, actions_taken, 
        follow_up, recommendations, reported_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        incident_id, 
        ride_name, 
        incident_type, 
        severity, 
        description, 
        normalizedDateReported, 
        normalizedTimeReported, 
        status || 'Open',
        photosJson,
        partiesJson,
        injuries || null,
        property_damage || null,
        other_impact || null,
        response || null,
        actions_taken || null,
        follow_up || null,
        recommendations || null,
        req.user.id
      ]
    );

    res.json({ id: result.insertId, message: 'Incident report created successfully' });
  } catch (error) {
    console.error('Create incident error:', error);
    
    // Delete uploaded files if there was an error
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        const filePath = path.join(uploadsDir, file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Incident ID already exists' });
    }
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

const updateIncidentReviewStatusHandler = async (req, res) => {
  try {
    const userRole = (req.user.role || '').toString().trim();
    if (userRole !== 'Operations Manager') {
      return res.status(403).json({ error: 'Only Operations Manager can update review status' });
    }

    const { review_status } = req.body;
    const allowedStatuses = ['Approved', 'Disapproved'];
    if (!allowedStatuses.includes(review_status)) {
      return res.status(400).json({ error: 'Invalid review status. Allowed values: Approved, Disapproved' });
    }

    const incidentId = req.params.id;
    const [existing] = await db.execute('SELECT id FROM incident_reports WHERE id = ?', [incidentId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    await db.execute(
      'UPDATE incident_reports SET review_status = ? WHERE id = ?',
      [review_status, incidentId]
    );

    res.json({ message: 'Review status updated successfully', review_status });
  } catch (error) {
    console.error('Update incident review status error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
};

// Update incident review status (Operations Manager only)
app.patch('/api/incidents/:id/review-status', authenticateToken, updateIncidentReviewStatusHandler);
app.put('/api/incidents/:id/review-status', authenticateToken, updateIncidentReviewStatusHandler);

// Update incident report with file uploads
app.put('/api/incidents/:id', authenticateToken, upload.array('photos', 10), async (req, res) => {
  try {
    const { 
      incident_id, 
      ride_name, 
      incident_type, 
      severity, 
      description, 
      date_reported, 
      time_reported, 
      status, 
      resolution,
      existing_photos,
      involved_parties,
      injuries,
      property_damage,
      other_impact,
      response,
      actions_taken,
      follow_up,
      recommendations,
      review_status
    } = req.body;

    const userRole = (req.user.role || '').toString();
    const isOperationsManager = userRole === 'Operations Manager';
    
    // Get existing photos from database
    const [existingIncident] = await db.execute('SELECT photos FROM incident_reports WHERE id = ?', [req.params.id]);
    let existingPhotos = [];
    if (existingIncident && existingIncident[0] && existingIncident[0].photos) {
      try {
        existingPhotos = JSON.parse(existingIncident[0].photos);
      } catch (e) {
        existingPhotos = [];
      }
    }
    
    // Process new uploaded files
    let newPhotosData = [];
    if (req.files && req.files.length > 0) {
      newPhotosData = req.files.map(file => ({
        id: Date.now() + Math.random(),
        filename: file.filename,
        originalname: file.originalname,
        path: `/uploads/images/${file.filename}`,
        mimetype: file.mimetype,
        size: file.size
      }));
    }
    
    // Combine existing photos (if provided) and new photos
    let finalPhotos = [];
    
    // If existing_photos is provided, parse and use it, otherwise keep current photos
    if (existing_photos) {
      try {
        const parsed = typeof existing_photos === 'string' ? JSON.parse(existing_photos) : existing_photos;
        finalPhotos = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        finalPhotos = existingPhotos;
      }
    } else {
      finalPhotos = existingPhotos;
    }
    
    // Add new photos
    finalPhotos = [...finalPhotos, ...newPhotosData];
    
    // Parse involved_parties if it's a string
    let partiesJson = null;
    if (involved_parties) {
      try {
        const parties = typeof involved_parties === 'string' ? JSON.parse(involved_parties) : involved_parties;
        partiesJson = JSON.stringify(parties);
      } catch (e) {
        partiesJson = JSON.stringify([]);
      }
    }
    
    // Convert photos to JSON string
    const photosJson = finalPhotos.length > 0 ? JSON.stringify(finalPhotos) : null;
    
    // Validate and normalize date_reported and time_reported
    const normalizedDateReported = date_reported && date_reported.trim() !== '' ? date_reported.trim() : null;
    const normalizedTimeReported = time_reported && time_reported.trim() !== '' ? time_reported.trim() : null;
    
    const [columns] = await db.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = current_database() AND TABLE_NAME = 'incident_reports'
    `);
    const hasReviewStatus = columns.map(c => c.COLUMN_NAME).includes('review_status');

    let updateFields = [
      'incident_id = ?', 'ride_name = ?', 'incident_type = ?', 'severity = ?', 'description = ?',
      'date_reported = ?', 'time_reported = ?', 'status = ?', 'resolution = ?',
      'photos = ?', 'involved_parties = ?', 'injuries = ?', 'property_damage = ?', 'other_impact = ?',
      'response = ?', 'actions_taken = ?', 'follow_up = ?', 'recommendations = ?'
    ];
    let updateValues = [
      incident_id, ride_name, incident_type, severity, description,
      normalizedDateReported, normalizedTimeReported, status, resolution,
      photosJson, partiesJson, injuries || null, property_damage || null, other_impact || null,
      response || null, actions_taken || null, follow_up || null, recommendations || null
    ];

    if (hasReviewStatus && review_status !== undefined && review_status !== null && isOperationsManager) {
      const allowedStatuses = ['Approved', 'Disapproved', 'Pending'];
      if (allowedStatuses.includes(review_status)) {
        updateFields.push('review_status = ?');
        updateValues.push(review_status);
      }
    }

    updateValues.push(req.params.id);
    await db.execute(
      `UPDATE incident_reports SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    res.json({ message: 'Incident report updated successfully' });
  } catch (error) {
    console.error('Update incident error:', error);
    
    // Delete uploaded files if there was an error
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        const filePath = path.join(uploadsDir, file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }
    
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Delete incident report
app.delete('/api/incidents/:id', authenticateToken, async (req, res) => {
  try {
    // Get incident photos before deleting
    const [incident] = await db.execute('SELECT photos FROM incident_reports WHERE id = ?', [req.params.id]);
    
    // Delete the incident from database
    await db.execute('DELETE FROM incident_reports WHERE id = ?', [req.params.id]);
    
    // Delete associated image files
    if (incident && incident[0] && incident[0].photos) {
      try {
        const photos = JSON.parse(incident[0].photos);
        photos.forEach(photo => {
          if (photo.filename) {
            const filePath = path.join(uploadsDir, photo.filename);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          }
        });
      } catch (e) {
        console.error('Error deleting photo files:', e);
      }
    }
    
    res.json({ message: 'Incident report deleted successfully' });
  } catch (error) {
    console.error('Delete incident error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a single photo from an incident
app.delete('/api/incidents/:id/photos/:photoId', authenticateToken, async (req, res) => {
  try {
    const [incident] = await db.execute('SELECT photos FROM incident_reports WHERE id = ?', [req.params.id]);
    
    if (!incident || !incident[0]) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    
    let photos = [];
    if (incident[0].photos) {
      try {
        photos = JSON.parse(incident[0].photos);
      } catch (e) {
        photos = [];
      }
    }
    
    // Find and remove the photo
    const photoIndex = photos.findIndex(p => p.id == req.params.photoId);
    if (photoIndex === -1) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    const photoToDelete = photos[photoIndex];
    
    // Delete the file from filesystem
    if (photoToDelete.filename) {
      const filePath = path.join(uploadsDir, photoToDelete.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    // Remove from array
    photos.splice(photoIndex, 1);
    
    // Update database
    const photosJson = photos.length > 0 ? JSON.stringify(photos) : null;
    await db.execute('UPDATE incident_reports SET photos = ? WHERE id = ?', [photosJson, req.params.id]);
    
    res.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('Delete photo error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== SPARE PARTS ROUTES ====================

// Get spare parts
app.get('/api/spare-parts', authenticateToken, async (req, res) => {
  try {
    const [parts] = await db.execute('SELECT * FROM spare_parts ORDER BY created_at DESC');
    res.json(parts);
  } catch (error) {
    console.error('Get spare parts error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create spare part
app.post('/api/spare-parts', authenticateToken, async (req, res) => {
  try {
    const { part_name, part_number, category, ride, quantity, unit, location, supplier, cost, status } = req.body;

    const [result] = await db.execute(
      'INSERT INTO spare_parts (part_name, part_number, category, ride, quantity, unit, location, supplier, cost, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [part_name, part_number, category, ride || '', quantity || 0, unit, location, supplier, cost, status || 'Available']
    );

    res.json({ id: result.insertId, message: 'Spare part created successfully' });
  } catch (error) {
    console.error('Create spare part error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update spare part
app.put('/api/spare-parts/:id', authenticateToken, async (req, res) => {
  try {
    const { part_name, part_number, category, ride, quantity, unit, location, supplier, cost, status, notes, approval_status } = req.body;

    // Check if notes and approval_status columns exist
    const [columns] = await db.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = current_database()
      AND TABLE_NAME = 'spare_parts'
    `);

    const columnNames = columns.map(col => col.COLUMN_NAME);
    const hasNotes = columnNames.includes('notes');
    const hasApprovalStatus = columnNames.includes('approval_status');
    const hasRide = columnNames.includes('ride');

    // Build update query dynamically based on available columns
    let updateFields = ['part_name', 'part_number', 'category', 'quantity', 'unit', 'location', 'supplier', 'cost', 'status'];
    let updateValues = [part_name, part_number, category, quantity, unit, location, supplier, cost, status];

    if (hasRide) {
      updateFields.push('ride');
      updateValues.push(ride || '');
    }

    if (hasNotes) {
      updateFields.push('notes');
      if (!hasApprovalStatus && approval_status !== undefined && approval_status !== null) {
        updateValues.push(JSON.stringify({ approvalStatus: approval_status, notes: notes || '' }));
      } else {
        updateValues.push(notes ?? null);
      }
    }

    if (hasApprovalStatus && approval_status !== undefined && approval_status !== null) {
      updateFields.push('approval_status');
      updateValues.push(approval_status);
      console.log(`Updating spare part ${req.params.id} with approval_status: ${approval_status}`);
    } else if (!hasApprovalStatus && approval_status !== undefined && approval_status !== null && !hasNotes) {
      console.warn('approval_status column does not exist in spare_parts table');
    }

    updateValues.push(req.params.id);

    const updateQuery = `UPDATE spare_parts SET ${updateFields.map(f => `${f} = ?`).join(', ')} WHERE id = ?`;
    await db.execute(updateQuery, updateValues);

    res.json({ message: 'Spare part updated successfully' });
  } catch (error) {
    console.error('Update spare part error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete spare part
app.delete('/api/spare-parts/:id', authenticateToken, async (req, res) => {
  try {
    await db.execute('DELETE FROM spare_parts WHERE id = ?', [req.params.id]);
    res.json({ message: 'Spare part deleted successfully' });
  } catch (error) {
    console.error('Delete spare part error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== RIDE REPAIRS ROUTES ====================

// Get all ride repairs
app.get('/api/ride-repairs', authenticateToken, async (req, res) => {
  try {
    const [repairs] = await db.execute('SELECT * FROM ride_repairs ORDER BY date DESC, created_at DESC');
    res.json(repairs);
  } catch (error) {
    console.error('Get ride repairs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create ride repair
app.post('/api/ride-repairs', authenticateToken, async (req, res) => {
  try {
    const { ride, date, issue, parts_replaced, cost, technician, status, notes } = req.body;
    const userId = req.user?.id || null;
    
    const [result] = await db.execute(
      'INSERT INTO ride_repairs (ride, date, issue, parts_replaced, cost, technician, status, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [ride, date, issue, parts_replaced || null, cost || 0, technician, status || 'In Progress', notes || null, userId]
    );

    res.json({ id: result.insertId, message: 'Ride repair created successfully' });
  } catch (error) {
    console.error('Create ride repair error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update ride repair
app.put('/api/ride-repairs/:id', authenticateToken, async (req, res) => {
  try {
    const { ride, date, issue, parts_replaced, cost, technician, status, notes } = req.body;
    
    await db.execute(
      'UPDATE ride_repairs SET ride = ?, date = ?, issue = ?, parts_replaced = ?, cost = ?, technician = ?, status = ?, notes = ? WHERE id = ?',
      [ride, date, issue, parts_replaced || null, cost || 0, technician, status, notes || null, req.params.id]
    );

    res.json({ message: 'Ride repair updated successfully' });
  } catch (error) {
    console.error('Update ride repair error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete ride repair
app.delete('/api/ride-repairs/:id', authenticateToken, async (req, res) => {
  try {
    await db.execute('DELETE FROM ride_repairs WHERE id = ?', [req.params.id]);
    res.json({ message: 'Ride repair deleted successfully' });
  } catch (error) {
    console.error('Delete ride repair error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== PART DEPLOYMENTS ROUTES ====================

// Get all part deployments
app.get('/api/part-deployments', authenticateToken, async (req, res) => {
  try {
    const [deployments] = await db.execute('SELECT * FROM part_deployments ORDER BY date DESC, created_at DESC');
    res.json(deployments);
  } catch (error) {
    console.error('Get part deployments error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create part deployment
app.post('/api/part-deployments', authenticateToken, async (req, res) => {
  try {
    const { date, place, ride, parts, quantity, status, encoded_by } = req.body;
    const userId = req.user?.id || null;
    
    const [result] = await db.execute(
      'INSERT INTO part_deployments (date, place, ride, parts, quantity, status, encoded_by, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [date, place, ride, parts, quantity, status || 'Complete', encoded_by, userId]
    );

    res.json({ id: result.insertId, message: 'Part deployment created successfully' });
  } catch (error) {
    console.error('Create part deployment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update part deployment
app.put('/api/part-deployments/:id', authenticateToken, async (req, res) => {
  try {
    const { date, place, ride, parts, quantity, status, encoded_by } = req.body;
    
    await db.execute(
      'UPDATE part_deployments SET date = ?, place = ?, ride = ?, parts = ?, quantity = ?, status = ?, encoded_by = ? WHERE id = ?',
      [date, place, ride, parts, quantity, status, encoded_by, req.params.id]
    );

    res.json({ message: 'Part deployment updated successfully' });
  } catch (error) {
    console.error('Update part deployment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete part deployment
app.delete('/api/part-deployments/:id', authenticateToken, async (req, res) => {
  try {
    await db.execute('DELETE FROM part_deployments WHERE id = ?', [req.params.id]);
    res.json({ message: 'Part deployment deleted successfully' });
  } catch (error) {
    console.error('Delete part deployment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== PART REMOVALS ROUTES ====================

// Get all part removals
app.get('/api/part-removals', authenticateToken, async (req, res) => {
  try {
    const [removals] = await db.execute('SELECT * FROM part_removals ORDER BY date DESC, created_at DESC');
    res.json(removals);
  } catch (error) {
    console.error('Get part removals error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create part removal
app.post('/api/part-removals', authenticateToken, async (req, res) => {
  try {
    const { date, place, ride, parts, quantity, status, encoded_by } = req.body;
    const userId = req.user?.id || null;
    
    const [result] = await db.execute(
      'INSERT INTO part_removals (date, place, ride, parts, quantity, status, encoded_by, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [date, place, ride, parts, quantity, status || 'Complete', encoded_by, userId]
    );

    res.json({ id: result.insertId, message: 'Part removal created successfully' });
  } catch (error) {
    console.error('Create part removal error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update part removal
app.put('/api/part-removals/:id', authenticateToken, async (req, res) => {
  try {
    const { date, place, ride, parts, quantity, status, encoded_by } = req.body;
    
    await db.execute(
      'UPDATE part_removals SET date = ?, place = ?, ride = ?, parts = ?, quantity = ?, status = ?, encoded_by = ? WHERE id = ?',
      [date, place, ride, parts, quantity, status, encoded_by, req.params.id]
    );

    res.json({ message: 'Part removal updated successfully' });
  } catch (error) {
    console.error('Update part removal error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete part removal
app.delete('/api/part-removals/:id', authenticateToken, async (req, res) => {
  try {
    await db.execute('DELETE FROM part_removals WHERE id = ?', [req.params.id]);
    res.json({ message: 'Part removal deleted successfully' });
  } catch (error) {
    console.error('Delete part removal error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== MERCHANDISE ROUTES ====================

// Get merchandise
app.get('/api/merchandise', authenticateToken, async (req, res) => {
  try {
    const [merchandise] = await db.execute('SELECT * FROM merchandise ORDER BY created_at DESC');
    res.json(merchandise);
  } catch (error) {
    console.error('Get merchandise error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== RIDES ROUTES ====================

// Get rides
app.get('/api/rides', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM rides ORDER BY name ASC');
    res.json(rows);
  } catch (error) {
    console.error('Get rides error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create ride
app.post('/api/rides', authenticateToken, async (req, res) => {
  try {
    const { name, status } = req.body;
    await db.execute('INSERT INTO rides (name, status) VALUES (?, ?)', [name, status || 'operational']);
    res.json({ message: 'Ride created successfully' });
  } catch (error) {
    console.error('Create ride error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Ride name already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Alias: some clients may call singular path
app.post('/api/ride', authenticateToken, async (req, res) => {
  try {
    const { name, status } = req.body;
    await db.execute('INSERT INTO rides (name, status) VALUES (?, ?)', [name, status || 'operational']);
    res.json({ message: 'Ride created successfully' });
  } catch (error) {
    console.error('Create ride (alias) error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Ride name already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Update ride
app.put('/api/rides/:id', authenticateToken, async (req, res) => {
  try {
    const { name, status } = req.body;
    await db.execute('UPDATE rides SET name = ?, status = ? WHERE id = ?', [name, status || 'operational', req.params.id]);
    res.json({ message: 'Ride updated successfully' });
  } catch (error) {
    console.error('Update ride error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete ride
app.delete('/api/rides/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT name FROM rides WHERE id = ?', [req.params.id]);
    const rideName = rows[0]?.name;

    await db.execute('DELETE FROM rides WHERE id = ?', [req.params.id]);

    if (rideName) {
      await db.execute('DELETE FROM spare_parts WHERE category = ?', [rideName]);
    }

    res.json({ message: 'Ride deleted successfully' });
  } catch (error) {
    console.error('Delete ride error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Ride status map endpoints
app.get('/api/ride-status', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT name, status FROM rides');
    const map = {};
    rows.forEach(r => { map[r.name] = r.status || 'operational'; });
    res.json(map);
  } catch (e) {
    console.error('Get ride status error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/ride-status', authenticateToken, async (req, res) => {
  try {
    const { statuses } = req.body || {};
    if (!statuses || typeof statuses !== 'object') {
      return res.status(400).json({ error: 'Invalid statuses payload' });
    }
    for (const [name, status] of Object.entries(statuses)) {
      await db.execute('UPDATE rides SET status = ? WHERE name = ?', [status, name]);
    }
    res.json({ message: 'Ride statuses updated successfully' });
  } catch (e) {
    console.error('Update ride status error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== RIDE SCANS ROUTES ====================

// Get ride scans
app.get('/api/ride-scans', authenticateToken, async (req, res) => {
  try {
    const [scans] = await db.execute('SELECT * FROM ride_scans ORDER BY scanned_at DESC');
    res.json(scans);
  } catch (error) {
    console.error('Get ride scans error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create ride scan
app.post('/api/ride-scans', authenticateToken, async (req, res) => {
  try {
    const { qr_code, ride, type } = req.body;
    
    const [result] = await db.execute(
      'INSERT INTO ride_scans (qr_code, ride, type, scanned_by) VALUES (?, ?, ?, ?)',
      [qr_code, ride, type, req.user.id]
    );

    res.json({ id: result.insertId, message: 'Ride scan created successfully' });
  } catch (error) {
    console.error('Create ride scan error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete ride scan
app.delete('/api/ride-scans/:id', authenticateToken, async (req, res) => {
  try {
    await db.execute('DELETE FROM ride_scans WHERE id = ?', [req.params.id]);
    res.json({ message: 'Ride scan deleted successfully' });
  } catch (error) {
    console.error('Delete ride scan error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== RIDE ENTRIES ROUTES ====================

// Get ride entries with optional filters
app.get('/api/ride-entries', authenticateToken, async (req, res) => {
  try {
    const { date, rideId, rideName, enteredBy, entryType, startDate, endDate } = req.query;
    
    let query = 'SELECT * FROM ride_entries WHERE 1=1';
    const params = [];
    
    if (date) {
      query += ' AND entry_date = ?';
      params.push(date);
    }
    if (rideId) {
      query += ' AND ride_id = ?';
      params.push(rideId);
    }
    if (rideName) {
      query += ' AND ride_name LIKE ?';
      params.push(`%${rideName}%`);
    }
    if (enteredBy) {
      query += ' AND entered_by = ?';
      params.push(enteredBy);
    }
    if (entryType) {
      query += ' AND entry_type = ?';
      params.push(entryType);
    }
    if (startDate) {
      query += ' AND entry_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND entry_date <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY entry_timestamp DESC';
    
    const [entries] = await db.execute(query, params);
    res.json(entries);
  } catch (error) {
    console.error('Get ride entries error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get entries for a specific ride
app.get('/api/ride-entries/ride/:rideId', authenticateToken, async (req, res) => {
  try {
    const { rideId } = req.params;
    const { date, startDate, endDate, entryType } = req.query;
    
    let query = 'SELECT * FROM ride_entries WHERE ride_id = ?';
    const params = [rideId];
    
    if (date) {
      query += ' AND entry_date = ?';
      params.push(date);
    }
    if (startDate) {
      query += ' AND entry_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND entry_date <= ?';
      params.push(endDate);
    }
    if (entryType) {
      query += ' AND entry_type = ?';
      params.push(entryType);
    }
    
    query += ' ORDER BY entry_timestamp DESC';
    
    const [entries] = await db.execute(query, params);
    res.json(entries);
  } catch (error) {
    console.error('Get ride entries for ride error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get entries by user
app.get('/api/ride-entries/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { date, startDate, endDate } = req.query;
    
    let query = 'SELECT * FROM ride_entries WHERE entered_by = ?';
    const params = [userId];
    
    if (date) {
      query += ' AND entry_date = ?';
      params.push(date);
    }
    if (startDate) {
      query += ' AND entry_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND entry_date <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY entry_timestamp DESC';
    
    const [entries] = await db.execute(query, params);
    res.json(entries);
  } catch (error) {
    console.error('Get user ride entries error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new ride entry
app.post('/api/ride-entries', authenticateToken, async (req, res) => {
  try {
    const { rideId, rideName, customerCount, entryTime, entryDate, entryType, notes } = req.body;
    
    if (!rideId || !rideName || !customerCount || !entryTime || !entryDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const [result] = await db.execute(
      `INSERT INTO ride_entries (ride_id, ride_name, customer_count, entry_time, entry_date, entry_type, notes, entered_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [rideId, rideName, customerCount, entryTime, entryDate, entryType || 'manual', notes || null, req.user.id]
    );

    res.json({ id: result.insertId, message: 'Ride entry created successfully' });
  } catch (error) {
    console.error('Create ride entry error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update ride entry
app.put('/api/ride-entries/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { rideId, rideName, customerCount, entryTime, entryDate, entryType, notes } = req.body;
    
    if (!rideId || !rideName || !customerCount || !entryTime || !entryDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const [result] = await db.execute(
      `UPDATE ride_entries 
       SET ride_id = ?, ride_name = ?, customer_count = ?, entry_time = ?, entry_date = ?, entry_type = ?, notes = ?
       WHERE id = ?`,
      [rideId, rideName, customerCount, entryTime, entryDate, entryType || 'manual', notes || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Ride entry not found' });
    }

    res.json({ message: 'Ride entry updated successfully' });
  } catch (error) {
    console.error('Update ride entry error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete ride entry
app.delete('/api/ride-entries/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await db.execute('DELETE FROM ride_entries WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Ride entry not found' });
    }

    res.json({ message: 'Ride entry deleted successfully' });
  } catch (error) {
    console.error('Delete ride entry error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get daily summary
app.get('/api/ride-entries/summary', authenticateToken, async (req, res) => {
  try {
    const { date, rideId, startDate, endDate } = req.query;
    
    let query = 'SELECT * FROM daily_ride_summary WHERE 1=1';
    const params = [];
    
    if (date) {
      query += ' AND summary_date = ?';
      params.push(date);
    }
    if (rideId) {
      query += ' AND ride_id = ?';
      params.push(rideId);
    }
    if (startDate) {
      query += ' AND summary_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND summary_date <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY summary_date DESC, ride_name ASC';
    
    const [summaries] = await db.execute(query, params);
    res.json(summaries);
  } catch (error) {
    console.error('Get daily summary error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get ride statistics
app.get('/api/ride-entries/stats', authenticateToken, async (req, res) => {
  try {
    const { rideId, startDate, endDate, period } = req.query;
    
    let dateCondition = '';
    let params = [];
    
    if (period === 'today') {
      dateCondition = 'AND entry_date = CURDATE()';
    } else if (period === 'week') {
      dateCondition = 'AND entry_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
    } else if (period === 'month') {
      dateCondition = 'AND entry_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
    } else if (period === 'year') {
      dateCondition = 'AND entry_date >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)';
    } else if (startDate && endDate) {
      dateCondition = 'AND entry_date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }
    
    let rideCondition = '';
    if (rideId) {
      rideCondition = 'AND ride_id = ?';
      params.push(rideId);
    }
    
    const [stats] = await db.execute(`
      SELECT 
        ride_id,
        ride_name,
        COUNT(*) as total_entries,
        SUM(customer_count) as total_customers,
        AVG(customer_count) as avg_customers_per_entry,
        MIN(entry_time) as earliest_entry,
        MAX(entry_time) as latest_entry,
        COUNT(DISTINCT entry_date) as active_days
      FROM ride_entries 
      WHERE 1=1 ${dateCondition} ${rideCondition}
      GROUP BY ride_id, ride_name
      ORDER BY total_customers DESC
    `, params);
    
    res.json(stats);
  } catch (error) {
    console.error('Get ride stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Bulk create entries
app.post('/api/ride-entries/bulk', authenticateToken, async (req, res) => {
  try {
    const { entries } = req.body;
    
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'Entries array is required' });
    }
    
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      for (const entry of entries) {
        const { rideId, rideName, customerCount, entryTime, entryDate, entryType, notes } = entry;
        
        if (!rideId || !rideName || !customerCount || !entryTime || !entryDate) {
          throw new Error('Missing required fields in entry');
        }
        
        await connection.execute(
          `INSERT INTO ride_entries (ride_id, ride_name, customer_count, entry_time, entry_date, entry_type, notes, entered_by) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [rideId, rideName, customerCount, entryTime, entryDate, entryType || 'manual', notes || null, req.user.id]
        );
      }
      
      await connection.commit();
      res.json({ message: `${entries.length} ride entries created successfully` });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Bulk create ride entries error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'ARMS API is running' });
});

// API root info
app.get('/api', (req, res) => {
  res.json({
    name: 'ARMS API',
    status: 'ok',
    health: '/api/health',
    auth: {
      login: '/api/auth/login',
      me: '/api/auth/me'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ API available at http://localhost:${PORT}/api`);
});

