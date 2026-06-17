import { useState } from "react";
import { useMenuItems, useCategories, useRawMaterials } from "@/hooks/use-data";
import { formatCurrency } from "@/lib/utils";
import { Package, Search, Plus, Minus, AlertTriangle, ArrowRightLeft } from "lucide-react";

export default function Inventory() {
  const { data: items, updateItem } = useMenuItems();
  const { data: categories } = useCategories();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [viewTab, setViewTab] = useState<"menu" | "materials">("menu");
  const { data: rawMaterials, updateMaterial } = useRawMaterials();

  // Only show items that are tracking stock
  const trackedItems = items.filter(i => i.trackStock);
  
  const displayItems = trackedItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = filterCat === "All" || item.categoryId === filterCat;
    return matchesSearch && matchesCat;
  }).sort((a, b) => (a.stock || 0) - (b.stock || 0)); // Sort by lowest stock first

  const handleStockAdjust = (id: string, currentStock: number, delta: number) => {
    const newStock = Math.max(0, currentStock + delta);
    updateItem(id, { stock: newStock });
  };

  const handleDirectEdit = (id: string, value: string) => {
    const parsed = parseInt(value);
    if (!isNaN(parsed) && parsed >= 0) {
      updateItem(id, { stock: parsed });
    }
  };

  const lowStockCount = trackedItems.filter(i => (i.stock || 0) <= 5).length;
  
  const displayMaterials = rawMaterials.filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (a.stock || 0) - (b.stock || 0));

  const handleMaterialAdjust = (id: string, currentStock: number, delta: number) => {
    const newStock = Math.max(0, currentStock + delta);
    updateMaterial(id, { stock: newStock });
  };

  const handleMaterialEdit = (id: string, value: string) => {
    const parsed = parseInt(value);
    if (!isNaN(parsed) && parsed >= 0) {
      updateMaterial(id, { stock: parsed });
    }
  };

  const lowMaterialCount = rawMaterials.filter(m => (m.stock || 0) <= 10).length;

  return (
    <div className="flex-1 bg-gray-50 overflow-y-auto">
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Package className="w-6 h-6 text-yellow-500" /> Inventory Management
            </h1>
            <p className="text-sm text-gray-500 mt-1">Manage stock levels for your tracked items.</p>
          </div>
          
          <div className="flex items-center gap-3">
            {viewTab === "menu" && lowStockCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-bold border border-red-100">
                <AlertTriangle className="w-4 h-4" /> {lowStockCount} items low
              </div>
            )}
            {viewTab === "materials" && lowMaterialCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-sm font-bold border border-orange-100">
                <AlertTriangle className="w-4 h-4" /> {lowMaterialCount} materials low
              </div>
            )}
            <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm gap-1">
              <button 
                onClick={() => setViewTab("menu")} 
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewTab === "menu" ? "bg-yellow-500 text-white" : "text-gray-500 hover:bg-gray-50"}`}
              >
                Menu Items
              </button>
              <button 
                onClick={() => setViewTab("materials")} 
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewTab === "materials" ? "bg-yellow-500 text-white" : "text-gray-500 hover:bg-gray-50"}`}
              >
                Raw Materials
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-140px)] min-h-[500px]">
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 bg-gray-50/50">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search items..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all bg-white"
              />
            </div>
            {viewTab === "menu" && (
              <select 
                value={filterCat} 
                onChange={(e) => setFilterCat(e.target.value)} 
                className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-yellow-400 bg-white min-w-[150px]"
              >
                <option value="All">All Categories</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {viewTab === "menu" ? (
              trackedItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3">
                  <Package className="w-12 h-12 text-gray-200" />
                  <p>No items are currently being tracked.</p>
                  <p className="text-sm">Go to the Admin panel and enable "Track Stock" for items you want to manage here.</p>
                </div>
              ) : displayItems.length === 0 ? (
                <div className="text-center text-gray-500 py-12">No items match your search.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {displayItems.map(item => {
                    const stock = item.stock || 0;
                    const isLow = stock <= 5;
                    const isOut = stock === 0;

                    return (
                      <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isOut ? 'bg-red-50/50 border-red-100' : isLow ? 'bg-orange-50/30 border-orange-100' : 'bg-white border-gray-200 hover:border-yellow-300'}`}>
                        <div className="w-12 h-12 shrink-0 rounded-lg bg-gray-100 flex items-center justify-center text-2xl">{item.image}</div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-800 text-sm truncate">{item.name}</p>
                          <p className="text-xs text-gray-500">{categories.find((c) => c.id === item.categoryId)?.name || "—"}</p>
                          
                          <div className="mt-1 flex items-center gap-2">
                            <button 
                              onClick={() => handleStockAdjust(item.id, stock, -1)}
                              className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95 transition-all"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            
                            <input 
                              type="number" 
                              value={stock} 
                              onChange={(e) => handleDirectEdit(item.id, e.target.value)}
                              className={`w-14 text-center font-bold text-sm bg-transparent border-none focus:outline-none focus:ring-0 p-0 ${isOut ? 'text-red-600' : isLow ? 'text-orange-500' : 'text-gray-900'}`}
                            />
                            
                            <button 
                              onClick={() => handleStockAdjust(item.id, stock, 1)}
                              className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95 transition-all"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs font-bold text-gray-400">{formatCurrency(item.price)}</span>
                          {isOut ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-bold uppercase tracking-wider">Out</span>
                          ) : isLow && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-600 font-bold uppercase tracking-wider">Low</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              rawMaterials.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3">
                  <Package className="w-12 h-12 text-gray-200" />
                  <p>No raw materials defined.</p>
                  <p className="text-sm">Go to the Admin panel to add your raw materials and packaging.</p>
                </div>
              ) : displayMaterials.length === 0 ? (
                <div className="text-center text-gray-500 py-12">No materials match your search.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {displayMaterials.map(item => {
                    const stock = item.stock || 0;
                    const isLow = stock <= 10;
                    const isOut = stock === 0;

                    return (
                      <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isOut ? 'bg-red-50/50 border-red-100' : isLow ? 'bg-orange-50/30 border-orange-100' : 'bg-white border-gray-200 hover:border-yellow-300'}`}>
                        <div className="w-12 h-12 shrink-0 rounded-lg bg-yellow-50 text-yellow-600 flex items-center justify-center"><Package className="w-6 h-6" /></div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-800 text-sm truncate">{item.name}</p>
                          <p className="text-xs text-gray-500 capitalize">{item.unit}</p>
                          
                          <div className="mt-1 flex items-center gap-2">
                            <button 
                              onClick={() => handleMaterialAdjust(item.id, stock, -1)}
                              className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95 transition-all"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            
                            <input 
                              type="number" 
                              value={stock} 
                              onChange={(e) => handleMaterialEdit(item.id, e.target.value)}
                              className={`w-14 text-center font-bold text-sm bg-transparent border-none focus:outline-none focus:ring-0 p-0 ${isOut ? 'text-red-600' : isLow ? 'text-orange-500' : 'text-gray-900'}`}
                            />
                            
                            <button 
                              onClick={() => handleMaterialAdjust(item.id, stock, 1)}
                              className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95 transition-all"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-1">
                          {isOut ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-bold uppercase tracking-wider">Out</span>
                          ) : isLow && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-600 font-bold uppercase tracking-wider">Low</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
