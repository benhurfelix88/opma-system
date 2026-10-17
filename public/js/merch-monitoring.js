document.addEventListener('DOMContentLoaded', () => {
    initializeMerchMonitoring();
    setupEventListeners();
});

function initializeMerchMonitoring() {
    // Load initial data for the default game (Basketball)
    loadMerchData('Basketball');
}

function loadMerchData(gameName) {
    // Simulated data - In a real application, this would fetch from a backend
    const merchData = {
        'Basketball': [
            {
                itemDescription: 'Basketball - Size 7',
                inStockQty: 50,
                inStockDate: '05/15/23',
                outStockQty: 30,
                outStockDate: '05/20/23'
            },
            {
                itemDescription: 'Basketball Net',
                inStockQty: 20,
                inStockDate: '05/10/23',
                outStockQty: 15,
                outStockDate: '05/18/23'
            }
        ],
        'Ring Toss': [
            {
                itemDescription: 'Plastic Rings',
                inStockQty: 100,
                inStockDate: '05/12/23',
                outStockQty: 45,
                outStockDate: '05/19/23'
            },
            {
                itemDescription: 'Target Posts',
                inStockQty: 30,
                inStockDate: '05/08/23',
                outStockQty: 10,
                outStockDate: '05/16/23'
            }
        ]
    };

    // Update the selected game button
    document.querySelectorAll('.game-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.textContent.trim() === gameName);
    });

    // Update the merchandise table
    updateMerchTable(merchData[gameName] || []);
}

function updateMerchTable(items) {
    const tableBody = document.querySelector('.merch-table tbody');
    tableBody.innerHTML = '';

    items.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.itemDescription}</td>
            <td>
                <div>Qty: ${item.inStockQty}</div>
                <div>Date: ${item.inStockDate}</div>
            </td>
            <td>
                <div>Qty: ${item.outStockQty}</div>
                <div>Date: ${item.outStockDate}</div>
            </td>
            <td>
                <button class="edit-btn" onclick="handleEditItem('${item.itemDescription}')">Edit</button>
                <button class="delete-btn" onclick="handleDeleteItem('${item.itemDescription}')">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function setupEventListeners() {
    // Game selection buttons
    document.querySelectorAll('.game-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            loadMerchData(btn.textContent.trim());
        });
    });

    // Add item button
    document.querySelector('.add-item-btn').addEventListener('click', () => {
        showModal('Add New Item');
    });

    // Modal close button
    document.querySelector('.close-btn').addEventListener('click', hideModal);

    // Form submission
    document.querySelector('#merch-form').addEventListener('submit', handleFormSubmit);

    // Cancel button
    document.querySelector('.cancel-btn').addEventListener('click', hideModal);
}

function showModal(title, itemData = null) {
    const modal = document.querySelector('.modal');
    const modalTitle = document.querySelector('.modal-title');
    const form = document.querySelector('#merch-form');

    modalTitle.textContent = title;

    // Clear or populate form fields
    form.elements['itemDescription'].value = itemData ? itemData.itemDescription : '';
    form.elements['inStockQty'].value = itemData ? itemData.inStockQty : '';
    form.elements['inStockDate'].value = itemData ? formatDateForInput(itemData.inStockDate) : '';
    form.elements['outStockQty'].value = itemData ? itemData.outStockQty : '';
    form.elements['outStockDate'].value = itemData ? formatDateForInput(itemData.outStockDate) : '';

    modal.classList.add('active');
}

function hideModal() {
    const modal = document.querySelector('.modal');
    modal.classList.remove('active');
    document.querySelector('#merch-form').reset();
}

function handleFormSubmit(e) {
    e.preventDefault();

    // Get form data
    const formData = new FormData(e.target);
    const itemData = {
        itemDescription: formData.get('itemDescription'),
        inStockQty: formData.get('inStockQty'),
        inStockDate: formData.get('inStockDate'),
        outStockQty: formData.get('outStockQty'),
        outStockDate: formData.get('outStockDate')
    };

    // In a real application, this would be sent to a backend
    console.log('Saving item:', itemData);

    // Refresh the table with the selected game's data
    const selectedGame = document.querySelector('.game-btn.selected').textContent.trim();
    loadMerchData(selectedGame);

    hideModal();
}

function handleEditItem(itemDescription) {
    // In a real application, this would fetch the item's data from the backend
    const mockItemData = {
        itemDescription: itemDescription,
        inStockQty: 50,
        inStockDate: '05/15/23',
        outStockQty: 30,
        outStockDate: '05/20/23'
    };

    showModal('Edit Item', mockItemData);
}

function handleDeleteItem(itemDescription) {
    if (confirm(`Are you sure you want to delete ${itemDescription}?`)) {
        // In a real application, this would send a delete request to the backend
        console.log('Deleting item:', itemDescription);

        // Refresh the table
        const selectedGame = document.querySelector('.game-btn.selected').textContent.trim();
        loadMerchData(selectedGame);
    }
}

function formatDateForInput(dateStr) {
    // Convert MM/DD/YY to YYYY-MM-DD
    const [month, day, year] = dateStr.split('/');
    return `20${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
} 