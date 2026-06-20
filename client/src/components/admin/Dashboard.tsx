import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { getAdminHeaders } from '../../services/apiClient';
import { API_BASE_URL } from '../../services/apiClient';

interface Props {
  showToast: (m: string, type?: 'success' | 'error') => void;
}

const getTodayISO = () => new Date().toISOString().split('T')[0];

const Sparkline: React.FC<{ data: number[], color: string, id: string }> = ({ data, color, id }) => {
  const width = 160;
  const height = 65;
  const padding = 6;
  
  const isDataValid = data && data.length >= 2;
  const allZero = isDataValid && data.every(v => v === 0);

  if (!isDataValid || allZero) {
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <line 
          x1="0" 
          y1={height - padding} 
          x2={width} 
          y2={height - padding} 
          stroke={color} 
          strokeWidth="3.5" 
          opacity="0.25" 
          strokeLinecap="round"
        />
      </svg>
    );
  }

  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || (max > 0 ? max : 1);
  
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    let y;
    if (max === min) {
      y = height / 2; // Center for flat non-zero data
    } else {
      y = height - padding - ((v - min) / range) * (height - padding * 2);
    }
    return `${x},${y}`;
  });

  const pathData = `M ${points.join(' L ')}`;
  const areaData = `${pathData} L ${width},${height} L 0,${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path
        d={areaData}
        fill={`url(#grad-${id})`}
      />
      <path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.15))' }}
      />
    </svg>
  );
};




const Dashboard: React.FC<Props> = ({ showToast }) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [filterType, setFilterType] = useState('Daily');
  const [selectedMetric, setSelectedMetric] = useState('Sales');
  const [selectedDate, setSelectedDate] = useState(getTodayISO());
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(getTodayISO());

  const [dbStats, setDbStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          type: filterType,
          date: selectedDate,
          from: fromDate,
          to: toDate
        });
        const res = await fetch(`${API_BASE_URL}/admin/dashboard-stats?${params}`, { headers: getAdminHeaders() });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (isMounted) setDbStats(data);
      } catch (e) {
        console.error("Fetch failed", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchStats();
    return () => { isMounted = false; };
  }, [filterType, selectedDate, fromDate, toDate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format date for display (DD/MM/YYYY)
  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // Get week number
  const getWeekNumber = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const getWeeklyDisplay = (dateStr: string) => {
    const d = new Date(dateStr);
    return `Week ${getWeekNumber(d)}, ${d.getFullYear()}`;
  };

  const getMonthlyDisplay = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const stats = useMemo(() => {
    const defaultStats = {
      sales: 0, prevSales: 0,
      vol: 0, prevVol: 0,
      revenue: 0, prevRevenue: 0,
      salesChange: 0, volChange: 0, revenueChange: 0,
      rank: 0, prevRank: 0,
      trends: { sales: [], revenue: [], signups: [] }
    };

    if (!dbStats) return defaultStats;

    const calculateChange = (curr: number, prev: number) => {
      if (prev <= 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    return {
      sales: dbStats.salesVolume || 0,
      prevSales: dbStats.prevSales || 0,
      vol: dbStats.salesVolume || 0,
      prevVol: dbStats.prevSales || 0,
      revenue: dbStats.totalRevenue || 0,
      prevRevenue: dbStats.prevRevenue || 0,
      salesChange: calculateChange(dbStats.salesVolume || 0, dbStats.prevSales || 0),
      volChange: calculateChange(dbStats.salesVolume || 0, dbStats.prevSales || 0),
      revenueChange: calculateChange(dbStats.totalRevenue || 0, dbStats.prevRevenue || 0),
      rank: dbStats.rank || 0,
      prevRank: Math.floor((dbStats.rank || 0) * 1.1), // Safe fallback for prev rank
      trends: dbStats.recentTrends || defaultStats.trends
    };
  }, [dbStats]);

  const currentChartData = useMemo(() => {
    if (!dbStats || !dbStats.chartData || dbStats.chartData.length === 0) return [];
    
    const keyMap: Record<string, string> = {
      'Sales': 'sales',
      'Signups': 'signups',
      'Sales Volume': 'sales',
      'Revenue': 'revenue'
    };
    const key = keyMap[selectedMetric] || 'sales';
    return dbStats.chartData.map((d: any) => ({ ...d, value: d[key] || 0 }));
  }, [selectedMetric, dbStats]);

  const getHeaderDate = () => {
    if (filterType === 'Daily') return formatDateForDisplay(selectedDate);
    if (filterType === 'Weekly') return getWeeklyDisplay(selectedDate);
    if (filterType === 'Monthly') return getMonthlyDisplay(selectedDate);
    if (filterType === 'Custom') return `${formatDateForDisplay(fromDate)} - ${formatDateForDisplay(toDate)}`;
    return '';
  };

  return (
    <div className="w-full bg-[#fcfcfc] font-sans selection:bg-purple-100 min-h-screen relative p-8">
      {/* Header Section */}
      <div className={`flex justify-between items-center mb-10 relative ${isFilterOpen ? 'z-[100]' : 'z-10'}`}>
        <div>
          <h1 className="text-[28px] font-bold text-[#111] tracking-tight leading-none mb-2">
            Analytics
          </h1>
          <p className="text-[#9ea0a4] text-[15px] font-medium">{getHeaderDate()}</p>
        </div>

        <div className="relative">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-[12px] text-[14px] font-bold transition-all border ${isFilterOpen 
              ? 'bg-[#1a1a1a] border-[#1a1a1a] text-white shadow-lg' 
              : 'bg-white border-[#e5e7eb] text-[#1a1a1a] shadow-sm hover:bg-gray-50'
            }`}
          >
            <span className="material-symbols-outlined text-[19px] font-bold">tune</span>
            Filters
          </button>

          {/* Filter Popover */}
          {isFilterOpen && (
            <div className="absolute right-0 top-[calc(100%+12px)] w-[360px] bg-white border border-gray-100 rounded-[28px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.25),0_0_1px_rgba(0,0,0,0.1)] z-[110] p-7 animate-in origin-top-right backdrop-blur-xl bg-white/98">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-[18px] font-extrabold text-[#1a1a1a] tracking-tight">Analytics Filters</h4>
                <button onClick={() => setIsFilterOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-all">
                  <span className="material-symbols-outlined text-[20px] font-bold">close</span>
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-[13px] font-bold text-gray-400 mb-3 uppercase tracking-widest pl-1">Filter By</p>
                  <div className="flex bg-[#f8f9fa] border border-gray-100 rounded-[20px] p-1.5 gap-1 shadow-inner">
                    {['Daily', 'Weekly', 'Monthly', 'Custom'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setFilterType(type)}
                        className={`flex-1 py-2.5 text-[13px] font-bold rounded-[16px] transition-all ${filterType === type
                          ? 'bg-white text-[#1a1a1a] shadow-md border border-gray-50'
                          : 'text-[#9ea0a4] hover:text-gray-600'
                          }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {filterType !== 'Custom' ? (
                  <div>
                    <div className="relative group cursor-pointer" onClick={() => (document.getElementById('hidden-date-picker') as HTMLInputElement)?.showPicker()}>
                      <input
                        type="text"
                        readOnly
                        value={
                          filterType === 'Daily' ? formatDateForDisplay(selectedDate) :
                            filterType === 'Weekly' ? getWeeklyDisplay(selectedDate) :
                              getMonthlyDisplay(selectedDate)
                        }
                        className="w-full border border-gray-100 bg-[#fcfcfc] rounded-[20px] py-4.5 px-6 text-[15px] font-bold text-[#1a1a1a] outline-none cursor-pointer transition-all hover:border-indigo-200 hover:bg-white focus:ring-4 focus:ring-indigo-50 shadow-sm"
                      />
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-indigo-50 rounded-xl transition-transform group-hover:scale-110">
                        <span className="material-symbols-outlined text-indigo-600 text-[22px]">calendar_today</span>
                      </div>
                      <input
                        type="date"
                        id="hidden-date-picker"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer pointer-events-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-[14px] font-semibold text-[#a1a1a1] mb-2 pl-1">From Date</p>
                      <div className="relative group cursor-pointer" onClick={() => (document.getElementById('from-date-picker') as HTMLInputElement)?.showPicker()}>
                        <input
                          type="text"
                          readOnly
                          value={formatDateForDisplay(fromDate)}
                          className="w-full border border-gray-100 bg-[#fcfcfc] rounded-[20px] py-4 px-6 text-[15px] font-bold text-[#1a1a1a] outline-none cursor-pointer transition-all hover:border-indigo-200 hover:bg-white shadow-sm"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-indigo-50 rounded-lg">
                          <span className="material-symbols-outlined text-indigo-600 text-[20px]">calendar_today</span>
                        </div>
                        <input
                          type="date"
                          id="from-date-picker"
                          value={fromDate}
                          onChange={(e) => setFromDate(e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer pointer-events-none"
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-gray-400 mb-2 pl-1 tracking-widest uppercase">To Date</p>
                      <div className="relative group cursor-pointer" onClick={() => (document.getElementById('to-date-picker') as HTMLInputElement)?.showPicker()}>
                        <input
                          type="text"
                          readOnly
                          value={formatDateForDisplay(toDate)}
                          className="w-full border border-gray-100 bg-[#fcfcfc] rounded-[20px] py-4 px-6 text-[15px] font-bold text-[#1a1a1a] outline-none cursor-pointer transition-all hover:border-indigo-200 hover:bg-white shadow-sm"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-indigo-50 rounded-lg">
                          <span className="material-symbols-outlined text-indigo-600 text-[20px]">calendar_today</span>
                        </div>
                        <input
                          type="date"
                          id="to-date-picker"
                          value={toDate}
                          onChange={(e) => setToDate(e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer pointer-events-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {/* Card 1: Rank */}
        <div className="bg-white border border-[#f0f0f2] rounded-2xl p-7 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-[170px] relative overflow-hidden">
          <div>
            <p className="text-[#a1a1a1] text-[13px] font-bold mb-6 uppercase tracking-widest opacity-60">RANK</p>
            <h2 className="text-[34px] font-bold text-[#111] tracking-tight mb-1">#{stats.rank.toLocaleString()}</h2>
            <p className="text-[#a1a1a1] text-[14px] font-medium">Previous: {stats.prevRank}</p>
          </div>
          <p className="absolute bottom-4 right-5 text-[#c1c3c7] text-[10px] font-bold uppercase tracking-wider scale-90 origin-right">
            UPDATES EVERY 24HRS
          </p>
        </div>

        {/* Card 2: Sales Volume */}
        <div className="bg-white border border-[#f0f0f2] rounded-2xl p-7 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex justify-between min-h-[170px]">
          <div className="flex flex-col justify-between h-full">
            <div>
              <p className="text-[#a1a1a1] text-[13px] font-bold mb-6 uppercase tracking-widest opacity-60">SALES VOLUME</p>
              <h2 className="text-[34px] font-bold text-[#111] leading-none mb-1">{stats.sales.toLocaleString()}</h2>
              <p className="text-[#a1a1a1] text-[14px] font-medium">Previous: {stats.prevSales.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex flex-col items-end h-full justify-between">
            <div className={`flex items-center ${stats.salesChange >= 0 ? 'text-green-500' : 'text-[#ef4444]'} text-[12px] font-bold pr-1`}>
              <span className="material-symbols-outlined text-[20px] -mr-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                {stats.salesChange >= 0 ? 'arrow_drop_up' : 'arrow_drop_down'}
              </span>
              {Math.abs(stats.salesChange)}%
            </div>
            <div className="mt-auto pr-1">
              <Sparkline data={stats.trends.sales} color="#8B5CF6" id="sales" />
            </div>
          </div>
        </div>

        {/* Card 3: Revenue */}
        <div className="bg-white border border-[#f0f0f2] rounded-2xl p-7 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex justify-between min-h-[170px]">
          <div className="flex flex-col justify-between h-full">
            <div>
              <p className="text-[#a1a1a1] text-[13px] font-bold mb-6 uppercase tracking-widest opacity-60">REVENUE</p>
              <h2 className="text-[34px] font-bold text-[#111] leading-none mb-1">₹{stats.revenue.toLocaleString()}</h2>
              <p className="text-[#a1a1a1] text-[14px] font-medium">Previous: ₹{stats.prevRevenue.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex flex-col items-end h-full justify-between">
            <div className={`flex items-center ${stats.revenueChange >= 0 ? 'text-green-500' : 'text-[#ef4444]'} text-[12px] font-bold pr-1`}>
              <span className="material-symbols-outlined text-[20px] -mr-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                {stats.revenueChange >= 0 ? 'arrow_drop_up' : 'arrow_drop_down'}
              </span>
              {Math.abs(stats.revenueChange)}%
            </div>
            <div className="mt-auto pr-1">
              <Sparkline data={stats.trends.revenue} color="#10B981" id="revenue" />
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Block */}
      <div className="w-full">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-[20px] font-bold text-[#111]">Analysis</h3>

          <div className="relative" ref={dropdownRef}>
            <div
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="group flex items-center justify-between min-w-[120px] px-4 py-2.5 bg-[#f2f2f4] border-none rounded-[12px] cursor-pointer hover:bg-[#ebebee] transition-all"
            >
              <span className="text-[14px] font-bold text-[#1a1a1a]">{selectedMetric}</span>
              <span className={`material-symbols-outlined text-[20px] text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : 'rotate-0'}`}>expand_more</span>
            </div>

            {/* Custom Metric Dropdown */}
            {isDropdownOpen && (
              <div className="absolute right-0 top-[calc(100%+12px)] w-[200px] bg-white border border-gray-100 rounded-[24px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.2)] z-[120] overflow-hidden animate-in origin-top backdrop-blur-xl bg-white/98">
                {['Sales', 'Signups', 'Sales Volume', 'Revenue'].map((metric) => (
                  <div
                    key={metric}
                    onClick={() => {
                      setSelectedMetric(metric);
                      setIsDropdownOpen(false);
                      showToast(`Switched view to ${metric}`);
                    }}
                    className={`px-6 py-4 text-[14px] font-bold cursor-pointer transition-all flex items-center justify-between ${selectedMetric === metric
                      ? 'bg-[#f2f2f4] text-[#1a1a1a]'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                  >
                    {metric}
                    {selectedMetric === metric && (
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Area Chart Container */}
        <div className="bg-white border border-[#f0f0f2] rounded-[24px] p-8 shadow-[0_1px_4px_rgba(0,0,0,0.02)] h-[480px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              key={`${filterType}-${selectedMetric}-${currentChartData.length}`}
              data={currentChartData}
              margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
            >
              <defs>
                <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#f5f5f7" strokeDasharray="0" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#a1a1a1', fontSize: 13, fontWeight: 500 }}
                dy={20}
                interval={filterType === 'Daily' || filterType === 'Custom' ? 2 : 0}
              />
              <YAxis hide domain={[0, 'auto']} />
              <Tooltip
                cursor={{ stroke: '#8B5CF6', strokeWidth: 1, strokeDasharray: '4 4' }}
                contentStyle={{
                  borderRadius: '16px',
                  border: 'none',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  fontSize: '14px',
                  fontWeight: '600',
                  padding: '12px 16px'
                }}
                formatter={(val: number) => {
                  if (selectedMetric === 'Revenue') {
                    return [`₹${val.toLocaleString()}`, 'Revenue'];
                  }
                  return [val.toLocaleString(), selectedMetric];
                }}
                labelStyle={{ color: '#a1a1a1', marginBottom: '4px', fontSize: '12px' }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#8B5CF6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#purpleGradient)"
                strokeLinecap="round"
                animationDuration={1000}
                isAnimationActive={true}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .font-sans {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        @keyframes pop-in {
          0% { opacity: 0; transform: scale(0.95) translateY(-10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-in {
          animation: pop-in 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }
      `}</style>
    </div >
  );
};

export default Dashboard;
