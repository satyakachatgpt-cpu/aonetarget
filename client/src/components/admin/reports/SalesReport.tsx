import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { coursesAPI } from '../../../services/apiClient';

interface SaleRecord {
  id: string;
  studentName: string;
  email: string;
  phone: string;
  courseName: string;
  batchName: string;
  amountPaid: number;
  paymentDate: string;
  paymentMethod: string;
  transactionId: string;
}

interface Props {
  showToast: (m: string, type?: 'success' | 'error') => void;
}

const SalesReport: React.FC<Props> = ({ showToast }) => {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  
  // Stats
  const [stats, setStats] = useState({ totalRevenue: 0, totalCount: 0 });
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  
  // Date Input Refs
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    fetchSales();
  }, [currentPage]);

  const loadInitialData = async () => {
    try {
      const coursesData = await coursesAPI.getAll();
      setCourses(Array.isArray(coursesData) ? coursesData : (coursesData?.courses || []));
      await fetchSales();
    } catch (error) {
      showToast('Failed to load initial data', 'error');
    }
  };

  const fetchSales = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (startDate) query.append('startDate', startDate);
      if (endDate) query.append('endDate', endDate);
      if (selectedCourse) query.append('courseId', selectedCourse);
      query.append('page', currentPage.toString());
      query.append('limit', itemsPerPage.toString());

      const res = await fetch(`/api/admin/reports/sales?${query.toString()}`, {
          headers: {
              'x-admin-id': localStorage.getItem('adminId') || 'admin'
          }
      });
      const data = await res.json();
      setSales(data.sales || []);
      setStats({ 
        totalRevenue: data.totalRevenue || 0, 
        totalCount: data.totalCount || 0 
      });
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      showToast('Failed to load sales report', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    setCurrentPage(1);
    fetchSales();
  };

  const handleExportCSV = () => {
    if (sales.length === 0) {
      showToast('No data to export', 'error');
      return;
    }

    const exportData = sales.map((s, idx) => ({
      'S.No': (currentPage - 1) * itemsPerPage + idx + 1,
      'Student Name': s.studentName,
      'Email': s.email,
      'Phone': s.phone,
      'Course Name': s.courseName,
      'Batch Name': s.batchName,
      'Amount Paid': s.amountPaid,
      'Payment Date': new Date(s.paymentDate).toLocaleString('en-IN'),
      'Method': s.paymentMethod,
      'Transaction ID': s.transactionId
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales Report');
    XLSX.writeFile(wb, `Sales_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('Report exported successfully', 'success');
  };

  return (
    <div className="space-y-4 animate-fade-in pb-8 max-w-[1600px] mx-auto px-4">
      {/* Compact Stat Cards - Standardized Admin Palette */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString('en-IN')}`, icon: 'payments', iconColor: 'text-emerald-500', bg: 'bg-emerald-50/50' },
          { label: 'Total Sales', value: stats.totalCount, icon: 'shopping_cart', iconColor: 'text-indigo-500', bg: 'bg-indigo-50/50' },
          { label: 'Avg. Sale', value: `₹${stats.totalCount > 0 ? (stats.totalRevenue / stats.totalCount).toFixed(0) : 0}`, icon: 'trending_up', iconColor: 'text-blue-500', bg: 'bg-blue-50/50' }
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between group hover:border-gray-200 transition-all">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-2">{stat.label}</span>
              <span className="text-xl font-black text-gray-900 tracking-tight">{stat.value}</span>
            </div>
            <div className={`w-10 h-10 ${stat.bg} ${stat.iconColor} rounded-xl flex items-center justify-center border border-transparent group-hover:border-current/10 transition-all`}>
              <span className="material-symbols-outlined text-[24px]">{stat.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Compact Filter Bar - Standardized Admin Styling */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[340px]">
             <label className="text-[11px] font-bold text-gray-400 uppercase mb-1.5 block ml-1 tracking-tight">Purchase Period</label>
             <div className="flex items-center gap-3">
                <div 
                    onClick={() => startDateRef.current?.showPicker()}
                    className="flex-1 flex items-center gap-2 bg-white px-3.5 h-10 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-sm focus-within:ring-4 focus-within:ring-indigo-100/50 transition-all cursor-pointer group/start"
                >
                    <span className="material-symbols-outlined text-gray-400 text-[18px] group-hover/start:text-[#1a237e] transition-colors">calendar_today</span>
                    <input
                        ref={startDateRef}
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 min-w-0 bg-transparent border-0 p-0 text-[13px] font-bold text-gray-900 focus:ring-0 focus:outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                    />
                </div>
                
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] select-none opacity-60">to</span>
                
                <div 
                    onClick={() => endDateRef.current?.showPicker()}
                    className="flex-1 flex items-center gap-2 bg-white px-3.5 h-10 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-sm focus-within:ring-4 focus-within:ring-indigo-100/50 transition-all cursor-pointer group/end"
                >
                    <span className="material-symbols-outlined text-gray-400 text-[18px] group-hover/end:text-[#1a237e] transition-colors">calendar_today</span>
                    <input
                        ref={endDateRef}
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 min-w-0 bg-transparent border-0 p-0 text-[13px] font-bold text-gray-900 focus:ring-0 focus:outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                    />
                </div>
             </div>
          </div>
          <div className="flex-[2] min-w-[240px]">
            <label className="text-[11px] font-bold text-gray-400 uppercase mb-1.5 block ml-1 tracking-tight">Course Stream</label>
            <div className="relative">
                <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50/50 border border-gray-100 rounded-xl text-[13px] font-bold text-gray-700 focus:bg-white focus:border-indigo-200 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all appearance-none cursor-pointer"
                >
                <option value="">All Courses</option>
                {courses.map(c => (
                    <option key={c.id || c._id} value={c.id || c._id}>{c.name || c.title}</option>
                ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[20px]">expand_more</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleApplyFilters}
              className="h-10 px-6 bg-[#1a237e] text-white rounded-xl text-[13px] font-bold hover:bg-navy/90 transition-all active:scale-95 flex items-center gap-2 shadow-sm shadow-navy/10"
            >
              <span className="material-symbols-outlined text-[18px]">filter_list</span>
              Apply
            </button>
            <button
              onClick={handleExportCSV}
              className="h-10 px-6 bg-white border border-gray-200 text-gray-600 rounded-xl text-[13px] font-bold hover:bg-gray-50 transition-all active:scale-95 flex items-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Dense Data Table - Unified Styling */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="pl-6 pr-2 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest w-12">#</th>
                <th className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Student Profile</th>
                <th className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Enrollment Details</th>
                <th className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center w-32">Amount</th>
                <th className="px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center w-36">TXN Date</th>
                <th className="pr-6 pl-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-right">TXN Identity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 relative">
              {loading && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10 transition-all duration-300">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1a237e]"></div>
                </div>
              )}
              {sales.length === 0 && !loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-20">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                        <span className="material-symbols-outlined text-[48px] mb-2 opacity-20">search_off</span>
                        <p className="text-[12px] font-bold uppercase tracking-widest">No matching sales records found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sales.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-gray-50/30 transition-colors group">
                    <td className="pl-6 pr-2 py-4 text-[13px] font-bold text-gray-200 group-hover:text-gray-400 transition-colors">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="text-[14px] font-bold text-gray-800 group-hover:text-[#1a237e] transition-colors">{s.studentName}</span>
                        <span className="text-[11px] font-medium text-gray-400 lowercase">{s.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-gray-700 truncate max-w-[240px] leading-tight">{s.courseName}</span>
                        <span className="text-[10px] font-bold text-[#1a237e] uppercase tracking-tighter mt-1 bg-indigo-50/50 px-1.5 py-0.5 rounded w-fit">{s.batchName || 'Premium Course'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-[14px] font-black text-emerald-600 tracking-tight">₹{s.amountPaid}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-gray-700">{new Date(s.paymentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest opacity-60">{s.paymentMethod}</span>
                      </div>
                    </td>
                    <td className="pr-6 pl-4 py-4 text-right">
                      <span className="text-[11px] font-mono font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded border border-gray-100 group-hover:border-[#1a237e]/20 group-hover:text-gray-600 transition-all select-all truncate max-w-[140px] inline-block">
                        {s.transactionId}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Standardized Pagination Footer - Synchronized with Blocked Users */}
        {!loading && stats.totalCount > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-white">
            <span className="text-[13px] font-medium text-gray-400 italic">
               Showing Page {currentPage} of {totalPages} <span className="mx-2 opacity-30">|</span> {stats.totalCount} total entries
            </span>

            <div className="flex items-center p-1.5 bg-white border border-gray-200 rounded-2xl shadow-sm">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-9 px-4 flex items-center justify-center text-[13px] font-bold text-gray-400 hover:text-black hover:bg-gray-50 rounded-xl transition-all disabled:opacity-50"
              >
                Previous
              </button>
              <div className="w-[1px] h-4 bg-gray-100 mx-1"></div>
              <button className="h-9 w-9 flex items-center justify-center text-[13px] font-black bg-black text-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
                {currentPage}
              </button>
              <div className="w-[1px] h-4 bg-gray-100 mx-1"></div>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="h-9 px-4 flex items-center justify-center text-[13px] font-bold text-gray-400 hover:text-black hover:bg-gray-50 rounded-xl transition-all disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesReport;
