import React, { useState, useRef } from 'react';
import { RightSideDrawer, DrawerBody } from './DrawerSystem';
import CustomDropdown from './CustomDropdown';

interface SubjectiveTestDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onAddTests: (data: any) => void;
    testSeriesOptions: { value: string; label: string }[];
}

const SubjectiveTestDrawer: React.FC<SubjectiveTestDrawerProps> = ({
    isOpen,
    onClose,
    onAddTests,
    testSeriesOptions
}) => {
    const [activeTab, setActiveTab] = useState<'Basic' | 'Advanced'>('Basic');

    // File refs for Advanced tab
    const videoRef = useRef<HTMLInputElement>(null);
    const testPdfRef = useRef<HTMLInputElement>(null);
    const solutionsPdfRef = useRef<HTMLInputElement>(null);
    const answerKeyPdfRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        // Basic Fields
        title: '',
        status: 'Paid',
        noOfQuestions: '',
        totalDuration: '',
        totalMarks: '',
        testSeries: [] as string[],
        subjects: '',
        sortingOrder: '0.00',
        responseType: 'PDF',
        allowPdfExport: 'No',
        markTestAsLive: false,
        // Advanced Fields
        startDate: '2026-03-09T18:49',
        endDate: '2026-03-09T18:49',
        solutionVideo: null as File | null,
        testPdf: null as File | null,
        solutionsPdf: null as File | null,
        answerKeyPdf: null as File | null,
        displayRank: false
    });

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleFileChange = (field: string, file: File | null) => {
        setFormData(prev => ({ ...prev, [field]: file }));
    };

    const handleSubmit = () => {
        onAddTests(formData);
        onClose();
    };

    const UploadSection = ({
        label,
        field,
        file,
        accept,
        inputRef,
        icon,
        isRequired = false
    }: {
        label: string,
        field: string,
        file: File | null,
        accept: string,
        inputRef: React.RefObject<HTMLInputElement>,
        icon: string,
        isRequired?: boolean
    }) => (
        <div className="space-y-3">
            <label className="text-[13px] font-bold text-[#2d3748]">{label}{isRequired && <span className="text-red-500 ml-0.5">*</span>}</label>
            <div className="flex gap-6 items-center">
                <div className="w-[120px] h-[120px] bg-[#f8f9fa] border border-gray-100 rounded-2xl flex flex-col items-center justify-center gap-2 group relative overflow-hidden flex-shrink-0 shadow-sm transition-all hover:bg-white hover:border-gray-200">
                    {file ? (
                        <div className="flex flex-col items-center gap-1.5 p-2 w-full h-full text-center">
                            <span className="material-symbols-outlined text-[32px] text-gray-700">{icon === 'video_library' ? 'movie' : 'picture_as_pdf'}</span>
                            <p className="text-[10px] font-bold text-gray-600 px-1 line-clamp-2 uppercase tracking-tighter leading-tight">{file.name}</p>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleFileChange(field, null); }}
                                className="absolute top-1.5 right-1.5 w-6 h-6 bg-white border border-gray-100 rounded-full flex items-center justify-center shadow-md hover:text-red-500 transition-colors">
                                <span className="material-symbols-outlined text-[14px] font-black">close</span>
                            </button>
                        </div>
                    ) : (
                        <>
                            <span className="material-symbols-outlined text-[32px] text-gray-300 group-hover:text-gray-400 transition-colors">{icon}</span>
                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none mt-1">No {icon === 'video_library' ? 'Video' : 'PDF'}</p>
                        </>
                    )}
                </div>
                <div
                    onClick={() => inputRef.current?.click()}
                    className="flex-1 h-[120px] border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center transition-all bg-white hover:bg-gray-50/50 cursor-pointer group hover:border-gray-300">
                    <input
                        type="file"
                        ref={inputRef}
                        accept={accept}
                        className="hidden"
                        onChange={(e) => handleFileChange(field, e.target.files?.[0] || null)}
                    />
                    <div className="text-center px-4">
                        <p className="text-[16px] font-black text-gray-400 group-hover:text-[#1a202c] transition-colors uppercase tracking-tight">Upload {icon === 'video_library' ? 'Video' : 'PDF'}</p>
                        <p className="text-[11px] font-bold text-gray-300 mt-1 uppercase tracking-widest group-hover:text-gray-400 transition-colors">Click or Drag & Drop</p>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <RightSideDrawer isOpen={isOpen} onClose={onClose} width="850px">
            <div className="flex flex-col h-full bg-white font-sans overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                    <h2 className="text-[17px] font-bold text-gray-800">Add Subjective Test</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                        <span className="material-symbols-outlined text-[22px] text-gray-400">close</span>
                    </button>
                </div>

                <DrawerBody className="flex-1 overflow-y-auto hide-scrollbar !p-0 bg-white">
                    {/* Tabs */}
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

                    <div className="flex flex-col min-h-full p-6 space-y-12">
                        {activeTab === 'Basic' ? (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                <div className="grid grid-cols-2 gap-x-10 gap-y-8">
                                    {/* Row 1: Title, Status */}
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

                                    <div className="space-y-2">
                                        <label className="text-[13px] font-bold text-[#2d3748]">Status</label>
                                        <div className="flex bg-[#f3f4f6]/50 p-1.5 rounded-[14px] h-12 border border-gray-200">
                                            <button
                                                onClick={() => handleInputChange('status', 'Paid')}
                                                className={`flex-1 rounded-lg font-bold text-[13px] transition-all ${formData.status === 'Paid' ? 'bg-[#d1d5db] text-[#1a202c]' : 'text-gray-500'}`}>
                                                Paid
                                            </button>
                                            <button
                                                onClick={() => handleInputChange('status', 'Free')}
                                                className={`flex-1 rounded-lg font-bold text-[13px] transition-all ${formData.status === 'Free' ? 'bg-[#d1d5db] text-[#1a202c]' : 'text-gray-500'}`}>
                                                Free
                                            </button>
                                        </div>
                                    </div>

                                    {/* Row 2: No. of Questions, Sorting Order */}
                                    <div className="space-y-2">
                                        <label className="text-[13px] font-bold text-[#2d3748]">No. of Questions <span className="text-red-500 ml-0.5">*</span></label>
                                        <input
                                            type="text"
                                            value={formData.noOfQuestions}
                                            onChange={(e) => handleInputChange('noOfQuestions', e.target.value)}
                                            placeholder="Number of Questions"
                                            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-gray-400 transition-all placeholder:text-gray-300 shadow-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[13px] font-bold text-[#2d3748]">Sorting Order</label>
                                        <input
                                            type="text"
                                            value={formData.sortingOrder}
                                            onChange={(e) => handleInputChange('sortingOrder', e.target.value)}
                                            placeholder="0.00"
                                            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-gray-400 transition-all shadow-sm"
                                        />
                                    </div>

                                    {/* Row 3: Total Duration, Total Marks */}
                                    <div className="space-y-2">
                                        <label className="text-[13px] font-bold text-[#2d3748]">Total Duration (in minutes) <span className="text-red-500 ml-0.5">*</span></label>
                                        <input
                                            type="text"
                                            value={formData.totalDuration}
                                            onChange={(e) => handleInputChange('totalDuration', e.target.value)}
                                            placeholder="Time in Minutes"
                                            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-gray-400 transition-all placeholder:text-gray-300 shadow-sm"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[13px] font-bold text-[#1e1e1e]">Total Marks <span className="text-red-500 ml-0.5">*</span></label>
                                        <input
                                            type="text"
                                            value={formData.totalMarks}
                                            onChange={(e) => handleInputChange('totalMarks', e.target.value)}
                                            placeholder="Marks"
                                            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-gray-400 transition-all placeholder:text-gray-300 shadow-sm"
                                        />
                                    </div>

                                    {/* Row 4: Test Series, Subjects */}
                                    <div className="space-y-2">
                                        <label className="text-[13px] font-bold text-[#1e1e1e]">Test Series <span className="text-red-500 ml-0.5">*</span></label>
                                        <CustomDropdown
                                            isMulti
                                            options={testSeriesOptions}
                                            value={formData.testSeries}
                                            accentColor="#1a202c"
                                            onChange={(val: any) => handleInputChange('testSeries', val)}
                                            placeholder={formData.testSeries.length > 0 ? `${formData.testSeries.length} selected` : 'Select Test Series'}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[13px] font-bold text-[#1e1e1e]">Subjects</label>
                                        <CustomDropdown
                                            options={[
                                                { value: 'Physics', label: 'Physics' },
                                                { value: 'Chemistry', label: 'Chemistry' },
                                                { value: 'Mathematics', label: 'Mathematics' },
                                                { value: 'Biology', label: 'Biology' },
                                            ]}
                                            value={formData.subjects}
                                            accentColor="#1a202c"
                                            onChange={(val: any) => handleInputChange('subjects', val)}
                                            placeholder="--Select Subject--"
                                        />
                                    </div>

                                    {/* Row 5: Response Type, Allow PDF Export */}
                                    <div className="space-y-2">
                                        <label className="text-[13px] font-bold text-[#1e1e1e]">Response Type</label>
                                        <CustomDropdown
                                            options={[
                                                { value: 'PDF', label: 'PDF' },
                                                { value: 'TEXT', label: 'TEXT' },
                                                { value: 'QNA', label: 'QNA' },
                                            ]}
                                            value={formData.responseType}
                                            accentColor="#1a202c"
                                            onChange={(val: any) => handleInputChange('responseType', val)}
                                            placeholder="PDF"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[13px] font-bold text-[#1e1e1e]">Allow PDF Export <span className="text-red-500 ml-0.5">*</span></label>
                                        <CustomDropdown
                                            options={[
                                                { value: 'No', label: 'No' },
                                                { value: 'Yes', label: 'Yes' },
                                            ]}
                                            value={formData.allowPdfExport}
                                            accentColor="#1a202c"
                                            onChange={(val: any) => handleInputChange('allowPdfExport', val)}
                                            placeholder="No"
                                        />
                                    </div>

                                    {/* Row 6: Mark Test as Live */}
                                    <div className="col-span-2 pt-4 flex items-center justify-between border-t border-gray-50">
                                        <div className="space-y-0.5">
                                            <p className="text-[14px] font-bold text-[#1e1e1e]">Mark Test as Live</p>
                                            <p className="text-[12px] text-gray-400 font-medium italic">Enable this to make the test accessible to students immediately</p>
                                        </div>
                                        <div
                                            onClick={() => handleInputChange('markTestAsLive', !formData.markTestAsLive)}
                                            className={`relative inline-flex items-center cursor-pointer w-[44px] h-[24px] rounded-full transition-all duration-300 ${formData.markTestAsLive ? 'bg-black' : 'bg-gray-200'}`}
                                        >
                                            <div className={`absolute w-5 h-5 bg-white rounded-full shadow-md transition-transform ${formData.markTestAsLive ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-50">
                                    <h3 className="text-[18px] font-bold text-gray-800">Questions</h3>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-12 animate-in fade-in slide-in-from-right-2 duration-300">
                                {/* Test Dates Section */}
                                <div className="space-y-8">
                                    <h3 className="text-[16px] font-bold text-[#1e1e1e] tracking-tight">Test Dates</h3>
                                    <div className="grid grid-cols-2 gap-10">
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

                                {/* Test Content Section */}
                                <div className="space-y-6">
                                    <h3 className="text-[18px] font-bold text-gray-800 tracking-tight">Test Content</h3>
                                    <div className="grid grid-cols-2 gap-x-12 gap-y-10">
                                        <UploadSection
                                            label="Test Solutions Video"
                                            field="solutionVideo"
                                            file={formData.solutionVideo}
                                            accept="video/*"
                                            inputRef={videoRef}
                                            icon="video_library"
                                        />
                                        <UploadSection
                                            label="Upload PDF"
                                            field="testPdf"
                                            file={formData.testPdf}
                                            accept=".pdf"
                                            inputRef={testPdfRef}
                                            icon="picture_as_pdf"
                                            isRequired
                                        />
                                        <UploadSection
                                            label="Solutions"
                                            field="solutionsPdf"
                                            file={formData.solutionsPdf}
                                            accept=".pdf"
                                            inputRef={solutionsPdfRef}
                                            icon="picture_as_pdf"
                                        />
                                        <UploadSection
                                            label="Answer Key"
                                            field="answerKeyPdf"
                                            file={formData.answerKeyPdf}
                                            accept=".pdf"
                                            inputRef={answerKeyPdfRef}
                                            icon="picture_as_pdf"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-5 pt-10 border-t border-gray-100">
                                    <h3 className="text-[16px] font-bold text-[#1e1e1e] tracking-tight">Additional Settings</h3>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="text-[14px] font-bold text-[#1e1e1e]">Display Rank</p>
                                            <p className="text-[12px] text-gray-400 font-medium italic">Switch ON to display rankings of participants as part of the test result</p>
                                        </div>
                                        <div
                                            onClick={() => handleInputChange('displayRank', !formData.displayRank)}
                                            className={`relative inline-flex items-center cursor-pointer w-[44px] h-[24px] rounded-full transition-all duration-300 ${formData.displayRank ? 'bg-black' : 'bg-gray-200'}`}
                                        >
                                            <div className={`absolute w-5 h-5 bg-white rounded-full shadow-md transition-transform ${formData.displayRank ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="mt-auto shrink-0 bg-[#1a202c] py-6 flex items-center justify-center -mx-6 -mb-6">
                            <button
                                onClick={handleSubmit}
                                className="text-white text-[16px] font-bold hover:opacity-90 transition-all outline-none uppercase tracking-[2px]">
                                Submit
                            </button>
                        </div>
                    </div>
                </DrawerBody>
            </div>

            <style>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </RightSideDrawer>
    );
};

export default SubjectiveTestDrawer;
