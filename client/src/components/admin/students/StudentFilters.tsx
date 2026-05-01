import React from 'react';

interface StudentFiltersProps {
    isOpen: boolean;
    statusFilter: string;
    setStatusFilter: (status: string) => void;
    deviceFilter: string;
    setDeviceFilter: (filter: string) => void;
}

export const StudentFilters: React.FC<StudentFiltersProps> = ({
    isOpen,
    statusFilter,
    setStatusFilter,
    deviceFilter,
    setDeviceFilter
}) => {
    if (!isOpen) return null;

    return (
        <div className="mb-6 p-6 bg-white border border-gray-100 rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="grid grid-cols-3 gap-6">
                <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Account Status</label>
                    <div className="flex gap-2">
                        {['all', 'active', 'inactive'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase transition-all ${statusFilter === status ? 'bg-[#111] text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                            >
                                {status === 'inactive' ? 'Blocked' : status}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Device Guard</label>
                    <div className="flex gap-2">
                        {[
                            { id: 'all', label: 'All' },
                            { id: 'pending', label: 'Pending Requests' },
                            { id: 'locked', label: 'Locked Accounts' }
                        ].map((f) => (
                            <button
                                key={f.id}
                                onClick={() => setDeviceFilter(f.id)}
                                className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase transition-all ${deviceFilter === f.id ? 'bg-[#1A237E] text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
