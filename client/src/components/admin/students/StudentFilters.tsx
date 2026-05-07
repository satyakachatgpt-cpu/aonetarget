import React from 'react';

interface StudentFiltersProps {
    isOpen: boolean;
    statusFilter: string;
    setStatusFilter: (status: string) => void;
    paymentFilter: string;
    setPaymentFilter: (status: string) => void;
    deviceFilter: string;
    setDeviceFilter: (filter: string) => void;
    dateFilter: string;
    setDateFilter: (filter: string) => void;
    startDate: string;
    setStartDate: (date: string) => void;
    endDate: string;
    setEndDate: (date: string) => void;
    onExport: () => void;
    exporting: boolean;
}

export const StudentFilters: React.FC<StudentFiltersProps> = ({
    isOpen,
    statusFilter,
    setStatusFilter,
    paymentFilter,
    setPaymentFilter,
    deviceFilter,
    setDeviceFilter,
    dateFilter,
    setDateFilter,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    onExport,
    exporting
}) => {
    if (!isOpen) return null;

    return (
        <div className="mb-6 p-8 bg-white border border-gray-100 rounded-[24px] shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Account Status */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-[18px] text-gray-400">person</span>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Account Status</label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {['all', 'active', 'inactive'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase transition-all ${statusFilter === status ? 'bg-[#111] text-white shadow-md scale-105' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                            >
                                {status === 'inactive' ? 'Blocked' : status}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Payment Status */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-[18px] text-gray-400">payments</span>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment Status</label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {['all', 'paid', 'pending', 'failed'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setPaymentFilter(status)}
                                className={`px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase transition-all ${paymentFilter === status ? 'bg-[#00897B] text-white shadow-md scale-105' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Device Guard */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-[18px] text-gray-400">security</span>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Device Guard</label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {[
                            { id: 'all', label: 'All' },
                            { id: 'pending', label: 'Pending' },
                            { id: 'locked', label: 'Locked' }
                        ].map((f) => (
                            <button
                                key={f.id}
                                onClick={() => setDeviceFilter(f.id)}
                                className={`px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase transition-all ${deviceFilter === f.id ? 'bg-[#1A237E] text-white shadow-md scale-105' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Date Filter */}
                <div className="space-y-4 lg:col-span-2">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-[18px] text-gray-400">calendar_month</span>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Registration Date</label>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {[
                            { id: 'all', label: 'All Time' },
                            { id: 'today', label: 'Today' },
                            { id: 'last24h', label: 'Last 24h' },
                            { id: 'last7d', label: 'Last 7 Days' },
                            { id: 'last30d', label: 'Last 30 Days' },
                            { id: 'last1y', label: 'Last 1 Year' },
                            { id: 'custom', label: 'Custom Range' }
                        ].map((f) => (
                            <button
                                key={f.id}
                                onClick={() => setDateFilter(f.id)}
                                className={`px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase transition-all ${dateFilter === f.id ? 'bg-[#5C6BC0] text-white shadow-md scale-105' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {dateFilter === 'custom' && (
                        <div className="flex items-center gap-4 animate-in slide-in-from-left-2 duration-200">
                            <div className="flex-1">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl text-[12px] font-bold text-gray-600 outline-none focus:border-indigo-500 transition-all"
                                />
                            </div>
                            <span className="text-gray-300 font-bold">to</span>
                            <div className="flex-1">
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl text-[12px] font-bold text-gray-600 outline-none focus:border-indigo-500 transition-all"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-end justify-end gap-3 lg:col-span-1">
                    <button
                        onClick={onExport}
                        disabled={exporting}
                        className={`flex items-center gap-2 h-11 px-6 bg-[#2e7d32] text-white rounded-xl text-[12px] font-bold transition-all hover:bg-[#1b5e20] active:scale-95 shadow-lg shadow-green-900/10 ${exporting ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {exporting ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <span className="material-symbols-outlined text-[20px]">download</span>
                        )}
                        {exporting ? 'Exporting...' : 'Export Excel'}
                    </button>
                    <button
                        onClick={() => {
                            setStatusFilter('all');
                            setPaymentFilter('all');
                            setDeviceFilter('all');
                            setDateFilter('all');
                            setStartDate('');
                            setEndDate('');
                        }}
                        className="flex items-center gap-2 h-11 px-6 bg-gray-100 text-gray-600 rounded-xl text-[12px] font-bold transition-all hover:bg-gray-200 active:scale-95"
                    >
                        <span className="material-symbols-outlined text-[20px]">restart_alt</span>
                        Clear
                    </button>
                </div>
            </div>
        </div>
    );
};
