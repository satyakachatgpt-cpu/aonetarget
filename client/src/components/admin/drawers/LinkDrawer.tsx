import React, { useState, useRef } from 'react';
import {
    RightSideDrawer,
    DrawerHeader,
    DrawerBody,
    FormLabel,
    FormInput
} from '../DrawerSystem';

export const LinkDrawer: React.FC<{ isOpen: boolean; onClose: () => void; onSubmit: (data: any) => void }> = ({ isOpen, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        name: '',
        link: '',
        status: 'Free',
        publishOn: '2026-03-02 10:15',
        order: '0.00',
        imageFile: null as File | null,
        isDemo: false
    });
    const [showAdvanced, setShowAdvanced] = useState(false);
    const linkFileRef = useRef<HTMLInputElement>(null);

    return (
        <RightSideDrawer isOpen={isOpen} onClose={onClose}>
            <DrawerHeader title="Add Link" onClose={onClose} />
            <DrawerBody className="bg-[#fcfcfc]">
                <div className="space-y-7 pb-10">
                    {/* Name */}
                    <div className="space-y-2">
                        <FormLabel label="Name" required />
                        <FormInput
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Title"
                        />
                    </div>

                    {/* Image Section */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-[14px] font-bold text-gray-700 mb-1 ml-1">Image</label>
                            <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Recommended: 400x400 px (1:1 Ratio)</span>
                        </div>
                        <div className="flex gap-4">
                            {/* No Image Placeholder */}
                            <div className="w-[140px] aspect-[4/3] bg-[#f2f2f2] rounded-2xl flex flex-col items-center justify-center gap-2 shrink-0 border border-gray-100">
                                <span className="material-symbols-outlined text-gray-400 text-[32px]">image</span>
                                <span className="text-[12px] font-bold text-gray-400">No Image</span>
                            </div>

                            {/* Upload Area */}
                            <div
                                onClick={() => linkFileRef.current?.click()}
                                className="flex-1 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center p-4 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer group text-center"
                            >
                                <input
                                    type="file"
                                    ref={linkFileRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) setFormData({ ...formData, imageFile: file });
                                    }}
                                />
                                <h4 className="text-[16px] font-bold text-gray-400 group-hover:text-gray-600 transition-colors">Upload Image</h4>
                                <p className="text-[11px] font-medium text-gray-300 leading-tight mt-1 max-w-[140px] mx-auto">Click or Drag & Drop your file here.</p>
                            </div>
                        </div>
                    </div>

                    {/* Link */}
                    <div className="space-y-2">
                        <FormLabel label="Link" required />
                        <FormInput
                            value={formData.link}
                            onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                            placeholder="Link"
                        />
                    </div>

                    {/* Status & Demo Toggle */}
                    <div className="space-y-4">
                        <div className="flex bg-[#f8fafc] p-1.5 rounded-2xl flex relative border border-gray-100/50 h-[52px]">
                            <div
                                className={`absolute inset-y-1.5 w-[calc(50%-6px)] bg-white rounded-xl shadow-sm transition-all duration-300 ${formData.status === 'Free' ? 'left-1.5' : 'left-[50%]'}`}
                            />
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, status: 'Free' })}
                                className={`flex-1 relative z-10 text-[14px] font-bold transition-colors ${formData.status === 'Free' ? 'text-gray-900' : 'text-gray-400'}`}
                            >
                                Free
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, status: 'Paid' })}
                                className={`flex-1 relative z-10 text-[14px] font-bold transition-colors ${formData.status === 'Paid' ? 'text-gray-900' : 'text-gray-400'}`}
                            >
                                Paid
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, isDemo: !formData.isDemo })}
                            className={`w-full h-[54px] rounded-2xl border-2 transition-all flex items-center justify-center gap-2 ${formData.isDemo ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-gray-100 text-gray-400'}`}
                        >
                            <span className="material-symbols-outlined text-[20px]">{formData.isDemo ? 'check_circle' : 'circle'}</span>
                            <span className="text-[13px] font-bold uppercase tracking-tight">Show in Demo Section</span>
                        </button>
                    </div>

                    {/* Publish On */}
                    <div className="space-y-2">
                        <FormLabel label="Publish On" />
                        <FormInput
                            value={formData.publishOn}
                            onChange={(e) => setFormData({ ...formData, publishOn: e.target.value })}
                            placeholder="YYYY-MM-DD HH:MM"
                        />
                    </div>

                    {/* Advanced Settings */}
                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center gap-1 text-[13px] font-bold text-[#3b82f6] hover:text-blue-700 transition-all ml-auto focus:outline-none"
                        >
                            <span className={`material-symbols-outlined text-[20px] transition-transform duration-300 ${showAdvanced ? '-rotate-180' : ''}`}>expand_more</span>
                            {showAdvanced ? 'Hide Advanced Settings' : 'Advanced Settings'}
                        </button>
                        {showAdvanced && (
                            <div className="mt-4 p-6 bg-gray-50/50 rounded-2xl border border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="space-y-5">
                                    <h4 className="text-[14px] font-bold text-gray-800">Advanced Settings</h4>
                                    <div className="space-y-2">
                                        <FormLabel label="Sorting Order" />
                                        <FormInput
                                            value={formData.order}
                                            onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
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
                        onClick={() => onSubmit(formData)}
                        className="flex-[2] h-[60px] bg-[#1a1c1e] text-white rounded-2xl font-bold text-[15px] hover:bg-black transition-all shadow-lg active:scale-[0.98]"
                    >
                        SUBMIT LINK
                    </button>
                </div>
            </div>
        </RightSideDrawer>
    );
};
