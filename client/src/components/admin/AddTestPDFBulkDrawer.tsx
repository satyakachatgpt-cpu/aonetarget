import React, { useState, useRef } from 'react';
import { RightSideDrawer, DrawerBody } from './DrawerSystem';
import CustomDropdown from './CustomDropdown';

interface AddTestPDFBulkDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
}

const AddTestPDFBulkDrawer: React.FC<AddTestPDFBulkDrawerProps> = ({
    isOpen,
    onClose,
    onSubmit
}) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [testTitle, setTestTitle] = useState('');
    const [testImage, setTestImage] = useState<File | null>(null);
    const [formData, setFormData] = useState({
        questions: '',
        marks: '',
        time: '',
        sortingOrder: '0.00',
        subject: '',
        freeFlag: 'Paid',
        exportPdf: 'No'
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            setTestTitle(file.name.replace('.pdf', ''));
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setTestImage(e.target.files[0]);
        }
    };

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        if (!selectedFile) return;
        
        setIsProcessing(true);
        setStatusMessage('AI is analyzing your PDF... Please wait.');
        
        try {
            const formDataToUpload = new FormData();
            formDataToUpload.append('pdf', selectedFile);

            const response = await fetch('/api/v2/parse/gemini-pdf', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                    'x-admin-id': localStorage.getItem('adminId') || ''
                },
                body: formDataToUpload
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'AI Parsing failed');
            }

            const result = await response.json();
            
            onSubmit({
                ...formData,
                file: selectedFile,
                title: testTitle,
                image: testImage,
                parsedQuestions: result.questions
            });
            
            onClose();
            setSelectedFile(null);
            setTestImage(null);
            setTestTitle('');
        } catch (err: any) {
            alert(err.message || "Something went wrong during AI parsing");
        } finally {
            setIsProcessing(false);
            setStatusMessage('');
        }
    };

    return (
        <RightSideDrawer isOpen={isOpen} onClose={onClose} width="850px">
            <div className="flex flex-col h-full bg-white font-sans overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                    <h2 className="text-[17px] font-bold text-gray-800">Bulk Upload Test</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                        <span className="material-symbols-outlined text-[22px] text-gray-400">close</span>
                    </button>
                </div>

                <DrawerBody className="flex-1 overflow-y-auto hide-scrollbar !p-0 bg-white">
                    <div className="flex flex-col min-h-full p-6 space-y-8">
                        {/* PDF Upload Section */}
                        <div className="space-y-4">
                            <label className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest px-1">PDFs</label>

                            {!selectedFile ? (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full min-h-[160px] border-2 border-dashed border-gray-200 rounded-[2.5rem] flex flex-col items-center justify-center transition-all bg-white hover:bg-gray-50/50 hover:border-gray-300 cursor-pointer group shadow-sm"
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        accept=".pdf"
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                    <div className="space-y-2 text-center">
                                        <p className="text-[20px] font-black text-gray-400 group-hover:text-[#1a202c] transition-colors uppercase tracking-tight">Upload PDF</p>
                                        <p className="text-[12px] font-black text-gray-300 group-hover:text-gray-400 uppercase tracking-widest mt-1">Click or Drag & Drop</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                <div className="space-y-6">
                                    <div className="w-full h-[120px] border border-gray-100 rounded-[2rem] bg-[#f8f9fa] px-6 flex items-center justify-between group shadow-sm">
                                        <div className="flex items-center gap-6 flex-1">
                                            <div
                                                onClick={() => imageInputRef.current?.click()}
                                                className="w-[60px] h-[60px] bg-white border border-gray-100 rounded-2xl flex items-center justify-center shadow-sm cursor-pointer hover:border-gray-300 transition-all overflow-hidden relative group/img"
                                            >
                                                <input
                                                    type="file"
                                                    ref={imageInputRef}
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={handleImageChange}
                                                />
                                                {testImage ? (
                                                    <img src={URL.createObjectURL(testImage)} className="w-full h-full object-cover" alt="Test Thumb" />
                                                ) : (
                                                    <span className="material-symbols-outlined text-gray-300 text-[32px]">image</span>
                                                )}
                                                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-white text-[20px]">add_a_photo</span>
                                                </div>
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <input
                                                    type="text"
                                                    value={testTitle}
                                                    onChange={(e) => setTestTitle(e.target.value)}
                                                    className="w-full h-10 px-4 border border-gray-200 rounded-xl text-[14px] font-bold text-[#1a202c] outline-none focus:border-gray-400 transition-all bg-white shadow-sm"
                                                />
                                                <p className="text-[11px] font-bold text-gray-400 px-1 italic">File: {selectedFile.name}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2 ml-4">
                                            <button className="w-8 h-8 rounded-lg border border-gray-100 flex items-center justify-center text-gray-300 hover:text-black hover:border-black transition-all bg-white shadow-sm">
                                                <span className="material-symbols-outlined text-[18px]">grid_view</span>
                                            </button>
                                            <button
                                                onClick={() => { setSelectedFile(null); setTestImage(null); }}
                                                className="w-8 h-8 rounded-lg border border-red-50 flex items-center justify-center text-red-200 hover:text-red-500 hover:border-red-500 transition-all bg-white shadow-sm"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-3 px-1">
                                        <div className="w-full h-[6px] bg-gray-100 rounded-full overflow-hidden">
                                            <div className="w-full h-full bg-black rounded-full" />
                                        </div>
                                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest text-right">Upload complete</p>
                                    </div>
                                </div>
                                </div>
                            )}
                        </div>

                        {/* Form Fields Visible After Upload */}
                        {selectedFile && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="grid grid-cols-3 gap-10">
                                    <div className="space-y-3">
                                        <label className="text-[13px] font-bold text-[#2d3748]">Questions <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            value={formData.questions}
                                            onChange={(e) => handleInputChange('questions', e.target.value)}
                                            placeholder="Number of questions.."
                                            className="w-full h-12 px-4 border border-gray-200 rounded-xl text-[14px] font-medium text-gray-700 outline-none focus:border-gray-400 transition-all placeholder:text-gray-300 shadow-sm"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[13px] font-bold text-[#2d3748]">Marks <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            value={formData.marks}
                                            onChange={(e) => handleInputChange('marks', e.target.value)}
                                            placeholder="Marks"
                                            className="w-full h-12 px-4 border border-gray-200 rounded-xl text-[14px] font-medium text-gray-700 outline-none focus:border-gray-400 transition-all placeholder:text-gray-300 shadow-sm"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[13px] font-bold text-[#2d3748]">Time <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            value={formData.time}
                                            onChange={(e) => handleInputChange('time', e.target.value)}
                                            placeholder="Time in minutes"
                                            className="w-full h-12 px-4 border border-gray-200 rounded-xl text-[14px] font-medium text-gray-700 outline-none focus:border-gray-400 transition-all placeholder:text-gray-300 shadow-sm"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-x-10 gap-y-8">
                                    <div className="space-y-2">
                                        <label className="text-[13px] font-bold text-[#2d3748]">Sorting Order <span className="text-red-500 ml-0.5">*</span></label>
                                        <input
                                            type="text"
                                            value={formData.sortingOrder}
                                            onChange={(e) => handleInputChange('sortingOrder', e.target.value)}
                                            placeholder="0.00"
                                            className="w-full h-12 px-4 border border-gray-200 rounded-xl text-[14px] font-medium text-gray-700 outline-none focus:border-gray-400 transition-all bg-white shadow-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[13px] font-bold text-[#2d3748]">Subjects</label>
                                        <div className="relative group">
                                            <CustomDropdown
                                                options={[
                                                    { value: 'Physics', label: 'Physics' },
                                                    { value: 'Chemistry', label: 'Chemistry' },
                                                    { value: 'Biology', label: 'Biology' },
                                                    { value: 'Mathematics', label: 'Mathematics' },
                                                ]}
                                                value={formData.subject}
                                                accentColor="#1a202c"
                                                onChange={(val: any) => handleInputChange('subject', val)}
                                                placeholder="--Select Subject--"
                                                dropup={true}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[13px] font-bold text-[#2d3748]">Free Flag <span className="text-red-500 ml-0.5">*</span></label>
                                        <div className="flex bg-[#f3f4f6]/50 p-1.5 rounded-[14px] h-12 border border-gray-200">
                                            <button
                                                onClick={() => handleInputChange('freeFlag', 'Paid')}
                                                className={`flex-1 rounded-lg font-bold text-[13px] transition-all ${formData.freeFlag === 'Paid' ? 'bg-[#d1d5db] text-[#1a202c]' : 'text-gray-500'}`}>
                                                Paid
                                            </button>
                                            <button
                                                onClick={() => handleInputChange('freeFlag', 'Free')}
                                                className={`flex-1 rounded-lg font-bold text-[13px] transition-all ${formData.freeFlag === 'Free' ? 'bg-[#d1d5db] text-[#1a202c]' : 'text-gray-500'}`}>
                                                Free
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[13px] font-bold text-[#2d3748]">Export PDF <span className="text-red-500 ml-0.5">*</span></label>
                                        <div className="relative group">
                                            <CustomDropdown
                                                options={[
                                                    { value: 'No', label: 'No' },
                                                    { value: 'Yes', label: 'Yes' },
                                                ]}
                                                value={formData.exportPdf}
                                                accentColor="#1a202c"
                                                onChange={(val: any) => handleInputChange('exportPdf', val)}
                                                placeholder="No"
                                                dropup={true}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="mt-auto shrink-0 bg-[#1a202c] py-6 flex flex-col items-center justify-center -mx-6 -mb-6 relative">
                            {isProcessing ? (
                                <div className="flex flex-col items-center gap-3 animate-pulse">
                                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span className="text-white text-[12px] font-bold uppercase tracking-[2px]">
                                        {statusMessage}
                                    </span>
                                </div>
                            ) : (
                                <button
                                    onClick={handleSubmit}
                                    disabled={!selectedFile}
                                    className={`text-white text-[16px] font-bold hover:opacity-90 transition-all outline-none uppercase tracking-[2px] ${!selectedFile ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    Submit & Process with AI
                                </button>
                            )}
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

export default AddTestPDFBulkDrawer;
