// Initialize admin account if it doesn't exist
document.addEventListener('DOMContentLoaded', () => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    // Check if admin account exists
    const adminExists = users.some(user => user.role === 'it_admin' && user.username === 'admin');
    
    if (!adminExists) {
        // Create admin account
        const adminUser = {
            fullName: 'System Administrator',
            username: 'admin',
            email: 'admin@arms-system.com',
            password: 'Admin@123', // This is a temporary password that should be changed on first login
            mobileNumber: '1234567890',
            role: 'it_admin',
            department: '',
            securityQuestion: 'city',
            securityAnswer: 'admin',
            status: 'approved'
        };
        
        users.push(adminUser);
        localStorage.setItem('users', JSON.stringify(users));
        console.log('Admin account created successfully');
    }
}); 