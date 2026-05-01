import React, { useState } from 'react';
import {
    RightSideDrawer,
    DrawerHeader,
    DrawerBody,
    FormLabel,
    FormInput
} from '../DrawerSystem';
import BatchMultiSelect from '../course-content/BatchMultiSelect';

export const WebinarDrawer: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    onSubmit: (data: any) => void;
    showToast?: (msg: string, type?: 'success' | 'error') => void;
    globalCreateMode?: boolean;
    selectedBatchIds?: string[];
    setSelectedBatchIds?: (ids: string[]) => void;
    availableCourses?: any[];
}> = ({ isOpen, onClose, onSubmit, showToast, globalCreateMode = false, selectedBatchIds = [], setSelectedBatchIds, availableCourses = [] }) => {
    const [formData, setFormData] = useState({
        title: '',
        webinarId: '',
        duration: '60',
        date: '2026-03-05 15:00',
        status: 'active'
    });

    return (
        <RightSideDrawer isOpen={isOpen} onClose={onClose}>
            <DrawerHeader title="Add Webinar.gg Live" onClose={onClose} />
            <DrawerBody className="bg-[#fcfcfc]">
                <div className="space-y-6 pb-10">
                    {/* Batch Multi-Select for Global Mode */}
                    {globalCreateMode && (
                        <BatchMultiSelect 
                            courses={availableCourses}
                            selectedIds={selectedBatchIds}
                            onChange={(ids) => setSelectedBatchIds?.(ids)}
                        />
                    )}

                    <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100/50 text-center flex flex-col items-center">
                        <span className="material-symbols-outlined text-[48px] text-blue-500 mb-2">podcasts</span>
                        <h4 className="text-[14px] font-black text-blue-900 uppercase tracking-tight">Webinar.gg Integration</h4>
                        <p className="text-[12px] text-blue-400 mt-1 font-medium">Connect your live webinar service</p>
                    </div>

                    <div className="space-y-2">
                        <FormLabel label="Webinar Title" required />
                        <FormInput
                            placeholder="e.g. Weekly Strategy Session"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <FormLabel label="Webinar ID / Link" required />
                        <FormInput
                            placeholder="Enter Webinar.gg link or ID"
                            value={formData.webinarId}
                            onChange={(e) => setFormData({ ...formData, webinarId: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <FormLabel label="Duration (min)" />
                            <FormInput
                                type="number"
                                placeholder="60"
                                value={formData.duration}
                                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <FormLabel label="Start Time" />
                            <FormInput
                                placeholder="YYYY-MM-DD HH:MM"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                    </div>

                </div>
            </DrawerBody>
            <div className="px-8 pb-10">
                <div className="flex gap-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 h-[60px] bg-gray-100 text-gray-700 rounded-2xl font-bold text-[15px] hover:bg-gray-200 transition-all active:scale-[0.98]"
                    >
                        CANCEL
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (globalCreateMode && selectedBatchIds.length === 0) {
                                showToast?.('Please select at least one batch', 'error');
                                return;
                            }
                            onSubmit(formData);
                        }}
                        className="flex-[2] h-[60px] bg-[#1a1c1e] text-white rounded-2xl font-bold text-[15px] hover:bg-black transition-all shadow-lg active:scale-[0.98]"
                    >
                        CONNECT WEBINAR
                    </button>
                </div>
            </div>
        </RightSideDrawer>
    );
};
