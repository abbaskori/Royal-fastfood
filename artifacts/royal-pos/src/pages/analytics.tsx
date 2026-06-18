import { useState, useMemo } from "react";
import { useOrders, useCategories, useMenuItems, useRawMaterials, useCustomers } from "@/hooks/use-data";
import { formatCurrency } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, AreaChart, Area } from "recharts";
import { format, isToday, isThisWeek, isThisMonth, parseISO, subDays, subWeeks, subMonths, isSameDay } from "date-fns";
import { TrendingUp, CreditCard, Banknote, Users, AlertTriangle, Clock, Award, Star, ArrowUpRight, ArrowDownRight, Trash2, Tag, Percent, Package } from "lucide-react";
import { motion } from "framer-motion";

export default function Analytics() {
  const { data: allOrders, deleteOrder, resetData } = useOrders();
  const { data: categories } = useCategories();
  const { data: menuItems } = useMenuItems();
  const { data: rawMaterials } = useRawMaterials();
  const { data: customers } = useCustomers();
  const [timeFilter, setTimeFilter] = useState<'daily'|'weekly'|'monthly'|'all'|'custom'|'range'>('all');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Current period orders
  const orders = useMemo(() => {
    if(timeFilter === 'all') return allOrders;
    return allOrders.filter(o => {
      const d = parseISO(o.createdAt);
      if(timeFilter === 'daily') return isToday(d);
      if(timeFilter === 'weekly') return isThisWeek(d);
      if(timeFilter === 'monthly') return isThisMonth(d);
      if(timeFilter === 'custom') return format(d, 'yyyy-MM-dd') === selectedDate;
      if(timeFilter === 'range') {
        const dStr = format(d, 'yyyy-MM-dd');
        return dStr >= startDate && dStr <= endDate;
      }
      return true;
    });
  }, [allOrders, timeFilter, selectedDate, startDate, endDate]);

  // Previous period orders for trend comparison
  const previousOrders = useMemo(() => {
    if (timeFilter === 'all') return [];
    return allOrders.filter(o => {
      const d = parseISO(o.createdAt);
      const now = new Date();
      if (timeFilter === 'daily') return isSameDay(d, subDays(now, 1));
      if (timeFilter === 'custom') return format(d, 'yyyy-MM-dd') === format(subDays(parseISO(selectedDate), 1), 'yyyy-MM-dd');
      if (timeFilter === 'weekly') return d >= subWeeks(now, 2) && d < subWeeks(now, 1);
      if (timeFilter === 'monthly') return d >= subMonths(now, 2) && d < subMonths(now, 1);
      if (timeFilter === 'range') {
        const diff = Math.floor((parseISO(endDate).getTime() - parseISO(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const prevStart = format(subDays(parseISO(startDate), diff), 'yyyy-MM-dd');
        const prevEnd = format(subDays(parseISO(endDate), diff), 'yyyy-MM-dd');
        const dStr = format(d, 'yyyy-MM-dd');
        return dStr >= prevStart && dStr <= prevEnd;
      }
      return false;
    });
  }, [allOrders, timeFilter, selectedDate, startDate, endDate]);

  const stats = useMemo(() => {
    // Current stats
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const totalDiscounts = orders.reduce((sum, o) => sum + (o.discountAmount || 0), 0);
    const uniqueCustomers = new Set(orders.map(o => o.customerPhone || o.customerName)).size;
    
    // Previous stats for trends
    const prevRevenue = previousOrders.reduce((sum, o) => sum + o.total, 0);
    const revenueTrend = prevRevenue === 0 ? 0 : ((totalRevenue - prevRevenue) / prevRevenue) * 100;
    const prevOrdersCount = previousOrders.length;
    const ordersTrend = prevOrdersCount === 0 ? 0 : ((orders.length - prevOrdersCount) / prevOrdersCount) * 100;

    // Top Items
    const itemsMap: Record<string, {name: string, qty: number, revenue: number}> = {};
    orders.forEach(o => {
      o.items.forEach(i => {
        const itemDef = menuItems.find(mi => mi.name === i.name);
        const catDef = itemDef ? categories.find(c => c.id === itemDef.categoryId) : null;
        const isColdDrink = catDef?.name?.toLowerCase().includes('cold drink') || i.name.toLowerCase().includes('colddrink') || i.name.toLowerCase().includes('cold drink');
        if (!isColdDrink) {
          if (!itemsMap[i.name]) itemsMap[i.name] = { name: i.name, qty: 0, revenue: 0 };
          itemsMap[i.name].qty += i.quantity;
          itemsMap[i.name].revenue += i.amount;
        }
      });
    });
    const topItems = Object.values(itemsMap).sort((a, b) => b.qty - a.qty).slice(0, 5);

    // Peak Hours
    const hoursMap: Record<number, number> = {};
    for (let i = 0; i < 24; i++) hoursMap[i] = 0;
    orders.forEach(o => {
      const hour = new Date(o.createdAt).getHours();
      hoursMap[hour] += o.total;
    });
    const hourlyData = Object.entries(hoursMap).map(([hourStr, revenue]) => {
      const h = parseInt(hourStr);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return {
        hour: `${h12} ${ampm}`,
        revenue
      };
    });

    // Category breakdown
    const catMap: Record<string, number> = {};
    // Initialize all known categories to 0
    categories.forEach(c => { catMap[c.name] = 0; });
    
    orders.forEach(o => {
      o.items.forEach(i => {
        // Find category using menuItems
        const itemDef = menuItems.find(mi => mi.name === i.name);
        const catDef = itemDef ? categories.find(c => c.id === itemDef.categoryId) : null;
        const catName = catDef ? catDef.name : 'Uncategorized';
        catMap[catName] = (catMap[catName] || 0) + i.amount;
      });
    });
    
    // Category Pie Data
    const categoryColors = ['#f59e0b', '#3b82f6', '#ec4899', '#10b981', '#8b5cf6', '#ef4444', '#14b8a6', '#f43f5e', '#84cc16'];
    const totalCategoryRevenue = Object.values(catMap).reduce((a, b) => a + b, 0);
    const categoryPieData = Object.entries(catMap)
      .filter(([name, val]) => val > 0 || name !== 'Uncategorized') // Keep all real categories even if 0
      .map(([name, value], i) => ({ 
        name, 
        value, 
        percentage: totalCategoryRevenue === 0 ? "0.0" : ((value / totalCategoryRevenue) * 100).toFixed(1),
        color: categoryColors[i % categoryColors.length] 
      }));

    // Customer Loyalty & Leaderboard
    const customerOrders: Record<string, { count: number, spend: number, name: string }> = {};
    allOrders.forEach(o => {
      const key = o.customerPhone || o.customerName;
      if (key) {
        if (!customerOrders[key]) customerOrders[key] = { count: 0, spend: 0, name: o.customerName || "Unknown" };
        customerOrders[key].count += 1;
        customerOrders[key].spend += o.total;
      }
    });
    const repeatCustomers = Object.values(customerOrders).filter(c => c.count > 1).length;
    const repeatRate = uniqueCustomers === 0 ? 0 : (repeatCustomers / uniqueCustomers) * 100;
    
    const topCustomersList = Object.values(customerOrders)
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 5);

    // Trend Data over Time (Line Chart)
    const trendMap: Record<string, number> = {};
    orders.forEach(o => {
      const d = parseISO(o.createdAt);
      const key = (timeFilter === 'daily' || timeFilter === 'custom') 
        ? format(d, 'HH:00') // group by hour
        : format(d, 'MMM dd'); // group by day
      trendMap[key] = (trendMap[key] || 0) + o.total;
    });
    // Sort keys chronologically
    const trendDataList = Object.entries(trendMap)
      .sort(([k1], [k2]) => k1.localeCompare(k2))
      .map(([name, revenue]) => ({ name, revenue }));

    // Low Stock Alerts
    const lowStockItems = menuItems.filter(i => i.trackStock && (i.stock || 0) <= 5).map(i => ({ name: i.name, stock: i.stock || 0, type: 'Item' }));
    const lowStockMaterials = rawMaterials.filter(m => (m.stock || 0) <= 10).map(m => ({ name: m.name, stock: m.stock || 0, type: 'Material' }));
    const lowStockAlerts = [...lowStockItems, ...lowStockMaterials].sort((a, b) => a.stock - b.stock);

    // Raw Material Consumption
    const consumptionMap: Record<string, { name: string; unit: string; consumed: number; currentStock: number }> = {};
    orders.forEach(o => {
      o.items.forEach(orderItem => {
        const itemDef = menuItems.find(mi => mi.id === orderItem.id || mi.name === orderItem.name);
        if (!itemDef || !itemDef.recipe || itemDef.recipe.length === 0) return;
        itemDef.recipe.forEach(req => {
          if (!req.materialId || req.quantity <= 0) return;
          const mat = rawMaterials.find(m => m.id === req.materialId);
          if (!mat) return;
          if (!consumptionMap[mat.id]) {
            consumptionMap[mat.id] = { name: mat.name, unit: mat.unit, consumed: 0, currentStock: mat.stock || 0 };
          }
          consumptionMap[mat.id].consumed += req.quantity * orderItem.quantity;
        });
      });
    });
    const topConsumedMaterials = Object.values(consumptionMap)
      .filter(m => m.consumed > 0)
      .sort((a, b) => b.consumed - a.consumed);

    return {
      totalOrders: orders.length,
      totalRevenue,
      totalDiscounts,
      avgOrderValue: orders.length ? totalRevenue / orders.length : 0,
      uniqueCustomers,
      revenueTrend,
      ordersTrend,
      topItems,
      hourlyData,
      categoryPieData,
      topCustomersList,
      trendDataList,
      lowStockAlerts,
      topConsumedMaterials,
      repeatCustomers,
      repeatRate,
      cashRevenue: orders.filter(o => o.paymentMethod === 'Cash').reduce((sum, o) => sum + o.total, 0),
      onlineRevenue: orders.filter(o => o.paymentMethod === 'Online').reduce((sum, o) => sum + o.total, 0),
    };
  }, [orders, previousOrders, allOrders, menuItems, rawMaterials, categories, timeFilter]);

  const pieData = [
    { name: 'Cash', value: stats.cashRevenue, color: '#f97316' },
    { name: 'Online', value: stats.onlineRevenue, color: '#ec4899' },
  ].filter(d => d.value > 0);

  const exportCSV = () => {
    const headers = "Bill No,Date,Customer,Phone,Items,Subtotal,Discount,Total,Payment\n";
    const rows = orders.map(o => `${o.billNumber},${format(new Date(o.createdAt), 'yyyy-MM-dd HH:mm')},"${o.customerName}",${o.customerPhone},"${o.items.map(i=>`${i.quantity}x ${i.name}`).join('; ')}",${o.subtotal},${o.discountAmount},${o.total},${o.paymentMethod}`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `royal_export_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    if(window.confirm("WARNING: This will delete ALL orders and customer data permanently. Are you sure?")) {
      if(window.prompt("Type 'DELETE' to confirm") === "DELETE") {
        resetData();
      }
    }
  };

  const handleDeleteOrder = (id: string, billNumber: number) => {
    if(window.confirm(`Are you sure you want to delete Bill #${billNumber}? This cannot be undone.`)) {
      deleteOrder(id);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-purple-50 to-yellow-50 dark:from-purple-950/30 dark:to-yellow-950/30 relative p-4 md:p-8">
      <img src={`${import.meta.env.BASE_URL}images/analytics-bg.png`} className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none mix-blend-overlay" alt="" />
      
      <div className="max-w-[1600px] mx-auto relative z-10 space-y-6 md:space-y-8">
        
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div>
            <h1 className="text-3xl font-display font-black text-foreground">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-1">Track sales, revenue, and customer patterns.</p>
          </div>
          
          <div className="flex flex-wrap gap-2 md:gap-4 items-center">
            <div className="flex gap-2">
              <select 
                value={timeFilter} 
                onChange={e => setTimeFilter(e.target.value as any)}
                className="px-4 py-2.5 bg-white dark:bg-card border border-border rounded-xl shadow-sm focus:outline-none focus:ring-4 focus:ring-accent/20 font-bold text-sm text-foreground"
              >
                <option value="daily">Today</option>
                <option value="custom">Specific Day</option>
                <option value="range">Date Range</option>
                <option value="weekly">This Week</option>
                <option value="monthly">This Month</option>
                <option value="all">All Time</option>
              </select>

              {timeFilter === 'custom' && (
                <input 
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="px-4 py-2.5 bg-white dark:bg-card border border-border rounded-xl shadow-sm focus:outline-none focus:ring-4 focus:ring-accent/20 font-bold text-sm text-foreground"
                />
              )}
              {timeFilter === 'range' && (
                <div className="flex items-center gap-2 bg-white dark:bg-card border border-border rounded-xl shadow-sm px-2">
                  <input 
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="px-2 py-2.5 bg-transparent focus:outline-none font-bold text-sm text-foreground w-[130px]"
                  />
                  <span className="text-muted-foreground text-sm font-bold">to</span>
                  <input 
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="px-2 py-2.5 bg-transparent focus:outline-none font-bold text-sm text-foreground w-[130px]"
                  />
                </div>
              )}
            </div>
            <button onClick={exportCSV} className="px-5 py-2.5 bg-white dark:bg-card text-foreground border border-border rounded-xl font-bold text-sm hover:shadow-md transition-all">Export CSV</button>
            <button onClick={handleReset} className="px-5 py-2.5 bg-red-100 text-red-600 rounded-xl font-bold text-sm hover:bg-red-200 transition-all flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Reset Data
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
          <StatCard 
            title="Total Revenue" 
            value={formatCurrency(stats.totalRevenue)} 
            icon={<TrendingUp className="text-green-500 w-6 h-6" />} 
            color="bg-green-50" 
            trend={stats.revenueTrend}
          />
          <StatCard 
            title="Total Orders" 
            value={stats.totalOrders} 
            icon={<Banknote className="text-blue-500 w-6 h-6" />} 
            color="bg-blue-50" 
            trend={stats.ordersTrend}
          />
          <StatCard 
            title="Avg Order Value" 
            value={formatCurrency(stats.avgOrderValue)} 
            icon={<CreditCard className="text-purple-500 w-6 h-6" />} 
            color="bg-purple-50" 
          />
          <StatCard 
            title="Total Discounts" 
            value={formatCurrency(stats.totalDiscounts)} 
            icon={<Percent className="text-red-500 w-6 h-6" />} 
            color="bg-red-50" 
          />
          <StatCard 
            title="Repeat Customers" 
            value={stats.repeatCustomers} 
            icon={<Users className="text-yellow-500 w-6 h-6" />} 
            color="bg-yellow-50" 
            subtitle={`${stats.repeatRate.toFixed(1)}% loyalty rate`}
          />
        </div>

        {/* Sales Trend Chart */}
        <div className="bg-white dark:bg-card rounded-3xl p-6 shadow-xl shadow-black/5 border border-border/50 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><TrendingUp className="w-5 h-5" /></div>
            <h3 className="font-display font-bold text-lg text-foreground">Sales Trend</h3>
          </div>
          <div className="w-full h-[300px]">
            {stats.trendDataList.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.trendDataList} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                  <RechartsTooltip 
                    formatter={(val: number) => [formatCurrency(val), 'Revenue']}
                    contentStyle={{borderRadius:'12px', border:'none', boxShadow:'0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground italic">No trend data available</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Peak Hours Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-card rounded-3xl p-6 shadow-xl shadow-black/5 border border-border/50 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Clock className="w-5 h-5" /></div>
              <h3 className="font-display font-bold text-lg text-foreground">Peak Hours (Revenue)</h3>
            </div>
            <div className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="hour" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                  <RechartsTooltip 
                    cursor={{fill: '#f8fafc'}}
                    formatter={(val: number) => [formatCurrency(val), 'Revenue']}
                    contentStyle={{borderRadius:'12px', border:'none', boxShadow:'0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                  />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue by Category Chart */}
          <div className="lg:col-span-1 bg-white dark:bg-card rounded-3xl p-6 shadow-xl shadow-black/5 border border-border/50 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-pink-50 rounded-lg text-pink-600"><Tag className="w-5 h-5" /></div>
              <h3 className="font-display font-bold text-lg text-foreground">Revenue by Category</h3>
            </div>
            <div className="flex-1 min-h-[300px] relative">
              {stats.categoryPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.categoryPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                      {stats.categoryPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <RechartsTooltip formatter={(val: number, name: string, props: any) => [`${formatCurrency(val)} (${props.payload.percentage}%)`, name]} contentStyle={{borderRadius:'12px', border:'none', boxShadow:'0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                    <Legend iconType="circle" wrapperStyle={{paddingTop:'20px'}} formatter={(value, entry: any) => `${value} (${entry.payload.percentage}%)`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground font-medium">No category data</div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white dark:bg-card rounded-3xl p-6 shadow-xl shadow-black/5 border border-border/50 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-yellow-50 rounded-lg text-yellow-600"><Star className="w-5 h-5" /></div>
              <h3 className="font-display font-bold text-lg text-foreground">Top Selling Items</h3>
            </div>
            <div className="space-y-4 flex-1">
              {stats.topItems.length > 0 ? stats.topItems.map((item, idx) => (
                <div key={item.name} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-4">{idx + 1}.</span>
                      <span className="text-sm font-bold text-foreground">{item.name}</span>
                    </div>
                    <span className="text-xs font-black text-primary">{item.qty} units</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.qty / stats.topItems[0].qty) * 100}%` }}
                      className="h-full bg-yellow-500 rounded-full"
                    />
                  </div>
                </div>
              )) : (
                <div className="h-full flex items-center justify-center text-muted-foreground italic">No sales data yet</div>
              )}
            </div>
            <div className="mt-6 pt-6 border-t border-border">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground mb-4">
                <Award className="w-4 h-4" /> REVENUE CONTRIBUTION
              </div>
              <div className="space-y-2">
                {stats.topItems.slice(0,3).map(item => (
                  <div key={item.name} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-bold">{formatCurrency(item.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Customers */}
          <div className="lg:col-span-1 bg-white dark:bg-card rounded-3xl p-6 shadow-xl shadow-black/5 border border-border/50 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><Users className="w-5 h-5" /></div>
              <h3 className="font-display font-bold text-lg text-foreground">Top Customers</h3>
            </div>
            <div className="space-y-4 flex-1">
              {stats.topCustomersList.length > 0 ? stats.topCustomersList.map((c, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-xs">
                      #{idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.count} orders</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-sm text-primary">{formatCurrency(c.spend)}</p>
                  </div>
                </div>
              )) : (
                <div className="h-full flex items-center justify-center text-muted-foreground italic">No customer data yet</div>
              )}
            </div>
          </div>
          <div className="lg:col-span-1 bg-white dark:bg-card rounded-3xl p-6 shadow-xl shadow-black/5 border border-border/50 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><CreditCard className="w-5 h-5" /></div>
              <h3 className="font-display font-bold text-lg text-foreground">Payment Methods</h3>
            </div>
            <div className="flex-1 min-h-[250px] relative">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <RechartsTooltip formatter={(val: number) => formatCurrency(val)} contentStyle={{borderRadius:'12px', border:'none', boxShadow:'0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                    <Legend iconType="circle" wrapperStyle={{paddingTop:'20px'}} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground font-medium">No payment data</div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-yellow-50 dark:bg-yellow-950/30 p-4 rounded-2xl">
                <p className="text-xs font-bold text-yellow-600 uppercase tracking-wider mb-1">Cash</p>
                <p className="text-xl font-black text-yellow-700 dark:text-yellow-400">{formatCurrency(stats.cashRevenue)}</p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-950/30 p-4 rounded-2xl">
                <p className="text-xs font-bold text-yellow-600 uppercase tracking-wider mb-1">Online</p>
                <p className="text-xl font-black text-yellow-700 dark:text-yellow-400">{formatCurrency(stats.onlineRevenue)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Low Stock Alerts */}
          <div className="lg:col-span-1 bg-white dark:bg-card rounded-3xl p-6 shadow-xl shadow-black/5 border border-border/50 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-red-50 rounded-lg text-red-600"><AlertTriangle className="w-5 h-5" /></div>
              <h3 className="font-display font-bold text-lg text-foreground">Stock Alerts</h3>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[400px] scrollbar-thin pr-2">
              {stats.lowStockAlerts.length > 0 ? stats.lowStockAlerts.map((item, idx) => (
                <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border ${item.stock === 0 ? 'bg-red-50/50 border-red-100' : 'bg-orange-50/30 border-orange-100'}`}>
                  <div className="flex items-center gap-3">
                    {item.type === 'Item' ? <Tag className={`w-4 h-4 ${item.stock===0?'text-red-500':'text-orange-500'}`} /> : <Package className={`w-4 h-4 ${item.stock===0?'text-red-500':'text-orange-500'}`} />}
                    <div>
                      <p className="text-sm font-bold text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] px-2 py-1 rounded-lg font-bold uppercase tracking-wider ${item.stock===0?'bg-red-100 text-red-700':'bg-orange-100 text-orange-700'}`}>
                      {item.stock === 0 ? 'Out' : `${item.stock} left`}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-8">
                  <div className="w-12 h-12 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-3">
                    <Star className="w-6 h-6" />
                  </div>
                  <p className="font-bold">All Good!</p>
                  <p className="text-sm">Stock levels are healthy.</p>
                </div>
              )}
            </div>
          </div>

          {/* Raw Material Consumption */}
          <div className="lg:col-span-1 bg-white dark:bg-card rounded-3xl p-6 shadow-xl shadow-black/5 border border-border/50 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-teal-50 rounded-lg text-teal-600"><Package className="w-5 h-5" /></div>
              <div>
                <h3 className="font-display font-bold text-lg text-foreground">Material Consumption</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Used in this period</p>
              </div>
            </div>
            <div className="space-y-4 flex-1 overflow-y-auto max-h-[400px] scrollbar-thin pr-1">
              {stats.topConsumedMaterials.length > 0 ? stats.topConsumedMaterials.map((mat, idx) => {
                const maxConsumed = stats.topConsumedMaterials[0].consumed;
                const percentage = maxConsumed > 0 ? (mat.consumed / maxConsumed) * 100 : 0;
                const isLow = mat.currentStock <= 10;
                return (
                  <div key={idx} className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-end">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground w-4">{idx + 1}.</span>
                        <span className="text-sm font-bold text-foreground">{mat.name}</span>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <span className="text-xs font-black text-teal-600">{mat.consumed} {mat.unit}</span>
                        {isLow && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-orange-100 text-orange-600">Low</span>
                        )}
                      </div>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="h-full bg-teal-500 rounded-full"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {mat.currentStock} {mat.unit} remaining in stock
                    </p>
                  </div>
                );
              }) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-8">
                  <div className="w-12 h-12 bg-teal-50 text-teal-400 rounded-full flex items-center justify-center mb-3">
                    <Package className="w-6 h-6" />
                  </div>
                  <p className="font-bold">No Consumption Data</p>
                  <p className="text-sm text-center">Assign recipes to menu items to track raw material usage.</p>
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="lg:col-span-2 bg-white dark:bg-card rounded-3xl p-6 shadow-xl shadow-black/5 border border-border/50 flex flex-col">
            <h3 className="font-display font-bold text-lg mb-4 text-foreground">Recent Orders</h3>
            <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[400px] scrollbar-thin">
              <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
                <thead>
                  <tr className="border-b-2 border-border text-muted-foreground font-semibold">
                    <th className="py-3 px-4 rounded-tl-xl">Bill No</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Method</th>
                    <th className="py-3 px-4 text-center rounded-tr-xl">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No orders found for this period.</td></tr>
                  )}
                  {orders.slice(0, 100).map(o => (
                    <tr key={o.id} className="hover:bg-muted/50 transition-colors text-foreground">
                      <td className="py-3 px-4 font-bold text-primary">#{o.billNumber}</td>
                      <td className="py-3 px-4">{format(new Date(o.createdAt), "dd MMM, hh:mm a")}</td>
                      <td className="py-3 px-4">
                        <p className="font-bold">{o.customerName}</p>
                        {o.customerPhone && <p className="text-xs text-muted-foreground">{o.customerPhone}</p>}
                      </td>
                      <td className="py-3 px-4 text-right font-black">{formatCurrency(o.total)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${o.paymentMethod==='Cash'?'bg-yellow-100 text-yellow-700':'bg-yellow-100 text-yellow-700'}`}>
                          {o.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button 
                          onClick={() => handleDeleteOrder(o.id, o.billNumber)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Bill"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {orders.length > 100 && <p className="text-center text-sm text-muted-foreground mt-4">Showing last 100 orders. Export CSV for complete history.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({title, value, icon, color, trend, subtitle}: any) {
  return (
    <motion.div whileHover={{ y: -4 }} className="bg-white dark:bg-card p-6 rounded-3xl shadow-lg shadow-black/5 border border-border/50 flex items-center gap-4">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${color}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider truncate">{title}</p>
        <div className="flex items-baseline gap-2 flex-wrap">
          <p className="text-2xl sm:text-3xl font-black font-display mt-1 text-foreground">{value}</p>
          {trend !== undefined && trend !== 0 && (
            <div className={`flex items-center text-[10px] font-black px-1.5 py-0.5 rounded-full ${trend > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {trend > 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
              {Math.abs(trend).toFixed(0)}%
            </div>
          )}
        </div>
        {subtitle && <p className="text-[10px] font-bold text-muted-foreground mt-1">{subtitle}</p>}
      </div>
    </motion.div>
  );
}
