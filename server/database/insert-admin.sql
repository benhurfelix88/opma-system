-- Insert Admin User for ARMS System
-- Run this in phpMyAdmin SQL tab or MySQL command line
-- Make sure database 'arms_system' exists first!

USE arms_system;

-- Delete existing admin user if exists (to avoid duplicates)
DELETE FROM users WHERE username = 'admin';

-- Insert default admin user
-- Username: admin
-- Password: Admin@123
-- Role: IT Admin
-- Status: approved
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

-- Verify admin user was created
SELECT id, username, email, full_name, role, status FROM users WHERE username = 'admin';

