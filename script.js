document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loginContainer = document.querySelector('.login-container');
    const dashboardContainer = document.querySelector('.dashboard-container');
    const sidebarLinks = document.querySelectorAll('.sidebar a');
    const pages = document.querySelectorAll('.page');
    const excelFileInput = document.getElementById('excel-file');
    const stockTableBody = document.querySelector('#stock-table tbody');
    const addStockForm = document.getElementById('add-stock-form');
    const nameInput = document.getElementById('name');
    const categoryInput = document.getElementById('category');
    const initialStockInput = document.getElementById('initial-stock');
    const categoryFilter = document.getElementById('category-filter');
    const stockInForm = document.getElementById('stock-in-form');
    const stockInProductSelect = document.getElementById('stock-in-product');
    const stockInHistoryTableBody = document.querySelector('#stock-in-history-table tbody');
    const orderDetailsForm = document.getElementById('order-details-form');
    const addToOrderForm = document.getElementById('add-to-order-form');
    const stockOutCategorySelect = document.getElementById('stock-out-category');
    const stockOutProductSelect = document.getElementById('stock-out-product');
    const stockOutQuantityInput = document.getElementById('stock-out-quantity');
    const currentOrderTableBody = document.querySelector('#current-order-table tbody');
    const submitOrderBtn = document.getElementById('submit-order-btn');
    const orderHistoryTableBody = document.querySelector('#order-history-table tbody');
    const orderDateInput = document.getElementById('order-date');

    let refCounter = 1;
    let stockData = [];
    let stockInHistory = [];
    let orderHistory = [];
    let currentOrder = [];
    let stockInIdCounter = 1;
    let orderIdCounter = 1;

    if (sidebarLinks.length > 0) {
        sidebarLinks[0].parentElement.classList.add('active');
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (username === 'admin' && password === 'admin') {
            loginContainer.style.display = 'none';
            dashboardContainer.style.display = 'flex';
            pages[0].style.display = 'block';
        } else {
            alert('Invalid username or password');
        }
    });

    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            sidebarLinks.forEach(l => l.parentElement.classList.remove('active'));
            link.parentElement.classList.add('active');

            const targetId = link.getAttribute('href').substring(1);
            pages.forEach(page => {
                page.style.display = page.id === targetId ? 'block' : 'none';
            });
            if (targetId === 'stock-in') {
                updateStockInProductSelect();
            } else if (targetId === 'stock-out') {
                setOrderDate();
                updateStockOutCategorySelect();
            }
        });
    });

    excelFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();

        reader.onload = (event) => {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            populateTable(jsonData);
        };

        reader.readAsArrayBuffer(file);
    });

    addStockForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newName = nameInput.value.trim();
        if (stockData.some(product => product.name.toLowerCase() === newName.toLowerCase())) {
            alert('A product with this name already exists.');
            return;
        }

        const newProduct = {
            name: newName,
            category: categoryInput.value,
            refNo: refCounter++,
            initialStock: parseInt(initialStockInput.value),
            stockIn: 0,
            stockOut: 0,
        };
        stockData.push(newProduct);
        renderStockTable();
        updateCategoryFilter();
        addStockForm.reset();
        nameInput.focus();
    });

    stockInForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const supplierName = document.getElementById('supplier-name').value;
        const productName = stockInProductSelect.value;
        const quantity = parseInt(document.getElementById('stock-in-quantity').value);

        if (productName && quantity > 0) {
            const product = stockData.find(p => p.name === productName);
            if (product) {
                product.stockIn += quantity;
                addStockInToHistory(supplierName, productName, quantity);
                renderStockTable();
                stockInForm.reset();
            } else {
                alert('Product not found!');
            }
        } else {
            alert('Please select a product and enter a valid quantity.');
        }
    });

    addToOrderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const productName = stockOutProductSelect.value;
        const quantity = parseInt(stockOutQuantityInput.value);

        if (productName && quantity > 0) {
            currentOrder.push({ product: productName, quantity: quantity });
            renderCurrentOrder();
            addToOrderForm.reset();
        } else {
            alert('Please select a product and enter a valid quantity.');
        }
    });

    submitOrderBtn.addEventListener('click', () => {
        if (currentOrder.length === 0) {
            alert('Please add products to the order first.');
            return;
        }

        const orderDetails = {
            id: orderIdCounter++,
            date: new Date(),
            takenBy: document.getElementById('order-taken-by').value,
            customerName: document.getElementById('customer-name').value,
            customerContact: document.getElementById('customer-contact').value,
            address: document.getElementById('address').value,
            remarks: document.getElementById('remarks').value,
            products: [...currentOrder]
        };

        orderHistory.push(orderDetails);

        currentOrder.forEach(item => {
            const product = stockData.find(p => p.name === item.product);
            if (product) {
                product.stockOut += item.quantity;
            }
        });

        currentOrder = [];
        renderCurrentOrder();
        renderStockTable();
        renderOrderHistory();
        orderDetailsForm.reset();
        setOrderDate();
    });

    stockOutCategorySelect.addEventListener('change', () => {
        updateStockOutProductSelect();
    });

    categoryFilter.addEventListener('change', () => {
        renderStockTable();
    });

    function populateTable(data) {
        const newStockData = data.slice(1).map(rowData => ({
            name: rowData[0],
            category: rowData[1],
            refNo: refCounter++,
            initialStock: parseInt(rowData[2]),
            stockIn: 0,
            stockOut: 0,
        }));

        newStockData.forEach(newProduct => {
            if (!stockData.some(existingProduct => existingProduct.name.toLowerCase() === newProduct.name.toLowerCase())) {
                stockData.push(newProduct);
            }
        });

        renderStockTable();
        updateCategoryFilter();
    }

    function renderStockTable() {
        stockTableBody.innerHTML = '';
        const selectedCategory = categoryFilter.value;
        stockData
            .filter(product => selectedCategory === 'all' || product.category === selectedCategory)
            .forEach(product => {
                const tableRow = createTableRow(product);
                stockTableBody.appendChild(tableRow);
            });
    }

    function createTableRow(product) {
        const row = document.createElement('tr');
        const finalStock = product.initialStock + product.stockIn - product.stockOut;
        row.dataset.category = product.category;

        row.innerHTML = `
            <td>${product.name}</td>
            <td>${product.category}</td>
            <td>${product.refNo}</td>
            <td>${product.initialStock}</td>
            <td>${finalStock}</td>
            <td class="actions-cell">
                <div class="dropdown">
                    <button class="dropdown-toggle"><i class="fas fa-ellipsis-h"></i></button>
                    <div class="dropdown-menu">
                        <button class="edit-btn"><i class="fas fa-edit"></i> Edit</button>
                        <button class="delete-btn"><i class="fas fa-trash"></i> Delete</button>
                    </div>
                </div>
            </td>
        `;

        if (finalStock <= 10) {
            row.classList.add('low-stock');
        }

        row.querySelector('.edit-btn').addEventListener('click', () => editRow(row, product));
        row.querySelector('.delete-btn').addEventListener('click', () => deleteRow(product.refNo));
        row.querySelector('.dropdown-toggle').addEventListener('click', () => {
            row.querySelector('.dropdown-menu').classList.toggle('show');
        });

        return row;
    }

    function formatAmPm(date) {
        let hours = date.getHours();
        let minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        minutes = minutes < 10 ? '0' + minutes : minutes;
        return `${date.toLocaleDateString()} ${hours}:${minutes} ${ampm}`;
    }

    function setOrderDate() {
        orderDateInput.value = formatAmPm(new Date());
    }

    function addStockInToHistory(supplier, product, quantity) {
        const newStockIn = {
            id: stockInIdCounter++,
            date: new Date(),
            supplier: supplier,
            product: product,
            quantity: quantity
        };
        stockInHistory.push(newStockIn);
        renderStockInHistory();
    }

    function renderStockInHistory() {
        stockInHistoryTableBody.innerHTML = '';
        stockInHistory.forEach(stockIn => {
            const historyRow = document.createElement('tr');
            historyRow.innerHTML = `
                <td>${formatAmPm(stockIn.date)}</td>
                <td>${stockIn.supplier}</td>
                <td>${stockIn.product}</td>
                <td>${stockIn.quantity}</td>
                <td class="actions-cell">
                    <button class="delete-stock-in-btn"><i class="fas fa-trash"></i> Delete</button>
                </td>
            `;
            historyRow.querySelector('.delete-stock-in-btn').addEventListener('click', () => deleteStockIn(stockIn.id));
            stockInHistoryTableBody.appendChild(historyRow);
        });
    }

    function deleteStockIn(stockInId) {
        if (!confirm('Are you sure you want to delete this stock in entry?')) {
            return;
        }

        const stockInIndex = stockInHistory.findIndex(s => s.id === stockInId);
        if (stockInIndex > -1) {
            const stockInEntry = stockInHistory[stockInIndex];
            const product = stockData.find(p => p.name === stockInEntry.product);

            if (product) {
                product.stockIn -= stockInEntry.quantity;
            }

            stockInHistory.splice(stockInIndex, 1);
            renderStockTable();
            renderStockInHistory();
        }
    }

    function renderCurrentOrder() {
        currentOrderTableBody.innerHTML = '';
        currentOrder.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.product}</td>
                <td>${item.quantity}</td>
                <td class="actions-cell">
                    <button class="delete-order-item-btn"><i class="fas fa-trash"></i></button>
                </td>
            `;
            row.querySelector('.delete-order-item-btn').addEventListener('click', () => {
                currentOrder.splice(index, 1);
                renderCurrentOrder();
            });
            currentOrderTableBody.appendChild(row);
        });
    }

    function renderOrderHistory() {
        orderHistoryTableBody.innerHTML = '';
        orderHistory.forEach(order => {
            const row = document.createElement('tr');
            const totalItems = order.products.reduce((sum, item) => sum + item.quantity, 0);
            row.innerHTML = `
                <td>${order.id}</td>
                <td>${formatAmPm(order.date)}</td>
                <td>${order.customerName}</td>
                <td>${totalItems}</td>
                <td class="actions-cell">
                    <button class="view-order-details-btn"><i class="fas fa-eye"></i> View</button>
                    <button class="delete-order-btn"><i class="fas fa-trash"></i> Delete</button>
                </td>
            `;
            row.querySelector('.view-order-details-btn').addEventListener('click', () => viewOrderDetails(order.id));
            row.querySelector('.delete-order-btn').addEventListener('click', () => deleteOrder(order.id));
            orderHistoryTableBody.appendChild(row);
        });
    }

    function viewOrderDetails(orderId) {
        const order = orderHistory.find(o => o.id === orderId);
        if (order) {
            let details = `Order ID: ${order.id}\n`;
            details += `Date: ${formatAmPm(order.date)}\n`;
            details += `Customer: ${order.customerName}\n`;
            details += `Contact: ${order.customerContact}\n`;
            details += `Address: ${order.address}\n`;
            details += `Remarks: ${order.remarks}\n\n`;
            details += 'Products:\n';
            order.products.forEach(item => {
                details += `- ${item.product}: ${item.quantity}\n`;
            });
            alert(details);
        }
    }

    function deleteOrder(orderId) {
        if (!confirm('Are you sure you want to delete this order? This will also add the stock back.')) {
            return;
        }

        const orderIndex = orderHistory.findIndex(o => o.id === orderId);
        if (orderIndex > -1) {
            const order = orderHistory[orderIndex];
            order.products.forEach(item => {
                const product = stockData.find(p => p.name === item.product);
                if (product) {
                    product.stockOut -= item.quantity;
                }
            });
            orderHistory.splice(orderIndex, 1);
            renderStockTable();
            renderOrderHistory();
        }
    }

    function editRow(row, product) {
        const cells = row.querySelectorAll('td');
        const actionButton = row.querySelector('.edit-btn');

        if (!row.classList.contains('editing-row')) {
            row.classList.add('editing-row');
            row.querySelector('.dropdown-menu').classList.remove('show');
            cells[0].contentEditable = true;
            cells[1].contentEditable = true;
            cells[3].contentEditable = true;
            actionButton.innerHTML = '<i class="fas fa-save"></i> Save';
        } else {
            row.classList.remove('editing-row');
            cells[0].contentEditable = false;
            cells[1].contentEditable = false;
            cells[3].contentEditable = false;
            actionButton.innerHTML = '<i class="fas fa-edit"></i> Edit';

            const newName = cells[0].textContent.trim();
            if (stockData.some(p => p.name.toLowerCase() === newName.toLowerCase() && p.refNo !== product.refNo)) {
                alert('A product with this name already exists.');
                cells[0].textContent = product.name; // Revert to old name
                return;
            }

            product.name = newName;
            product.category = cells[1].textContent;
            product.initialStock = parseInt(cells[3].textContent);
            renderStockTable();
            updateCategoryFilter();
        }
    }

    function deleteRow(refNo) {
        if (confirm('Are you sure you want to delete this stock item?')) {
            stockData = stockData.filter(p => p.refNo !== refNo);
            renderStockTable();
            updateCategoryFilter();
        }
    }

    function updateCategoryFilter() {
        const categories = [...new Set(stockData.map(p => p.category))];
        const currentFilterValue = categoryFilter.value;
        categoryFilter.innerHTML = '<option value="all">All</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });
        categoryFilter.value = currentFilterValue;
    }

    function updateStockInProductSelect() {
        stockInProductSelect.innerHTML = '<option value="">Select Product</option>';
        stockData.forEach(product => {
            const option = document.createElement('option');
            option.value = product.name;
            option.textContent = product.name;
            stockInProductSelect.appendChild(option);
        });
    }

    function updateStockOutCategorySelect() {
        const categories = [...new Set(stockData.map(p => p.category))];
        stockOutCategorySelect.innerHTML = '<option value="">Select Category</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            stockOutCategorySelect.appendChild(option);
        });
    }

    function updateStockOutProductSelect() {
        const selectedCategory = stockOutCategorySelect.value;
        stockOutProductSelect.innerHTML = '<option value="">Select Product</option>';
        stockData
            .filter(product => product.category === selectedCategory)
            .forEach(product => {
                const option = document.createElement('option');
                option.value = product.name;
                option.textContent = product.name;
                stockOutProductSelect.appendChild(option);
            });
    }

    window.addEventListener('click', (e) => {
        document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
            if (!menu.parentElement.contains(e.target)) {
                menu.classList.remove('show');
            }
        });
    });
});
