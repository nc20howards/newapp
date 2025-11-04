import { CanteenShop, CanteenCategory, CanteenMenuItem, CanteenOrder, User, CanteenSettings, PaymentMethod, EWalletTransaction } from '../types';
import * as eWalletService from './eWalletService';
import { findUserById } from './groupService';
import { createReceipt } from './receiptService';

const SHOPS_KEY = '360_smart_school_canteen_shops';
const CATEGORIES_KEY = '360_smart_school_canteen_categories';
const MENU_ITEMS_KEY = '360_smart_school_canteen_menu_items';
const ORDERS_KEY = '360_smart_school_canteen_orders';
const CANTEEN_SETTINGS_KEY = '360_smart_school_canteen_settings';

// --- Helper Functions ---
export const getShops = (): CanteenShop[] => JSON.parse(localStorage.getItem(SHOPS_KEY) || '[]');
export const saveShops = (shops: CanteenShop[]) => localStorage.setItem(SHOPS_KEY, JSON.stringify(shops));
const getCategories = (): CanteenCategory[] => JSON.parse(localStorage.getItem(CATEGORIES_KEY) || '[]');
const saveCategories = (categories: CanteenCategory[]) => localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
const getMenuItems = (): CanteenMenuItem[] => JSON.parse(localStorage.getItem(MENU_ITEMS_KEY) || '[]');
const saveMenuItems = (items: CanteenMenuItem[]) => localStorage.setItem(MENU_ITEMS_KEY, JSON.stringify(items));
const getOrders = (): CanteenOrder[] => JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
const saveOrders = (orders: CanteenOrder[]) => localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));

// New helpers for settings
const getSettings = (): Record<string, CanteenSettings> => JSON.parse(localStorage.getItem(CANTEEN_SETTINGS_KEY) || '{}');
const saveSettings = (settings: Record<string, CanteenSettings>) => localStorage.setItem(CANTEEN_SETTINGS_KEY, JSON.stringify(settings));

// --- Canteen Settings Management ---
export const getCanteenSettings = (schoolId: string): CanteenSettings => {
    const allSettings = getSettings();
    if (allSettings[schoolId]) {
        return allSettings[schoolId];
    }
    // Return default if not found
    return {
        schoolId,
        activePaymentMethod: 'e_wallet',
    };
};

export const saveCanteenSettings = (settings: CanteenSettings): void => {
    const allSettings = getSettings();
    allSettings[settings.schoolId] = settings;
    saveSettings(allSettings);
};


// --- Shop Management ---
export const getShopsForSchool = (schoolId: string): CanteenShop[] => {
    return getShops().filter(s => s.schoolId === schoolId);
};

export const getShopOwnerId = (shopId: string): string | undefined => {
    const shop = getShops().find(s => s.id === shopId);
    return shop?.ownerId;
};

export const addShop = (schoolId: string, name: string, description: string): CanteenShop => {
    const shops = getShops();
    if (shops.some(s => s.schoolId === schoolId && s.name.toLowerCase() === name.toLowerCase())) {
        throw new Error('A shop with this name already exists for this school.');
    }
    const newShop: CanteenShop = { id: `shop_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, schoolId, name, description };
    shops.push(newShop);
    saveShops(shops);
    return newShop;
};

export const updateShop = (shopId: string, name: string, description: string): CanteenShop => {
    const shops = getShops();
    const shopIndex = shops.findIndex(s => s.id === shopId);
    if (shopIndex === -1) throw new Error('Shop not found.');
    shops[shopIndex] = { ...shops[shopIndex], name, description };
    saveShops(shops);
    return shops[shopIndex];
};

export const deleteShop = (shopId: string): void => {
    let shops = getShops();
    shops = shops.filter(s => s.id !== shopId);
    saveShops(shops);
    // Cascade delete categories and items
    let categories = getCategories().filter(c => c.shopId !== shopId);
    saveCategories(categories);
    let menuItems = getMenuItems().filter(i => i.shopId !== shopId);
    saveMenuItems(menuItems);
};


// --- Category Management ---
export const getCategoriesForShop = (shopId: string): CanteenCategory[] => {
    const categories = getCategories().filter(c => c.shopId === shopId);
    const menuItems = getMenuItemsForShop(shopId);
    // Calculate item counts dynamically
    return categories.map(cat => ({
        ...cat,
        itemCount: menuItems.filter(item => item.categoryId === cat.id).length
    }));
};

export const addCategory = (shopId: string, name: string): CanteenCategory => {
    const categories = getCategories();
    if (categories.some(c => c.shopId === shopId && c.name.toLowerCase() === name.toLowerCase())) {
        throw new Error('A category with this name already exists in this shop.');
    }
    const newCategory: CanteenCategory = { id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, shopId, name, itemCount: 0 };
    categories.push(newCategory);
    saveCategories(categories);
    return newCategory;
};

export const updateCategory = (categoryId: string, name: string): CanteenCategory => {
    const categories = getCategories();
    const catIndex = categories.findIndex(c => c.id === categoryId);
    if (catIndex === -1) throw new Error('Category not found.');
    categories[catIndex].name = name;
    saveCategories(categories);
    return categories[catIndex];
};

export const deleteCategory = (categoryId: string): void => {
    let categories = getCategories();
    categories = categories.filter(c => c.id !== categoryId);
    saveCategories(categories);
    // Cascade delete items in this category
    let menuItems = getMenuItems().filter(i => i.categoryId !== categoryId);
    saveMenuItems(menuItems);
};


// --- Menu Item Management ---
export const getMenuItemsForShop = (shopId: string): CanteenMenuItem[] => {
    return getMenuItems().filter(i => i.shopId === shopId);
};

export const getMenuItemsForCategory = (categoryId: string): CanteenMenuItem[] => {
    return getMenuItems().filter(i => i.categoryId === categoryId);
};

export const addMenuItem = (data: Omit<CanteenMenuItem, 'id'>): CanteenMenuItem => {
    const items = getMenuItems();
    const newItem: CanteenMenuItem = { ...data, id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}` };
    items.push(newItem);
    saveMenuItems(items);
    return newItem;
};

export const updateMenuItem = (itemId: string, data: Partial<Omit<CanteenMenuItem, 'id' | 'shopId' | 'categoryId'>>): CanteenMenuItem => {
    const items = getMenuItems();
    const itemIndex = items.findIndex(i => i.id === itemId);
    if (itemIndex === -1) throw new Error('Menu item not found.');
    items[itemIndex] = { ...items[itemIndex], ...data };
    saveMenuItems(items);
    return items[itemIndex];
};

export const deleteMenuItem = (itemId: string): void => {
    let items = getMenuItems();
    items = items.filter(i => i.id !== itemId);
    saveMenuItems(items);
};


// --- Order Management ---
export const getOrdersForShop = (shopId: string, status?: CanteenOrder['status']): CanteenOrder[] => {
    let orders = getOrders().filter(o => o.shopId === shopId);
    if (status) {
        orders = orders.filter(o => o.status === status);
    }
    return orders.sort((a, b) => b.timestamp - a.timestamp);
};

export const getOrdersForSchool = (schoolId: string): CanteenOrder[] => {
    const schoolShops = getShopsForSchool(schoolId);
    const shopIds = new Set(schoolShops.map(s => s.id));
    const allOrders = getOrders();
    return allOrders.filter(o => shopIds.has(o.shopId)).sort((a, b) => b.timestamp - a.timestamp);
};

export const getOrdersForStudent = (studentId: string): CanteenOrder[] => {
    return getOrders().filter(o => o.studentId === studentId).sort((a, b) => b.timestamp - a.timestamp);
};

export const getOrderById = (orderId: string): CanteenOrder | null => {
    const orders = getOrders();
    return orders.find(o => o.id === orderId) || null;
};

export const findReadyOrderForStudent = (studentId: string, shopId: string): CanteenOrder | null => {
    const orders = getOrders();
    // Find the first order that matches criteria. In a real-world scenario, you might want to handle multiple ready orders.
    const readyOrder = orders.find(o => 
        o.studentId === studentId && 
        o.shopId === shopId && 
        o.status === 'ready'
    );
    return readyOrder || null;
};


export const placeOrder = (
    shopId: string,
    studentId: string,
    cart: { itemId: string; quantity: number }[],
    pin: string,
    deliveryMethod: 'pickup' | 'delivery',
    deliveryDetails?: string
): CanteenOrder => {
    const student = findUserById(studentId);
    if (!student) throw new Error("Student not found.");
    
    const shop = getShops().find(s => s.id === shopId);
    if (!shop) throw new Error("Shop not found.");

    const items = getMenuItems();
    const orderItems = cart.map(cartItem => {
        const menuItem = items.find(i => i.id === cartItem.itemId);
        if (!menuItem) throw new Error(`Item with ID ${cartItem.itemId} not found.`);
        return { itemId: menuItem.id, name: menuItem.name, quantity: cartItem.quantity, price: menuItem.price };
    });

    const totalAmount = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // 1. Verify PIN
    if (!eWalletService.verifyPin(studentId, pin)) {
        throw new Error("Invalid PIN.");
    }
    
    // 2. Check available balance
    const availableBalance = eWalletService.getAvailableBalance(studentId);
    if (availableBalance < totalAmount) {
        throw new Error("Insufficient available funds. Your balance might be held for other pending orders.");
    }

    // 3. Create a pending transaction to hold the funds
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const transaction = eWalletService.createTransaction({
        walletUserId: studentId,
        type: 'payment',
        amount: -totalAmount,
        description: `Canteen Order from ${shop.name}`,
        status: 'pending',
        recipient: `Shop ID: ${shopId}`,
        method: 'e-wallet',
        orderId: orderId,
    });

    // 4. Create the order
    const newOrder: CanteenOrder = {
        id: orderId,
        shopId,
        studentId,
        studentName: student.name,
        items: orderItems,
        totalAmount,
        status: 'pending',
        timestamp: Date.now(),
        transactionId: transaction.id,
        deliveryMethod,
        deliveryDetails,
    };
    const orders = getOrders();
    orders.push(newOrder);
    saveOrders(orders);
    
    return newOrder;
};

export const completeScannedOrder = (orderId: string, requestingUserId: string): CanteenOrder => {
    const orders = getOrders();
    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) throw new Error("Order not found.");

    const order = orders[orderIndex];

    if (order.status !== 'ready') {
        throw new Error(`Order is not ready for pickup. Current status: ${order.status}`);
    }
    
    // Security check
    const shop = getShops().find(s => s.id === order.shopId);
    if (!shop || shop.ownerId !== requestingUserId) {
        throw new Error("You are not authorized to complete this order.");
    }

    // Settle the payment
    if (!order.transactionId) {
        throw new Error("Order has no associated transaction to complete.");
    }
    // Settle the payment
    eWalletService.settleOrderPayment(order.id, order.shopId);

    // Update order status
    order.status = 'completed';
    orders[orderIndex] = order;
    saveOrders(orders);

    // Generate receipts
    if (!shop.ownerId) throw new Error("Could not find shop owner to create receipt.");

    createReceipt({
        transactionId: order.transactionId,
        orderId: order.id,
        userId: order.studentId,
        type: 'purchase',
        amount: order.totalAmount,
        description: `Purchase at ${shop.name}`,
        partyName: shop.name,
        items: order.items,
    });
    
    createReceipt({
        transactionId: order.transactionId,
        orderId: order.id,
        userId: shop.ownerId,
        type: 'sale',
        amount: order.totalAmount,
        description: `Sale to ${order.studentName}`,
        partyName: order.studentName,
        items: order.items,
    });
    
    return order;
};

export const updateOrderStatus = (orderId: string, newStatus: CanteenOrder['status']): CanteenOrder => {
    const orders = getOrders();
    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) throw new Error('Order not found.');
    
    const order = orders[orderIndex];
    const originalStatus = order.status;
    order.status = newStatus;

    try {
        if (newStatus === 'completed' && order.transactionId) {
            eWalletService.settleOrderPayment(order.id, order.shopId);
        } else if (newStatus === 'cancelled' && order.transactionId) {
            eWalletService.cancelOrderPayment(order.id);
        }
    } catch (e) {
        order.status = originalStatus; // Revert status on error
        saveOrders(orders);
        throw e; // Re-throw the error
    }
    
    orders[orderIndex] = order;
    saveOrders(orders);
    return orders[orderIndex];
};

export const cancelStudentOrder = (orderId: string, studentId: string): void => {
    const orders = getOrders();
    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) throw new Error('Order not found.');
    
    const order = orders[orderIndex];
    
    if (order.studentId !== studentId) {
        throw new Error("You are not authorized to cancel this order.");
    }
    
    if (order.status !== 'pending') {
        throw new Error("Only pending orders can be cancelled.");
    }

    order.status = 'cancelled';
    
    if (order.transactionId) {
        eWalletService.cancelOrderPayment(order.id);
    }
    
    orders[orderIndex] = order;
    saveOrders(orders);
};


// --- Seeding ---
export const seedInitialCanteenData = (schoolId: string): CanteenShop => {
    const shop = addShop(schoolId, "Main Tuck Shop", "The primary student canteen for snacks and lunch.");
    const drinksCat = addCategory(shop.id, "Cold Drinks");
    const snacksCat = addCategory(shop.id, "Snacks");
    const lunchCat = addCategory(shop.id, "Lunch Specials");

    addMenuItem({ shopId: shop.id, categoryId: drinksCat.id, name: "Soda (500ml)", description: "Assorted flavors.", price: 1500, imageUrl: 'https://picsum.photos/seed/soda/200', isAvailable: true });
    addMenuItem({ shopId: shop.id, categoryId: drinksCat.id, name: "Mineral Water", description: "Stay hydrated.", price: 1000, imageUrl: 'https://picsum.photos/seed/water/200', isAvailable: true });
    
    addMenuItem({ shopId: shop.id, categoryId: snacksCat.id, name: "Samosa", description: "Beef or vegetable filling.", price: 1000, imageUrl: 'https://picsum.photos/seed/samosa/200', isAvailable: true });
    addMenuItem({ shopId: shop.id, categoryId: snacksCat.id, name: "Doughnut", description: "Sweet and fluffy.", price: 800, imageUrl: 'https://picsum.photos/seed/doughnut/200', isAvailable: false });
    
    addMenuItem({ shopId: shop.id, categoryId: lunchCat.id, name: "Beans & Posho", description: "A classic filling meal.", price: 3000, imageUrl: 'https://picsum.photos/seed/posho/200', isAvailable: true });
    addMenuItem({ shopId: shop.id, categoryId: lunchCat.id, name: "Rice & Chicken Stew", description: "Friday special.", price: 5000, imageUrl: 'https://picsum.photos/seed/rice/200', isAvailable: true });

    return shop;
};
