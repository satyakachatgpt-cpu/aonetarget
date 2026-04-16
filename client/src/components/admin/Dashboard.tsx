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

interface Props {
  showToast: (m: string, type?: 'success' | 'error') => void;
}

const dailyData = [
  { name: '18th Feb', sales: 10, signups: 5, vol: 2 },
  { name: '19th Feb', sales: 15, signups: 8, vol: 3 },
  { name: '20th Feb', sales: 250, signups: 120, vol: 45 },
  { name: '21st Feb', sales: 40, signups: 30, vol: 12 },
  { name: '22nd Feb', sales: 60, signups: 45, vol: 18 },
  { name: '23rd Feb', sales: 85, signups: 60, vol: 25 },
  { name: '24th Feb', sales: 40, signups: 35, vol: 8 },
  { name: '25th Feb', sales: 160, signups: 90, vol: 30 },
  { name: '26th Feb', sales: 90, signups: 70, vol: 20 },
  { name: '27th Feb', sales: 30, signups: 25, vol: 5 },
  { name: '28th Feb', sales: 280, signups: 150, vol: 50 },
  { name: '1st Mar', sales: 40, signups: 35, vol: 10 },
  { name: '2nd Mar', sales: 15, signups: 10, vol: 2 },
];

const weeklyData = [
  { name: 'Week 05', sales: 400, signups: 200, vol: 80 },
  { name: 'Week 06', sales: 650, signups: 350, vol: 120 },
  { name: 'Week 07', sales: 300, signups: 150, vol: 60 },
  { name: 'Week 08', sales: 900, signups: 500, vol: 180 },
  { name: 'Week 09', sales: 550, signups: 300, vol: 100 },
  { name: 'Week 10', sales: 120, signups: 80, vol: 20 },
];

const monthlyData = [
  { name: 'Oct 25', sales: 2400, signups: 1200, vol: 400 },
  { name: 'Nov 25', sales: 3200, signups: 1600, vol: 600 },
  { name: 'Dec 25', sales: 2100, signups: 1000, vol: 350 },
  { name: 'Jan 26', sales: 4500, signups: 2200, vol: 800 },
  { name: 'Feb 26', sales: 3800, signups: 1800, vol: 700 },
  { name: 'Mar 26', sales: 200, signups: 100, vol: 30 },
];

const customData = [
  { name: '30/12', sales: 120, signups: 60, vol: 20 },
  { name: '05/01', sales: 450, signups: 220, vol: 80 },
  { name: '12/01', sales: 300, signups: 150, vol: 50 },
  { name: '19/01', sales: 800, signups: 400, vol: 150 },
  { name: '26/01', sales: 400, signups: 200, vol: 70 },
  { name: '02/02', sales: 1200, signups: 600, vol: 240 },
  { name: '09/02', sales: 600, signups: 300, vol: 110 },
  { name: '16/02', sales: 1500, signups: 750, vol: 300 },
  { name: '23/02', sales: 800, signups: 400, vol: 140 },
  { name: '02/03', sales: 100, signups: 50, vol: 10 },
];

const Dashboard: React.FC<Props> = ({ showToast }) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [filterType, setFilterType] = useState('Daily');
  const [selectedMetric, setSelectedMetric] = useState('Sales');
  const [selectedDate, setSelectedDate] = useState('2026-03-02');
  const [fromDate, setFromDate] = useState('2025-12-30');
  const [toDate, setToDate] = useState('2026-03-02');

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
        const res = await fetch(`/api/admin/dashboard-stats?${params}`, { headers: getAdminHeaders() });
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

  // Calculate current stats
  const stats = useMemo(() => {
    // If we have real DB data, use it!
    if (dbStats) {
      const calculateChange = (curr: number, prev: number) => {
        if (prev === 0) return curr > 0 ? 100 : 0;
        return Math.round(((curr - prev) / prev) * 100);
      };

      return {
        sales: dbStats.salesVolume,
        prevSales: dbStats.prevSales,
        vol: dbStats.salesVolume,
        prevVol: dbStats.prevSales,
        revenue: dbStats.totalRevenue,
        prevRevenue: dbStats.prevRevenue,
        salesChange: calculateChange(dbStats.salesVolume, dbStats.prevSales),
        volChange: calculateChange(dbStats.salesVolume, dbStats.prevSales),
        revenueChange: calculateChange(dbStats.totalRevenue, dbStats.prevRevenue),
        rank: dbStats.rank,
        prevRank: 480
      };
    }

    // Fallback to Mock data if DB is empty/loading
    const activeData = filterType === 'Weekly' ? weeklyData :
      filterType === 'Monthly' ? monthlyData :
        filterType === 'Custom' ? customData : dailyData;

    const currentSales = activeData.reduce((acc, curr) => acc + curr.sales, 0);
    const currentVol = activeData.reduce((acc, curr) => acc + curr.vol, 0);
    const currentRevenue = currentSales * 499;

    const prevSales = Math.round(currentSales * 1.5);
    const prevVol = Math.round(currentVol * 1.8);
    const prevRevenue = Math.round(currentRevenue * 1.6);

    const calculateChange = (curr: number, prev: number) => {
      if (prev === 0) return 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    return {
      sales: currentSales,
      prevSales: prevSales,
      vol: currentVol,
      prevVol: prevVol,
      revenue: currentRevenue,
      prevRevenue: prevRevenue,
      salesChange: calculateChange(currentSales, prevSales),
      volChange: calculateChange(currentVol, prevVol),
      revenueChange: calculateChange(currentRevenue, prevRevenue),
      rank: activeData === dailyData ? 1271 : 842,
      prevRank: activeData === dailyData ? 480 : 210
    };
  }, [filterType, dbStats]);

  const currentChartData = useMemo(() => {
    // Priority: Real DB Chart Data
    if (dbStats && dbStats.chartData && dbStats.chartData.length > 0) {
      const key = selectedMetric === 'Sales' ? 'sales' :
        selectedMetric === 'Signups' ? 'signups' : 'vol';
      return dbStats.chartData.map((d: any) => ({ ...d, value: d[key] }));
    }

    // Fallback: Mock Data
    const raw = filterType === 'Weekly' ? weeklyData :
      filterType === 'Monthly' ? monthlyData :
        filterType === 'Custom' ? customData : dailyData;

    const key = selectedMetric === 'Sales' ? 'sales' :
      selectedMetric === 'Signups' ? 'signups' : 'vol';

    return raw.map(d => ({ ...d, value: (d as any)[key] }));
  }, [filterType, selectedMetric, dbStats]);

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
            <div className="mt-auto">
              <svg width="64" height="40" viewBox="0 0 64 40">
                <defs>
                  <linearGradient id="miniFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <path d="M 54 5 L 64 35 L 14 35 Z" fill="url(#miniFill)" stroke="#8B5CF6" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 3: Revenue */}
        <div className="bg-white border border-[#f0f0f2] rounded-2xl p-7 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex justify-between min-h-[170px]">
          <div className="flex flex-col justify-between h-full">
            <div>
              <p className="text-[#a1a1a1] text-[13px] font-bold mb-6 uppercase tracking-widest opacity-60">REVENUE</p>
              <h2 className="text-[34px] font-bold text-[#111] leading-none mb-1">₹{stats.revenue.toLocaleString()}</h2>
              <p className="text-[#a1a1a1] text-[14px] font-medium">Previous: {stats.prevRevenue.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex flex-col items-end h-full justify-between">
            <div className={`flex items-center ${stats.revenueChange >= 0 ? 'text-green-500' : 'text-[#ef4444]'} text-[12px] font-bold pr-1`}>
              <span className="material-symbols-outlined text-[20px] -mr-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                {stats.revenueChange >= 0 ? 'arrow_drop_up' : 'arrow_drop_down'}
              </span>
              {Math.abs(stats.revenueChange)}%
            </div>
            <div className="mt-auto">
              <svg width="64" height="40" viewBox="0 0 64 40">
                <defs>
                  <linearGradient id="miniFillRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <path d="M 54 5 L 64 35 L 14 35 Z" fill="url(#miniFillRev)" stroke="#8B5CF6" strokeWidth="2" strokeLinejoin="round" />
              </svg>
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
                {['Sales', 'Signups', 'Sales Volume'].map((metric) => (
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
              <YAxis hide />
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
