import React, { useState, useEffect } from 'react';
import {
    RightSideDrawer,
    DrawerHeader,
    DrawerBody,
    DrawerFooter,
    FormLabel,
    FormSelect,
    PrimaryButton
} from '../DrawerSystem';
import BatchMultiSelect from '../course-content/BatchMultiSelect';

export interface TestDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (tests: any[]) => void;
    testSeriesList: any[];
    isSeriesLoading: boolean;
    onSeriesChange: (seriesId: string) => void;
    availableTests: any[];
    isTestsLoading: boolean;
    showToast?: (msg: string, type?: 'success' | 'error') => void;
    globalCreateMode?: boolean;
    selectedBatchIds?: string[];
    setSelectedBatchIds?: (ids: string[]) => void;
    availableCourses?: any[];
}

export const TestDrawer: React.FC<TestDrawerProps> = ({
    isOpen,
    onClose,
    onSubmit,
    testSeriesList,
    isSeriesLoading,
    onSeriesChange,
    availableTests,
    isTestsLoading,
    showToast,
    globalCreateMode = false,
    selectedBatchIds = [],
    setSelectedBatchIds,
    availableCourses = []
}) => {
    const [selectedSeries, setSelectedSeries] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [addedTestIds, setAddedTestIds] = useState<string[]>([]);

    useEffect(() => {
        if (!isOpen) {
            setSelectedSeries('');
            setSearchQuery('');
            setAddedTestIds([]);
        }
    }, [isOpen]);

    const handleSeriesChange = (id: string) => {
        setSelectedSeries(id);
        onSeriesChange(id);
    };

    const toggleTest = (test: any) => {
        const id = test._id || test.id;
        setAddedTestIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const filteredTests = availableTests.filter(t =>
        (t.name || t.title || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedTests = availableTests.filter(t => addedTestIds.includes(t._id || t.id));

    return (
        <RightSideDrawer isOpen={isOpen} onClose={onClose}>
            <DrawerHeader title="Add Test(s)" onClose={onClose} />
            <DrawerBody>
                <div className="space-y-6">
                    {/* Batch Multi-Select for Global Mode */}
                    {globalCreateMode && (
                        <BatchMultiSelect 
                            courses={availableCourses}
                            selectedIds={selectedBatchIds}
                            onChange={(ids) => setSelectedBatchIds?.(ids)}
                        />
                    )}

                    <div>
                        <FormLabel label="Select Test Series" />
                        <FormSelect
                            value={selectedSeries}
                            onChange={(val) => handleSeriesChange(val)}
                            options={[
                                { value: '', label: isSeriesLoading ? 'Loading Series...' : 'Select Series' },
                                ...testSeriesList.map(s => ({
                                    value: s._id || s.id,
                                    label: s.seriesName || s.title || s.name
                                }))
                            ]}
                        />
                    </div>

                    {selectedSeries && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <FormLabel label="Select Test" />
                                    {selectedSeries && (
                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50/50 border border-indigo-100 rounded-full animate-in zoom-in-95 duration-300">
                                            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                                            <span className="text-[11px] font-black text-indigo-600 uppercase tracking-widest leading-none">
                                                {testSeriesList.find(s => (s._id || s.id) === selectedSeries)?.seriesName || 
                                                 testSeriesList.find(s => (s._id || s.id) === selectedSeries)?.title || 
                                                 testSeriesList.find(s => (s._id || s.id) === selectedSeries)?.name || "Series"}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search for a Test"
                                        className="w-full h-[52px] pl-11 pr-4 bg-[#f8fafc] border border-gray-100 rounded-2xl text-[14px] font-medium outline-none focus:border-blue-400 focus:bg-white transition-all shadow-sm"
                                    />
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
                                </div>
                            </div>

                            <div className="max-h-[360px] overflow-y-auto pr-1 space-y-1 custom-scrollbar">
                                {isTestsLoading ? (
                                    <div className="py-20 text-center opacity-30">
                                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                        <p className="text-[14px] font-bold">Loading tests...</p>
                                    </div>
                                ) : filteredTests.length > 0 ? (
                                    filteredTests.map((test) => {
                                        const isChecked = addedTestIds.includes(test._id || test.id);
                                        return (
                                            <div
                                                key={test._id || test.id}
                                                onClick={() => toggleTest(test)}
                                                className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border ${isChecked
                                                    ? 'bg-indigo-50/50 border-indigo-100'
                                                    : 'hover:bg-gray-50 border-transparent'
                                                    }`}
                                            >
                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${isChecked
                                                    ? 'bg-indigo-500 border-indigo-500 text-white'
                                                    : 'bg-white border-gray-200'
                                                    }`}>
                                                    {isChecked && <span className="material-symbols-outlined text-[16px] font-bold">check</span>}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className={`text-[14px] font-bold tracking-tight ${isChecked ? 'text-indigo-900' : 'text-gray-700'}`}>
                                                        {test.name || test.title}
                                                    </span>
                                                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                                        {(test._id || test.id).slice(-6).toUpperCase()}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="py-20 flex flex-col items-center justify-center text-center opacity-30">
                                        <span className="material-symbols-outlined text-[48px]">search_off</span>
                                        <p className="text-[14px] font-bold mt-2">No tests found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {addedTestIds.length > 0 && (
                        <div className="flex items-center justify-between px-2 pt-2 animate-in slide-in-from-bottom-2">
                            <span className="text-[12px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest">
                                {addedTestIds.length} Selected
                            </span>
                            <button
                                onClick={() => setAddedTestIds([])}
                                className="text-[12px] font-bold text-gray-400 hover:text-red-500 transition-colors uppercase tracking-widest"
                            >
                                Clear All
                            </button>
                        </div>
                    )}

                </div>
            </DrawerBody>
            <DrawerFooter>
                <PrimaryButton
                    onClick={() => {
                        if (globalCreateMode && selectedBatchIds.length === 0) {
                            showToast?.('Please select at least one batch', 'error');
                            return;
                        }
                        onSubmit(selectedTests);
                    }}
                    disabled={addedTestIds.length === 0}
                >
                    SUBMIT
                </PrimaryButton>
            </DrawerFooter>
        </RightSideDrawer>
    );
};
