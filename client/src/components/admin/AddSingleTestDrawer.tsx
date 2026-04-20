import React, { useState, useEffect, useRef } from 'react';
import { RightSideDrawer, DrawerBody } from './DrawerSystem';
import CustomDropdown from './CustomDropdown';
import RichTextEditor from '../shared/RichTextEditor';

interface AddSingleTestDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    editingTest?: any;
    testSeriesOptions: { value: string; label: string }[];
    defaultTestSeries?: string[];
    showToast?: (m: string, type?: 'success' | 'error') => void;
}

const AddSingleTestDrawer: React.FC<AddSingleTestDrawerProps> = ({
    isOpen,
    onClose,
    onSubmit,
    editingTest,
    testSeriesOptions,
    defaultTestSeries,
    showToast
}) => {
    const [activeTab, setActiveTab] = useState<'Basic' | 'Advanced'>('Basic');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showTermsEditor, setShowTermsEditor] = useState(false);

    // Get current datetime string for min attribute restriction
    const minDateTime = new Date().toISOString().slice(0, 16);

    // Helper to format date for display
    const formatDisplayDate = (dateStr: string) => {
        if (!dateStr) return 'Select date & time';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    };

    // Helper to calculate duration summary
    const getDurationSummary = (start: string, end: string) => {
        const s = new Date(start).getTime();
        const e = new Date(end).getTime();
        if (isNaN(s) || isNaN(e) || e <= s) return null;

        const diff = e - s;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        let parts = [];
        if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
        if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
        if (mins > 0) parts.push(`${mins} minute${mins > 1 ? 's' : ''}`);

        return parts.join(', ');
    };

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        status: 'Free',
        testSeries: [] as string[],
        noOfQuestions: '0',
        totalMarks: '',
        totalDuration: '',
        sortingOrder: '0.00',
        enableSectionSelector: false,
        startDate: '2026-03-09T23:11:38',
        endDate: '2026-03-09T23:11:38',
        // Advanced Fields
        language: 'English',
        translationTitle: '',
        maxAttempts: '-1',
        shuffleQuestions: false,
        shuffleOptions: false,
        displayPause: false,
        allowTestAttempt: true,
        allQuestionCompulsory: false,
        uiType: 'Default',
        testPdf: null as File | null,
        testVideo: null as File | null,
        solutionLink: '',
        enablePartialScoring: false,
        displayTestResults: true,
        displayRank: true,
        showSolution: true,
        showTotalStudents: true,
        showPercentile: true,
        showSolutionsPdf: false,
        isLive: false,
        adminStatus: 'Enable',
        telegramChannelId: '',
        sendTelegramNotice: false,
        marksPerQuestion: '',
        negativeMarking: '',
        termsAndConditions: ''
    });

    const [sections, setSections] = useState([
        { id: Date.now(), section: '', maxQuestions: -1, partTitle: '', cutoff: 0, isOptional: true, fixedTiming: false }
    ]);

    const pdfInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);

    const prevOpenRef = useRef(false);

    useEffect(() => {
        if (isOpen && !prevOpenRef.current) {
            // Drawer just opened - initialize form
            if (editingTest) {
                setFormData({
                    title: editingTest.name || editingTest.title || '',
                    status: editingTest.status === 'active' ? 'Free' : (editingTest.status === 'inactive' ? 'Paid' : 'Free'),
                    testSeries: editingTest.courseId ? [editingTest.courseId] : (editingTest.courseIds || []),
                    noOfQuestions: editingTest.noOfQuestions?.toString() || editingTest.questions?.toString() || '0',
                    totalMarks: editingTest.totalMarks?.toString() || editingTest.marks?.toString() || '',
                    totalDuration: editingTest.duration?.toString() || editingTest.time?.toString() || '',
                    sortingOrder: editingTest.sortBy?.toString() || '0.00',
                    enableSectionSelector: editingTest.enableSectionSelector || false,
                    startDate: editingTest.openDate || editingTest.date || new Date().toISOString().slice(0, 16),
                    endDate: editingTest.closeDate || editingTest.date || new Date().toISOString().slice(0, 16),
                    language: editingTest.language || 'English',
                    translationTitle: editingTest.translationTitle || '',
                    maxAttempts: editingTest.maxAttempts?.toString() || '-1',
                    shuffleQuestions: editingTest.shuffleQuestions || false,
                    shuffleOptions: editingTest.shuffleOptions || false,
                    displayPause: editingTest.displayPause || false,
                    allowTestAttempt: editingTest.allowTestAttempt !== undefined ? editingTest.allowTestAttempt : true,
                    allQuestionCompulsory: editingTest.allQuestionCompulsory || false,
                    uiType: editingTest.uiType || 'Default',
                    testPdf: null,
                    testVideo: null,
                    solutionLink: editingTest.solutionLink || '',
                    enablePartialScoring: editingTest.enablePartialScoring || false,
                    displayTestResults: editingTest.displayTestResults !== undefined ? editingTest.displayTestResults : true,
                    displayRank: editingTest.displayRank !== undefined ? editingTest.displayRank : true,
                    showSolution: editingTest.showSolution !== undefined ? editingTest.showSolution : true,
                    showTotalStudents: editingTest.showTotalStudents !== undefined ? editingTest.showTotalStudents : true,
                    showPercentile: editingTest.showPercentile !== undefined ? editingTest.showPercentile : true,
                    showSolutionsPdf: editingTest.showSolutionsPdf || false,
                    isLive: editingTest.isLive || false,
                    adminStatus: editingTest.adminStatus || 'Enable',
                    telegramChannelId: editingTest.telegramChannelId || '',
                    sendTelegramNotice: editingTest.sendTelegramNotice || false,
                    marksPerQuestion: editingTest.marksPerQuestion?.toString() || '',
                    negativeMarking: editingTest.negativeMarking?.toString() || '',
                    termsAndConditions: editingTest.termsAndConditions || ''
                });
                if (editingTest.sections && Array.isArray(editingTest.sections)) {
                    setSections(editingTest.sections);
                }
            } else {
                // Reset for NEW test
                setFormData({
                    title: '',
                    status: 'Free',
                    testSeries: defaultTestSeries || [],
                    noOfQuestions: '0',
                    totalMarks: '',
                    totalDuration: '',
                    sortingOrder: '0.00',
                    enableSectionSelector: false,
                    startDate: new Date().toISOString().slice(0, 16),
                    endDate: new Date().toISOString().slice(0, 16),
                    language: 'English',
                    translationTitle: '',
                    maxAttempts: '-1',
                    shuffleQuestions: false,
                    shuffleOptions: false,
                    displayPause: false,
                    allowTestAttempt: true,
                    allQuestionCompulsory: false,
                    uiType: 'Default',
                    testPdf: null,
                    testVideo: null,
                    solutionLink: '',
                    enablePartialScoring: false,
                    displayTestResults: true,
                    displayRank: true,
                    showSolution: true,
                    showTotalStudents: true,
                    showPercentile: true,
                    showSolutionsPdf: false,
                    isLive: false,
                    adminStatus: 'Enable',
                    telegramChannelId: '',
                    sendTelegramNotice: false,
                    marksPerQuestion: '',
                    negativeMarking: '',
                    termsAndConditions: ''
                });
                setSections([{ id: Date.now(), section: '', maxQuestions: -1, partTitle: '', cutoff: 0, isOptional: true, fixedTiming: false }]);
            }
        }
        prevOpenRef.current = isOpen;
    }, [isOpen, editingTest, defaultTestSeries]);

    // Removed the redundant second useEffect that was only handling testSeries


    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleFileChange = (field: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        handleInputChange(field, file);
    };

    const updateSection = (id: number, field: string, value: any) => {
        setSections(prev => prev.map(sec => sec.id === id ? { ...sec, [field]: value } : sec));
    };

    const addSection = () => {
        setSections([...sections, { id: Date.now(), section: '', maxQuestions: -1, partTitle: '', cutoff: 0, isOptional: true, fixedTiming: false }]);
    };

    const uiThemes: Record<string, { primary: string; secondary: string }> = {
        'Default': { primary: '#4361EE', secondary: '#F8FAFF' },
        'UI Type 1': { primary: '#00A3FF', secondary: '#F0F9FF' },
        'UI Type 2': { primary: '#8B5CF6', secondary: '#F5F3FF' },
        'UI Type 3': { primary: '#EC4899', secondary: '#FDF2F8' },
        'UI Type 4': { primary: '#1E1E1E', secondary: '#F9FAFB' },
        'UI Type 6': { primary: '#10B981', secondary: '#ECFDF5' },
        'UI Type 7': { primary: '#F59E0B', secondary: '#FFFBEB' },
        'UI Type 8': { primary: '#14B8A6', secondary: '#F0FDFA' },
    };

    const theme = uiThemes[formData.uiType] || uiThemes['Default'];
    
    // Dynamic section options based on test title
    const sectionOptions = [{ value: formData.title || 'Draft Test', label: formData.title || 'Draft Test' }];


    const languages = [
        { value: 'English', label: 'English' },
        { value: 'Hindi', label: 'Hindi' },
        { value: 'Marathi', label: 'Marathi' },
        { value: 'Gujarati', label: 'Gujarati' },
        { value: 'Tamil', label: 'Tamil' },
        { value: 'Telugu', label: 'Telugu' },
        { value: 'Kannada', label: 'Kannada' },
        { value: 'Malayalam', label: 'Malayalam' },
        { value: 'Odia', label: 'Odia' },
        { value: 'Punjabi', label: 'Punjabi' },
        { value: 'Bengali', label: 'Bengali' },
        { value: 'Assamese', label: 'Assamese' },
        { value: 'Urdu', label: 'Urdu' },
        { value: 'Sanskrit', label: 'Sanskrit' },
        { value: 'Kashmiri', label: 'Kashmiri' },
        { value: 'Konkani', label: 'Konkani' },
        { value: 'Sindhi', label: 'Sindhi' },
        { value: 'Maithili', label: 'Maithili' },
        { value: 'Dogri', label: 'Dogri' },
        { value: 'Manipuri', label: 'Manipuri' },
        { value: 'Bodo', label: 'Bodo' },
        { value: 'Santali', label: 'Santali' },
        { value: 'Nepali', label: 'Nepali' }
    ];



    return (
        <RightSideDrawer isOpen={isOpen} onClose={onClose} width="850px">
            <div className="flex flex-col h-full bg-white font-sans overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 shrink-0">
                    <h2 className="text-[17px] font-bold text-[#1e1e1e]">Add Test</h2>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-black transition-colors rounded-full hover:bg-gray-50">
                        <span className="material-symbols-outlined text-[24px]">close</span>
                    </button>
                </div>

                <DrawerBody className="flex-1 overflow-y-auto hide-scrollbar bg-white !p-0">
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
                        {activeTab === 'Basic' && (
                            <>
                                <div className="grid grid-cols-2 gap-x-10 gap-y-8">
                                    {/* Title */}
                                    <div className="space-y-2 col-span-1">
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
                                    <div className="space-y-2 col-span-1">
                                        <label className="text-[13px] font-bold text-[#2d3748]">Status</label>
                                        <div className="flex bg-[#f3f4f6]/50 p-1.5 rounded-[14px] h-12 border border-gray-200">
                                            <button
                                                onClick={() => handleInputChange('status', 'Free')}
                                                className={`flex-1 rounded-lg font-bold text-[13px] transition-all ${formData.status === 'Free' ? 'bg-[#d1d5db] text-[#1a202c]' : 'text-gray-500'}`}>
                                                Free
                                            </button>
                                            <button
                                                onClick={() => handleInputChange('status', 'Paid')}
                                                className={`flex-1 rounded-lg font-bold text-[13px] transition-all ${formData.status === 'Paid' ? 'bg-[#d1d5db] text-[#1a202c]' : 'text-gray-500'}`}>
                                                Paid
                                            </button>
                                        </div>
                                    </div>

                                    {/* Test Instructions */}
                                    <div className="space-y-2 col-span-2">
                                        <label className="text-[13px] font-bold text-[#2d3748]">Test Instructions (Terms and Conditions)<span className="text-red-500 ml-0.5">*</span></label>
                                        {!showTermsEditor ? (
                                            <div className="flex">
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        if (!formData.termsAndConditions) {
                                                            setFormData(prev => ({ 
                                                                ...prev, 
                                                                termsAndConditions: '<ul><li>Ensure you have a stable internet connection before starting the test.</li><li>You must attempt all the questions.</li></ul>' 
                                                            }));
                                                        }
                                                        setShowTermsEditor(true);
                                                    }}
                                                    className={`flex items-center justify-center px-6 h-12 border ${formData.termsAndConditions ? 'border-[#1a202c] bg-gray-50 text-[#1a202c]' : 'border-gray-200 text-[#4a5568] hover:bg-gray-50'} rounded-xl text-[14px] font-bold transition-all shadow-sm`}>
                                                    {formData.termsAndConditions ? 'Edit Terms' : 'Add Terms'}
                                                </button>
                                                {formData.termsAndConditions && (
                                                    <div className="ml-3 flex items-center text-green-600 text-[13px] font-bold bg-green-50 px-3 rounded-lg border border-green-100">
                                                        <span className="material-symbols-outlined text-[18px] mr-1">check_circle</span>
                                                        Terms Added
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
                                                <RichTextEditor
                                                    label=""
                                                    content={formData.termsAndConditions}
                                                    onChange={(val) => handleInputChange('termsAndConditions', val)}
                                                    height="250px"
                                                />
                                                <div className="mt-3 flex gap-2 justify-end">
                                                    <button 
                                                        type="button"
                                                        onClick={() => {
                                                            if (formData.termsAndConditions === '<ul><li>Ensure you have a stable internet connection before starting the test.</li><li>You must attempt all the questions.</li></ul>') {
                                                                handleInputChange('termsAndConditions', '');
                                                            }
                                                            setShowTermsEditor(false);
                                                        }}
                                                        className="px-4 h-10 bg-gray-100 text-gray-600 border border-gray-200 rounded-lg text-[13px] font-bold hover:bg-gray-200 transition-all">
                                                        Cancel
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={() => setShowTermsEditor(false)}
                                                        className="px-6 h-10 bg-[#1a202c] text-white rounded-lg text-[13px] font-bold hover:bg-black transition-all">
                                                        Update Terms
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Test Series */}
                                    <div className="space-y-2 col-span-1">
                                        <label className="text-[13px] font-bold text-[#2d3748]">Test Series<span className="text-red-500 ml-0.5">*</span></label>
                                        <CustomDropdown
                                            isMulti
                                            options={testSeriesOptions}
                                            value={formData.testSeries}
                                            accentColor="#1a202c"
                                            onChange={(val: string[]) => handleInputChange('testSeries', val)}
                                            placeholder={formData.testSeries.length > 0 ? `${formData.testSeries.length} of ${testSeriesOptions.length} selected` : 'Select Test Series'}
                                        />
                                    </div>

                                    {/* Total Marks */}
                                    <div className="space-y-2 col-span-1">
                                        <label className="text-[13px] font-bold text-[#2d3748]">Total Marks (Registered)<span className="text-red-500 ml-0.5">*</span></label>
                                        <input
                                            type="text"
                                            value={formData.totalMarks}
                                            onChange={(e) => handleInputChange('totalMarks', e.target.value)}
                                            placeholder="Sum of all question marks"
                                            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-gray-400 transition-all placeholder:text-gray-300 shadow-sm"
                                        />
                                    </div>

                                    {/* No of Questions */}
                                    <div className="space-y-2 col-span-1">
                                        <label className="text-[13px] font-bold text-[#2d3748]">No. of Questions<span className="text-red-500 ml-0.5">*</span></label>
                                        <input
                                            type="text"
                                            value={formData.noOfQuestions}
                                            onChange={(e) => handleInputChange('noOfQuestions', e.target.value)}
                                            placeholder="Expected total questions"
                                            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-gray-400 transition-all placeholder:text-gray-300 shadow-sm"
                                        />
                                    </div>

                                    {/* Total Duration */}
                                    <div className="space-y-2 col-span-1">
                                        <label className="text-[13px] font-bold text-[#2d3748]">Test Duration (Minutes)<span className="text-red-500 ml-0.5">*</span></label>
                                        <input
                                            type="text"
                                            value={formData.totalDuration}
                                            onChange={(e) => handleInputChange('totalDuration', e.target.value)}
                                            placeholder="Timer duration"
                                            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-gray-400 transition-all placeholder:text-gray-300 shadow-sm"
                                        />
                                    </div>

                                    {/* Marks Per Question */}
                                    <div className="space-y-2 col-span-1">
                                        <label className="text-[13px] font-bold text-[#2d3748]">Marks Per Question (Default)<span className="text-red-500 ml-0.5">*</span></label>
                                        <input
                                            type="text"
                                            value={formData.marksPerQuestion}
                                            onChange={(e) => handleInputChange('marksPerQuestion', e.target.value)}
                                            placeholder="4"
                                            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-gray-400 transition-all placeholder:text-gray-300 shadow-sm"
                                        />
                                    </div>

                                    {/* Negative Marking */}
                                    <div className="space-y-2 col-span-1">
                                        <label className="text-[13px] font-bold text-[#2d3748]">Negative Marking (Default)<span className="text-red-500 ml-0.5">*</span></label>
                                        <input
                                            type="text"
                                            value={formData.negativeMarking}
                                            onChange={(e) => handleInputChange('negativeMarking', e.target.value)}
                                            placeholder="-1"
                                            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-gray-400 transition-all placeholder:text-gray-300 shadow-sm"
                                        />
                                    </div>



                                    {/* Sorting Order */}
                                    <div className="space-y-2 col-span-1">
                                        <label className="text-[13px] font-bold text-[#2d3748]">Sorting Order<span className="text-red-500 ml-0.5">*</span></label>
                                        <input
                                            type="text"
                                            value={formData.sortingOrder}
                                            onChange={(e) => handleInputChange('sortingOrder', e.target.value)}
                                            placeholder="0.00"
                                            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-gray-400 transition-all placeholder:text-gray-300 shadow-sm"
                                        />
                                    </div>
                                </div>

                                <div className="pt-8 border-t border-gray-100">
                                    <h3 className="text-[16px] font-bold text-[#1e1e1e] mb-5">Sections</h3>

                                    <div className="w-full rounded-2xl border border-gray-100 overflow-visible shadow-sm z-10 relative bg-white">
                                        <table className="w-full border-collapse">
                                            <thead>
                                                <tr className="bg-[#f8f9fa] border-b border-gray-100">
                                                    <th className="w-[160px] px-3 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-left">Test Section<span className="text-red-500 ml-0.5">*</span></th>
                                                    <th className="w-[90px] px-3 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Max Questions</th>
                                                    <th className="px-3 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-left">Part Title</th>
                                                    <th className="w-[90px] px-3 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Cutoff Score</th>
                                                    <th className="w-[80px] px-2 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Is Optional</th>
                                                    <th className="w-[90px] px-2 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Fixed Timing</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {sections.map((sec, idx) => (
                                                    <tr key={sec.id} className="hover:bg-gray-50/20 transition-colors">
                                                        <td className="px-2 py-3 w-[160px]">
                                                            <CustomDropdown
                                                                options={sectionOptions}
                                                                value={sec.section}
                                                                accentColor="#1a202c"
                                                                onChange={(val: string) => updateSection(sec.id, 'section', val)}
                                                                placeholder="Select Test Section"
                                                            />
                                                        </td>
                                                        <td className="px-2 py-3 w-[90px]">
                                                            <input
                                                                type="number"
                                                                placeholder="-1"
                                                                value={sec.maxQuestions}
                                                                onChange={(e) => updateSection(sec.id, 'maxQuestions', e.target.value)}
                                                                className="w-full h-10 px-2 border border-gray-200 rounded-xl text-[13px] font-bold text-gray-700 outline-none text-center focus:border-gray-400 transition-all shadow-sm"
                                                            />
                                                        </td>
                                                        <td className="px-2 py-3">
                                                            <input
                                                                type="text"
                                                                value={sec.partTitle}
                                                                placeholder="Part Title"
                                                                onChange={(e) => updateSection(sec.id, 'partTitle', e.target.value)}
                                                                className="w-full h-10 px-3 border border-gray-200 rounded-xl text-[13px] font-medium text-gray-700 outline-none focus:border-gray-400 transition-all shadow-sm"
                                                            />
                                                        </td>
                                                        <td className="px-2 py-3 w-[90px]">
                                                            <input
                                                                type="number"
                                                                placeholder="0"
                                                                value={sec.cutoff}
                                                                onChange={(e) => updateSection(sec.id, 'cutoff', e.target.value)}
                                                                className="w-full h-10 px-2 border border-gray-200 rounded-xl text-[13px] font-bold text-gray-700 outline-none text-center focus:border-gray-400 transition-all shadow-sm"
                                                            />
                                                        </td>
                                                        <td className="px-2 py-3 text-center">
                                                            <div className="flex justify-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={sec.isOptional}
                                                                    onChange={(e) => updateSection(sec.id, 'isOptional', e.target.checked)}
                                                                    className="w-4 h-4 rounded-[4px] border-gray-300 text-[#4361EE] focus:ring-[#4361EE] cursor-pointer"
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="px-2 py-3 text-center">
                                                            <div className="flex justify-center">
                                                                <div
                                                                    onClick={() => updateSection(sec.id, 'fixedTiming', !sec.fixedTiming)}
                                                                    className={`relative inline-flex items-center cursor-pointer w-[34px] h-[18px] rounded-full transition-all duration-300 ${sec.fixedTiming ? 'bg-black' : 'bg-gray-200'}`}
                                                                >
                                                                    <div className={`absolute w-3.5 h-3.5 bg-white rounded-full shadow-md transition-transform duration-300 ${sec.fixedTiming ? 'translate-x-[17px]' : 'translate-x-[1.5px]'}`} />
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="mt-8 flex justify-center">
                                        <button
                                            onClick={addSection}
                                            className="px-8 h-12 border border-gray-200 rounded-xl text-[14px] font-bold text-[#4a5568] hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm">
                                            <span className="material-symbols-outlined text-[20px] font-black">add</span>
                                            Add More
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-10 space-y-10">
                                    <div className="flex items-center justify-between border-t border-gray-100 pt-8">
                                        <div className="space-y-1">
                                            <p className="text-[14px] font-bold text-[#1e1e1e]">Enable Section Selector<span className="text-red-500 ml-0.5">*</span></p>
                                            <p className="text-[12px] text-gray-400 font-medium italic">Switch ON to enable students to choose between optional sections</p>
                                        </div>
                                        <div
                                            onClick={() => handleInputChange('enableSectionSelector', !formData.enableSectionSelector)}
                                            className={`relative inline-flex items-center cursor-pointer w-[44px] h-[24px] rounded-full transition-all duration-300 ${formData.enableSectionSelector ? 'bg-black' : 'bg-gray-200'}`}
                                        >
                                            <div className={`absolute w-5 h-5 bg-white rounded-full shadow-md transition-transform ${formData.enableSectionSelector ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
                                        </div>
                                    </div>

                                    <div className="space-y-6 pt-10 border-t border-gray-100">
                                        <h3 className="text-[16px] font-bold text-[#1e1e1e]">Test Dates</h3>
                                        <div className="grid grid-cols-2 gap-10">
                                            <div className="space-y-3">
                                                <label className="text-[13px] font-bold text-[#2d3748]">Start Date</label>
                                                <div className="relative group ring-1 ring-transparent hover:ring-blue-100 rounded-xl transition-all">
                                                    <div className="w-full h-12 px-4 border border-gray-200 rounded-xl flex items-center justify-between text-[14px] text-gray-900 font-bold bg-white shadow-sm">
                                                        <span>{formatDisplayDate(formData.startDate)}</span>
                                                        <span className="material-symbols-outlined text-gray-400 text-[20px]">calendar_today</span>
                                                    </div>
                                                    <input
                                                        type="datetime-local"
                                                        step="1"
                                                        min={minDateTime}
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
                                                        <span>{formatDisplayDate(formData.endDate)}</span>
                                                        <span className="material-symbols-outlined text-gray-400 text-[20px]">calendar_today</span>
                                                    </div>
                                                    <input
                                                        type="datetime-local"
                                                        step="1"
                                                        min={formData.startDate || minDateTime}
                                                        value={formData.endDate}
                                                        onChange={(e) => handleInputChange('endDate', e.target.value)}
                                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                    />
                                                </div>
                                                <p className="text-[11px] text-gray-400 font-medium italic">Attempts won't be allowed after the selected date and time</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab === 'Advanced' && (
                            <div className="space-y-10">
                                {/* Language and Translation */}
                                <div className="space-y-6">
                                    <h3 className="text-[15px] font-bold text-gray-800">Language and Translation</h3>
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <label className="text-[13px] font-bold text-gray-700">Language</label>
                                            <CustomDropdown
                                                options={languages}
                                                value={formData.language}
                                                accentColor={theme.primary}
                                                onChange={(val) => handleInputChange('language', val)}
                                                placeholder="Select Language"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[13px] font-bold text-gray-700">Translation Test</label>
                                            <input
                                                type="text"
                                                value={formData.translationTitle}
                                                onChange={(e) => handleInputChange('translationTitle', e.target.value)}
                                                placeholder="Enter test title.."
                                                className="w-full h-11 px-4 border border-gray-200 rounded-xl text-[14px] font-medium placeholder:text-gray-300 outline-none transition-all"
                                                style={{ borderColor: formData.translationTitle ? theme.primary : '#E5E7EB' }}
                                                onFocus={(e) => e.target.style.borderColor = theme.primary}
                                                onBlur={(e) => e.target.style.borderColor = formData.translationTitle ? theme.primary : '#E5E7EB'}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Test Attempt Settings */}
                                <div className="space-y-6 pt-6 border-t border-gray-50">
                                    <h3 className="text-[15px] font-bold text-gray-800">Test Attempt Settings</h3>
                                    <div className="space-y-6">
                                        <div className="space-y-2 max-w-[50%]">
                                            <label className="text-[13px] font-bold text-gray-700">Maximum Attempts Allowed</label>
                                            <input
                                                type="text"
                                                value={formData.maxAttempts}
                                                onChange={(e) => handleInputChange('maxAttempts', e.target.value)}
                                                className="w-full h-11 px-4 border border-gray-200 rounded-xl text-[14px] font-medium outline-none"
                                            />
                                            <p className="text-[11px] text-gray-400 italic">Specify the max number of times each user can attempt this test (-1 is unlimited)</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                                            {[
                                                { label: 'Shuffle Questions', sub: 'Switch ON to automatically shuffle the order of questions in the test', key: 'shuffleQuestions' },
                                                { label: 'Shuffle Options', sub: 'Switch ON to automatically shuffle the order of options in the test', key: 'shuffleOptions' },
                                                { label: 'Display Pause Option', sub: 'Switch ON to provide students the ability to pause the timer during the test', key: 'displayPause' },
                                                { label: 'Allow Test Attempt', sub: 'Switch OFF to disable students from retaking the test', key: 'allowTestAttempt' },
                                                { label: 'All Question Compulsory', sub: 'Users can submit the test only when all questions are attempted', key: 'allQuestionCompulsory' }
                                            ].map((item) => (
                                                <div key={item.key} className="flex items-start justify-between">
                                                    <div className="space-y-0.5 pr-4">
                                                        <p className="text-[13.5px] font-bold text-gray-800">{item.label}</p>
                                                        <p className="text-[11px] text-gray-400 font-medium italic leading-tight">{item.sub}</p>
                                                    </div>
                                                    <div
                                                        onClick={() => handleInputChange(item.key, !(formData as any)[item.key])}
                                                        className={`relative inline-flex items-center cursor-pointer w-9 h-5 rounded-full transition-all duration-200 flex-shrink-0 ${(formData as any)[item.key] ? 'bg-[#1e1e1e]' : 'bg-[#e5e7eb]'}`}
                                                    >
                                                        <div className={`absolute w-3.5 h-3.5 bg-white rounded-full shadow-md transition-all duration-200 ${(formData as any)[item.key] ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                                                    </div>
                                                </div>
                                            ))}

                                            <div className="space-y-2">
                                                <label className="text-[13px] font-bold text-gray-700">UI Type</label>
                                                <CustomDropdown
                                                    options={[
                                                        { value: 'Default', label: 'Default' },
                                                        { value: 'UI Type 1', label: 'UI Type 1' },
                                                        { value: 'UI Type 2', label: 'UI Type 2' },
                                                        { value: 'UI Type 3', label: 'UI Type 3' },
                                                        { value: 'UI Type 4', label: 'UI Type 4' },
                                                        { value: 'UI Type 6', label: 'UI Type 6' },
                                                        { value: 'UI Type 7', label: 'UI Type 7' },
                                                        { value: 'UI Type 8', label: 'UI Type 8' }
                                                    ]}
                                                    value={formData.uiType}
                                                    accentColor={theme.primary}
                                                    onChange={(val) => handleInputChange('uiType', val)}
                                                    placeholder="Select UI Type"
                                                />
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <span className="w-1.5 h-1.5 rounded-full transition-colors duration-300" style={{ backgroundColor: theme.primary }}></span>
                                                    <p className="text-[11px] font-bold italic transition-colors duration-300" style={{ color: theme.primary }}>Active Design: {formData.uiType} Perspective Applied</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Test Material */}
                                <div className="space-y-6 pt-6 border-t border-gray-50">
                                    <h3 className="text-[15px] font-bold text-gray-800">Test Material</h3>
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <label className="text-[13px] font-bold text-gray-700">Attach PDF</label>
                                            <input
                                                type="file"
                                                ref={pdfInputRef}
                                                onChange={(e) => handleFileChange('testPdf', e)}
                                                accept=".pdf"
                                                className="hidden"
                                            />
                                            <div className="flex gap-4">
                                                <div className={`w-24 h-24 rounded-xl border border-dashed flex flex-col items-center justify-center gap-1 transition-colors ${formData.testPdf ? 'bg-blue-50 border-blue-200 text-blue-500' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                                                    <span className="material-symbols-outlined text-[24px]">{formData.testPdf ? 'picture_as_pdf' : 'question_mark'}</span>
                                                    <span className="text-[11px] font-bold text-center px-2 truncate w-full">
                                                        {formData.testPdf ? formData.testPdf.name : 'No PDF'}
                                                    </span>
                                                </div>
                                                <div
                                                    onClick={() => pdfInputRef.current?.click()}
                                                    className="flex-1 h-24 bg-white rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center hover:bg-gray-50 transition-all cursor-pointer group"
                                                >
                                                    <p className="text-[13px] font-bold text-gray-800">Upload PDF</p>
                                                    <p className="text-[11px] text-gray-400">Click or Drag & Drop your file here.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Test Result Settings */}
                                <div className="space-y-6 pt-6 border-t border-gray-50">
                                    <h3 className="text-[15px] font-bold text-gray-800">Test Result Settings</h3>
                                    <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                                        {[
                                            { label: 'Enable Partial Scoring', sub: 'Switch ON to award partial marks for partially correct answers', key: 'enablePartialScoring' },
                                            { label: 'Display Test Results', sub: 'Switch ON to display the test result to the participant', key: 'displayTestResults' },
                                            { label: 'Display Rank', sub: 'Switch ON to display rankings of participants as part of the test result', key: 'displayRank' },
                                            { label: 'Show Solution', sub: 'Switch ON to display the solution for each question as part of the test result', key: 'showSolution' },
                                            { label: 'Show Total Students', sub: 'Switch ON to display the total students along with rank on test result analysis', key: 'showTotalStudents' },
                                            { label: 'Show Percentile', sub: 'Switch ON to display the percentile rank as part of test result', key: 'showPercentile' },
                                            { label: 'Show Solutions Image', sub: 'Switch IF you want to display an image as part of test result', key: 'showSolutionsImage' },
                                            { label: 'Show Solutions Video', sub: 'Switch ON to display a video as part of the test result', key: 'showSolutionsVideo' }
                                        ].map((item) => (
                                            <div key={item.key} className="flex items-start justify-between">
                                                <div className="space-y-0.5 pr-4">
                                                    <p className="text-[13.5px] font-bold text-gray-800">{item.label}</p>
                                                    <p className="text-[11px] text-gray-400 font-medium italic leading-tight">{item.sub}</p>
                                                </div>
                                                <div
                                                    onClick={() => handleInputChange(item.key, !(formData as any)[item.key])}
                                                    className={`relative inline-flex items-center cursor-pointer w-9 h-5 rounded-full transition-all duration-200 flex-shrink-0 ${(formData as any)[item.key] ? 'bg-[#1e1e1e]' : 'bg-[#e5e7eb]'}`}
                                                >
                                                    <div className={`absolute w-3.5 h-3.5 bg-white rounded-full shadow-md transition-all duration-200 ${(formData as any)[item.key] ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-2 gap-8 mt-6">
                                        <div className="space-y-2">
                                            <label className="text-[13px] font-bold text-gray-700">Test Solutions Video</label>
                                            <input
                                                type="file"
                                                ref={videoInputRef}
                                                onChange={(e) => handleFileChange('testVideo', e)}
                                                accept="video/*"
                                                className="hidden"
                                            />
                                            <div className="flex gap-4">
                                                <div className={`w-28 h-28 rounded-xl border border-dashed flex flex-col items-center justify-center gap-1 transition-colors ${formData.testVideo ? 'bg-blue-50 border-blue-200 text-blue-500' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                                                    <span className="material-symbols-outlined text-[24px]">{formData.testVideo ? 'movie' : 'videocam_off'}</span>
                                                    <span className="text-[11px] font-bold text-center px-2 truncate w-full">
                                                        {formData.testVideo ? formData.testVideo.name : 'No Video'}
                                                    </span>
                                                </div>
                                                <div
                                                    onClick={() => videoInputRef.current?.click()}
                                                    className="flex-1 h-28 bg-white rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center hover:bg-gray-50 transition-all cursor-pointer group"
                                                >
                                                    <p className="text-[13px] font-bold text-gray-800">Upload Video</p>
                                                    <p className="text-[11px] text-gray-400">Click or Drag & Drop your file here.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 mt-6">
                                        <label className="text-[13px] font-bold text-gray-700">Test Solutions Link</label>
                                        <input
                                            type="text"
                                            value={formData.solutionLink}
                                            onChange={(e) => handleInputChange('solutionLink', e.target.value)}
                                            placeholder="Enter Solution Link"
                                            className="w-full h-11 px-4 border border-gray-200 rounded-xl text-[14px] font-medium placeholder:text-gray-300 outline-none transition-all"
                                            style={{ borderColor: formData.solutionLink ? theme.primary : '#E5E7EB' }}
                                            onFocus={(e) => e.target.style.borderColor = theme.primary}
                                            onBlur={(e) => e.target.style.borderColor = formData.solutionLink ? theme.primary : '#E5E7EB'}
                                        />
                                    </div>

                                    <div className="flex items-start justify-between mt-6">
                                        <div className="space-y-0.5 pr-4">
                                            <p className="text-[13.5px] font-bold text-gray-800">Show Solutions PDF</p>
                                            <p className="text-[11px] text-gray-400 font-medium italic leading-tight">Switch ON to display a PDF as part of the test result</p>
                                        </div>
                                        <div
                                            onClick={() => handleInputChange('showSolutionsPdf', !formData.showSolutionsPdf)}
                                            className={`relative inline-flex items-center cursor-pointer w-9 h-5 rounded-full transition-all duration-200 flex-shrink-0 ${formData.showSolutionsPdf ? 'bg-[#1e1e1e]' : 'bg-[#e5e7eb]'}`}
                                        >
                                            <div className={`absolute w-3.5 h-3.5 bg-white rounded-full shadow-md transition-all duration-200 ${formData.showSolutionsPdf ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                                        </div>
                                    </div>
                                </div>

                                {/* Telegram and Additional Settings */}
                                <div className="space-y-10 pt-6 border-t border-gray-50">
                                    <div className="space-y-6">
                                        <h3 className="text-[15px] font-bold text-gray-800">Telegram Settings</h3>
                                        <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[13px] font-bold text-gray-700">Telegram Channel ID</label>
                                                <input
                                                    type="text"
                                                    value={formData.telegramChannelId}
                                                    onChange={(e) => handleInputChange('telegramChannelId', e.target.value)}
                                                    placeholder="Enter Channel ID"
                                                    className="w-full h-11 px-4 border border-gray-200 rounded-xl text-[14px] font-medium placeholder:text-gray-300 outline-none focus:border-blue-300"
                                                />
                                            </div>
                                            <div className="flex items-center justify-between mt-8">
                                                <p className="text-[13.5px] font-bold text-gray-800">Send Notification</p>
                                                <div
                                                    onClick={() => handleInputChange('sendTelegramNotice', !formData.sendTelegramNotice)}
                                                    className={`relative inline-flex items-center cursor-pointer w-9 h-5 rounded-full transition-all duration-200 flex-shrink-0 ${formData.sendTelegramNotice ? 'bg-[#1e1e1e]' : 'bg-[#e5e7eb]'}`}
                                                >
                                                    <div className={`absolute w-3.5 h-3.5 bg-white rounded-full shadow-md transition-all duration-200 ${formData.sendTelegramNotice ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6 pt-6 border-t border-gray-50">
                                        <h3 className="text-[15px] font-bold text-gray-800">Additional Settings</h3>
                                        <div className="grid grid-cols-2 gap-x-12">
                                            <div className="space-y-2">
                                                <label className="text-[13px] font-bold text-gray-700">Status<span className="text-red-500 ml-0.5">*</span></label>
                                                <div className="flex bg-[#f3f4f6] p-1 rounded-xl h-11 border border-gray-100">
                                                    <button
                                                        onClick={() => handleInputChange('adminStatus', 'Disable')}
                                                        className={`flex-1 rounded-lg font-bold text-[13px] transition-all ${formData.adminStatus === 'Disable' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}>
                                                        Disable
                                                    </button>
                                                    <button
                                                        onClick={() => handleInputChange('adminStatus', 'Enable')}
                                                        className={`flex-1 rounded-lg font-bold text-[13px] transition-all ${formData.adminStatus === 'Enable' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}>
                                                        Enable
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between mt-8">
                                                <p className="text-[13.5px] font-bold text-gray-800">Mark Test as Live</p>
                                                <div
                                                    onClick={() => handleInputChange('isLive', !formData.isLive)}
                                                    className={`relative inline-flex items-center cursor-pointer w-9 h-5 rounded-full transition-all duration-200 flex-shrink-0 ${formData.isLive ? 'bg-[#1e1e1e]' : 'bg-[#e5e7eb]'}`}
                                                >
                                                    <div className={`absolute w-3.5 h-3.5 bg-white rounded-full shadow-md transition-all duration-200 ${formData.isLive ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-center mt-10 pb-8">
                            <button
                                disabled={isSubmitting}
                                onClick={async () => {
                                    if (!formData.title) return showToast?.('Test Title is mandatory!', 'error');
                                    if (formData.testSeries.length === 0) return showToast?.('Select at least one Test Series!', 'error');
                                    if (!formData.totalMarks) return showToast?.('Total Marks is mandatory!', 'error');
                                    if (!formData.marksPerQuestion) return showToast?.('Marks Per Question is mandatory!', 'error');
                                    if (!formData.negativeMarking) return showToast?.('Negative Marking is mandatory!', 'error');
                                    
                                    setIsSubmitting(true);
                                    try {
                                        await onSubmit({ ...formData, sections });
                                    } finally {
                                        setIsSubmitting(false);
                                    }
                                }}
                                className={`w-[240px] h-[54px] bg-[#1a202c] text-white text-[15px] font-bold rounded-2xl transition-all shadow-lg hover:shadow-xl uppercase tracking-[2px] ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-black active:scale-[0.98]'}`}>
                                {isSubmitting ? 'Submitting...' : 'Submit'}
                            </button>
                        </div>
                    </div>
                </DrawerBody>
            </div>

            <style>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                input[type="datetime-local"]::-webkit-calendar-picker-indicator {
                    cursor: pointer;
                    opacity: 0.5;
                }
                input[type="datetime-local"]::-webkit-calendar-picker-indicator:hover {
                    opacity: 1;
                }
            `}</style>
        </RightSideDrawer>
    );
};

export default AddSingleTestDrawer;
