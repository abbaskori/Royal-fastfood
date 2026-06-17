import { useState, useRef } from "react";
import { useShopInfo, useCategories, useMenuItems, useSecuritySettings } from "@/hooks/use-data";
import { StorageAPI } from "@/lib/storage";
import { Plus, Trash2, Edit2, Check, X, Store, Tag, Pizza, Upload, Image, Shield, Key, Eye, EyeOff } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function Admin() {
  const [activeTab, setActiveTab] = useState<"shop" | "categories" | "items" | "security">("shop");

  return (
    <div className="flex-1 bg-gray-50 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Admin Panel</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage shop settings, categories, and menu items.</p>
          </div>
          <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm gap-1 overflow-x-auto scrollbar-hide">
            <TabBtn active={activeTab === "shop"} onClick={() => setActiveTab("shop")} icon={<Store className="w-4 h-4" />} label="Shop" />
            <TabBtn active={activeTab === "categories"} onClick={() => setActiveTab("categories")} icon={<Tag className="w-4 h-4" />} label="Categories" />
            <TabBtn active={activeTab === "items"} onClick={() => setActiveTab("items")} icon={<Pizza className="w-4 h-4" />} label="Menu" />
            <TabBtn active={activeTab === "security"} onClick={() => setActiveTab("security")} icon={<Shield className="w-4 h-4" />} label="Security" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
          {activeTab === "shop" && <ShopInfoTab />}
          {activeTab === "categories" && <CategoriesTab />}
          {activeTab === "items" && <MenuItemsTab />}
          {activeTab === "security" && <SecurityTab />}
        </div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${active ? "bg-yellow-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}
    >
      {icon} <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-bold text-gray-700">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition-all font-medium text-gray-800";

function ShopInfoTab() {
  const { data: shop, update } = useShopInfo();
  const [form, setForm] = useState(shop);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    update(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm({ ...form, logo: ev.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  const clearLogo = () => {
    setForm({ ...form, logo: "" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const defaultLogo = `${import.meta.env.BASE_URL}royal-logo.png`;
  const displayLogo = form.logo || defaultLogo;

  return (
    <form onSubmit={handleSave} className="max-w-xl space-y-5">
      {/* Logo Upload */}
      <Field label="Shop Logo">
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 shrink-0">
            {displayLogo ? (
              <img src={displayLogo} alt="Logo" className="w-full h-full object-contain p-1" onError={(e) => { (e.target as HTMLImageElement).src = ""; }} />
            ) : (
              <Image className="w-8 h-8 text-gray-300" />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 text-yellow-600 rounded-lg text-sm font-bold hover:bg-yellow-100 transition-colors active:scale-95"
            >
              <Upload className="w-4 h-4" /> Upload Logo
            </button>
            {form.logo && (
              <button type="button" onClick={clearLogo} className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 text-red-500 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors active:scale-95">
                <X className="w-4 h-4" /> Use Default
              </button>
            )}
            <p className="text-xs text-gray-400">PNG, JPG, SVG recommended</p>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
        </div>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Shop Name">
          <input required type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
        </Field>
        <Field label="Contact Number">
          <input required type="text" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className={inputCls} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Address">
            <textarea required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={`${inputCls} min-h-[80px] resize-none`} />
          </Field>
        </div>
        <Field label="GSTIN (Optional)">
          <input type="text" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} className={inputCls} placeholder="Leave blank if none" />
        </Field>
      </div>

      <button
        type="submit"
        className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-700 active:scale-95 transition-all shadow-sm"
      >
        {saved ? <><Check className="w-4 h-4 text-green-400" /> Saved!</> : "Save Settings"}
      </button>

      {/* Danger Zone */}
      <div className="mt-12 pt-8 border-t border-red-100">
        <h3 className="text-red-600 font-black text-lg mb-2 flex items-center gap-2">
          <Trash2 className="w-5 h-5" /> Danger Zone
        </h3>
        <p className="text-sm text-gray-500 mb-4">Wipe all sales history and customer data from the cloud. This cannot be undone.</p>
        <button
          type="button"
          onClick={async () => {
            if (window.confirm("ARE YOU SURE? This will delete all sales and analytics data FOREVER.") && 
                window.confirm("LAST WARNING: This is permanent. Delete all data?")) {
              try {
                await StorageAPI.resetCloudData();
                alert("All data has been reset successfully.");
                window.location.reload();
              } catch (e) {
                alert("Failed to reset data. Check internet connection.");
              }
            }
          }}
          className="px-6 py-3 bg-red-50 text-red-600 border border-red-100 rounded-xl font-bold hover:bg-red-600 hover:text-white active:scale-95 transition-all shadow-sm text-sm"
        >
          Reset Server Data (Orders & Analytics)
        </button>
      </div>
    </form>
  );
}


function CategoriesTab() {
  const { data: categories, addCategory, deleteCategory } = useCategories();
  const [newName, setNewName] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) { addCategory(newName.trim()); setNewName(""); }
  };

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input required type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New category name..." className={`${inputCls} flex-1`} />
        <button type="submit" className="px-5 py-2.5 bg-yellow-500 text-white rounded-xl font-bold hover:bg-yellow-600 active:scale-95 transition-all flex items-center gap-1.5 text-sm shadow-sm">
          <Plus className="w-4 h-4" /> Add
        </button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 group">
            <span className="font-semibold text-gray-800 text-sm">{c.name}</span>
            <button
              onClick={() => window.confirm("Delete this category?") && deleteCategory(c.id)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function MenuItemsTab() {
  const { data: items, addItem, updateItem, deleteItem } = useMenuItems();
  const { data: categories } = useCategories();
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", price: "", categoryId: "", image: "🍔", trackStock: false, stock: 0 });
  const [filterCat, setFilterCat] = useState("All");

  const startEdit = (item: any) => {
    setIsEditing(item.id);
    setForm({ name: item.name, price: item.price.toString(), categoryId: item.categoryId, image: item.image, trackStock: item.trackStock || false, stock: item.stock || 0 });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name: form.name.trim(), price: parseFloat(form.price), categoryId: form.categoryId, image: form.image, trackStock: form.trackStock, stock: form.stock };
    if (isEditing === "new") addItem(payload);
    else if (isEditing) updateItem(isEditing, payload);
    setIsEditing(null);
  };

  const displayItems = filterCat === "All" ? items : items.filter((i) => i.categoryId === filterCat);

  if (isEditing) {
    return (
      <form onSubmit={handleSave} className="max-w-lg space-y-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-black text-lg text-gray-900">{isEditing === "new" ? "Add New Item" : "Edit Item"}</h3>
          <button type="button" onClick={() => setIsEditing(null)} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <Field label="Item Name">
          <input required type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Price (₹)">
            <input required type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Category">
            <select required value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className={inputCls}>
              <option value="" disabled>Select...</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Emoji Icon">
          <div className="flex gap-3 items-center">
            <div className="w-14 h-14 bg-yellow-100 rounded-xl flex items-center justify-center text-3xl shrink-0">{form.image}</div>
            <input type="text" maxLength={2} value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="🍔" className={`${inputCls} flex-1 text-center text-2xl`} />
          </div>
        </Field>
        
        <div className="grid grid-cols-2 gap-4">
          <Field label="Track Stock?">
            <div className="flex items-center h-[42px] gap-2">
              <input type="checkbox" checked={form.trackStock} onChange={(e) => setForm({ ...form, trackStock: e.target.checked })} className="w-5 h-5 text-yellow-500 rounded focus:ring-yellow-400" />
              <span className="text-sm font-medium text-gray-700">Enable Tracking</span>
            </div>
          </Field>
          {form.trackStock && (
            <Field label="Current Stock">
              <input required type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} className={inputCls} />
            </Field>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="flex-1 py-3 bg-yellow-500 text-white rounded-xl font-bold hover:bg-yellow-600 active:scale-95 transition-all shadow-sm text-sm">Save Item</button>
          <button type="button" onClick={() => setIsEditing(null)} className="py-3 px-6 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 active:scale-95 transition-all text-sm">Cancel</button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-yellow-400 bg-white text-gray-700">
          <option value="All">All Categories ({items.length})</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name} ({items.filter((i) => i.categoryId === c.id).length})</option>)}
        </select>
        <button
          onClick={() => { setIsEditing("new"); setForm({ name: "", price: "", categoryId: categories[0]?.id || "", image: "🍔", trackStock: false, stock: 0 }); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-yellow-500 text-white rounded-xl font-bold hover:bg-yellow-600 active:scale-95 transition-all text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add New Item
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {displayItems.map((item) => (
          <div key={item.id} className="flex gap-3 p-3 border border-gray-200 rounded-xl bg-gray-50 hover:bg-white transition-colors group">
            <div className="w-12 h-12 shrink-0 rounded-lg bg-yellow-100 flex items-center justify-center text-2xl">{item.image}</div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-800 text-sm truncate">{item.name}</p>
              <div className="flex items-center gap-2">
                <p className="text-green-600 font-bold text-sm">{formatCurrency(item.price)}</p>
                {item.trackStock && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${item.stock! <= 5 ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-700'}`}>
                    Stock: {item.stock}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 truncate">{categories.find((c) => c.id === item.categoryId)?.name || "—"}</p>
            </div>
            <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
              <button onClick={() => startEdit(item)} className="w-7 h-7 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 transition-colors">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => window.confirm("Delete this item?") && deleteItem(item.id)} className="w-7 h-7 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SecurityTab() {
  const { data: security, update } = useSecuritySettings();
  const [form, setForm] = useState(security);
  const [showPins, setShowPins] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.adminPin.length !== 4 || form.staffPin.length !== 4) {
      alert("PINs must be exactly 4 digits.");
      return;
    }
    update(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-md space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-black text-lg text-gray-900">Security Settings</h3>
          <p className="text-sm text-gray-500">Control access to your POS system.</p>
        </div>
        <button 
          onClick={() => setShowPins(!showPins)}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors"
        >
          {showPins ? <><EyeOff className="w-3.5 h-3.5" /> Hide</> : <><Eye className="w-3.5 h-3.5" /> Show</>}
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <Field label="Manager PIN (Full Access)">
          <div className="relative">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              required 
              type={showPins ? "text" : "password"} 
              maxLength={4}
              pattern="\d{4}"
              value={form.adminPin} 
              onChange={(e) => setForm({ ...form, adminPin: e.target.value.replace(/\D/g, '') })} 
              className={`${inputCls} pl-10 tracking-[0.5em] font-black text-lg`}
              placeholder="0000"
            />
          </div>
        </Field>

        <Field label="Manager PIN (Analytics Only)">
          <div className="relative">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              required 
              type={showPins ? "text" : "password"} 
              maxLength={4}
              pattern="\d{4}"
              value={form.managerPin} 
              onChange={(e) => setForm({ ...form, managerPin: e.target.value.replace(/\D/g, '') })} 
              className={`${inputCls} pl-10 tracking-[0.5em] font-black text-lg`}
              placeholder="5555"
            />
          </div>
        </Field>

        <Field label="Staff PIN (POS Only)">
          <div className="relative">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              required 
              type={showPins ? "text" : "password"} 
              maxLength={4}
              pattern="\d{4}"
              value={form.staffPin} 
              onChange={(e) => setForm({ ...form, staffPin: e.target.value.replace(/\D/g, '') })} 
              className={`${inputCls} pl-10 tracking-[0.5em] font-black text-lg`}
              placeholder="1234"
            />
          </div>
        </Field>

        <div className="pt-4">
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-700 active:scale-95 transition-all shadow-sm"
          >
            {saved ? <><Check className="w-4 h-4 text-green-400" /> PINs Updated!</> : "Update PINs"}
          </button>
        </div>
      </form>

      <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
        <div className="flex gap-3">
          <Shield className="w-5 h-5 text-yellow-600 shrink-0" />
          <div className="text-xs text-yellow-800 space-y-1">
            <p className="font-bold">Security Tip:</p>
            <p>Change your PINs regularly to keep your sales data safe. Avoid using simple PINs like 1234 or 1111 for Manager access.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
