document.addEventListener('DOMContentLoaded', () => {
    initializePartsInventory();
    setupEventListeners();
});

function initializePartsInventory() {
    // Load initial data for the selected ride
    loadPartsData('Caterpillar');
}

function loadPartsData(rideName) {
    // In a real application, this would fetch data from an API
    const partsData = {
        'Caterpillar': [
            { name: 'Rails', dateInspected: '02/23/25', status: 'Good' },
            { name: 'Caro/wagon', dateInspected: '02/23/25', status: 'Bad' },
            { name: 'Center Pole', dateInspected: '02/23/25', status: 'Good' },
            { name: 'Spokes', dateInspected: '02/23/25', status: 'Bad' },
            { name: 'Harness/Handle bars', dateInspected: '02/23/25', status: 'Good' }
        ],
        'Ferris Wheel': [
            { name: 'Motor', dateInspected: '02/23/25', status: 'Good' },
            { name: 'Wheel Frame', dateInspected: '02/23/25', status: 'Good' },
            { name: 'Cabins', dateInspected: '02/23/25', status: 'Bad' }
        ]
    };

    const parts = partsData[rideName] || [];
    updatePartsTable(parts);
}

function updatePartsTable(parts) {
    const tbody = document.querySelector('.parts-table tbody');
    if (!tbody) return;

    tbody.innerHTML = parts.map(part => `
        <tr>
            <td>${part.name}</td>
            <td>${part.dateInspected}</td>
            <td class="status-${part.status.toLowerCase()}">${part.status}</td>
            <td>
                <button class="edit-btn" data-part="${part.name}">Edit</button>
                <button class="delete-btn" data-part="${part.name}">Delete</button>
            </td>
        </tr>
    `).join('');
}

function setupEventListeners() {
    // Ride selection
    const rideButtons = document.querySelectorAll('.ride-btn');
    rideButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Update selection
            rideButtons.forEach(b => b.classList.remove('selected'));
            e.target.classList.add('selected');

            // Load parts data for selected ride
            loadPartsData(e.target.textContent);
        });
    });

    // Add new part
    const addPartBtn = document.querySelector('.add-part-btn');
    if (addPartBtn) {
        addPartBtn.addEventListener('click', () => {
            showModal('Add New Part');
        });
    }

    // Modal close button
    const closeBtn = document.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', hideModal);
    }

    // Modal cancel button
    const cancelBtn = document.querySelector('.cancel-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', hideModal);
    }

    // Part form submission
    const partForm = document.getElementById('partForm');
    if (partForm) {
        partForm.addEventListener('submit', handlePartFormSubmit);
    }

    // Edit and Delete buttons
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('edit-btn')) {
            const partName = e.target.dataset.part;
            handleEditPart(partName);
        } else if (e.target.classList.contains('delete-btn')) {
            const partName = e.target.dataset.part;
            handleDeletePart(partName);
        }
    });
}

function showModal(title = 'Add New Part', partData = null) {
    const modal = document.getElementById('partModal');
    const modalTitle = modal.querySelector('.modal-header h2');
    const form = document.getElementById('partForm');

    modalTitle.textContent = title;

    if (partData) {
        form.elements.partName.value = partData.name;
        form.elements.dateInspected.value = formatDateForInput(partData.dateInspected);
        form.elements.status.value = partData.status;
    } else {
        form.reset();
    }

    modal.classList.add('active');
}

function hideModal() {
    const modal = document.getElementById('partModal');
    modal.classList.remove('active');
}

function handlePartFormSubmit(e) {
    e.preventDefault();

    const formData = {
        name: e.target.elements.partName.value,
        dateInspected: e.target.elements.dateInspected.value,
        status: e.target.elements.status.value
    };

    // In a real application, this would be an API call
    console.log('Saving part:', formData);

    // Simulate successful save
    const selectedRide = document.querySelector('.ride-btn.selected').textContent;
    loadPartsData(selectedRide);

    hideModal();
}

function handleEditPart(partName) {
    // In a real application, this would fetch the part data from an API
    const partData = {
        name: partName,
        dateInspected: '02/23/25',
        status: 'Good'
    };

    showModal('Edit Part', partData);
}

function handleDeletePart(partName) {
    if (confirm(`Are you sure you want to delete ${partName}?`)) {
        // In a real application, this would be an API call
        console.log('Deleting part:', partName);

        // Simulate successful delete
        const selectedRide = document.querySelector('.ride-btn.selected').textContent;
        loadPartsData(selectedRide);
    }
}

function formatDateForInput(dateStr) {
    // Convert date string (MM/DD/YY) to YYYY-MM-DD for input[type="date"]
    const [month, day, year] = dateStr.split('/');
    return `20${year}-${month}-${day}`;
} 