document.addEventListener('DOMContentLoaded', () => {
    initializeTicketing();
    setupQRCode();
    loadTicketingData();
});

function initializeTicketing() {
    // Update date and time
    const updateDateTime = () => {
        const now = new Date();
        document.getElementById('current-date').textContent = now.toLocaleDateString();
        document.getElementById('current-time').textContent = now.toLocaleTimeString();
    };
    
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Load initial restrictions
    document.getElementById('restrictions').textContent = 'Height must be at least 4 feet';
    
    // Load available rides
    const rides = ['Ferris Wheel', 'Viking', 'Caterpillar', 'Fun Slide'];
    document.getElementById('available-rides').textContent = rides.join(', ');
}

function setupQRCode() {
    // In a real application, this would generate a QR code based on the current date and available rides
    // For now, we'll just use a placeholder image
    const qrCode = document.querySelector('.qr-code img');
    if (qrCode) {
        qrCode.src = '../public/images/qr-placeholder.png';
    }
}

function loadTicketingData() {
    // Load monitoring data
    updateMonitoringTable();
    
    // Load counter data
    updateCountersTable();
    
    // Set up auto-refresh
    setInterval(() => {
        updateMonitoringTable();
        updateCountersTable();
    }, 30000); // Refresh every 30 seconds
}

function updateMonitoringTable() {
    // In a real application, this would fetch data from an API
    const monitoringData = [
        {
            ride: 'Ride A',
            entry: 'QR code/Time/Rest',
            exit: 'QR code/Time/Rest'
        },
        {
            ride: 'Ride B',
            entry: '-',
            exit: '-'
        },
        {
            ride: 'Ride C',
            entry: '-',
            exit: '-'
        }
    ];
    
    const tbody = document.querySelector('.monitoring-table tbody');
    if (tbody) {
        tbody.innerHTML = monitoringData.map(data => `
            <tr>
                <td>${data.ride}</td>
                <td>${data.entry}</td>
                <td>${data.exit}</td>
            </tr>
        `).join('');
    }
}

function updateCountersTable() {
    // In a real application, this would fetch data from an API
    const counterData = {
        total: {
            entry: 250,
            exit: 250
        },
        rides: [
            { name: 'Ride A', entry: 100, exit: 100 },
            { name: 'Ride B', entry: 75, exit: 75 },
            { name: 'Ride C', entry: 75, exit: 75 }
        ]
    };
    
    const tbody = document.querySelector('.counters-table tbody');
    if (tbody) {
        let html = `
            <tr>
                <td class="total">${counterData.total.entry}</td>
                <td class="total">${counterData.total.entry}</td>
                <td class="total">${counterData.total.exit}</td>
            </tr>
        `;
        
        html += counterData.rides.map(ride => `
            <tr>
                <td>${ride.name}:</td>
                <td>${ride.entry}</td>
                <td>${ride.exit}</td>
            </tr>
        `).join('');
        
        tbody.innerHTML = html;
    }
}

// Event Listeners for expand buttons
document.querySelectorAll('.expand-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const section = e.target.closest('section');
        section.classList.toggle('expanded');
        
        // Update button text
        const isExpanded = section.classList.contains('expanded');
        e.target.textContent = isExpanded ? '⌃' : '□';
    });
}); 