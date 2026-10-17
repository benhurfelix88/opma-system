document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }

    // Redirect admin to admin dashboard
    if (currentUser.role === 'it_admin') {
        window.location.href = 'admin-dashboard.html';
        return;
    }

    // Set user info
    document.getElementById('userName').textContent = currentUser.fullName;
    document.getElementById('userRole').textContent = formatRole(currentUser.role);

    // Load role-specific menu and content
    loadMenuItems(currentUser.role);
    loadDashboardContent(currentUser.role, currentUser.department);
});

function formatRole(role) {
    const roleMap = {
        'it_encoder': 'IT Encoder',
        'park_personnel': 'Park Personnel',
        'operations_manager': 'Operations Manager'
    };
    return roleMap[role] || role;
}

function loadMenuItems(role) {
    const navMenu = document.querySelector('.nav-menu');
    const menuItems = getRoleMenuItems(role);
    
    navMenu.innerHTML = menuItems.map(item => `
        <a href="#" class="nav-item ${item.id === 'dashboard' ? 'active' : ''}" data-page="${item.id}">
            ${item.label}
        </a>
    `).join('') + '<a href="#" class="nav-item logout">Logout</a>';

    // Add event listeners
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            if (item.classList.contains('logout')) {
                handleLogout();
            } else {
                handleNavigation(item.dataset.page);
            }
        });
    });
}

function getRoleMenuItems(role) {
    const menuItems = {
        'it_encoder': [
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'encode-data', label: 'Encode Data' },
            { id: 'view-records', label: 'View Records' },
            { id: 'reports', label: 'Reports' }
        ],
        'park_personnel': [
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'scan-tickets', label: 'Scan Tickets' },
            { id: 'merchandise', label: 'Merchandise' },
            { id: 'maintenance', label: 'Maintenance' }
        ],
        'operations_manager': [
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'analytics', label: 'Analytics' },
            { id: 'reports', label: 'Reports' },
            { id: 'inventory', label: 'Inventory' },
            { id: 'staff', label: 'Staff Management' }
        ]
    };
    
    return menuItems[role] || [];
}

function loadDashboardContent(role, department) {
    const content = document.getElementById('dashboardContent');
    
    switch (role) {
        case 'it_encoder':
            content.innerHTML = getEncoderContent();
            break;
        case 'park_personnel':
            content.innerHTML = getPersonnelContent(department);
            break;
        case 'operations_manager':
            content.innerHTML = getManagerContent();
            break;
        default:
            content.innerHTML = '<p>Welcome to your dashboard!</p>';
    }
}

function getEncoderContent() {
    return `
        <div class="content-section">
            <h2>Data Entry Dashboard</h2>
            <div class="quick-stats">
                <div class="stat-card">
                    <h3>Today's Entries</h3>
                    <p class="stat-number">0</p>
                </div>
                <div class="stat-card">
                    <h3>Pending Reviews</h3>
                    <p class="stat-number">0</p>
                </div>
                <div class="stat-card">
                    <h3>Total Records</h3>
                    <p class="stat-number">0</p>
                </div>
            </div>
            <div class="recent-activity">
                <h3>Recent Activity</h3>
                <div class="activity-list">
                    <p>No recent activity</p>
                </div>
            </div>
        </div>
    `;
}

function getPersonnelContent(department) {
    let content = '';
    switch (department) {
        case 'ticket_booth_a':
        case 'ticket_booth_b':
        case 'ticket_booth_c':
            content = `
                <div class="content-section">
                    <h2>Ticket Booth Dashboard</h2>
                    <div class="quick-stats">
                        <div class="stat-card">
                            <h3>Today's Sales</h3>
                            <p class="stat-number">₱0</p>
                        </div>
                        <div class="stat-card">
                            <h3>Tickets Sold</h3>
                            <p class="stat-number">0</p>
                        </div>
                        <div class="stat-card">
                            <h3>Active Tickets</h3>
                            <p class="stat-number">0</p>
                        </div>
                    </div>
                    <div class="ticket-actions">
                        <button class="btn-primary">New Sale</button>
                        <button class="btn-secondary">View Sales History</button>
                    </div>
                </div>
            `;
            break;
        case 'ride_maintenance':
            content = `
                <div class="content-section">
                    <h2>Maintenance Dashboard</h2>
                    <div class="maintenance-overview">
                        <div class="stat-card">
                            <h3>Active Issues</h3>
                            <p class="stat-number">0</p>
                        </div>
                        <div class="stat-card">
                            <h3>Scheduled Maintenance</h3>
                            <p class="stat-number">0</p>
                        </div>
                    </div>
                    <div class="maintenance-actions">
                        <button class="btn-primary">Report Issue</button>
                        <button class="btn-secondary">View Schedule</button>
                    </div>
                </div>
            `;
            break;
        case 'inventory_monitoring':
            content = `
                <div class="content-section">
                    <h2>Inventory Dashboard</h2>
                    <div class="inventory-overview">
                        <div class="stat-card">
                            <h3>Low Stock Items</h3>
                            <p class="stat-number">0</p>
                        </div>
                        <div class="stat-card">
                            <h3>Pending Orders</h3>
                            <p class="stat-number">0</p>
                        </div>
                    </div>
                    <div class="inventory-actions">
                        <button class="btn-primary">Update Inventory</button>
                        <button class="btn-secondary">View Reports</button>
                    </div>
                </div>
            `;
            break;
        default:
            content = `
                <div class="content-section">
                    <h2>Park Personnel Dashboard</h2>
                    <p>Welcome to your dashboard!</p>
                </div>
            `;
    }
    return content;
}

function getManagerContent() {
    return `
        <div class="content-section">
            <h2>Operations Overview</h2>
            <div class="quick-stats">
                <div class="stat-card">
                    <h3>Today's Revenue</h3>
                    <p class="stat-number">₱0</p>
                </div>
                <div class="stat-card">
                    <h3>Visitor Count</h3>
                    <p class="stat-number">0</p>
                </div>
                <div class="stat-card">
                    <h3>Active Staff</h3>
                    <p class="stat-number">0</p>
                </div>
                <div class="stat-card">
                    <h3>Open Issues</h3>
                    <p class="stat-number">0</p>
                </div>
            </div>
            <div class="chart-container">
                <h3>Daily Visitor Trends</h3>
                <p>No data available</p>
            </div>
            <div class="recent-reports">
                <h3>Recent Reports</h3>
                <p>No recent reports</p>
            </div>
        </div>
    `;
}

function handleNavigation(page) {
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to clicked item
    const activeItem = document.querySelector(`[data-page="${page}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }
    
    // For now, just show an alert
    alert('This feature is coming soon!');
}

function handleLogout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
} 