import React, { useState, useMemo } from 'react';
import {
    RightSideDrawer,
    DrawerBody,
} from './DrawerSystem';
import { BulkContentItem } from './course-content/CourseContent.types';

interface BulkActionsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    items: BulkContentItem[];
    onApplyAction: (action: string, selectedIds: string[], options?: any) => Promise<void>;
    isLoading?: boolean;
}

const BulkActionsDrawer: React.FC<BulkActionsDrawerProps> = ({ isOpen, onClose, items, onApplyAction, isLoading }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [activeAction, setActiveAction] = useState<string | null>(null);

    const isBusy = isLoading || !!activeAction;

    // Navigation breadcrumbs
    const breadcrumbs = useMemo(() => {
        const chain: { id: string | null; title: string }[] = [{ id: null, title: 'Home' }];
        if (currentFolderId) {
            const folderChain: { id: string; title: string }[] = [];
            let currId: string | null = currentFolderId;
            while (currId) {
                const folder = items.find(i => i.id === currId);
                if (folder) {
                    folderChain.unshift({ id: folder.id, title: folder.title });
                    currId = folder.parentId || null;
                } else break;
            }
            chain.push(...folderChain);
        }
        return chain;
    }, [items, currentFolderId]);

    // Items visible in current folder
    const currentFolderItems = useMemo(() => {
        return (items || []).filter(item => {
            const itemParent = item.folderId || item.parentId || null;
            return itemParent === currentFolderId;
        });
    }, [items, currentFolderId]);

    // Search filtered items within current folder
    const filteredItems = useMemo(() => {
        return currentFolderItems.filter(item => 
            item.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [currentFolderItems, searchQuery]);

    const isAllVisibleSelected = filteredItems.length > 0 && 
        filteredItems.every(item => selectedIds.includes(item.id));

    const handleSelectAllVisible = () => {
        if (isAllVisibleSelected) {
            setSelectedIds(prev => prev.filter(id => !filteredItems.some(fi => fi.id === id)));
        } else {
            const newIds = filteredItems.map(fi => fi.id).filter(id => !selectedIds.includes(id));
            setSelectedIds(prev => [...prev, ...newIds]);
        }
    };

    const toggleSelection = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const getIcon = (type: string) => {
        switch (type.toLowerCase()) {
            case 'folder': return 'folder';
            case 'video': return 'play_circle';
            case 'live': return 'sensors';
            case 'pdf':
            case 'document': return 'description';
            case 'test':
            case 'omr_test': return 'quiz';
            case 'subjective_test': return 'history_edu';
            default: return 'insert_drive_file';
        }
    };

    const handleApply = async (action: string, options?: any) => {
        setActiveAction(action);
        try {
            await onApplyAction(action, selectedIds, options);
            if (action === 'delete') setSelectedIds([]);
        } finally {
            setActiveAction(null);
        }
    };

    return (
        <RightSideDrawer isOpen={isOpen} onClose={onClose} width="450px">
            <div className="flex flex-col h-full bg-white font-sans selection:bg-blue-50 selection:text-blue-600">
                {/* Header - Compact */}
                <div className="relative overflow-hidden flex justify-between items-center px-6 py-4 border-b border-gray-100 shrink-0">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl -mr-16 -mt-16 rounded-full" />
                    <div className="relative z-10 flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-amber-500 text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                        </div>
                        <div>
                            <h3 className="text-[16px] font-bold text-gray-900 tracking-tight">Bulk Action</h3>
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                                {selectedIds.length} Selected
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="relative z-10 w-9 h-9 flex items-center justify-center bg-gray-50 rounded-xl text-gray-400 hover:text-gray-600 transition-all active:scale-95 hover:bg-gray-100">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                {/* Top Area - Unified Spacing */}
                <div className="shrink-0 bg-white">
                    {/* Breadcrumbs - Compact Row */}
                    <div className="px-6 py-1.5 bg-gray-50/50 border-b border-gray-50 flex items-center gap-1 overflow-x-auto no-scrollbar">
                        {breadcrumbs.map((bc, idx) => (
                            <React.Fragment key={bc.id || 'root'}>
                                <button
                                    onClick={() => setCurrentFolderId(bc.id)}
                                    className={`text-[11px] font-bold whitespace-nowrap transition-colors max-w-[120px] truncate ${bc.id === currentFolderId ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    {bc.title}
                                </button>
                                {idx < breadcrumbs.length - 1 && (
                                    <span className="material-symbols-outlined text-[14px] text-gray-300">chevron_right</span>
                                )}
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Search Area - Integrated Spacing */}
                    <div className="px-6 pt-3 pb-2 space-y-2.5">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search in this folder..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-[38px] px-4 bg-gray-50 border border-gray-100 rounded-[10px] text-[13px] font-semibold outline-none focus:bg-white focus:border-blue-400 transition-all placeholder:text-gray-400"
                            />
                            <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
                        </div>

                        {/* Select Visible Row */}
                        <div className="flex justify-between items-center h-8 px-1">
                            <span className="text-[12px] font-bold text-gray-700 uppercase tracking-tight">Select visible</span>
                            <button
                                onClick={handleSelectAllVisible}
                                className={`w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center transition-all ${isAllVisibleSelected ? 'bg-gray-900 border-gray-900 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-400'}`}
                            >
                                {isAllVisibleSelected && <span className="material-symbols-outlined text-[12px] text-white font-bold">check</span>}
                            </button>
                        </div>
                    </div>
                </div>

                <DrawerBody className="p-0 flex-1 flex flex-col overflow-hidden">
                    {/* Items List */}
                    <div className="flex-1 overflow-y-auto px-6 py-1 space-y-0.5 custom-scrollbar border-t border-gray-50">
                        {filteredItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                                <span className="material-symbols-outlined text-[48px] opacity-10">inventory_2</span>
                                <p className="text-[13px] font-bold mt-2">No items found</p>
                            </div>
                        ) : (
                            filteredItems.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => item.type === 'folder' && setCurrentFolderId(item.id)}
                                    className={`group flex items-center gap-4 py-2 px-2.5 rounded-[10px] min-h-[48px] cursor-pointer transition-all border ${item.type === 'folder' ? 'hover:bg-blue-50/50 hover:border-blue-50' : 'hover:bg-gray-50 hover:border-gray-100'} border-transparent`}
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${item.type === 'folder' ? 'bg-blue-50 text-blue-500' : 'bg-gray-50 text-gray-400 group-hover:bg-white group-hover:shadow-sm'}`}>
                                        <span className="material-symbols-outlined text-[20px]">{getIcon(item.type)}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-semibold text-gray-700 truncate group-hover:text-gray-900">{item.title}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-0.5">{item.type.replace('_', ' ')}</p>
                                    </div>
                                    {item.type === 'folder' && (
                                        <span className="material-symbols-outlined text-gray-200 text-[18px] mr-1 group-hover:text-blue-300 transition-colors">chevron_right</span>
                                    )}
                                    <button
                                        onClick={(e) => toggleSelection(e, item.id)}
                                        className={`w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${selectedIds.includes(item.id) ? 'bg-gray-900 border-gray-900 shadow-md shadow-black/10' : 'border-gray-200 bg-white group-hover:border-gray-300'}`}
                                    >
                                        {selectedIds.includes(item.id) && <span className="material-symbols-outlined text-[12px] text-white font-bold">check</span>}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer Actions - Clean 2-Row Layout */}
                    <div className="bg-white border-t border-gray-100 px-6 py-4 space-y-2.5 shadow-[0_-8px_24px_rgba(15,23,42,0.04)] shrink-0 z-20">
                        {/* Row 1: Mark Paid/Free */}
                        <div className="grid grid-cols-2 gap-2.5">
                            <button
                                onClick={() => handleApply('mark-paid')}
                                disabled={isBusy || selectedIds.length === 0}
                                className="flex items-center justify-center gap-2 h-[36px] bg-gray-50 border border-gray-100 rounded-[10px] text-[11px] font-bold text-gray-700 hover:bg-white hover:border-gray-200 transition-all uppercase tracking-tight disabled:opacity-60 active:scale-98"
                            >
                                <span className="material-symbols-outlined text-[16px] text-amber-500">lock</span>
                                {activeAction === 'mark-paid' ? 'Processing...' : 'Mark Paid'}
                            </button>
                            <button
                                onClick={() => handleApply('mark-free')}
                                disabled={isBusy || selectedIds.length === 0}
                                className="flex items-center justify-center gap-2 h-[36px] bg-gray-50 border border-gray-100 rounded-[10px] text-[11px] font-bold text-gray-700 hover:bg-white hover:border-gray-200 transition-all uppercase tracking-tight disabled:opacity-60 active:scale-98"
                            >
                                <span className="material-symbols-outlined text-[16px] text-green-500">lock_open</span>
                                {activeAction === 'mark-free' ? 'Processing...' : 'Mark Free'}
                            </button>
                        </div>

                        {/* Row 2: Enable/Disable/Delete */}
                        <div className="grid grid-cols-3 gap-2.5">
                            <button
                                onClick={() => handleApply('enable')}
                                disabled={isBusy || selectedIds.length === 0}
                                className="flex items-center justify-center gap-1.5 h-[36px] bg-gray-50 border border-gray-100 rounded-[10px] text-[11px] font-bold text-gray-700 hover:bg-white hover:border-gray-200 transition-all uppercase tracking-tight disabled:opacity-60 active:scale-98"
                            >
                                <span className="material-symbols-outlined text-[16px] text-blue-500">visibility</span>
                                {activeAction === 'enable' ? 'Enabling...' : 'Enable'}
                            </button>
                            <button
                                onClick={() => handleApply('disable')}
                                disabled={isBusy || selectedIds.length === 0}
                                className="flex items-center justify-center gap-1.5 h-[36px] bg-gray-50 border border-gray-100 rounded-[10px] text-[11px] font-bold text-gray-700 hover:bg-white hover:border-gray-200 transition-all uppercase tracking-tight disabled:opacity-60 active:scale-98"
                            >
                                <span className="material-symbols-outlined text-[16px] text-gray-400">visibility_off</span>
                                {activeAction === 'disable' ? 'Disabling...' : 'Disable'}
                            </button>
                            <button
                                onClick={() => handleApply('delete')}
                                disabled={isBusy || selectedIds.length === 0}
                                className="flex items-center justify-center gap-1.5 h-[36px] bg-red-50 text-red-600 border border-red-100 rounded-[10px] text-[11px] font-bold hover:bg-red-500 hover:text-white transition-all uppercase tracking-tight disabled:opacity-60 active:scale-98"
                            >
                                <span className="material-symbols-outlined text-[16px]">{activeAction === 'delete' ? 'sync' : 'delete'}</span>
                                {activeAction === 'delete' ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </DrawerBody>
            </div>
        </RightSideDrawer>
    );
};

export default BulkActionsDrawer;
