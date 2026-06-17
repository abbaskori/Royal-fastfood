import { useState, useEffect, useCallback } from 'react';
import { StorageAPI, type ShopInfo, type Category, type MenuItem, type Order, type Customer } from '@/lib/storage';

function useStorageData<T>(getter: () => T) {
  const [data, setData] = useState<T>(getter());

  useEffect(() => {
    const handleUpdate = () => setData(getter());
    window.addEventListener('royal_storage_update', handleUpdate);
    return () => window.removeEventListener('royal_storage_update', handleUpdate);
  }, [getter]);

  return data;
}

export function useShopInfo() {
  const info = useStorageData(StorageAPI.getShopInfo);
  return { 
    data: info, 
    update: StorageAPI.setShopInfo 
  };
}

export function useCategories() {
  const categories = useStorageData(StorageAPI.getCategories);
  const addCategory = useCallback((name: string) => {
    const cats = StorageAPI.getCategories();
    cats.push({ id: crypto.randomUUID(), name, createdAt: new Date().toISOString() });
    StorageAPI.setCategories(cats);
  }, []);
  const deleteCategory = useCallback((id: string) => {
    const cats = StorageAPI.getCategories().filter(c => c.id !== id);
    StorageAPI.setCategories(cats);
  }, []);
  return { data: categories, addCategory, deleteCategory };
}

export function useMenuItems() {
  const items = useStorageData(StorageAPI.getMenuItems);
  const addItem = useCallback((item: Omit<MenuItem, 'id' | 'createdAt'>) => {
    const current = StorageAPI.getMenuItems();
    current.push({ ...item, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    StorageAPI.setMenuItems(current);
  }, []);
  const updateItem = useCallback((id: string, updates: Partial<MenuItem>) => {
    const current = StorageAPI.getMenuItems().map(i => i.id === id ? { ...i, ...updates } : i);
    StorageAPI.setMenuItems(current);
  }, []);
  const deleteItem = useCallback((id: string) => {
    const current = StorageAPI.getMenuItems().filter(i => i.id !== id);
    StorageAPI.setMenuItems(current);
  }, []);
  return { data: items, addItem, updateItem, deleteItem };
}

export function useOrders() {
  const orders = useStorageData(StorageAPI.getOrders);
  return { 
    data: orders, 
    createOrder: StorageAPI.addOrder, 
    updateOrder: StorageAPI.updateOrder,
    deleteOrder: StorageAPI.deleteOrder,
    resetData: StorageAPI.resetData 
  };
}

export function useCustomers() {
  const customers = useStorageData(StorageAPI.getCustomers);
  return { data: customers };
}

export function useSecuritySettings() {
  const settings = useStorageData(StorageAPI.getSecuritySettings);
  return { 
    data: settings, 
    update: StorageAPI.setSecuritySettings 
  };
}
