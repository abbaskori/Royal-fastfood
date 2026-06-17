import { useState, useMemo, useRef, useEffect } from "react";
import { ShoppingCart, Plus, Minus, Trash2, ChevronDown, User, Phone, X, ArrowLeft, PlusCircle, Search } from "lucide-react";
import { useCategories, useMenuItems, useOrders, useCustomers, useShopInfo } from "@/hooks/use-data";
import { formatCurrency, getEmojiSvgUri, cn } from "@/lib/utils";
import { format } from "date-fns";

// ─── Types ───────────────────────────────────────────────────────────────────

type CartItem = { id: string; name: string; price: number; qty: number; uid: string };
type DiscountType = "none" | "percentage" | "rupees";
type PaymentMethod = "Cash" | "Online";

interface BillTab {
  id: string;
  label: string;
  cart: CartItem[];
  customerName: string;
  customerPhone: string;
  activeCategory: string;
  discountType: DiscountType;
  discountValue: number;
  paymentMethod: PaymentMethod;
  completedOrder: any | null;
  viewMode: "pos" | "receipt";
  mobileView: "menu" | "cart";
}

// ─── Persistence keys ─────────────────────────────────────────────────────────

const LS_TABS = "royal_pos_tabs";
const LS_ACTIVE = "royal_pos_active_tab";
const LS_COUNTER = "royal_pos_tab_counter";

// ─── Tab factory ─────────────────────────────────────────────────────────────

function getCounter() { return parseInt(localStorage.getItem(LS_COUNTER) || "1", 10); }
function bumpCounter() { const n = getCounter(); localStorage.setItem(LS_COUNTER, String(n + 1)); return n; }

function freshTab(): BillTab {
  return {
    id: crypto.randomUUID(),
    label: `Bill ${bumpCounter()}`,
    cart: [],
    customerName: "",
    customerPhone: "",
    activeCategory: "All",
    discountType: "none",
    discountValue: 0,
    paymentMethod: "Cash",
    completedOrder: null,
    viewMode: "pos",
    mobileView: "menu",
  };
}

function loadTabs(): { tabs: BillTab[]; activeTabId: string } {
  try {
    const saved = localStorage.getItem(LS_TABS);
    if (saved) {
      const tabs: BillTab[] = JSON.parse(saved);
      if (tabs.length > 0) {
        const activeId = localStorage.getItem(LS_ACTIVE) || tabs[0].id;
        const validId = tabs.find((t) => t.id === activeId) ? activeId : tabs[0].id;
        return { tabs, activeTabId: validId };
      }
    }
  } catch {}
  const t = freshTab();
  return { tabs: [t], activeTabId: t.id };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function POS() {
  const { data: categories } = useCategories();
  const { data: menuItems } = useMenuItems();
  const { createOrder, updateOrder } = useOrders();
  const { data: customers } = useCustomers();
  const { data: shop } = useShopInfo();

  const initial = useMemo(() => loadTabs(), []);
  const [tabs, setTabs] = useState<BillTab[]>(initial.tabs);
  const [activeTabId, setActiveTabId] = useState<string>(initial.activeTabId);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const tabBarRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Keyboard shortcut: Ctrl+F focuses search ────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── Persist tabs to localStorage on every change ────────────────────────────
  useEffect(() => { localStorage.setItem(LS_TABS, JSON.stringify(tabs)); }, [tabs]);
  useEffect(() => { localStorage.setItem(LS_ACTIVE, activeTabId); }, [activeTabId]);

  const logoSrc = shop.logo || `${import.meta.env.BASE_URL}royal-logo.png`;

  // ── Active tab helpers ──────────────────────────────────────────────────────

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  const updateTab = (updates: Partial<BillTab>) => {
    setTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, ...updates } : t)));
  };

  // ── Tab management ──────────────────────────────────────────────────────────

  const addTab = () => {
    const t = freshTab();
    setTabs((prev) => [...prev, t]);
    setActiveTabId(t.id);
    setTimeout(() => tabBarRef.current?.scrollTo({ left: 9999, behavior: "smooth" }), 50);
  };

  const closeTab = (tabId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTabs((prev) => {
      if (prev.length === 1) {
        const t = freshTab();
        setActiveTabId(t.id);
        return [t];
      }
      const next = prev.filter((t) => t.id !== tabId);
      if (tabId === activeTabId) setActiveTabId(next[next.length - 1].id);
      return next;
    });
  };

  // ── Cart operations (on active tab) ────────────────────────────────────────

  const addToCart = (item: any) => {
    if (item.trackStock) {
      const existing = activeTab.cart.find((i) => i.id === item.id);
      const currentQty = existing ? existing.qty : 0;
      if (currentQty >= (item.stock || 0)) {
        return; // Prevent exceeding stock
      }
    }

    updateTab({
      cart: (() => {
        const existing = activeTab.cart.find((i) => i.id === item.id);
        if (existing) return activeTab.cart.map((i) => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
        return [...activeTab.cart, { id: item.id, name: item.name, price: item.price, qty: 1, uid: crypto.randomUUID() }];
      })(),
      mobileView: "cart",
    });
  };

  const updateQty = (uid: string, delta: number) => {
    updateTab({ 
      cart: activeTab.cart.map((i) => {
        if (i.uid === uid) {
          const itemDef = menuItems.find(mi => mi.id === i.id);
          let newQty = Math.max(0, i.qty + delta);
          if (itemDef?.trackStock && newQty > (itemDef.stock || 0)) {
            newQty = itemDef.stock || 0;
          }
          return { ...i, qty: newQty };
        }
        return i;
      }).filter((i) => i.qty > 0) 
    });
  };

  const removeFromCart = (uid: string) => updateTab({ cart: activeTab.cart.filter((i) => i.uid !== uid) });

  // ── Computed totals ─────────────────────────────────────────────────────────

  const subtotal = activeTab.cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  const discountAmount = useMemo(() => {
    if (activeTab.discountType === "none") return 0;
    if (activeTab.discountType === "percentage") return subtotal * (Math.min(100, Math.max(0, activeTab.discountValue || 0)) / 100);
    return Math.min(subtotal, Math.max(0, activeTab.discountValue || 0));
  }, [activeTab.discountType, activeTab.discountValue, subtotal]);

  const total = subtotal - discountAmount;

  const filteredItems = useMemo(() => {
    let items = menuItems;
    if (activeTab.activeCategory !== "All") {
      items = items.filter((i) => i.categoryId === activeTab.activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter((i) => i.name.toLowerCase().includes(q));
    }
    return items;
  }, [menuItems, activeTab.activeCategory, searchQuery]);


  const customerSuggestions = useMemo(() => {
    if (!activeTab.customerName || activeTab.customerName.length < 1) return [];
    const q = activeTab.customerName.toLowerCase();
    return customers.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 5);
  }, [customers, activeTab.customerName]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handleCheckout = () => {
    if (activeTab.cart.length === 0) return;
    
    const orderData = {
      items: activeTab.cart.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.qty, amount: i.price * i.qty })),
      subtotal,
      discountType: activeTab.discountType,
      discountValue: activeTab.discountValue,
      discountAmount,
      total,
      paymentMethod: activeTab.paymentMethod,
      customerName: activeTab.customerName.trim(),
      customerPhone: activeTab.customerPhone.trim(),
      createdAt: activeTab.completedOrder?.createdAt || new Date().toISOString(),
    };

    let order;
    if (activeTab.completedOrder) {
      order = updateOrder(activeTab.completedOrder.id, orderData);
    } else {
      order = createOrder(orderData);
    }

    updateTab({ completedOrder: order, viewMode: "receipt", label: activeTab.customerName.trim() || "Guest" });
  };

  const newBill = () => {
    const t = freshTab();
    setTabs((prev) => prev.map((tb) => tb.id === activeTabId ? { ...t, id: activeTabId } : tb));
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

      {/* ── Tab Bar ─────────────────────────────────────────────────────────── */}
      <div className="no-print bg-white border-b border-gray-200 flex items-center shrink-0 gap-0 overflow-hidden">
        <div ref={tabBarRef} className="flex-1 flex items-end overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const hasItems = tab.cart.length > 0 || tab.completedOrder;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={cn(
                  "relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-all shrink-0 group",
                  isActive
                    ? "border-yellow-500 text-yellow-600 bg-yellow-50"
                    : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                )}
              >
                {tab.viewMode === "receipt" ? "🧾" : "🛒"}
                <span className="max-w-[100px] truncate">{tab.label}</span>
                {hasItems && !isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
                )}
                {tab.cart.length > 0 && tab.viewMode === "pos" && (
                  <span className="bg-yellow-500 text-white text-[10px] rounded-full px-1 min-w-[16px] text-center leading-4">
                    {tab.cart.length}
                  </span>
                )}
                <span
                  role="button"
                  onClick={(e) => closeTab(tab.id, e)}
                  className={cn(
                    "w-4 h-4 flex items-center justify-center rounded-full hover:bg-red-100 hover:text-red-500 transition-colors text-gray-400",
                    isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                >
                  <X className="w-2.5 h-2.5" />
                </span>
              </button>
            );
          })}
        </div>
        <button
          onClick={addTab}
          title="New Bill"
          className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 transition-colors shrink-0 border-l border-gray-200"
        >
          <PlusCircle className="w-4 h-4" /> <span className="hidden sm:inline">New Bill</span>
        </button>
      </div>

      {/* ── Receipt View ─────────────────────────────────────────────────────── */}
      {activeTab.viewMode === "receipt" && activeTab.completedOrder ? (
        <ReceiptView
          order={activeTab.completedOrder}
          shop={shop}
          logoSrc={logoSrc}
          onBack={() => updateTab({ viewMode: "pos" })}
          onNewBill={newBill}
        />
      ) : (

        /* ── POS View ──────────────────────────────────────────────────────── */
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-gray-50 dark:bg-gray-900">

          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">

          {/* Mobile menu/cart switcher */}
          <div className="lg:hidden flex border-b border-gray-200 bg-white shrink-0">
            <button
              onClick={() => updateTab({ mobileView: "menu" })}
              className={cn("flex-1 py-2.5 text-sm font-bold transition-colors flex items-center justify-center gap-2",
                activeTab.mobileView === "menu" ? "text-yellow-500 border-b-2 border-yellow-500" : "text-gray-500")}
            >
              🍽️ Menu
            </button>
            <button
              onClick={() => updateTab({ mobileView: "cart" })}
              className={cn("flex-1 py-2.5 text-sm font-bold transition-colors flex items-center justify-center gap-2",
                activeTab.mobileView === "cart" ? "text-yellow-500 border-b-2 border-yellow-500" : "text-gray-500")}
            >
              🛒 Cart
              {activeTab.cart.length > 0 && (
                <span className="bg-yellow-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                  {activeTab.cart.length}
                </span>
              )}
            </button>
          </div>

          {/* LEFT: Menu */}
          <div className={cn("flex-1 flex-col min-h-0 overflow-hidden bg-white border-b lg:border-b-0 lg:border-r border-gray-200",
            activeTab.mobileView === "menu" ? "flex" : "hidden lg:flex")}>
            {/* Menu header */}
            <div className="px-4 pt-3 pb-2 flex flex-col gap-2 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black text-gray-900 dark:text-white">Menu</h2>
                <div className="relative">
                  <select
                    value={activeTab.activeCategory}
                    onChange={(e) => updateTab({ activeCategory: e.target.value })}
                    className="appearance-none pl-3 pr-8 py-2 text-sm font-semibold border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-yellow-400 cursor-pointer"
                  >
                    <option value="All">All Categories</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
              </div>
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search menu... (Ctrl+F)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 dark:focus:ring-yellow-900 transition-all placeholder:text-gray-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-3">
              {filteredItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 py-12">
                  <Search className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm font-medium">No items found{searchQuery ? ` for "${searchQuery}"` : ""}</p>
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="mt-2 text-xs text-yellow-500 font-bold hover:underline">Clear search</button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filteredItems.map((item) => (
                    <button
                      key={item.id}
                      disabled={item.trackStock && (item.stock || 0) === 0}
                      onClick={() => addToCart(item)}
                      className="group flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md hover:border-yellow-300 dark:hover:border-yellow-500 transition-all active:scale-95 text-left w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="bg-yellow-400 dark:bg-yellow-500 flex items-center justify-center h-24 sm:h-28 w-full">
                        <img src={getEmojiSvgUri(item.image, "FB923C")} alt={item.name}
                          className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-sm" />
                      </div>
                      <div className="p-2 flex flex-col flex-1">
                        <p className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 leading-tight line-clamp-2 mb-1">{item.name}</p>
                        <div className="flex items-center justify-between mt-auto">
                          <p className="text-green-600 dark:text-green-400 font-bold text-sm">{formatCurrency(item.price)}</p>
                          {item.trackStock && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${(item.stock || 0) === 0 ? 'bg-red-100 text-red-600' : (item.stock || 0) <= 5 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600'}`}>
                              {(item.stock || 0) === 0 ? 'Out of Stock' : `${item.stock} left`}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Cart */}
          <div className={cn("w-full lg:w-[360px] xl:w-[400px] bg-white flex-col shrink-0 min-h-0 shadow-xl",
            activeTab.mobileView === "cart" ? "flex" : "hidden lg:flex")}>

            {/* Cart header */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2 shrink-0">
              <ShoppingCart className="w-5 h-5 text-gray-700" />
              <h2 className="font-bold text-gray-900">Cart ({activeTab.cart.length})</h2>
            </div>

            {/* Customer info */}
            <div className="px-4 pt-3 pb-2 space-y-2 border-b border-gray-100 shrink-0 relative">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Customer Name (Optional)"
                  value={activeTab.customerName}
                  onChange={(e) => { 
                    const name = e.target.value;
                    updateTab({ 
                      customerName: name, 
                      label: name.trim() || `Bill ${tabs.findIndex(t => t.id === activeTabId) + 1}` 
                    }); 
                    setShowSuggestions(true); 
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition-all"
                />
                {showSuggestions && customerSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 shadow-xl rounded-lg overflow-hidden z-50">
                    {customerSuggestions.map((c) => (
                      <button key={c.id}
                        onClick={() => { 
                          updateTab({ 
                            customerName: c.name, 
                            customerPhone: c.phone || "",
                            label: c.name
                          }); 
                          setShowSuggestions(false); 
                        }}
                        className="w-full text-left px-3 py-2.5 hover:bg-yellow-50 text-sm font-medium border-b border-gray-100 last:border-0 transition-colors">
                        {c.name} {c.phone && <span className="text-gray-400 text-xs ml-1">{c.phone}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  placeholder="Phone Number (Optional)"
                  value={activeTab.customerPhone}
                  onChange={(e) => updateTab({ customerPhone: e.target.value.replace(/\D/g, "") })}
                  maxLength={10}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition-all"
                />
              </div>
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto px-4 py-2 min-h-0">
              {activeTab.cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 py-8">
                  <ShoppingCart className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm font-medium">Cart is empty</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeTab.cart.map((item) => (
                    <div key={item.uid} className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                        <p className="text-xs text-green-600 font-bold">{formatCurrency(item.price)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQty(item.uid, -1)}
                          className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 active:scale-90 transition-all text-gray-600">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-bold text-gray-800">{item.qty}</span>
                        <button onClick={() => updateQty(item.uid, 1)}
                          className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 active:scale-90 transition-all text-gray-600">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="w-16 text-right text-sm font-bold text-gray-800">{formatCurrency(item.price * item.qty)}</div>
                      <button onClick={() => removeFromCart(item.uid)}
                        className="w-7 h-7 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom panel */}
            <div className="px-4 py-3 border-t border-gray-200 space-y-3 shrink-0 bg-white">
              {/* Discount */}
              <div>
                <p className="text-xs font-bold text-gray-500 mb-1.5">Discount</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <select
                      value={activeTab.discountType}
                      onChange={(e) => updateTab({ discountType: e.target.value as DiscountType, discountValue: 0 })}
                      className="w-full appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:border-yellow-400"
                    >
                      <option value="none">No Discount</option>
                      <option value="percentage">Percentage (%)</option>
                      <option value="rupees">Amount (₹)</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  {activeTab.discountType !== "none" && (
                    <input type="number" min="0"
                      max={activeTab.discountType === "percentage" ? 100 : subtotal}
                      value={activeTab.discountValue || ""}
                      onChange={(e) => updateTab({ discountValue: parseFloat(e.target.value) || 0 })}
                      placeholder={activeTab.discountType === "percentage" ? "%" : "₹"}
                      className="w-20 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-yellow-400 font-bold text-center"
                    />
                  )}
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-1">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal:</span><span>{formatCurrency(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-red-500 font-semibold">
                    <span>Discount:</span><span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-gray-900 pt-1">
                  <span>Total:</span>
                  <span className="text-green-600">{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Payment */}
              <div>
                <p className="text-xs font-bold text-gray-500 mb-1.5">Payment Method</p>
                <div className="relative">
                  <select
                    value={activeTab.paymentMethod}
                    onChange={(e) => updateTab({ paymentMethod: e.target.value as PaymentMethod })}
                    className="w-full appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:border-yellow-400 font-semibold"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Online">Online</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Generate Bill */}
              <button
                onClick={handleCheckout}
                disabled={activeTab.cart.length === 0}
                className={cn(
                  "w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
                  activeTab.cart.length > 0
                    ? "bg-gray-800 text-white hover:bg-gray-700 shadow-lg"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                )}
              >
                🧾 Generate Bill
              </button>
            </div>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}

// ─── Print helper ─────────────────────────────────────────────────────────────

function printBill(order: any, shop: any, logoSrc: string) {
  // Make logo URL absolute so it loads correctly from a blob: URL
  const absoluteLogo = logoSrc.startsWith("data:")
    ? logoSrc
    : logoSrc.startsWith("http")
      ? logoSrc
      : window.location.origin + (logoSrc.startsWith("/") ? "" : "/") + logoSrc;
  const infoRows = [
    ["Date", format(new Date(order.createdAt), "dd/MM/yy")],
    ["Time", format(new Date(order.createdAt), "hh:mm a")],
    ...(order.customerPhone ? [["Phone", order.customerPhone]] : []),
    ["Payment", order.paymentMethod],
  ];

  const itemRows = order.items.map((i: any) => `
    <tr>
      <td style="padding:2px 1px;border-bottom:1px dotted #ccc;">${i.name}</td>
      <td style="padding:2px 1px;text-align:center;border-bottom:1px dotted #ccc;">${i.quantity}</td>
      <td style="padding:2px 1px;text-align:right;border-bottom:1px dotted #ccc;">${i.price.toFixed(2)}</td>
      <td style="padding:2px 1px;text-align:right;font-weight:bold;border-bottom:1px dotted #ccc;">${i.amount.toFixed(2)}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html><html><head>
    <meta charset="utf-8"/>
    <title>Bill</title>
    <style>
      @page { size: 80mm auto; margin: 4mm; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #000; background: #fff; width: 100%; }
      .center { text-align: center; }
      .bold { font-weight: bold; }
      .big { font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
      .small { font-size: 10px; color: #333; }
      hr { border: none; border-top: 1px dashed #000; margin: 5px 0; }
      table { width: 100%; border-collapse: collapse; }
      th { text-align: left; padding: 2px 1px; border-bottom: 1px solid #000; font-size: 10px; }
      th:nth-child(2) { text-align: center; }
      th:nth-child(3), th:nth-child(4) { text-align: right; }
      .row { display: flex; justify-content: space-between; padding: 1px 0; font-size: 11px; }
      .total-row { font-size: 14px; font-weight: bold; display: flex; justify-content: space-between; padding: 2px 0; }
      img { max-height: 48px; display: block; margin: 0 auto 4px; }
    </style>
  </head><body>
    <div class="center">
      ${absoluteLogo ? `<img src="${absoluteLogo}" onerror="this.style.display='none'"/>` : ""}
      <div class="big">${shop.name}</div>
      <div class="small">${shop.address}</div>
      <div class="small">Ph: ${shop.contact}</div>
      ${shop.gstin ? `<div class="small">GSTIN: ${shop.gstin}</div>` : ""}
    </div>
    <hr/>
    ${infoRows.map(([l, v]) => `<div class="row"><span>${l}:</span><span>${v}</span></div>`).join("")}
    <hr/>
    <table>
      <thead><tr>
        <th>Item</th><th style="text-align:center">Qty</th>
        <th style="text-align:right">Rate</th><th style="text-align:right">Amt</th>
      </tr></thead>
      <tbody>${itemRows}</tbody>
    </table>
    <hr/>
    <div class="row"><span>Subtotal</span><span>Rs.${order.subtotal.toFixed(2)}</span></div>
    ${order.discountAmount > 0 ? `<div class="row"><span>Discount${order.discountType === "percentage" ? ` (${order.discountValue}%)` : ""}</span><span>-Rs.${order.discountAmount.toFixed(2)}</span></div>` : ""}
    <hr/>
    <div class="total-row"><span>TOTAL</span><span>Rs.${order.total.toFixed(2)}</span></div>
    <hr/>
    <div class="center bold" style="margin-top:6px;">** THANK YOU! VISIT AGAIN **</div>
  </body></html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank", "width=420,height=700");
  if (!win) { URL.revokeObjectURL(url); alert("Pop-up blocked! Please allow pop-ups for this site to print."); return; }
  win.addEventListener("load", () => {
    setTimeout(() => { win.print(); win.close(); URL.revokeObjectURL(url); }, 300);
  });
}

// ─── Receipt View ─────────────────────────────────────────────────────────────

function ReceiptView({ order, shop, logoSrc, onBack, onNewBill }: {
  order: any;
  shop: any;
  logoSrc: string;
  onBack: () => void;
  onNewBill: () => void;
}) {
  const whatsappText = `*${shop.name}*\nDate: ${format(new Date(order.createdAt), "dd/MM/yyyy, hh:mm a")}\nPayment: ${order.paymentMethod}\n\n${order.items.map((i: any) => `${i.name} x${i.quantity} = ${formatCurrency(i.amount)}`).join("\n")}\n\nSubtotal: ${formatCurrency(order.subtotal)}${order.discountAmount > 0 ? `\nDiscount: -${formatCurrency(order.discountAmount)}` : ""}\n*Total: ${formatCurrency(order.total)}*\n\nThank You! Visit Again!`;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-gray-100">
      {/* Action bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 py-2.5 px-4 flex items-center gap-2 shadow-sm flex-wrap justify-center sm:justify-start">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200 active:scale-95 transition-all text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 active:scale-95 transition-all text-sm"
        >
          🖨️ Print
        </button>
        <button
          onClick={() => {
            const phone = order.customerPhone;
            const url = phone
              ? `https://wa.me/91${phone}?text=${encodeURIComponent(whatsappText)}`
              : `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
            window.open(url, "_blank");
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#25D366] text-white rounded-lg font-bold hover:bg-[#1ebe5d] active:scale-95 transition-all text-sm"
        >
          📱 WhatsApp
        </button>
        <button
          onClick={onNewBill}
          className="flex items-center gap-1.5 px-4 py-2 bg-gray-700 text-white rounded-lg font-bold hover:bg-gray-800 active:scale-95 transition-all text-sm"
        >
          ✕ Close
        </button>
      </div>

      {/* Receipt */}
      <div className="flex-1 flex items-start justify-center p-4 pt-6 overflow-y-auto">
        <div id="print-receipt" className="bg-white w-full max-w-[400px] px-6 py-8 shadow-lg rounded-lg">

          {/* Logo & Shop Header */}
          <div className="text-center mb-6">
            <img src={logoSrc} alt={shop.name}
              className="receipt-logo h-16 w-auto mx-auto mb-4 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <h2 className="text-2xl font-black text-gray-900 leading-tight">{shop.name}</h2>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed max-w-[250px] mx-auto">{shop.address}</p>
            <p className="text-xs text-gray-500 mt-1 font-medium">Contact: {shop.contact}</p>
            {shop.gstin && <p className="text-[10px] text-gray-400 mt-1 tracking-wider uppercase">GSTIN: {shop.gstin}</p>}
          </div>

          <hr className="border-gray-300 mb-4" />

          {/* Bill Info */}
          <div className="space-y-1 mb-4 text-sm">
            {[
              ["Date & Time:", format(new Date(order.createdAt), "dd/MM/yyyy, hh:mm a")],
              ...(order.customerPhone ? [["Phone:", order.customerPhone]] : []),
              ["Payment:", order.paymentMethod],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-gray-600 font-medium">{label}</span>
                <span className="text-gray-900 font-semibold text-right">{value}</span>
              </div>
            ))}
          </div>

          <hr className="border-gray-300 mb-4" />

          {/* Items Table */}
          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left pb-2 font-bold text-gray-800">Item</th>
                <th className="text-center pb-2 font-bold text-gray-800 w-10">Qty</th>
                <th className="text-right pb-2 font-bold text-gray-800 w-20">Price</th>
                <th className="text-right pb-2 font-bold text-gray-800 w-20">Amount</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item: any, i: number) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2 text-gray-800">{item.name}</td>
                  <td className="py-2 text-center text-gray-600">{item.quantity}</td>
                  <td className="py-2 text-right text-gray-600">₹{item.price.toFixed(2)}</td>
                  <td className="py-2 text-right text-gray-800 font-medium">₹{item.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <hr className="border-gray-300 mb-3" />

          {/* Totals */}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span>₹{order.subtotal.toFixed(2)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-red-500">
                <span>Discount{order.discountType === "percentage" ? ` (${order.discountValue}%)` : ""}:</span>
                <span>-₹{order.discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-black text-gray-900 pt-1 border-t border-gray-200 mt-2">
              <span>Total:</span>
              <span>₹{order.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6 pt-4 border-t border-dashed border-gray-300">
            <p className="font-bold text-gray-900 text-sm">Thank You! Visit Again!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
