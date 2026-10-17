# Insert Admin User into Database

This guide will help you insert the admin user so you can log in to the system.

## Login Credentials (After Insertion)

- **Username:** `admin`
- **Password:** `Admin@123`
- **Role:** IT Admin

---

## Method 1: Using MySQL Command Line (Easiest if phpMyAdmin not working)

### Step 1: Open MySQL Command Line

**Option A: Using XAMPP Shell**
1. Open XAMPP Control Panel
2. Click **"Shell"** button at the bottom
3. Type: `mysql.exe -u root`
4. Press Enter

**Option B: Using Windows Command Prompt**
1. Open Command Prompt
2. Navigate to MySQL bin folder:
   ```bash
   cd C:\xampp\mysql\bin
   ```
3. Run MySQL:
   ```bash
   mysql.exe -u root
   ```

### Step 2: Create Database (if not exists)

```sql
CREATE DATABASE IF NOT EXISTS arms_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE arms_system;
```

### Step 3: Create Users Table (if not exists)

Copy and paste this entire block:

```sql
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    mobile_number VARCHAR(20),
    role ENUM('IT Admin', 'IT Encoder', 'Operations Manager', 'Amusement Park Personnel') NOT NULL,
    department VARCHAR(255),
    assigned_ride VARCHAR(255),
    security_question VARCHAR(255),
    security_answer VARCHAR(255),
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Step 4: Insert Admin User

Copy and paste this:

```sql
DELETE FROM users WHERE username = 'admin';

INSERT INTO users (
    username, 
    password, 
    email, 
    full_name, 
    role, 
    status
) VALUES (
    'admin',
    'Admin@123',
    'admin@arms-system.com',
    'System Administrator',
    'IT Admin',
    'approved'
);
```

### Step 5: Verify Admin User

```sql
SELECT id, username, email, full_name, role, status FROM users WHERE username = 'admin';
```

You should see:
```
+----+----------+------------------------+---------------------+----------+----------+
| id | username | email                  | full_name           | role     | status   |
+----+----------+------------------------+---------------------+----------+----------+
|  1 | admin    | admin@arms-system.com | System Administrator | IT Admin | approved |
+----+----------+------------------------+---------------------+----------+----------+
```

### Step 6: Exit MySQL

```sql
exit;
```

---

## Method 2: Using SQL File (If you can access phpMyAdmin later)

1. Open file: `server/database/insert-admin.sql` in Notepad
2. Copy all contents
3. In phpMyAdmin → SQL tab → Paste → Click "Go"

---

## Method 3: One-Line Insert (Quick Fix)

If database and table already exist, just run this in MySQL:

```sql
USE arms_system;
DELETE FROM users WHERE username = 'admin';
INSERT INTO users (username, password, email, full_name, role, status) VALUES ('admin', 'Admin@123', 'admin@arms-system.com', 'System Administrator', 'IT Admin', 'approved');
```

---

## Method 4: Using Node.js Script (Automated)

I've created a helper script. Run this:

```bash
cd server
node insert-admin.js
```

(Note: You'll need to create this script if it doesn't exist)

---

## Verification Steps

After inserting the admin user:

1. **Verify in MySQL:**
   ```sql
   USE arms_system;
   SELECT * FROM users WHERE username = 'admin';
   ```

2. **Test Login:**
   - Start backend: `cd server && npm start`
   - Start frontend: `npm start`
   - Go to: http://localhost:3000
   - Login with:
     - Username: `admin`
     - Password: `Admin@123`

---

## Troubleshooting

### Error: "Unknown database 'arms_system'"

**Solution:** Create database first:
```sql
CREATE DATABASE arms_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Error: "Table 'users' doesn't exist"

**Solution:** Create users table (see Method 1, Step 3 above)

### Error: "Duplicate entry 'admin'"

**Solution:** Delete existing admin first:
```sql
DELETE FROM users WHERE username = 'admin';
```

Then insert again.

### Can't Access phpMyAdmin

**Solution:** Use Method 1 (MySQL Command Line) instead.

---

## Quick Copy-Paste Commands

If database and table already exist, just run this:

```sql
USE arms_system;
DELETE FROM users WHERE username = 'admin';
INSERT INTO users (username, password, email, full_name, role, status) VALUES ('admin', 'Admin@123', 'admin@arms-system.com', 'System Administrator', 'IT Admin', 'approved');
SELECT * FROM users WHERE username = 'admin';
```

---

## After Insertion

1. **Restart Backend:**
   ```bash
   cd server
   npm start
   ```

2. **Test Login:**
   - Go to: http://localhost:3000
   - Username: `admin`
   - Password: `Admin@123`

---

**That's it! You can now log in to the system.** ✅

