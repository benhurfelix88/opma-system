document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in and is admin
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || currentUser.role !== 'it_admin') {
        window.location.href = 'index.html';
        return;
    }

    // Set admin name
    document.getElementById('adminName').textContent = currentUser.fullName;

    // Initialize dashboard
    loadMenuItems();
    loadUsers();
    setupEventListeners();
});

function loadMenuItems() {
    const navMenu = document.querySelector('.nav-menu');
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'user-management', label: 'User Management' },
        { id: 'incidents', label: 'Incident Reports' },
        { id: 'parts-inventory', label: 'Parts Inventory' },
        { id: 'supplies', label: 'Supplies' },
        { id: 'merchandise', label: 'Merchandise' },
        { id: 'ticketing', label: 'Ticketing' }
    ];
    
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

function loadUsers() {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const statusFilter = document.getElementById('statusFilter').value;
    const roleFilter = document.getElementById('roleFilter').value;
    const searchQuery = document.getElementById('searchUser').value.toLowerCase();

    const filteredUsers = users.filter(user => {
        const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        const matchesSearch = user.fullName.toLowerCase().includes(searchQuery) ||
                            user.username.toLowerCase().includes(searchQuery) ||
                            user.email.toLowerCase().includes(searchQuery);
        return matchesStatus && matchesRole && matchesSearch;
    });

    displayUsers(filteredUsers);
}

function displayUsers(users) {
    const tableBody = document.getElementById('usersTableBody');
    tableBody.innerHTML = '';

    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.fullName}</td>
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td>${formatRole(user.role)}</td>
            <td>${user.department || '-'}</td>
            <td><span class="status-badge status-${user.status}">${user.status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-view" onclick="viewUser('${user.username}')">View</button>
                    ${user.status === 'pending' ? `
                        <button class="btn-approve" onclick="updateUserStatus('${user.username}', 'approved')">Approve</button>
                        <button class="btn-reject" onclick="updateUserStatus('${user.username}', 'rejected')">Reject</button>
                    ` : ''}
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function formatRole(role) {
    const roleMap = {
        'it_admin': 'IT Admin',
        'it_encoder': 'IT Encoder',
        'park_personnel': 'Park Personnel',
        'operations_manager': 'Operations Manager'
    };
    return roleMap[role] || role;
}

function setupEventListeners() {
    // Filter and search handlers
    document.getElementById('statusFilter').addEventListener('change', loadUsers);
    document.getElementById('roleFilter').addEventListener('change', loadUsers);
    document.getElementById('searchUser').addEventListener('input', loadUsers);

    // Logout handler
    document.querySelector('.logout').addEventListener('click', () => {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    });

    // Modal close handler
    document.querySelector('.close-btn').addEventListener('click', hideModal);
    document.querySelector('.btn-cancel').addEventListener('click', hideModal);
}

function viewUser(username) {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.username === username);
    
    if (user) {
        document.getElementById('modalFullName').textContent = user.fullName;
        document.getElementById('modalUsername').textContent = user.username;
        document.getElementById('modalEmail').textContent = user.email;
        document.getElementById('modalRole').textContent = formatRole(user.role);
        document.getElementById('modalDepartment').textContent = user.department || '-';
        document.getElementById('modalStatus').textContent = user.status;

        const modal = document.getElementById('userActionModal');
        modal.classList.add('active');
    }
}

function hideModal() {
    const modal = document.getElementById('userActionModal');
    modal.classList.remove('active');
}

function updateUserStatus(username, newStatus) {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = users.findIndex(u => u.username === username);
    
    if (userIndex !== -1) {
        users[userIndex].status = newStatus;
        localStorage.setItem('users', JSON.stringify(users));
        loadUsers(); // Refresh the table
        hideModal();
    }
}

// Prevent navigation to other pages for now
document.querySelectorAll('.nav-item:not(.logout)').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        if (!item.classList.contains('active')) {
            alert('This feature is coming soon!');
        }
    });
}); 