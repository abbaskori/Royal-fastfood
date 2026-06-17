import { v4 as uuidv4 } from 'uuid';


const DATA_VERSION = "4.0.0";
const KEYS = {
  VERSION: "royal_data_version",
  SHOP_INFO: "royal_shop_info",
  CATEGORIES: "royal_categories",
  MENU_ITEMS: "royal_menu_items",
  ORDERS: "royal_orders",
  CUSTOMERS: "royal_customers",
  BILL_COUNTER: "royal_bill_counter",
  SECURITY: "royal_security_settings",
};

export interface SecuritySettings {
  adminPin: string;
  staffPin: string;
  managerPin: string;
}

const DEFAULT_SECURITY: SecuritySettings = {
  adminPin: "0000",
  staffPin: "1234",
  managerPin: "5555",
};

export interface ShopInfo {
  name: string;
  address: string;
  contact: string;
  gstin: string;
  logo: string;
}

export interface Category {
  id: string;
  name: string;
  createdAt: string;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  image: string; // Emoji
  createdAt: string;
  trackStock?: boolean;
  stock?: number;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  amount: number;
}

export interface Order {
  id: string;
  billNumber: number;
  items: OrderItem[];
  subtotal: number;
  discountType: 'none' | 'percentage' | 'rupees';
  discountValue: number;
  discountAmount: number;
  total: number;
  paymentMethod: 'Cash' | 'Online';
  customerName: string;
  customerPhone: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
  lastOrderDate: string;
}

const DEFAULT_SHOP_INFO: ShopInfo = {
  name: "Royal Food Centre",
  address: "Kanodar Auto Centre, Opp. Jamiya, Kanodar - 385520 Ta. Palanpur, Dist.B.K.",
  contact: "+91 7487897959",
  gstin: "",
  logo: "",
};

const SEED_DATA = [
  { cat: "Starter", emoji: "🍿", items: [ {n: "Chicken Pop Corn", p: 80}, {n: "Chicken Strip", p: 130}, {n: "Cheese Strip Chicken", p: 150} ] },
  { cat: "Pizza", emoji: "🍕", items: [ {n: "Cheese Corn Pizza M", p: 150}, {n: "Cheese Corn Pizza L", p: 230}, {n: "Veg. Pizza M", p: 170}, {n: "Veg. Pizza L", p: 260}, {n: "Chicken Delight Pizza M", p: 180}, {n: "Chicken Delight Pizza L", p: 260}, {n: "Margherita Pizza M", p: 150}, {n: "Margherita Pizza L", p: 240}, {n: "Chicken Tandoori Pizza M", p: 200}, {n: "Chicken Tandoori Pizza L", p: 260}, {n: "Chicken Peri Peri Pizza M", p: 210}, {n: "Chicken Peri Peri Pizza L", p: 270}, {n: "Royal In House Pizza M", p: 230}, {n: "Royal In House Pizza L", p: 280} ] },
  { cat: "Shawarma", emoji: "🥙", items: [ {n: "Arabian Shawarma", p: 50}, {n: "Cheese Shawarma", p: 70}, {n: "Special Shawarma in House", p: 80}, {n: "Exotic Shawarma", p: 100} ] },
  { cat: "Burger", emoji: "🍔", items: [ {n: "Crizpy Chicken Burger", p: 79}, {n: "Tandoori Chicken Burger", p: 120}, {n: "Spicy Chicken Burger", p: 120}, {n: "Veg. Burger Patty", p: 50}, {n: "Peri Peri Chicken Burger", p: 120} ] },
  { cat: "Wraps", emoji: "🌯", items: [ {n: "Chicken Tandoori Wraps", p: 100}, {n: "Chicken Peri Peri Wraps", p: 100}, {n: "Chicken Crispy Wraps", p: 80}, {n: "Chicken Spicy Wraps", p: 80} ] },
  { cat: "French Fries", emoji: "🍟", items: [ {n: "Plain Fries", p: 40}, {n: "Peri Peri Fries", p: 60}, {n: "Melted Chees Fries", p: 60}, {n: "Tandoori Fries", p: 60}, {n: "Pizza Seasoning Fries", p: 60}, {n: "Royal Fries", p: 60} ] },
  { cat: "Bowl", emoji: "🍲", items: [ {n: "Chicken & Fries (Mayo/Cheese)", p: 100}, {n: "Chicken & Fries(Cheese/Tandoori Mayo)", p: 120}, {n: "Chicken & Fries(Cheese/Peri Peri Mayo)", p: 120}, {n: "Chicken & Fries (Cheese/Barbeque Sauce)", p: 120}, {n: "Chicken & Fries(Cheese/Schezwan Sauce)", p: 120} ] },
  { cat: "Cold Drinks", emoji: "🥤", items: [ {n: "Mango 150ml", p: 10}, {n: "Neon Boost 150ml", p: 10}, {n: "Campa Cola 200ml", p: 10}, {n: "Power Up 200ml", p: 10}, {n: "Campa Orange 200ml", p: 10}, {n: "Camp Lamon 200ml", p: 10}, {n: "Lahoori Zeera 300ml", p: 20}, {n: "Lahoori Limbu 300ml", p: 20}, {n: "Sosyo 250ml", p: 20}, {n: "Power Up 500ml", p: 20}, {n: "Campa Cola500ml", p: 20}, {n: "Campa Orange 500ml", p: 20}, {n: "Campa Zeera 500ml", p: 20}, {n: "Mother Dairy Pista", p: 30}, {n: "Mother Dairy Ilaichi", p: 30}, {n: "Club Soda", p: 0}, {n: "Bailley Ihts Better", p: 20} ] },
];

export const emitChange = () => window.dispatchEvent(new Event('royal_storage_update'));

export function initializeStorage() {
  const version = localStorage.getItem(KEYS.VERSION);
  if (version !== DATA_VERSION) {
    localStorage.clear();
    
    localStorage.setItem(KEYS.VERSION, DATA_VERSION);
    localStorage.setItem(KEYS.SHOP_INFO, JSON.stringify(DEFAULT_SHOP_INFO));
    localStorage.setItem(KEYS.BILL_COUNTER, "1001");
    localStorage.setItem(KEYS.ORDERS, JSON.stringify([]));
    localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify([]));

    const categories: Category[] = [];
    const menuItems: MenuItem[] = [];

    SEED_DATA.forEach(c => {
      const catId = uuidv4();
      categories.push({ id: catId, name: c.cat, createdAt: new Date().toISOString() });
      c.items.forEach(i => {
        menuItems.push({
          id: uuidv4(),
          name: i.n,
          price: i.p,
          categoryId: catId,
          image: c.emoji,
          createdAt: new Date().toISOString()
        });
      });
    });

    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
    localStorage.setItem(KEYS.MENU_ITEMS, JSON.stringify(menuItems));
    emitChange();
  }
}

function get<T>(key: string, defaultValue: T): T {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
}

function set<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
  emitChange();
}

export const StorageAPI = {
  getShopInfo: () => get<ShopInfo>(KEYS.SHOP_INFO, DEFAULT_SHOP_INFO),
  setShopInfo: (info: ShopInfo) => set(KEYS.SHOP_INFO, info),

  getSecuritySettings: () => get<SecuritySettings>(KEYS.SECURITY, DEFAULT_SECURITY),
  setSecuritySettings: (settings: SecuritySettings) => {
    set(KEYS.SECURITY, settings);
  },

  getCategories: () => get<Category[]>(KEYS.CATEGORIES, []),
  setCategories: (cats: Category[]) => {
    set(KEYS.CATEGORIES, cats);
  },
  
  getMenuItems: () => get<MenuItem[]>(KEYS.MENU_ITEMS, []),
  setMenuItems: (items: MenuItem[]) => {
    set(KEYS.MENU_ITEMS, items);
  },

  getOrders: () => get<Order[]>(KEYS.ORDERS, []),
  addOrder: (orderWithoutIdAndBill: Omit<Order, 'id' | 'billNumber'>) => {
    const orders = StorageAPI.getOrders();
    const currentBillStr = localStorage.getItem(KEYS.BILL_COUNTER) || "1001";
    const currentBill = parseInt(currentBillStr, 10);
    
    const newOrder: Order = {
      ...orderWithoutIdAndBill,
      id: uuidv4(),
      billNumber: currentBill
    };
    
    orders.unshift(newOrder); // Add to top
    set(KEYS.ORDERS, orders);
    localStorage.setItem(KEYS.BILL_COUNTER, (currentBill + 1).toString());

    // Deduct stock for tracked items
    newOrder.items.forEach(item => {
      const items = StorageAPI.getMenuItems();
      const mi = items.find(i => i.id === item.id);
      if (mi && mi.trackStock) {
        mi.stock = Math.max(0, (mi.stock || 0) - item.quantity);
        set(KEYS.MENU_ITEMS, items);
      }
    });



    // Update customer
    if (newOrder.customerName) {
      const customers = StorageAPI.getCustomers();
      const existing = customers.find(c => c.phone === newOrder.customerPhone && newOrder.customerPhone !== "") || 
                       customers.find(c => c.name.toLowerCase() === newOrder.customerName.toLowerCase());
      
      let customer;
      if (existing) {
        existing.lastOrderDate = newOrder.createdAt;
        if (newOrder.customerPhone) existing.phone = newOrder.customerPhone;
        customer = existing;
        set(KEYS.CUSTOMERS, customers);
      } else {
        customer = {
          id: uuidv4(),
          name: newOrder.customerName,
          phone: newOrder.customerPhone,
          createdAt: newOrder.createdAt,
          lastOrderDate: newOrder.createdAt
        };
        customers.push(customer);
        set(KEYS.CUSTOMERS, customers);
      }
      

    }

    return newOrder;
  },

  updateOrder: (id: string, updates: Omit<Order, 'id' | 'billNumber'>) => {
    const orders = StorageAPI.getOrders();
    const index = orders.findIndex(o => o.id === id);
    if (index === -1) return null;

    const updatedOrder: Order = {
      ...orders[index],
      ...updates,
      id,
    };

    // Revert old stock
    orders[index].items.forEach(item => {
      const items = StorageAPI.getMenuItems();
      const mi = items.find(i => i.id === item.id);
      if (mi && mi.trackStock) {
        mi.stock = (mi.stock || 0) + item.quantity;
        set(KEYS.MENU_ITEMS, items);
      }
    });

    orders[index] = updatedOrder;
    set(KEYS.ORDERS, orders);

    // Apply new stock
    updatedOrder.items.forEach(item => {
      const items = StorageAPI.getMenuItems();
      const mi = items.find(i => i.id === item.id);
      if (mi && mi.trackStock) {
        mi.stock = Math.max(0, (mi.stock || 0) - item.quantity);
        set(KEYS.MENU_ITEMS, items);
      }
    });

    return updatedOrder;
  },

  deleteOrder: async (id: string) => {
    const orders = StorageAPI.getOrders();
    const orderToDelete = orders.find(o => o.id === id);
    if (orderToDelete) {
      // Revert stock
      orderToDelete.items.forEach(item => {
        const items = StorageAPI.getMenuItems();
        const mi = items.find(i => i.id === item.id);
        if (mi && mi.trackStock) {
          mi.stock = (mi.stock || 0) + item.quantity;
          set(KEYS.MENU_ITEMS, items);
        }
      });
    }
    const filtered = orders.filter(o => o.id !== id);
    set(KEYS.ORDERS, filtered);
  },

  getCustomers: () => get<Customer[]>(KEYS.CUSTOMERS, []),

  resetData: () => {
    localStorage.setItem(KEYS.ORDERS, "[]");
    localStorage.setItem(KEYS.CUSTOMERS, "[]");
    localStorage.setItem(KEYS.BILL_COUNTER, "1001");
    emitChange();
  }
};
