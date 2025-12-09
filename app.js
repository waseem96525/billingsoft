/**
 * Retail Store Management App
 * Complete POS System with Firebase Backend
 */

(function() {
    'use strict';

    // =========================================
    // Configuration
    // =========================================
    const CONFIG = {
        currency: '₹',
        taxRate: 0.18,
        lowStockThreshold: 10,
        dateFormat: 'en-IN'
    };

    // =========================================
    // State Management
    // =========================================
    const State = {
        currentUser: null,
        currentView: 'dashboard',
        cart: [],
        darkMode: localStorage.getItem('darkMode') === 'true',
        isLoading: false,
        gstEnabled: localStorage.getItem('gstEnabled') !== 'false',
        userRole: null
    };

    // =========================================
    // Data Layer (Firebase Firestore)
    // =========================================
    const Data = {
        // Products
        getProducts: async () => {
            try {
                return await FirebaseDB.products.getAll();
            } catch (error) {
                console.error('Error getting products:', error);
                showToast('Error loading products', 'error');
                return [];
            }
        },

        addProduct: async (product) => {
            try {
                product.createdAt = new Date().toISOString();
                const id = await FirebaseDB.products.add(product);
                showToast('Product added successfully!', 'success');
                return id;
            } catch (error) {
                console.error('Error adding product:', error);
                showToast('Error adding product', 'error');
                return null;
            }
        },

        updateProduct: async (id, updates) => {
            try {
                await FirebaseDB.products.update(id, updates);
                showToast('Product updated successfully!', 'success');
                return true;
            } catch (error) {
                console.error('Error updating product:', error);
                return false;
            }
        },

        deleteProduct: async (id) => {
            try {
                await FirebaseDB.products.delete(id);
                showToast('Product deleted successfully!', 'success');
                return true;
            } catch (error) {
                console.error('Error deleting product:', error);
                showToast('Error deleting product', 'error');
                return false;
            }
        },

        // Bills
        getBills: async () => {
            try {
                return await FirebaseDB.bills.getAll();
            } catch (error) {
                console.error('Error getting bills:', error);
                showToast('Error loading bills', 'error');
                return [];
            }
        },

        addBill: async (bill) => {
            try {
                bill.createdAt = new Date().toISOString();
                const id = await FirebaseDB.bills.add(bill);
                return id;
            } catch (error) {
                console.error('Error adding bill:', error);
                showToast('Error saving bill', 'error');
                return null;
            }
        },

        // Shop Settings
        getShopSettings: async () => {
            try {
                return await FirebaseDB.shop.get();
            } catch (error) {
                console.error('Error getting shop settings:', error);
                return {
                    name: 'My Store',
                    address: '',
                    phone: '',
                    email: '',
                    gstNumber: ''
                };
            }
        },

        saveShopSettings: async (settings) => {
            try {
                await FirebaseDB.shop.save(settings);
                showToast('Settings saved successfully!', 'success');
                return true;
            } catch (error) {
                console.error('Error saving shop settings:', error);
                showToast('Error saving settings', 'error');
                return false;
            }
        },

        // Users
        getUsers: async () => {
            try {
                return await FirebaseDB.users.getAll();
            } catch (error) {
                console.error('Error getting users:', error);
                showToast('Error loading users', 'error');
                return [];
            }
        },

        addUser: async (userData, password) => {
            try {
                // Create auth user
                const auth = firebase.auth();
                const userCredential = await auth.createUserWithEmailAndPassword(userData.email, password);
                const userId = userCredential.user.uid;

                // Save user data to Firestore
                userData.createdAt = new Date().toISOString();
                await FirebaseDB.users.update(userId, userData);

                showToast('User added successfully!', 'success');
                return userId;
            } catch (error) {
                console.error('Error adding user:', error);
                if (error.code === 'auth/email-already-in-use') {
                    showToast('Email already in use', 'error');
                } else if (error.code === 'auth/invalid-email') {
                    showToast('Invalid email address', 'error');
                } else if (error.code === 'auth/weak-password') {
                    showToast('Password is too weak', 'error');
                } else {
                    showToast('Error adding user', 'error');
                }
                return null;
            }
        },

        updateUser: async (id, updates) => {
            try {
                await FirebaseDB.users.update(id, updates);
                showToast('User updated successfully!', 'success');
                return true;
            } catch (error) {
                console.error('Error updating user:', error);
                showToast('Error updating user', 'error');
                return false;
            }
        },

        deleteUser: async (id) => {
            try {
                await FirebaseDB.users.delete(id);
                showToast('User deleted successfully!', 'success');
                return true;
            } catch (error) {
                console.error('Error deleting user:', error);
                showToast('Error deleting user', 'error');
                return false;
            }
        }
    };

    // =========================================
    // UI Helpers
    // =========================================
    function showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        toast.innerHTML = `
            <i class="fas ${icons[type] || icons.info}"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function showLoading() {
        State.isLoading = true;
        const loader = document.getElementById('loadingOverlay');
        if (loader) loader.classList.add('active');
    }

    function hideLoading() {
        State.isLoading = false;
        const loader = document.getElementById('loadingOverlay');
        if (loader) loader.classList.remove('active');
    }

    function formatCurrency(amount) {
        return `${CONFIG.currency}${parseFloat(amount).toFixed(2)}`;
    }

    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString(CONFIG.dateFormat, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    function generateBarcode() {
        return Math.floor(Math.random() * 9000000000000) + 1000000000000;
    }

    // =========================================
    // Authentication
    // =========================================
    async function checkAuthState() {
        return new Promise((resolve) => {
            firebase.auth().onAuthStateChanged(async (user) => {
                if (user) {
                    // Fetch user data from Firestore to get role
                    const userData = await FirebaseDB.users.get(user.uid);
                    const role = userData?.role || 'Cashier';
                    
                    State.currentUser = {
                        id: user.uid,
                        email: user.email,
                        name: user.displayName || user.email.split('@')[0],
                        role: role
                    };
                    State.userRole = role;
                    
                    showApp();
                    updateUIForRole(role);
                    await renderView('dashboard');
                } else {
                    State.currentUser = null;
                    State.userRole = null;
                    showAuth();
                }
                resolve(user);
            });
        });
    }

    async function login(email, password) {
        try {
            showLoading();
            await firebase.auth().signInWithEmailAndPassword(email, password);
            showToast('Welcome back!', 'success');
        } catch (error) {
            console.error('Login error:', error);
            let message = 'Login failed. Please try again.';
            if (error.code === 'auth/user-not-found') {
                message = 'No account found with this email.';
            } else if (error.code === 'auth/wrong-password') {
                message = 'Incorrect password.';
            } else if (error.code === 'auth/invalid-email') {
                message = 'Invalid email address.';
            }
            showToast(message, 'error');
        } finally {
            hideLoading();
        }
    }

    async function signup(name, email, password) {
        try {
            showLoading();
            const role = document.getElementById('signupRole').value;
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            
            // Update profile with name
            await userCredential.user.updateProfile({
                displayName: name
            });

            // Save user to Firestore with role
            await FirebaseDB.users.save(userCredential.user.uid, {
                name: name,
                email: email,
                role: role,
                createdAt: new Date().toISOString()
            });

            showToast('Account created successfully!', 'success');
        } catch (error) {
            console.error('Signup error:', error);
            let message = 'Signup failed. Please try again.';
            if (error.code === 'auth/email-already-in-use') {
                message = 'An account with this email already exists.';
            } else if (error.code === 'auth/weak-password') {
                message = 'Password should be at least 6 characters.';
            } else if (error.code === 'auth/invalid-email') {
                message = 'Invalid email address.';
            }
            showToast(message, 'error');
        } finally {
            hideLoading();
        }
    }

    async function logout() {
        try {
            await firebase.auth().signOut();
            State.currentUser = null;
            State.userRole = null;
            State.cart = [];
            showAuth();
            showToast('Logged out successfully', 'info');
        } catch (error) {
            console.error('Logout error:', error);
            showToast('Error logging out', 'error');
        }
    }

    function updateUIForRole(role) {
        const nav = document.getElementById('mainNav');
        if (!nav) return;

        // Hide/show menu items based on role
        const navButtons = nav.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            const view = btn.dataset.view;
            
            if (role === 'Cashier') {
                // Cashier can only access POS, Dashboard, and Barcode
                if (['inventory', 'reports', 'users', 'settings'].includes(view)) {
                    btn.style.display = 'none';
                } else {
                    btn.style.display = 'flex';
                }
            } else {
                // Admin has access to everything
                btn.style.display = 'flex';
            }
        });

        // Update user info display
        const userName = document.getElementById('userName');
        const userRole = document.getElementById('userRole');
        if (userName) userName.textContent = State.currentUser.name;
        if (userRole) {
            userRole.textContent = role;
            userRole.className = `badge ${role === 'Admin' ? 'badge-admin' : 'badge-cashier'}`;
        }
    }

    function showAuth() {
        document.getElementById('authView').style.display = 'flex';
        document.getElementById('appView').style.display = 'none';
    }

    function showApp() {
        document.getElementById('authView').style.display = 'none';
        document.getElementById('appView').style.display = 'flex';
    }

    // =========================================
    // Navigation
    // =========================================
    async function renderView(view) {
        State.currentView = view;

        // Update nav
        document.querySelectorAll('.nav-btn').forEach(item => {
            item.classList.toggle('active', item.dataset.view === view);
        });

        // Update main content
        document.querySelectorAll('.view').forEach(v => {
            v.classList.toggle('active', v.id === `${view}View`);
        });

        // Close mobile menu
        closeMobileMenu();

        // Render view content
        switch (view) {
            case 'dashboard':
                await renderDashboard();
                break;
            case 'pos':
                await renderPOS();
                break;
            case 'inventory':
                await renderInventory();
                break;
            case 'reports':
                await renderReports();
                break;
            case 'users':
                await renderUsers();
                break;
            case 'barcode':
                await renderBarcodeGenerator();
                break;
            case 'settings':
                await renderSettings();
                break;
        }
    }

    // =========================================
    // Dashboard
    // =========================================
    async function renderDashboard() {
        showLoading();
        
        const products = await Data.getProducts();
        const bills = await Data.getBills();
        
        // Calculate stats
        const today = new Date().toDateString();
        const todayBills = bills.filter(b => new Date(b.createdAt).toDateString() === today);
        const todaySales = todayBills.reduce((sum, b) => sum + b.total, 0);
        
        const totalProducts = products.length;
        const lowStock = products.filter(p => p.quantity <= CONFIG.lowStockThreshold).length;
        const totalValue = products.reduce((sum, p) => sum + (p.price * p.quantity), 0);

        // Update stats
        document.getElementById('todaySales').textContent = formatCurrency(todaySales);
        document.getElementById('totalProducts').textContent = totalProducts;
        document.getElementById('lowStockCount').textContent = lowStock;
        document.getElementById('inventoryValue').textContent = formatCurrency(totalValue);

        if (State.userRole === 'Cashier') {
            // Cashier dashboard - focus on today's sales and quick actions
            const recentList = document.getElementById('recentTransactions');
            if (recentList) {
                const recent = todayBills.slice(-5).reverse();
                recentList.innerHTML = recent.length ? recent.map(bill => `
                    <div class="transaction-item">
                        <div class="transaction-info">
                            <strong>Bill #${bill.id.slice(-6).toUpperCase()}</strong>
                            <span>${formatDate(bill.createdAt)}</span>
                        </div>
                        <div class="transaction-amount">${formatCurrency(bill.total)}</div>
                    </div>
                `).join('') : '<p class="empty-state">No transactions today</p>';
            }

            const alertsList = document.getElementById('lowStockAlerts');
            if (alertsList) {
                alertsList.innerHTML = `
                    <div style="text-align:center;padding:20px;color:var(--text-muted);">
                        <i class="fas fa-lock" style="font-size:32px;margin-bottom:8px;"></i>
                        <p>Contact admin for inventory details</p>
                    </div>
                `;
            }
        } else {
            // Admin dashboard - full access
            const recentList = document.getElementById('recentTransactions');
            if (recentList) {
                const recent = bills.slice(-5).reverse();
                recentList.innerHTML = recent.length ? recent.map(bill => `
                    <div class="transaction-item">
                        <div class="transaction-info">
                            <strong>Bill #${bill.id.slice(-6).toUpperCase()}</strong>
                            <span>${formatDate(bill.createdAt)}</span>
                        </div>
                        <div class="transaction-amount">${formatCurrency(bill.total)}</div>
                    </div>
                `).join('') : '<p class="empty-state">No recent transactions</p>';
            }

            const alertsList = document.getElementById('lowStockAlerts');
            if (alertsList) {
                const lowStockProducts = products.filter(p => p.quantity <= CONFIG.lowStockThreshold);
                alertsList.innerHTML = lowStockProducts.length ? lowStockProducts.map(p => `
                    <div class="alert-item ${p.quantity === 0 ? 'critical' : ''}">
                        <div class="alert-info">
                            <strong>${p.name}</strong>
                            <span>${p.quantity} left in stock</span>
                        </div>
                        <span class="alert-badge">${p.quantity === 0 ? 'Out of Stock' : 'Low Stock'}</span>
                    </div>
                `).join('') : '<p class="empty-state">All products are well stocked</p>';
            }
        }

        hideLoading();
    }

    // =========================================
    // POS (Point of Sale)
    // =========================================
    async function renderPOS() {
        showLoading();
        
        const products = await Data.getProducts();
        const grid = document.getElementById('posProducts');
        
        if (grid) {
            grid.innerHTML = products.length ? products.map(p => `
                <div class="product-card ${p.quantity === 0 ? 'out-of-stock' : ''}" 
                     onclick="${p.quantity > 0 ? `window.addToCart('${p.id}')` : ''}">
                    <div class="product-name">${p.name}</div>
                    <div class="product-price">${formatCurrency(p.price)}</div>
                    <div class="product-stock">${p.quantity} in stock</div>
                    ${p.quantity === 0 ? '<div class="out-badge">OUT OF STOCK</div>' : ''}
                </div>
            `).join('') : '<p class="empty-state">No products available. Add products in Inventory.</p>';
        }

        renderCart();
        hideLoading();
    }

    window.addToCart = async function(productId) {
        const products = await Data.getProducts();
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const existingItem = State.cart.find(item => item.id === productId);
        
        if (existingItem) {
            if (existingItem.quantity >= product.quantity) {
                showToast('Cannot add more. Stock limit reached.', 'warning');
                return;
            }
            existingItem.quantity++;
        } else {
            State.cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                quantity: 1,
                maxQuantity: product.quantity
            });
        }

        renderCart();
        showToast(`${product.name} added to cart`, 'success');
    };

    window.updateCartQuantity = function(productId, change) {
        const item = State.cart.find(i => i.id === productId);
        if (!item) return;

        const newQty = item.quantity + change;
        
        if (newQty <= 0) {
            State.cart = State.cart.filter(i => i.id !== productId);
        } else if (newQty > item.maxQuantity) {
            showToast('Stock limit reached', 'warning');
            return;
        } else {
            item.quantity = newQty;
        }

        renderCart();
    };

    window.removeFromCart = function(productId) {
        State.cart = State.cart.filter(i => i.id !== productId);
        renderCart();
    };

    window.toggleGST = function() {
        State.gstEnabled = !State.gstEnabled;
        localStorage.setItem('gstEnabled', State.gstEnabled);
        renderCart();
    };

    function renderCart() {
        const cartItems = document.getElementById('cartItems');
        const cartSubtotal = document.getElementById('cartSubtotal');
        const cartTax = document.getElementById('cartTax');
        const cartTotal = document.getElementById('cartTotal');
        const gstToggle = document.getElementById('gstToggle');

        if (!cartItems) return;

        if (State.cart.length === 0) {
            cartItems.innerHTML = '<p class="empty-cart">Cart is empty</p>';
            if (cartSubtotal) cartSubtotal.textContent = formatCurrency(0);
            if (cartTax) cartTax.textContent = formatCurrency(0);
            if (cartTotal) cartTotal.textContent = formatCurrency(0);
            return;
        }

        cartItems.innerHTML = State.cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${formatCurrency(item.price)}</div>
                </div>
                <div class="cart-item-controls">
                    <button class="qty-btn" onclick="updateCartQuantity('${item.id}', -1)">-</button>
                    <span class="qty-display">${item.quantity}</span>
                    <button class="qty-btn" onclick="updateCartQuantity('${item.id}', 1)">+</button>
                    <button class="remove-btn" onclick="removeFromCart('${item.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        const subtotal = State.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = State.gstEnabled ? subtotal * CONFIG.taxRate : 0;
        const total = subtotal + tax;

        if (gstToggle) {
            gstToggle.checked = State.gstEnabled;
        }

        if (cartSubtotal) cartSubtotal.textContent = formatCurrency(subtotal);
        if (cartTax) cartTax.textContent = formatCurrency(tax);
        if (cartTotal) cartTotal.textContent = formatCurrency(total);
    }

    window.openCheckout = function() {
        if (State.cart.length === 0) {
            showToast('Cart is empty', 'warning');
            return;
        }

        const subtotal = State.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = State.gstEnabled ? subtotal * CONFIG.taxRate : 0;
        const total = subtotal + tax;

        document.getElementById('checkoutSubtotal').textContent = formatCurrency(subtotal);
        document.getElementById('checkoutTax').textContent = formatCurrency(tax);
        document.getElementById('checkoutTotal').textContent = formatCurrency(total);
        document.getElementById('amountPaid').value = '';
        document.getElementById('changeAmount').textContent = formatCurrency(0);

        const modal = document.getElementById('checkoutModal');
        modal.classList.remove('hidden');
        modal.classList.add('active');
    };

    window.closeCheckout = function() {
        const modal = document.getElementById('checkoutModal');
        modal.classList.remove('active');
        modal.classList.add('hidden');
    };

    window.calculateChange = function() {
        const subtotal = State.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = State.gstEnabled ? subtotal * CONFIG.taxRate : 0;
        const total = subtotal + tax;
        const paid = parseFloat(document.getElementById('amountPaid').value) || 0;
        const change = paid - total;
        document.getElementById('changeAmount').textContent = formatCurrency(Math.max(0, change));
    };

    window.completeSale = async function(e) {
        if (e) e.preventDefault();
        
        const subtotal = State.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = State.gstEnabled ? subtotal * CONFIG.taxRate : 0;
        const total = subtotal + tax;
        const paid = parseFloat(document.getElementById('amountPaid').value) || 0;
        const paymentMethod = document.getElementById('paymentMethod').value;

        if (paid < total) {
            showToast('Insufficient payment amount', 'error');
            return;
        }

        showLoading();

        // Create bill
        const bill = {
            id: generateId(),
            items: [...State.cart],
            subtotal: subtotal,
            tax: tax,
            gstApplied: State.gstEnabled,
            total: total,
            paid: paid,
            change: paid - total,
            paymentMethod: paymentMethod,
            createdAt: new Date().toISOString()
        };

        // Update product quantities
        const products = await Data.getProducts();
        const validProductIds = new Set(products.map(p => p.id));
        
        // Filter out invalid items from cart
        const validCartItems = State.cart.filter(item => validProductIds.has(item.id));
        const removedCount = State.cart.length - validCartItems.length;
        
        if (removedCount > 0) {
            console.warn(`Removed ${removedCount} invalid item(s) from cart`);
        }
        
        for (const item of validCartItems) {
            const product = products.find(p => p.id === item.id);
            if (product && product.quantity >= item.quantity) {
                const newQuantity = product.quantity - item.quantity;
                await Data.updateProduct(item.id, {
                    quantity: newQuantity
                });
            }
        }

        // Save bill
        await Data.addBill(bill);

        // Store last bill for printing
        window.lastBill = bill;

        // Clear cart
        State.cart = [];

        closeCheckout();
        showToast('Sale completed successfully!', 'success');
        
        // Auto print bill after checkout
        setTimeout(() => {
            printBill(bill);
        }, 500);

        await renderPOS();
        hideLoading();
    };

    window.printBill = function(bill) {
        if (!bill) {
            bill = window.lastBill;
        }
        if (!bill) {
            showToast('No bill to print', 'warning');
            return;
        }

        const shopSettings = JSON.parse(localStorage.getItem('shopSettings')) || {
            name: 'My Store',
            address: '',
            phone: '',
            gstNumber: ''
        };

        const printWindow = window.open('', '_blank', 'width=400,height=600');
        if (!printWindow) {
            showToast('Please allow pop-ups to print bills', 'warning');
            return;
        }
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Bill - ${bill.id}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: 'Courier New', monospace;
                        font-size: 12px;
                        padding: 10px;
                        max-width: 300px;
                        margin: 0 auto;
                    }
                    .header { text-align: center; margin-bottom: 15px; }
                    .shop-name { font-size: 18px; font-weight: bold; }
                    .divider { border-top: 1px dashed #000; margin: 10px 0; }
                    .bill-info { margin-bottom: 10px; }
                    .items { margin-bottom: 10px; }
                    .item { display: flex; justify-content: space-between; margin: 5px 0; }
                    .item-name { flex: 1; }
                    .item-qty { width: 40px; text-align: center; }
                    .item-price { width: 70px; text-align: right; }
                    .totals { margin-top: 10px; }
                    .total-row { display: flex; justify-content: space-between; margin: 3px 0; }
                    .grand-total { font-size: 14px; font-weight: bold; margin-top: 5px; }
                    .footer { text-align: center; margin-top: 20px; font-size: 11px; }
                    @media print {
                        body { padding: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="shop-name">${shopSettings.name}</div>
                    ${shopSettings.address ? `<div>${shopSettings.address}</div>` : ''}
                    ${shopSettings.phone ? `<div>Tel: ${shopSettings.phone}</div>` : ''}
                    ${shopSettings.gstNumber ? `<div>GST: ${shopSettings.gstNumber}</div>` : ''}
                </div>
                
                <div class="divider"></div>
                
                <div class="bill-info">
                    <div>Bill #: ${bill.id.slice(-8).toUpperCase()}</div>
                    <div>Date: ${new Date(bill.createdAt).toLocaleString()}</div>
                    <div>Payment: ${bill.paymentMethod.toUpperCase()}</div>
                </div>
                
                <div class="divider"></div>
                
                <div class="items">
                    <div class="item" style="font-weight: bold;">
                        <span class="item-name">Item</span>
                        <span class="item-qty">Qty</span>
                        <span class="item-price">Amount</span>
                    </div>
                    ${bill.items.map(item => `
                        <div class="item">
                            <span class="item-name">${item.name}</span>
                            <span class="item-qty">${item.quantity}</span>
                            <span class="item-price">${CONFIG.currency}${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
                
                <div class="divider"></div>
                
                <div class="totals">
                    <div class="total-row">
                        <span>Subtotal:</span>
                        <span>${CONFIG.currency}${bill.subtotal.toFixed(2)}</span>
                    </div>
                    ${bill.gstApplied ? `
                        <div class="total-row">
                            <span>GST (${(CONFIG.taxRate * 100).toFixed(0)}%):</span>
                            <span>${CONFIG.currency}${bill.tax.toFixed(2)}</span>
                        </div>
                    ` : ''}
                    <div class="total-row grand-total">
                        <span>TOTAL:</span>
                        <span>${CONFIG.currency}${bill.total.toFixed(2)}</span>
                    </div>
                    <div class="total-row">
                        <span>Paid:</span>
                        <span>${CONFIG.currency}${bill.paid.toFixed(2)}</span>
                    </div>
                    <div class="total-row">
                        <span>Change:</span>
                        <span>${CONFIG.currency}${bill.change.toFixed(2)}</span>
                    </div>
                </div>
                
                <div class="divider"></div>
                
                <div class="footer">
                    <p>Thank you for your purchase!</p>
                    <p>Please visit again</p>
                </div>
                
                <div class="no-print" style="text-align: center; margin-top: 20px;">
                    <button onclick="window.print()" style="padding: 10px 20px; cursor: pointer;">
                        Print Bill
                    </button>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    // =========================================
    // User Management
    // =========================================
    async function renderUsers() {
        showLoading();
        
        const users = await Data.getUsers();
        const tableBody = document.getElementById('usersTableBody');
        
        if (tableBody) {
            tableBody.innerHTML = users.length > 0 ? users.map(u => `
                <tr>
                    <td>${u.name || u.email}</td>
                    <td>${u.email}</td>
                    <td>
                        <span class="badge badge-${u.role === 'Admin' ? 'admin' : 'cashier'}">
                            ${u.role || 'Cashier'}
                        </span>
                    </td>
                    <td>${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</td>
                    <td>
                        <span class="badge ${u.status === 'active' ? 'badge-success' : 'badge-warning'}">
                            ${u.status || 'active'}
                        </span>
                    </td>
                    <td>
                        <button class="btn-icon" onclick="editUser('${u.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon danger" onclick="deleteUser('${u.id}')" title="Delete" ${u.id === State.currentUser?.uid ? 'disabled' : ''}>
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('') : '<tr><td colspan="6" class="empty-state">No users yet. Add your first user!</td></tr>';
        }

        hideLoading();
    }

    window.openAddUser = function() {
        document.getElementById('userModalTitle').textContent = 'Add User';
        document.getElementById('userForm').reset();
        document.getElementById('userId').value = '';
        document.getElementById('passwordGroup').style.display = 'block';
        document.getElementById('userPassword').required = true;
        document.getElementById('userStatus').value = 'active';
        const modal = document.getElementById('userModal');
        modal.classList.remove('hidden');
        modal.classList.add('active');
    };

    window.editUser = async function(id) {
        const users = await Data.getUsers();
        const user = users.find(u => u.id === id);
        
        if (!user) {
            showToast('User not found', 'error');
            return;
        }

        document.getElementById('userModalTitle').textContent = 'Edit User';
        document.getElementById('userId').value = id;
        document.getElementById('userFullName').value = user.name || '';
        document.getElementById('userEmail').value = user.email || '';
        document.getElementById('userEmail').disabled = true; // Can't change email
        document.getElementById('userRole').value = user.role || 'Cashier';
        document.getElementById('userStatus').value = user.status || 'active';
        document.getElementById('passwordGroup').style.display = 'none';
        document.getElementById('userPassword').required = false;
        
        const modal = document.getElementById('userModal');
        modal.classList.remove('hidden');
        modal.classList.add('active');
    };

    window.closeUserModal = function() {
        const modal = document.getElementById('userModal');
        modal.classList.remove('active');
        modal.classList.add('hidden');
        document.getElementById('userEmail').disabled = false;
    };

    window.saveUser = async function(e) {
        e.preventDefault();
        
        const id = document.getElementById('userId').value;
        const userData = {
            name: document.getElementById('userFullName').value,
            email: document.getElementById('userEmail').value,
            role: document.getElementById('userRole').value,
            status: document.getElementById('userStatus').value
        };

        if (id) {
            // Update existing user
            const success = await Data.updateUser(id, userData);
            if (success) {
                closeUserModal();
                await renderUsers();
            }
        } else {
            // Add new user
            const password = document.getElementById('userPassword').value;
            if (!password || password.length < 6) {
                showToast('Password must be at least 6 characters', 'error');
                return;
            }
            
            const userId = await Data.addUser(userData, password);
            if (userId) {
                closeUserModal();
                await renderUsers();
            }
        }
    };

    window.deleteUser = async function(id) {
        if (id === State.currentUser?.uid) {
            showToast('Cannot delete your own account', 'error');
            return;
        }

        if (!confirm('Are you sure you want to delete this user?')) {
            return;
        }

        const success = await Data.deleteUser(id);
        if (success) {
            await renderUsers();
        }
    };

    window.filterUsers = function() {
        const searchTerm = document.getElementById('userSearch')?.value.toLowerCase() || '';
        const roleFilter = document.getElementById('roleFilter')?.value || '';
        
        const rows = document.querySelectorAll('#usersTableBody tr');
        rows.forEach(row => {
            if (row.querySelector('.empty-state')) return;
            
            const name = row.cells[0]?.textContent.toLowerCase() || '';
            const email = row.cells[1]?.textContent.toLowerCase() || '';
            const role = row.cells[2]?.textContent.trim() || '';
            
            const matchesSearch = name.includes(searchTerm) || email.includes(searchTerm);
            const matchesRole = !roleFilter || role === roleFilter;
            
            row.style.display = matchesSearch && matchesRole ? '' : 'none';
        });
    };

    // =========================================
    // Inventory Management
    // =========================================
    async function renderInventory() {
        showLoading();
        
        const products = await Data.getProducts();
        const tableBody = document.getElementById('inventoryTableBody');
        
        if (tableBody) {
            tableBody.innerHTML = products.length ? products.map(p => `
                <tr class="${p.quantity <= CONFIG.lowStockThreshold ? 'low-stock' : ''}">
                    <td>${p.name}</td>
                    <td>${p.sku || '-'}</td>
                    <td>${p.category || '-'}</td>
                    <td>${formatCurrency(p.price)}</td>
                    <td>
                        <span class="stock-badge ${p.quantity === 0 ? 'out' : p.quantity <= CONFIG.lowStockThreshold ? 'low' : 'ok'}">
                            ${p.quantity}
                        </span>
                    </td>
                    <td>${p.barcode || '-'}</td>
                    <td>
                        <button class="btn-icon" onclick="editProduct('${p.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon danger" onclick="deleteProduct('${p.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('') : '<tr><td colspan="7" class="empty-state">No products yet. Add your first product!</td></tr>';
        }

        hideLoading();
    }

    window.openAddProduct = function() {
        document.getElementById('productModalTitle').textContent = 'Add Product';
        document.getElementById('productForm').reset();
        document.getElementById('productId').value = '';
        document.getElementById('productBarcode').value = generateBarcode();
        const modal = document.getElementById('productModal');
        modal.classList.remove('hidden');
        modal.classList.add('active');
    };

    window.closeProductModal = function() {
        const modal = document.getElementById('productModal');
        modal.classList.remove('active');
        modal.classList.add('hidden');
    };

    window.saveProduct = async function(e) {
        e.preventDefault();
        
        const id = document.getElementById('productId').value;
        const product = {
            name: document.getElementById('productName').value,
            sku: document.getElementById('productSku').value,
            category: document.getElementById('productCategory').value,
            price: parseFloat(document.getElementById('productPrice').value),
            quantity: parseInt(document.getElementById('productQuantity').value),
            barcode: document.getElementById('productBarcode').value
        };

        showLoading();

        if (id) {
            await Data.updateProduct(id, product);
        } else {
            await Data.addProduct(product);
        }

        closeProductModal();
        await renderInventory();
        hideLoading();
    };

    window.editProduct = async function(productId) {
        const products = await Data.getProducts();
        const product = products.find(p => p.id === productId);
        if (!product) return;

        document.getElementById('productModalTitle').textContent = 'Edit Product';
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productSku').value = product.sku || '';
        document.getElementById('productCategory').value = product.category || '';
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productQuantity').value = product.quantity;
        document.getElementById('productBarcode').value = product.barcode || '';

        const modal = document.getElementById('productModal');
        modal.classList.remove('hidden');
        modal.classList.add('active');
    };

    window.deleteProduct = async function(productId) {
        if (!confirm('Are you sure you want to delete this product?')) return;
        
        showLoading();
        await Data.deleteProduct(productId);
        await renderInventory();
        hideLoading();
    };

    window.filterInventory = async function() {
        const search = document.getElementById('inventorySearch').value.toLowerCase();
        const category = document.getElementById('categoryFilter').value;
        const stock = document.getElementById('stockFilter').value;

        const products = await Data.getProducts();
        
        let filtered = products.filter(p => {
            const matchSearch = p.name.toLowerCase().includes(search) || 
                              (p.sku && p.sku.toLowerCase().includes(search));
            const matchCategory = !category || p.category === category;
            
            let matchStock = true;
            if (stock === 'low') matchStock = p.quantity > 0 && p.quantity <= CONFIG.lowStockThreshold;
            else if (stock === 'out') matchStock = p.quantity === 0;
            else if (stock === 'ok') matchStock = p.quantity > CONFIG.lowStockThreshold;

            return matchSearch && matchCategory && matchStock;
        });

        const tableBody = document.getElementById('inventoryTableBody');
        if (tableBody) {
            tableBody.innerHTML = filtered.length ? filtered.map(p => `
                <tr class="${p.quantity <= CONFIG.lowStockThreshold ? 'low-stock' : ''}">
                    <td>${p.name}</td>
                    <td>${p.sku || '-'}</td>
                    <td>${p.category || '-'}</td>
                    <td>${formatCurrency(p.price)}</td>
                    <td>
                        <span class="stock-badge ${p.quantity === 0 ? 'out' : p.quantity <= CONFIG.lowStockThreshold ? 'low' : 'ok'}">
                            ${p.quantity}
                        </span>
                    </td>
                    <td>${p.barcode || '-'}</td>
                    <td>
                        <button class="btn-icon" onclick="editProduct('${p.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon danger" onclick="deleteProduct('${p.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('') : '<tr><td colspan="7" class="empty-state">No products match your filters</td></tr>';
        }
    };

    // =========================================
    // Reports
    // =========================================
    async function renderReports() {
        showLoading();
        
        const bills = await Data.getBills();
        const products = await Data.getProducts();

        // Calculate report data
        const now = new Date();
        const today = now.toDateString();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();

        const todayBills = bills.filter(b => new Date(b.createdAt).toDateString() === today);
        const monthBills = bills.filter(b => {
            const d = new Date(b.createdAt);
            return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
        });

        const todaySales = todayBills.reduce((sum, b) => sum + b.total, 0);
        const monthSales = monthBills.reduce((sum, b) => sum + b.total, 0);
        const totalSales = bills.reduce((sum, b) => sum + b.total, 0);
        const avgTransaction = bills.length ? totalSales / bills.length : 0;

        // Update report stats
        document.getElementById('reportTodaySales').textContent = formatCurrency(todaySales);
        document.getElementById('reportMonthSales').textContent = formatCurrency(monthSales);
        document.getElementById('reportTotalSales').textContent = formatCurrency(totalSales);
        document.getElementById('reportAvgTransaction').textContent = formatCurrency(avgTransaction);

        // Top selling products
        const productSales = {};
        bills.forEach(bill => {
            bill.items.forEach(item => {
                productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
            });
        });

        const topProducts = Object.entries(productSales)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        const topProductsList = document.getElementById('topProductsList');
        if (topProductsList) {
            topProductsList.innerHTML = topProducts.length ? topProducts.map(([name, qty], i) => `
                <div class="top-product-item">
                    <span class="rank">#${i + 1}</span>
                    <span class="name">${name}</span>
                    <span class="qty">${qty} sold</span>
                </div>
            `).join('') : '<p class="empty-state">No sales data yet</p>';
        }

        // Recent bills list
        const billsList = document.getElementById('reportBillsList');
        if (billsList) {
            const recent = bills.slice(-10).reverse();
            billsList.innerHTML = recent.length ? recent.map(bill => `
                <div class="bill-item">
                    <div class="bill-info">
                        <strong>Bill #${bill.id.slice(-6).toUpperCase()}</strong>
                        <span>${formatDate(bill.createdAt)}</span>
                    </div>
                    <div class="bill-details">
                        <span>${bill.items.length} items</span>
                        <span>${bill.paymentMethod}</span>
                        <strong>${formatCurrency(bill.total)}</strong>
                        <button class="btn-icon" onclick="printBill(${JSON.stringify(bill).replace(/"/g, '&quot;')})">
                            <i class="fas fa-print"></i>
                        </button>
                    </div>
                </div>
            `).join('') : '<p class="empty-state">No bills yet</p>';
        }

        hideLoading();
    }

    // =========================================
    // Barcode Generator
    // =========================================
    async function renderBarcodeGenerator() {
        const products = await Data.getProducts();
        const select = document.getElementById('barcodeProductSelect');
        
        if (select) {
            select.innerHTML = '<option value="">Select a product</option>' +
                products.map(p => `<option value="${p.barcode}" data-name="${p.name}">${p.name} - ${p.barcode || 'No barcode'}</option>`).join('');
        }
    }

    window.generateBarcode = function() {
        const input = document.getElementById('barcodeInput').value || 
                     document.getElementById('barcodeProductSelect').value;
        
        if (!input) {
            showToast('Please enter a barcode number or select a product', 'warning');
            return;
        }

        const container = document.getElementById('barcodeDisplay');
        container.innerHTML = '<svg id="barcodeImage"></svg>';
        
        try {
            JsBarcode('#barcodeImage', input, {
                format: 'CODE128',
                width: 2,
                height: 100,
                displayValue: true
            });
            showToast('Barcode generated!', 'success');
        } catch (error) {
            showToast('Error generating barcode', 'error');
        }
    };

    window.printBarcode = function() {
        const barcode = document.getElementById('barcodeImage');
        if (!barcode) {
            showToast('Generate a barcode first', 'warning');
            return;
        }

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head><title>Print Barcode</title></head>
                <body style="text-align: center; padding: 20px;">
                    ${barcode.outerHTML}
                    <script>window.onload = function() { window.print(); }</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    window.generateRandomBarcode = function() {
        document.getElementById('barcodeInput').value = generateBarcode();
    };

    // =========================================
    // Settings
    // =========================================
    async function renderSettings() {
        const settings = await Data.getShopSettings();
        
        document.getElementById('shopName').value = settings.name || '';
        document.getElementById('shopAddress').value = settings.address || '';
        document.getElementById('shopPhone').value = settings.phone || '';
        document.getElementById('shopEmail').value = settings.email || '';
        document.getElementById('shopGst').value = settings.gstNumber || '';

        // Dark mode toggle
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (darkModeToggle) {
            darkModeToggle.checked = State.darkMode;
        }
    }

    window.saveSettings = async function(e) {
        e.preventDefault();
        
        const settings = {
            name: document.getElementById('shopName').value,
            address: document.getElementById('shopAddress').value,
            phone: document.getElementById('shopPhone').value,
            email: document.getElementById('shopEmail').value,
            gstNumber: document.getElementById('shopGst').value
        };

        // Also save to localStorage for print receipts
        localStorage.setItem('shopSettings', JSON.stringify(settings));

        await Data.saveShopSettings(settings);
    };

    window.toggleDarkMode = function() {
        State.darkMode = !State.darkMode;
        localStorage.setItem('darkMode', State.darkMode);
        document.body.classList.toggle('dark-mode', State.darkMode);
    };

    window.exportData = async function() {
        const products = await Data.getProducts();
        const bills = await Data.getBills();
        const settings = await Data.getShopSettings();

        const data = {
            products: products,
            bills: bills,
            settings: settings,
            exportedAt: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `store-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        showToast('Data exported successfully!', 'success');
    };

    window.importData = function() {
        document.getElementById('importFile').click();
    };

    window.handleImport = async function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async function(event) {
            try {
                const data = JSON.parse(event.target.result);
                
                if (data.products) {
                    for (const product of data.products) {
                        await Data.addProduct(product);
                    }
                }
                
                showToast('Data imported successfully!', 'success');
                await renderView(State.currentView);
            } catch (error) {
                showToast('Error importing data. Invalid file format.', 'error');
            }
        };
        reader.readAsText(file);
    };

    // =========================================
    // Mobile Menu
    // =========================================
    function initMobileMenu() {
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('sidebarOverlay');

        if (menuToggle) {
            menuToggle.addEventListener('click', toggleMobileMenu);
        }

        if (overlay) {
            overlay.addEventListener('click', closeMobileMenu);
        }
    }

    function toggleMobileMenu() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        if (sidebar) sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('active');
    }

    function closeMobileMenu() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
    }

    // =========================================
    // Event Listeners
    // =========================================
    function initEventListeners() {
        // Auth forms
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = document.getElementById('loginEmail').value;
                const password = document.getElementById('loginPassword').value;
                login(email, password);
            });
        }

        if (signupForm) {
            signupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = document.getElementById('signupName').value;
                const email = document.getElementById('signupEmail').value;
                const password = document.getElementById('signupPassword').value;
                signup(name, email, password);
            });
        }

        // Auth tabs
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
                
                tab.classList.add('active');
                document.getElementById(`${tab.dataset.tab}Form`).classList.add('active');
            });
        });

        // Navigation
        document.querySelectorAll('.nav-btn[data-view]').forEach(item => {
            item.addEventListener('click', () => {
                renderView(item.dataset.view);
            });
        });

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
        }

        // Dark mode toggle
        const darkModeBtn = document.getElementById('darkModeBtn');
        if (darkModeBtn) {
            darkModeBtn.addEventListener('click', toggleDarkMode);
        }

        // Product form
        const productForm = document.getElementById('productForm');
        if (productForm) {
            productForm.addEventListener('submit', saveProduct);
        }

        // User form
        const userForm = document.getElementById('userForm');
        if (userForm) {
            userForm.addEventListener('submit', saveUser);
        }

        // Settings form
        const settingsForm = document.getElementById('settingsForm');
        if (settingsForm) {
            settingsForm.addEventListener('submit', saveSettings);
        }

        // Inventory filters
        const inventorySearch = document.getElementById('inventorySearch');
        const categoryFilter = document.getElementById('categoryFilter');
        const stockFilter = document.getElementById('stockFilter');

        if (inventorySearch) inventorySearch.addEventListener('input', filterInventory);
        if (categoryFilter) categoryFilter.addEventListener('change', filterInventory);
        if (stockFilter) stockFilter.addEventListener('change', filterInventory);

        // POS search
        const posSearch = document.getElementById('posSearch');
        if (posSearch) {
            posSearch.addEventListener('input', async () => {
                const search = posSearch.value.toLowerCase();
                const products = await Data.getProducts();
                const filtered = products.filter(p => 
                    p.name.toLowerCase().includes(search) ||
                    (p.barcode && p.barcode.includes(search))
                );

                const grid = document.getElementById('posProducts');
                if (grid) {
                    grid.innerHTML = filtered.length ? filtered.map(p => `
                        <div class="product-card ${p.quantity === 0 ? 'out-of-stock' : ''}" 
                             onclick="${p.quantity > 0 ? `window.addToCart('${p.id}')` : ''}">
                            <div class="product-name">${p.name}</div>
                            <div class="product-price">${formatCurrency(p.price)}</div>
                            <div class="product-stock">${p.quantity} in stock</div>
                            ${p.quantity === 0 ? '<div class="out-badge">OUT OF STOCK</div>' : ''}
                        </div>
                    `).join('') : '<p class="empty-state">No products found</p>';
                }
            });
        }

        // GST toggle
        const gstToggle = document.getElementById('gstToggle');
        if (gstToggle) {
            gstToggle.addEventListener('change', toggleGST);
        }

        // Cart buttons
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', openCheckout);
        }

        const clearCartBtn = document.getElementById('clearCartBtn');
        if (clearCartBtn) {
            clearCartBtn.addEventListener('click', () => {
                if (confirm('Clear all items from cart?')) {
                    State.cart = [];
                    renderCart();
                    showToast('Cart cleared', 'info');
                }
            });
        }

        // Close modals on outside click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
                closeMobileMenu();
            }
        });
    }

    // =========================================
    // Initialization
    // =========================================
    async function init() {
        // Apply dark mode
        if (State.darkMode) {
            document.body.classList.add('dark-mode');
        }

        // Initialize mobile menu
        initMobileMenu();

        // Initialize event listeners
        initEventListeners();

        // Check auth state
        await checkAuthState();

        console.log('Retail Store Management App initialized with Firebase');
    }

    // Start the app
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
