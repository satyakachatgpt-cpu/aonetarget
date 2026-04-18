import React, { useState, useRef } from 'react';
import { RightSideDrawer, DrawerBody } from './DrawerSystem';
import CustomDropdown from './CustomDropdown';

interface AddTestPDFDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    testSeriesOptions: { value: string; label: string }[];
}

const AddTestPDFDrawer: React.FC<AddTestPDFDrawerProps> = ({
    isOpen,
    onClose,
    onSubmit,
    testSeriesOptions
}) => {
    const [activeTab, setActiveTab] = useState<'Basic' | 'Advanced'>('Basic');
    const pdfInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        title: '',
        status: 'Paid',
        noOfQuestions: '',
        totalMarks: '',
        totalDuration: '',
        testSeries: [] as string[],
        pdfFiles: [] as File[],
        startDate: '2026-03-09T18:33',
        endDate: '2026-03-09T18:33',
        // Advanced
        subject: '',
        sortingOrder: '0.00',
        allowPdfExport: 'No'
    });

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        setFormData(prev => ({ ...prev, pdfFiles: [...prev.pdfFiles, ...files] }));
    };
    const removePdf = (index: number) => {
        setFormData(prev => ({
            ...prev,
            pdfFiles: prev.pdfFiles.filter((_, i) => i !== index)
        }));
    };

    return (
        <RightSideDrawer isOpen={isOpen} onClose={onClose} width="850px">
            <div className="flex flex-col h-full bg-white font-sans overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                    <h2 className="text-[17px] font-bold text-gray-800">Add Test PDF</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                        <span className="material-symbols-outlined text-[22px] text-gray-400">close</span>
                    </button>
                </div>

                <DrawerBody className="flex-1 overflow-y-auto hide-scrollbar !p-0 bg-white">
                    <>
                        {/* Tabs (Non-Sticky) */}
                        <div className="flex bg-white shrink-0 border-b border-gray-100">
                            <button
                                onClick={() => setActiveTab('Basic')}
                                className={`flex-1 py-3.5 text-[15px] font-bold transition-all relative flex items-center justify-center ${activeTab === 'Basic' ? 'text-black' : 'text-gray-400'}`}>
                                Basic
                                {activeTab === 'Basic' && <div className="absolute bottom-0 left-[20%] right-[20%] h-[3px] bg-black rounded-t-full" />}
                            </button>
                            <div className="w-[1px] h-6 bg-gray-200 self-center" />
                            <button
                                onClick={() => setActiveTab('Advanced')}
                                className={`flex-1 py-3.5 text-[15px] font-bold transition-all relative flex items-center justify-center ${activeTab === 'Advanced' ? 'text-black' : 'text-gray-400'}`}>
                                Advanced
                                {activeTab === 'Advanced' && <div className="absolute bottom-0 left-[20%] right-[20%] h-[3px] bg-black rounded-t-full" />}
                            </button>
                        </div>

                        <div className="flex flex-col min-h-full p-6 space-y-8">
                            {activeTab === 'Basic' ? (
                                <div className="space-y-8">
                                    <div className="grid grid-cols-2 gap-x-10 gap-y-8">
                                        {/* Title */}
                                        <div className="space-y-2">
                                            <label className="text-[13px] font-bold text-[#2d3748]">Title<span className="text-red-500 ml-0.5">*</span></label>
                                            <input
                                                type="text"
                                                value={formData.title}
                                                onChange={(e) => handleInputChange('title', e.target.value)}
                                                placeholder="Enter Title"
                                                className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-gray-400 transition-all placeholder:text-gray-300 shadow-sm"
                                            />
                                        </div>

                                        {/* Status */}
                                        <div className="space-y-2">
                                            <label className="text-[13px] font-bold text-[#2d3748]">Status</label>
                                            <div className="flex bg-[#f3f4f6]/50 p-1.5 rounded-[14px] h-12 border border-gray-200">
                                                <button
                                                    onClick={() => handleInputChange('status', 'Paid')}
                                                    className={`flex-1 flex items-center justify-center rounded-[10px] text-[12px] font-bold transition-all ${formData.status === 'Paid' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                                                    PAID
                                                </button>
                                                <button
                                                    onClick={() => handleInputChange('status', 'Free')}
                                                    className={`flex-1 flex items-center justify-center rounded-[10px] text-[12px] font-bold transition-all ${formData.status === 'Free' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                                                    FREE
                                                </button>
                                            </div>
                                        </div>

                                        {/* Number of Questions */}
                                        <div className="space-y-2">
                                            <label className="text-[13px] font-bold text-[#2d3748]">Number of Questions<span className="text-red-500 ml-0.5">*</span></label>
                                            <input
                                                type="text"
                                                value={formData.noOfQuestions}
                                                onChange={(e) => handleInputChange('noOfQuestions', e.target.value)}
                                                placeholder="Number of Questions"
                                                className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-gray-400 transition-all placeholder:text-gray-300 shadow-sm"
                                            />
                                        </div>

                                        {/* Total Marks */}
                                        <div className="space-y-2">
                                            <label className="text-[13px] font-bold text-[#2d3748]">Total Marks<span className="text-red-500 ml-0.5">*</span></label>
                                            <input
                                                type="text"
                                                value={formData.totalMarks}
                                                onChange={(e) => handleInputChange('totalMarks', e.target.value)}
                                                placeholder="Marks"
                                                className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-gray-400 transition-all placeholder:text-gray-300 shadow-sm"
                                            />
                                        </div>

                                        {/* Total Duration */}
                                        <div className="space-y-2">
                                            <label className="text-[13px] font-bold text-[#2d3748]">Total Duration<span className="text-red-500 ml-0.5">*</span></label>
                                            <input
                                                type="text"
                                                value={formData.totalDuration}
                                                onChange={(e) => handleInputChange('totalDuration', e.target.value)}
                                                placeholder="Enter Total Duration (in minutes)"
                                                className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-gray-400 transition-all placeholder:text-gray-300 shadow-sm"
                                            />
                                        </div>

                                        {/* Test Series */}
                                        <div className="space-y-2">
                                            <label className="text-[13px] font-bold text-[#2d3748]">Test Series<span className="text-red-500 ml-0.5">*</span></label>
                                            <CustomDropdown
                                                isMulti
                                                options={testSeriesOptions}
                                                value={formData.testSeries}
                                                accentColor="#1a202c"
                                                onChange={(val: any) => handleInputChange('testSeries', val)}
                                                placeholder={formData.testSeries.length > 0 ? `${formData.testSeries.length} of ${testSeriesOptions.length} selected` : 'Select Test Series'}
                                            />
                                        </div>
                                    </div>

                                    {/* Upload PDF Area */}
                                    <div className="space-y-3">
                                        <label className="text-[14px] font-bold text-[#1e1e1e]">Upload PDF<span className="text-[#e11d48] ml-0.5">*</span></label>
                                        <div className="flex gap-10 items-start">
                                            {/* Preview Boxes */}
                                            <div className="flex flex-wrap gap-4 flex-1">
                                                {formData.pdfFiles.length > 0 ? formData.pdfFiles.map((file, idx) => (
                                                    <div key={idx} className="w-[180px] h-[180px] bg-[#ededed] border border-gray-100 rounded-2xl flex flex-col items-center justify-center gap-3 group relative overflow-hidden flex-shrink-0 animate-in fade-in zoom-in-95 duration-200">
                                                        <div className="flex flex-col items-center gap-2 p-2 w-full h-full text-center">
                                                            <span className="material-symbols-outlined text-[48px] text-red-500">picture_as_pdf</span>
                                                            <p className="text-[11px] font-extrabold text-gray-600 px-2 line-clamp-2 uppercase tracking-tighter">{file.name}</p>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); removePdf(idx); }}
                                                                className="absolute top-2 right-2 w-7 h-7 bg-white/80 border border-gray-100 rounded-full flex items-center justify-center shadow-sm hover:text-red-500 transition-colors">
                                                                <span className="material-symbols-outlined text-[16px] font-black">close</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                )) : (
                                                    <div className="w-[180px] h-[180px] bg-gray-50 border border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-300">
                                                        <span className="material-symbols-outlined text-[32px]">draft</span>
                                                        <p className="text-[10px] font-bold uppercase mt-2">No Files</p>
                                                    </div>
                                                )}

                                                <div
                                                    onClick={() => pdfInputRef.current?.click()}
                                                    className="w-[180px] h-[180px] bg-[#f8fafc] border-2 border-dashed border-[#e2e8f0] hover:border-[#94a3b8] rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all group shrink-0"
                                                >
                                                    <input
                                                        type="file"
                                                        ref={pdfInputRef}
                                                        onChange={handleFileChange}
                                                        accept="application/pdf"
                                                        multiple
                                                        className="hidden"
                                                    />
                                                    <div className="space-y-2 text-center">
                                                        <p className="text-[20px] font-black text-gray-400 group-hover:text-black transition-colors">Upload PDF</p>
                                                        <p className="text-[12px] font-extrabold text-[#cbd5e1] uppercase tracking-[0.1em] group-hover:text-gray-400">Click or Drag & Drop your file here.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-10 border-t border-gray-100 pt-8">
                                        {/* Date & Time */}
                                        <div className="space-y-3">
                                            <label className="text-[13px] font-bold text-[#2d3748]">Start Date</label>
                                            <div className="relative group ring-1 ring-transparent hover:ring-blue-100 rounded-xl transition-all">
                                                <div className="w-full h-12 px-4 border border-gray-200 rounded-xl flex items-center justify-between text-[14px] text-gray-900 font-bold bg-white shadow-sm">
                                                    <span>{formData.startDate ? formData.startDate.replace('T', ' ') : 'Select Date & Time'}</span>
                                                    <span className="material-symbols-outlined text-gray-400 text-[20px]">calendar_today</span>
                                                </div>
                                                <input
                                                    type="datetime-local"
                                                    value={formData.startDate}
                                                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                />
                                            </div>
                                            <p className="text-[11px] text-gray-400 font-medium italic">Test will be active for attempts from the selected date and time</p>
                                        </div>

                                        {/* End Date & Time */}
                                        <div className="space-y-3">
                                            <label className="text-[13px] font-bold text-[#2d3748]">End Date<span className="text-red-500 ml-0.5">*</span></label>
                                            <div className="relative group ring-1 ring-transparent hover:ring-blue-100 rounded-xl transition-all">
                                                <div className="w-full h-12 px-4 border border-gray-200 rounded-xl flex items-center justify-between text-[14px] text-gray-900 font-bold bg-white shadow-sm">
                                                    <span>{formData.endDate ? formData.endDate.replace('T', ' ') : 'Select End Date'}</span>
                                                    <span className="material-symbols-outlined text-gray-400 text-[20px]">calendar_today</span>
                                                </div>
                                                <input
                                                    type="datetime-local"
                                                    value={formData.endDate}
                                                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                />
                                            </div>
                                            <p className="text-[11px] text-gray-400 font-medium italic">Attempts won't be allowed after the selected date and time</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-300">
                                    <div className="grid grid-cols-2 gap-x-12 gap-y-8">
                                        {/* Subject */}
                                        <div className="space-y-2">
                                            <label className="text-[14px] font-bold text-[#1e1e1e]">Subject</label>
                                            <input
                                                type="text"
                                                value={formData.subject}
                                                onChange={(e) => handleInputChange('subject', e.target.value)}
                                                placeholder="e.g. Physics"
                                                className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-gray-400 transition-all placeholder:text-gray-300 shadow-sm"
                                            />
                                        </div>

                                        {/* Sorting Order */}
                                        <div className="space-y-2">
                                            <label className="text-[14px] font-bold text-[#1e1e1e]">Sorting Order</label>
                                            <input
                                                type="text"
                                                value={formData.sortingOrder}
                                                onChange={(e) => handleInputChange('sortingOrder', e.target.value)}
                                                placeholder="0.00"
                                                className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-gray-400 transition-all placeholder:text-gray-300 shadow-sm"
                                            />
                                        </div>

                                        {/* Allow Pdf Export */}
                                        <div className="space-y-2">
                                            <label className="text-[14px] font-bold text-[#1e1e1e]">Allow Pdf Export<span className="text-[#e11d48] ml-0.5">*</span></label>
                                            <CustomDropdown
                                                options={[
                                                    { value: 'Yes', label: 'Yes' },
                                                    { value: 'No', label: 'No' },
                                                ]}
                                                value={formData.allowPdfExport}
                                                onChange={(val: any) => handleInputChange('allowPdfExport', val)}
                                                placeholder="No"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="mt-auto shrink-0 bg-[#1a202c] py-6 flex items-center justify-center -mx-6 -mb-6 mt-10">
                                <button
                                    onClick={() => onSubmit(formData)}
                                    className="text-white text-[16px] font-bold hover:opacity-90 transition-all outline-none uppercase tracking-[2px]">
                                    Submit
                                </button>
                            </div>
                        </div>
                    </>
                </DrawerBody>
            </div>

            <style>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </RightSideDrawer>
    );
};

export default AddTestPDFDrawer;
