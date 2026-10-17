document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        try {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const user = users.find(u => 
                (u.username === username || u.email === username) && 
                u.password === password
            );
            
            if (!user) {
                showError('Invalid username/email or password');
                return;
            }
            
            if (user.status !== 'approved') {
                showError('Your account is pending approval. Please wait for admin approval.');
                return;
            }
            
            // Store logged in user info (except password)
            const userInfo = { ...user };
            delete userInfo.password;
            localStorage.setItem('currentUser', JSON.stringify(userInfo));
            
            // Redirect based on role
            if (user.role === 'it_admin') {
                window.location.href = 'admin-dashboard.html';
            } else {
                window.location.href = 'dashboard.html';
            }
            
        } catch (error) {
            showError('An error occurred. Please try again later.');
            console.error('Login error:', error);
        }
    });
});

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    // Remove any existing error messages
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Insert error message after the form
    const form = document.getElementById('loginForm');
    form.insertAdjacentElement('afterend', errorDiv);
    
    // Remove error message after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
} 