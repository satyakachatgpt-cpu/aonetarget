import React, { useState, useMemo } from 'react';
import {
    RightSideDrawer,
    DrawerHeader,
    DrawerBody,
    FormInput,
} from './DrawerSystem';

interface ContentItem {
    id: string;
    title: string;
    type: string;
    status: 'active' | 'inactive';
    isFree: boolean;
}

interface BulkActionsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    items: ContentItem[];
    onApplyAction: (action: string, selectedIds: string[]) => void;
}

const BulkActionsDrawer: React.FC<BulkActionsDrawerProps> = ({ isOpen, onClose, items, onApplyAction }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [exportOption, setExportOption] = useState('');

    const filteredItems = useMemo(() => {
        return items.filter(item =>
            item.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [items, searchQuery]);

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(filteredItems.map(item => item.id));
        } else {
            setSelectedIds([]);
        }
    };

    const toggleSelection = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const getIcon = (type: string) => {
        switch (type.toLowerCase()) {
            case 'folder': return 'folder';
            case 'video': return 'play_circle';
            case 'pdf':
            case 'note': return 'description';
            case 'test': return 'quiz';
            case 'quiz': return 'help_outline';
            case 'omr': return 'history_edu';
            case 'live':
            case 'live_stream': return 'sensors';
            default: return 'insert_drive_file';
        }
    };

    const isAllSelected = filteredItems.length > 0 && selectedIds.length === filteredItems.length;

    return (
        <RightSideDrawer isOpen={isOpen} onClose={onClose} width="440px">
            <div className="flex flex-col h-full bg-white">
                {/* Header */}
                <div className="relative overflow-hidden flex justify-between items-center px-8 py-7 border-b border-gray-100 shrink-0">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl -mr-16 -mt-16 rounded-full" />
                    <div className="relative z-10">
                        <h3 className="text-[20px] font-black text-gray-900 tracking-tight">Bulk Action</h3>
                    </div>
                    <button onClick={onClose} className="relative z-10 w-9 h-9 flex items-center justify-center bg-gray-50 rounded-full text-gray-400 hover:text-gray-600 transition-all">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                <DrawerBody className="p-0 flex-1 hide-scrollbar">
                    {/* Top Section */}
                    <div className="px-8 py-6 space-y-6">
                        <div>
                            <label className="text-[13px] font-bold text-gray-400 uppercase tracking-widest block mb-3">Course Content</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full h-[46px] px-5 bg-gray-50/50 border border-gray-100 rounded-xl text-[14px] font-bold outline-none focus:bg-white focus:border-blue-400/50 transition-all"
                                />
                                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-300">search</span>
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-2">
                            <span className="text-[14px] font-black text-gray-800">Select all</span>
                            <div
                                onClick={() => handleSelectAll(!isAllSelected)}
                                className={`w-5 h-5 rounded border-2 cursor-pointer flex items-center justify-center transition-all ${isAllSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-200 bg-white'}`}
                            >
                                {isAllSelected && <span className="material-symbols-outlined text-[14px] text-white font-black">check</span>}
                            </div>
                        </div>
                    </div>

                    {/* Items List */}
                    <div className="px-8 space-y-1 hide-scrollbar pb-6">
                        {filteredItems.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => toggleSelection(item.id)}
                                className="group flex items-center gap-4 py-3.5 px-1 cursor-pointer transition-all border-b border-gray-50/50 last:border-0"
                            >
                                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 shrink-0 group-hover:bg-blue-50 group-hover:text-blue-500 transition-all">
                                    <span className="material-symbols-outlined text-[20px]">{getIcon(item.type)}</span>
                                </div>
                                <span className="flex-1 text-[14px] font-bold text-gray-700 truncate group-hover:text-gray-900">{item.title}</span>
                                <div
                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedIds.includes(item.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-200 group-hover:border-gray-300 bg-white'}`}
                                >
                                    {selectedIds.includes(item.id) && <span className="material-symbols-outlined text-[14px] text-white font-black">check</span>}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer Actions */}
                    <div className="bg-white border-t border-gray-100 p-6 space-y-3.5 shadow-[0_-5px_20px_rgba(0,0,0,0.02)] mt-4">
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <select
                                    value={exportOption}
                                    onChange={(e) => setExportOption(e.target.value)}
                                    className="w-full h-10 px-4 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-gray-600 outline-none appearance-none pr-10"
                                >
                                    <option value="">Select Export Option</option>
                                    <option value="excel">Export to Excel</option>
                                    <option value="csv">Export to CSV</option>
                                </select>
                                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[18px]">expand_more</span>
                            </div>
                            <button
                                disabled={!exportOption || selectedIds.length === 0}
                                className="bg-gray-100 h-10 px-5 rounded-xl text-[12px] font-black text-gray-500 uppercase tracking-widest hover:bg-gray-200 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-[16px]">file_download</span>
                                Apply
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                            <button
                                onClick={() => onApplyAction('mark_paid', selectedIds)}
                                disabled={selectedIds.length === 0}
                                className="flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl text-[11px] font-black text-gray-700 hover:bg-gray-50 transition-all uppercase tracking-widest disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-[18px]">lock_open</span>
                                Mark As Paid
                            </button>
                            <button
                                onClick={() => onApplyAction('mark_free', selectedIds)}
                                disabled={selectedIds.length === 0}
                                className="flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl text-[11px] font-black text-gray-700 hover:bg-gray-50 transition-all uppercase tracking-widest disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-[18px]">no_encryption</span>
                                Mark As Free
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2.5">
                            <button
                                onClick={() => onApplyAction('enable', selectedIds)}
                                disabled={selectedIds.length === 0}
                                className="flex items-center justify-center gap-1.5 py-3 border border-gray-200 rounded-xl text-[10px] font-black text-gray-700 hover:bg-gray-50 transition-all uppercase tracking-tight disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-[16px] text-green-500">check_circle</span>
                                Enable
                            </button>
                            <button
                                onClick={() => onApplyAction('disable', selectedIds)}
                                disabled={selectedIds.length === 0}
                                className="flex items-center justify-center gap-1.5 py-3 border border-gray-200 rounded-xl text-[10px] font-black text-gray-700 hover:bg-gray-50 transition-all uppercase tracking-tight disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-[16px] text-orange-400">do_not_disturb_on</span>
                                Disable
                            </button>
                            <button
                                onClick={() => onApplyAction('delete', selectedIds)}
                                disabled={selectedIds.length === 0}
                                className="flex items-center justify-center gap-1.5 py-3 border border-red-50 bg-red-50 text-red-500 rounded-xl text-[10px] font-black hover:bg-red-500 hover:text-white transition-all uppercase tracking-tight shadow-sm shadow-red-100 disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                Delete
                            </button>
                        </div>
                    </div>
                </DrawerBody>
            </div>
        </RightSideDrawer>
    );
};

export default BulkActionsDrawer;
