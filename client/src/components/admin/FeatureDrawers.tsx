import React, { useState, useEffect } from 'react';
import {
    RightSideDrawer,
    DrawerHeader,
    DrawerBody,
    DrawerFooter,
    FormLabel,
    FormInput,
    FormSelect,
    UploadArea,
    PrimaryButton
} from './DrawerSystem';
import { useRef } from 'react';
import { coursesAPI, subjectsAPI } from '../../services/apiClient';
import { extractYouTubeId, toYouTubeEmbed } from '../../lib/utils';

/**
 * 1. OMR TEST DRAWER
 */
interface OMRTestDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (tests: any[]) => void;
    testSeriesList: any[];
    isSeriesLoading: boolean;
    onSeriesChange: (seriesId: string) => void;
    availableTests: any[];
    isTestsLoading: boolean;
}

export const OMRTestDrawer: React.FC<OMRTestDrawerProps> = ({
    isOpen,
    onClose,
    onSubmit,
    testSeriesList,
    isSeriesLoading,
    onSeriesChange,
    availableTests,
    isTestsLoading
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
            <DrawerHeader title="Add OMR Test(s)" onClose={onClose} />
            <DrawerBody>
                <div className="space-y-6">
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
                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50/50 border border-blue-100 rounded-full animate-in zoom-in-95 duration-300">
                                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                                            <span className="text-[11px] font-black text-blue-600 uppercase tracking-widest leading-none">
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
                                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
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
                                                    ? 'bg-blue-50/50 border-blue-100'
                                                    : 'hover:bg-gray-50 border-transparent'
                                                    }`}
                                            >
                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${isChecked
                                                    ? 'bg-blue-500 border-blue-500 text-white'
                                                    : 'bg-white border-gray-200'
                                                    }`}>
                                                    {isChecked && <span className="material-symbols-outlined text-[16px] font-bold">check</span>}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className={`text-[14px] font-bold tracking-tight ${isChecked ? 'text-blue-900' : 'text-gray-700'}`}>
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
                            <span className="text-[12px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">
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

                    <div className="flex gap-4 pt-10 pb-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 h-[60px] bg-gray-100 text-gray-700 rounded-2xl font-bold text-[15px] hover:bg-gray-200 transition-all active:scale-[0.98]"
                        >
                            CANCEL
                        </button>
                        <button
                            type="button"
                            onClick={() => onSubmit(selectedTests)}
                            disabled={addedTestIds.length === 0}
                            className={`flex-[2] h-[60px] rounded-2xl font-bold text-[15px] transition-all active:scale-[0.98] shadow-lg ${addedTestIds.length === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[#1a1c1e] text-white hover:bg-black'}`}
                        >
                            SUBMIT
                        </button>
                    </div>
                </div>
            </DrawerBody>
        </RightSideDrawer>
    );
};

/**
 * 2. ADD TEST DRAWER (Regular Tests)
 */
export const TestDrawer: React.FC<OMRTestDrawerProps> = ({
    isOpen,
    onClose,
    onSubmit,
    testSeriesList,
    isSeriesLoading,
    onSeriesChange,
    availableTests,
    isTestsLoading
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
                    onClick={() => onSubmit(selectedTests)}
                    disabled={addedTestIds.length === 0}
                >
                    SUBMIT
                </PrimaryButton>
            </DrawerFooter>
        </RightSideDrawer>
    );
};

/**
 * 3. ADD QUIZ DRAWER
 */
/**
 * 3. ADD QUIZ DRAWER
 */
export const QuizDrawer: React.FC<{ isOpen: boolean; onClose: () => void; onSubmit: (data: any) => void }> = ({ isOpen, onClose, onSubmit }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [quizzes, setQuizzes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Mock load quizzes - in a real app this would be a fetch
            setQuizzes([
                { id: 'q1', title: 'Biology Chapter 1 Quiz', questions: 10 },
                { id: 'q2', title: 'Physics Basics Quiz', questions: 15 },
                { id: 'q3', title: 'Chemistry Foundation Quiz', questions: 12 },
                { id: 'q4', title: 'Mathematics Logic Quiz', questions: 20 },
                { id: 'q5', title: 'Organic Chemistry Mock', questions: 25 },
                { id: 'q6', title: 'NEET Practice Quiz', questions: 30 },
            ]);
        } else {
            setSearchTerm('');
            setSelectedIds([]);
        }
    }, [isOpen]);

    const filteredQuizzes = quizzes.filter(q =>
        q.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleQuiz = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    return (
        <RightSideDrawer isOpen={isOpen} onClose={onClose}>
            <DrawerHeader title="Add Quiz(s)" onClose={onClose} />
            <DrawerBody className="hide-scrollbar">
                <div className="flex flex-col h-full">
                    <div className="flex-1 space-y-6">
                        <div className="space-y-4">
                            <FormLabel label="Select Quizzes" />
                            <div className="relative">
                                <FormInput
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search Quizzes..."
                                    className="pl-11"
                                />
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
                            </div>

                            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1 custom-scrollbar">
                                {filteredQuizzes.length > 0 ? (
                                    filteredQuizzes.map(quiz => (
                                        <div
                                            key={quiz.id}
                                            onClick={() => toggleQuiz(quiz.id)}
                                            className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border ${selectedIds.includes(quiz.id) ? 'bg-indigo-50 border-indigo-100' : 'bg-gray-50/50 border-transparent hover:bg-gray-100'}`}
                                        >
                                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${selectedIds.includes(quiz.id) ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-200'}`}>
                                                {selectedIds.includes(quiz.id) && <span className="material-symbols-outlined text-[14px] text-white">check</span>}
                                            </div>
                                            <div className="flex-1">
                                                <p className={`text-[14px] font-bold ${selectedIds.includes(quiz.id) ? 'text-indigo-900' : 'text-gray-700'}`}>{quiz.title}</p>
                                                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{quiz.questions} Questions</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-24 flex flex-col items-center justify-center text-center opacity-30">
                                        <span className="material-symbols-outlined text-[48px]">search_off</span>
                                        <p className="text-[14px] font-bold mt-2 font-black uppercase tracking-widest">No quizzes found</p>
                                    </div>
                                )}
                            </div>
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
                        onClick={() => onSubmit(selectedIds)}
                        disabled={selectedIds.length === 0}
                        className={`flex-[2] h-[60px] rounded-2xl font-bold text-[15px] transition-all active:scale-[0.98] shadow-lg ${selectedIds.length === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[#1a1c1e] text-white hover:bg-black'}`}
                    >
                        SUBMIT
                    </button>
                </div>
            </div>
        </RightSideDrawer>
    );
};

/**
 * 4/5/6. UPLOAD DRAWERS (AUDIO, IMAGE, DOCUMENT)
 */
import { FilePreviewItem } from './DrawerSystem';

export const UploadDrawer: React.FC<{ isOpen: boolean; onClose: () => void; title: string; subtitle: string; onSubmit: (files: File[]) => void; accept?: string }> = ({ isOpen, onClose, title, subtitle, onSubmit, accept }) => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const handleSubmit = async () => {
        if (selectedFiles.length === 0) return;
        setIsUploading(true);
        // Upload is handled by the parent onSubmit callback
        setIsUploading(false);
        onSubmit(selectedFiles);
        setSelectedFiles([]);
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <RightSideDrawer isOpen={isOpen} onClose={onClose}>
            <DrawerHeader title={title} onClose={onClose} />
            <DrawerBody className="hide-scrollbar">
                <div className="flex flex-col min-h-full">
                    <div className="flex-1 space-y-6">
                        <UploadArea
                            title={subtitle}
                            subtitle="You can select multiple files at once."
                            onFilesSelect={(files) => setSelectedFiles(prev => [...prev, ...files])}
                            accept={accept}
                            multiple={true}
                        />

                        {selectedFiles.length > 0 && (
                            <div className="space-y-3 pt-2">
                                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                    Selected Files ({selectedFiles.length})
                                </p>
                                <div className="space-y-2">
                                    {selectedFiles.map((file, idx) => (
                                        <FilePreviewItem
                                            key={`${file.name}-${idx}`}
                                            file={file}
                                            onRemove={() => removeFile(idx)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4 pt-10 pb-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 h-[60px] bg-gray-100 text-gray-700 rounded-2xl font-bold text-[15px] hover:bg-gray-200 transition-all active:scale-[0.98]"
                        >
                            CANCEL
                        </button>
                        <button
                            type="button"
                            disabled={selectedFiles.length === 0 || isUploading}
                            onClick={handleSubmit}
                            className={`flex-[2] h-[60px] rounded-2xl font-bold text-[15px] transition-all active:scale-[0.98] shadow-lg ${(selectedFiles.length === 0 || isUploading) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[#1a1c1e] text-white hover:bg-black'}`}
                        >
                            {isUploading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    <span>UPLOADING...</span>
                                </div>
                            ) : (
                                `SUBMIT ${selectedFiles.length > 0 ? selectedFiles.length : ''} FILES`
                            )}
                        </button>
                    </div>
                </div>
            </DrawerBody>
        </RightSideDrawer>
    );
};

/**
 * NEW: VIDEO DRAWER
 */
export const VideoDrawer: React.FC<{ isOpen: boolean; onClose: () => void; onSubmit: (data: any) => void; contentMode?: 'free' | 'demo' | 'all' }> = ({ isOpen, onClose, onSubmit, contentMode = 'all' }) => {
    const [mode, setMode] = useState<'link' | 'upload'>('link');
    const [courses, setCourses] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        title: '',
        link: '',
        status: 'Paid',
        isDemo: false,
        courseId: '',
        subjectId: ''
    });
    const [selectedVideos, setSelectedVideos] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [youtubeLinks, setYoutubeLinks] = useState([
        { id: 1, url: '', title: '' }
    ]);

    const addLink = () => {
        setYoutubeLinks(prev => [
            ...prev,
            { id: Date.now(), url: '', title: '' }
        ]);
    };

    const removeLink = (id: number) => {
        if (youtubeLinks.length === 1) return;
        setYoutubeLinks(prev => prev.filter(link => link.id !== id));
    };

    const updateLink = (id: number, field: string, value: string) => {
        setYoutubeLinks(prev => prev.map(link =>
            link.id === id ? { ...link, [field]: value } : link
        ));
    };

    useEffect(() => {
        const loadData = () => {
            if (!isOpen) return;

            // Set defaults based on contentMode
            setFormData(prev => ({
                ...prev,
                status: contentMode === 'demo' || contentMode === 'free' ? 'Free' : 'Paid',
                isDemo: contentMode === 'demo'
            }));

            coursesAPI.getAll().then(res => {
                const list = Array.isArray(res) ? res : (res?.data || []);
                setCourses(list);
            }).catch(e => console.error("VideoDrawer: courses fetch error:", e));

            subjectsAPI.getAll().then(res => {
                const list = Array.isArray(res) ? res : (res?.data || []);
                setSubjects(list);
            }).catch(e => console.error("VideoDrawer: subjects fetch error:", e));
        };
        loadData();
    }, [isOpen, contentMode]);

    const handleSubmit = async () => {
        if (mode === 'link' && !formData.link) return;
        if (mode === 'upload' && selectedVideos.length === 0) return;

        setIsUploading(true);
        // Simulate progress/validation if needed
        await new Promise(resolve => setTimeout(resolve, 800));
        setIsUploading(false);

        if (mode === 'link') {
            onSubmit(formData);
        } else {
            // Validate links
            const hasInvalid = youtubeLinks.some(l => l.url.trim() !== '' && !extractYouTubeId(l.url));
            if (hasInvalid) {
                alert('Please fix invalid YouTube links before submitting');
                setIsUploading(false);
                return;
            }

            const validLinks = youtubeLinks.filter(l => l.url.trim() !== '');
            if (validLinks.length === 0) {
                alert('Please add at least one YouTube link');
                setIsUploading(false);
                return;
            }

            onSubmit({
                youtubeLinks: validLinks,
                courseId: formData.courseId,
                subjectId: formData.subjectId,
                status: formData.status,
                isDemo: formData.isDemo
            });
        }

        setFormData({
            title: '',
            link: '',
            status: contentMode === 'demo' || contentMode === 'free' ? 'Free' : 'Paid',
            isDemo: contentMode === 'demo',
            courseId: '',
            subjectId: ''
        });
        setSelectedVideos([]);
        setYoutubeLinks([{ id: 1, url: '', title: '' }]);
    };

    return (
        <RightSideDrawer isOpen={isOpen} onClose={onClose}>
            <DrawerHeader title="Add Video(s)" onClose={onClose} />
            <DrawerBody className="hide-scrollbar">
                <div className="flex flex-col min-h-full">
                    <div className="flex-1 space-y-7 py-2">
                        {/* Mode Switch */}
                        <div className="flex bg-[#f8fafc] p-1.5 rounded-2xl border border-gray-100/50">
                            <button
                                onClick={() => setMode('link')}
                                className={`flex-1 py-3 text-[13px] font-black uppercase tracking-wider rounded-xl transition-all ${mode === 'link' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
                            >
                                Link
                            </button>
                            <button
                                onClick={() => setMode('upload')}
                                className={`flex-1 py-3 text-[13px] font-black uppercase tracking-wider rounded-xl transition-all ${mode === 'upload' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
                            >
                                Multiple Links
                            </button>
                        </div>

                        {mode === 'link' ? (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <FormLabel label="Video Title" required />
                                    <FormInput
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="Enter title"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <FormLabel label="YouTube / Video Link" required />
                                    <FormInput
                                        value={formData.link}
                                        onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                                        placeholder="https://youtube.com/..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <FormLabel label="Select Product" required />
                                        <FormSelect
                                            value={formData.courseId}
                                            onChange={(val) => setFormData({ ...formData, courseId: val })}
                                            options={[
                                                { value: '', label: 'Select Course' },
                                                ...courses.map(c => ({ value: c.id || c._id, label: c.name || c.title }))
                                            ]}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <FormLabel label="Select Subject" required />
                                        <FormSelect
                                            value={formData.subjectId}
                                            onChange={(val) => setFormData({ ...formData, subjectId: val })}
                                            options={[
                                                { value: '', label: 'Select Subject' },
                                                ...subjects.map(s => ({ value: s.id || s._id, label: s.name || s.title }))
                                            ]}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-gray-50">
                                    <div className="flex items-center justify-between px-1">
                                        <label className="text-[13px] font-bold text-gray-700">Display Settings</label>
                                    </div>
                                    <div className={(contentMode === 'demo' || contentMode === 'free') ? "space-y-4" : "grid grid-cols-2 gap-4"}>
                                        {/* Access Type / Level */}
                                        {contentMode === 'free' ? (
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Access Type</label>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, status: formData.status === 'Free' ? 'Paid' : 'Free' })}
                                                    className={`w-full h-[54px] rounded-2xl border-2 transition-all flex items-center justify-center gap-2 ${formData.status === 'Free' ? 'bg-green-50 border-green-500 text-green-700 shadow-sm' : 'bg-white border-gray-100 text-gray-400'}`}
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">{formData.status === 'Free' ? 'check_circle' : 'circle'}</span>
                                                    <span className="text-[13px] font-bold uppercase tracking-tight">Free Content</span>
                                                </button>
                                            </div>
                                        ) : contentMode === 'demo' ? null : (
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Access Level</label>
                                                <div className="flex bg-[#f8fafc] p-1 rounded-2xl border border-gray-100 h-[54px]">
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, status: 'Free' })}
                                                        className={`flex-1 text-[13px] font-bold rounded-xl transition-all ${formData.status === 'Free' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
                                                    >
                                                        Free
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, status: 'Paid' })}
                                                        className={`flex-1 text-[13px] font-bold rounded-xl transition-all ${formData.status === 'Paid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
                                                    >
                                                        Paid
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Demo Toggle */}
                                        {(contentMode === 'demo' || contentMode === 'all') && (
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Show in Demos</label>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, isDemo: !formData.isDemo })}
                                                    className={`w-full h-[54px] rounded-2xl border-2 transition-all flex items-center justify-center gap-2 ${formData.isDemo ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-gray-100 text-gray-400'}`}
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">{formData.isDemo ? 'check_circle' : 'circle'}</span>
                                                    <span className="text-[13px] font-bold uppercase tracking-tight">Demo Lesson</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    {youtubeLinks.map((link, index) => (
                                        <div key={link.id} className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50 space-y-3 relative group">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                    Video {index + 1}
                                                </span>
                                                {youtubeLinks.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeLink(link.id)}
                                                        className="text-red-400 hover:text-red-600 transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">close</span>
                                                    </button>
                                                )}
                                            </div>

                                            <div className="space-y-1">
                                                <input
                                                    type="text"
                                                    placeholder="Video Title (optional)"
                                                    value={link.title}
                                                    onChange={(e) => updateLink(link.id, 'title', e.target.value)}
                                                    className="w-full h-11 bg-white border border-gray-100 rounded-xl px-4 text-[13px] font-bold outline-none focus:border-blue-400 transition-all"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <input
                                                    type="text"
                                                    placeholder="YouTube URL: https://youtube.com/..."
                                                    value={link.url}
                                                    onChange={(e) => updateLink(link.id, 'url', e.target.value)}
                                                    className={`w-full h-11 bg-white border rounded-xl px-4 text-[13px] font-bold outline-none transition-all ${link.url ? (extractYouTubeId(link.url) ? 'border-green-100 focus:border-green-400' : 'border-red-100 focus:border-red-400') : 'border-gray-100 focus:border-blue-400'}`}
                                                />
                                                {link.url && (
                                                    <div className="flex items-center gap-1.5 ml-1">
                                                        {extractYouTubeId(link.url) ? (
                                                            <>
                                                                <span className="material-symbols-outlined text-green-500 text-[14px]">check_circle</span>
                                                                <span className="text-[10px] font-bold text-green-600 uppercase tracking-tight">Valid YouTube Link</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span className="material-symbols-outlined text-red-500 text-[14px]">error</span>
                                                                <span className="text-[10px] font-bold text-red-600 uppercase tracking-tight">Invalid YouTube URL</span>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    <button
                                        type="button"
                                        onClick={addLink}
                                        className="w-full h-[70px] border-2 border-dashed border-gray-100 rounded-2xl flex items-center justify-center gap-3 text-gray-400 hover:border-blue-200 hover:text-blue-500 hover:bg-blue-50/30 transition-all group"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-blue-100 transition-all">
                                            <span className="material-symbols-outlined text-[20px]">add</span>
                                        </div>
                                        <span className="text-[13px] font-black uppercase tracking-widest">Add Another Video</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-4 pt-10 pb-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 h-[60px] bg-gray-100 text-gray-700 rounded-2xl font-bold text-[15px] hover:bg-gray-200 transition-all active:scale-[0.98]"
                        >
                            CANCEL
                        </button>
                        <button
                            type="button"
                            disabled={isUploading || (mode === 'link' && !formData.link) || (mode === 'upload' && youtubeLinks.filter(l => l.url.trim() !== '').length === 0)}
                            onClick={handleSubmit}
                            className={`flex-[2] h-[60px] rounded-2xl font-bold text-[15px] transition-all active:scale-[0.98] shadow-lg ${(isUploading || (mode === 'link' && !formData.link) || (mode === 'upload' && youtubeLinks.filter(l => l.url.trim() !== '').length === 0)) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[#1a1c1e] text-white hover:bg-black'}`}
                        >
                            {isUploading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    <span>PROCESSING...</span>
                                </div>
                            ) : (
                                "SUBMIT VIDEO(S)"
                            )}
                        </button>
                    </div>
                </div>
            </DrawerBody>
        </RightSideDrawer>
    );
};

/**
 * 7. ADD LINK DRAWER
 */
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
            <DrawerBody className="px-8 py-8">
                <div className="space-y-7">
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

/**
 * 8. IMPORT CONTENT DRAWER
 */
export const ImportContentDrawer: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    courses: any[];
    onSourceChange: (sourceId: string) => void;
    importItems: any[];
    isLoading: boolean;
    selectedItems: string[];
    onSelectItem: (id: string) => void;
    onSelectAll: (checked: boolean) => void;
    onSubmit: (action: 'move' | 'copy') => void;
}> = ({
    isOpen,
    onClose,
    courses,
    onSourceChange,
    importItems,
    isLoading,
    selectedItems,
    onSelectItem,
    onSelectAll,
    onSubmit
}) => {
        const [importSearch, setImportSearch] = useState('');
        const [localSource, setLocalSource] = useState('');

        const filteredItems = importItems.filter(item =>
            (item.title || item.name || '').toLowerCase().includes(importSearch.toLowerCase())
        );

        const getIcon = (type: string, title: string) => {
            const lowTitle = title.toLowerCase();
            if (type === 'folder') return 'folder';
            if (lowTitle.includes('test') || type === 'test') return 'assignment';
            if (lowTitle.includes('video') || type === 'video') return 'videocam';
            return 'description';
        };

        return (
            <RightSideDrawer isOpen={isOpen} onClose={onClose} width="480px">
                <DrawerHeader title="Import Content" onClose={onClose} />
                <DrawerBody className="p-0">
                    <div className="px-8 py-8 space-y-8">
                        {/* Source Course Selection */}
                        <div className="space-y-2">
                            <FormLabel label="Source" required />
                            <FormSelect
                                value={localSource}
                                onChange={(val) => {
                                    setLocalSource(val);
                                    onSourceChange(val);
                                }}
                                options={[
                                    { value: '', label: 'Select Course' },
                                    ...(courses || []).map(c => ({
                                        value: c._id || c.id,
                                        label: c.name || c.title
                                    }))
                                ]}
                            />
                        </div>

                        {/* Content List Section */}
                        {localSource && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[14px] font-bold text-gray-700 tracking-tight">Course Content</h4>
                                    <div className="relative w-[180px]">
                                        <input
                                            type="text"
                                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-[13px] font-medium outline-none focus:border-blue-400 transition-all"
                                            placeholder="Search"
                                            value={importSearch}
                                            onChange={(e) => setImportSearch(e.target.value)}
                                        />
                                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
                                    </div>
                                </div>

                                {isLoading ? (
                                    <div className="py-20 flex flex-col items-center justify-center gap-3">
                                        <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                                        <span className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">Fetching...</span>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {/* Select All */}
                                        <div className="flex items-center justify-between pb-2 border-b border-gray-50">
                                            <span className="text-[13px] font-bold text-gray-400">Select all</span>
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-gray-300 text-blue-600 accent-blue-600 cursor-pointer"
                                                checked={importItems.length > 0 && selectedItems.length === importItems.length}
                                                onChange={(e) => onSelectAll(e.target.checked)}
                                            />
                                        </div>

                                        {/* Items List */}
                                        <div className="space-y-0.5 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
                                            {filteredItems.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="flex items-center justify-between py-3.5 px-2 cursor-pointer group hover:bg-gray-50 rounded-xl transition-all"
                                                    onClick={() => onSelectItem(item.id)}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-[#f8fafc] rounded-xl flex items-center justify-center shrink-0 border border-gray-100/50">
                                                            <span className="material-symbols-outlined text-[20px] text-gray-400">
                                                                {getIcon(item.type, item.title || item.name)}
                                                            </span>
                                                        </div>
                                                        <span className="text-[14px] font-bold text-gray-700 tracking-tight">{item.title || item.name}</span>
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                                                        checked={selectedItems.includes(item.id)}
                                                        readOnly
                                                    />
                                                </div>
                                            ))}
                                            {filteredItems.length === 0 && (
                                                <div className="py-20 text-center opacity-30">
                                                    <span className="material-symbols-outlined text-[48px]">search_off</span>
                                                    <p className="text-[14px] font-bold mt-2">No matching items</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        {!localSource && (
                            <div className="py-32 flex flex-col items-center justify-center text-center opacity-20">
                                <span className="material-symbols-outlined text-[64px] mb-4">move_to_inbox</span>
                                <p className="text-[15px] font-bold tracking-tight">Select a course to see content</p>
                            </div>
                        )}
                    </div>
                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-10 pb-6 px-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 h-[60px] bg-gray-100 text-gray-700 rounded-2xl font-bold text-[14px] hover:bg-gray-200 transition-all active:scale-[0.98]"
                        >
                            CANCEL
                        </button>
                        <button
                            disabled={selectedItems.length === 0}
                            onClick={() => onSubmit('move')}
                            className={`flex-[1.5] h-[60px] rounded-2xl text-[14px] font-bold transition-all border flex items-center justify-center gap-2 ${selectedItems.length > 0
                                ? 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 shadow-sm active:scale-[0.98]'
                                : 'bg-gray-50 text-gray-300 border-transparent cursor-not-allowed'
                                }`}
                        >
                            <span className="material-symbols-outlined text-[18px]">folder_managed</span>
                            MOVE
                        </button>
                        <button
                            disabled={selectedItems.length === 0}
                            onClick={() => onSubmit('copy')}
                            className={`flex-[1.5] h-[60px] rounded-2xl text-[14px] font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${selectedItems.length > 0
                                ? 'bg-[#1a1c1e] text-white hover:bg-black active:scale-[0.98]'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            <span className="material-symbols-outlined text-[18px]">content_copy</span>
                            COPY
                        </button>
                    </div>
                </DrawerBody>
            </RightSideDrawer>
        );
    };
/**
 * 9. LIVE STREAM DRAWER
 */
export const LiveStreamDrawer: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    courses?: any[];
    subjects?: any[];
    fixedCourseId?: string;
}> = ({ isOpen, onClose, onSubmit, courses = [], subjects = [], fixedCourseId }) => {
    const [formData, setFormData] = useState({
        title: '',
        streamSource: 'YouTube',
        streamId: '',
        courseId: '',
        pdf1: null as File | null,
        pdf2: null as File | null,
        studyMaterial: null as File | null,
        pdf1Url: '',
        pdf2Url: '',
        studyMaterialUrl: ''
    });

    useEffect(() => {
        if (!isOpen) {
            setFormData({
                title: '',
                streamSource: 'YouTube',
                streamId: '',
                courseId: fixedCourseId || '',
                pdf1: null,
                pdf2: null,
                studyMaterial: null,
                pdf1Url: '',
                pdf2Url: '',
                studyMaterialUrl: ''
            });
        }
    }, [isOpen, fixedCourseId]);

    const handleFileChange = (field: string, file: File) => {
        setFormData(prev => ({ ...prev, [field]: file }));
    };

    return (
        <RightSideDrawer isOpen={isOpen} onClose={onClose}>
            <DrawerHeader title="Schedule Live Stream" onClose={onClose} />
            <DrawerBody className="hide-scrollbar">
                <div className="flex flex-col min-h-full">
                    <div className="flex-1 space-y-7 py-2">
                        <div className="space-y-2">
                            <FormLabel label="Stream Title" required />
                            <FormInput
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Enter title"
                            />
                        </div>

                        <div className="space-y-2">

                        </div>

                        <div className="space-y-2">
                            <FormLabel label="Stream Source" />
                            <FormSelect
                                value={formData.streamSource}
                                onChange={(val) => setFormData({ ...formData, streamSource: val })}
                                options={[
                                    { value: 'YouTube', label: 'YouTube Live' },
                                    { value: 'Standard', label: 'Standard HLS' },
                                    { value: 'Zoom', label: 'Zoom Meeting' }
                                ]}
                            />
                        </div>

                        <div className="space-y-2">
                            <FormLabel label="YouTube URL / Stream Link" required />
                            <FormInput
                                value={formData.streamId}
                                onChange={(e) => setFormData({ ...formData, streamId: e.target.value })}
                                placeholder="https://www.youtube.com/live/abc123 or watch?v=..."
                            />
                            {formData.streamId && (
                                <p className="text-[11px] text-gray-400 ml-1 flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[14px]">
                                        {formData.streamId.includes('/live/') || formData.streamId.includes('youtube.com/live') ? 'sensors' : 'play_circle'}
                                    </span>
                                    {formData.streamId.includes('/live/') || formData.streamId.includes('youtube.com/live')
                                        ? 'YouTube Live URL detected — will open directly for students'
                                        : 'Normal video URL detected — will play in custom player'}
                                </p>
                            )}
                        </div>

                        {!fixedCourseId && (
                            <div className="space-y-2">
                                <FormLabel label="Select Batch" required />
                                <FormSelect
                                    value={formData.courseId}
                                    onChange={(val) => setFormData({ ...formData, courseId: val })}
                                    options={[
                                        { value: '', label: 'Select Batch' },
                                        ...courses.map(c => ({ value: c.id || c._id, label: c.name || c.title }))
                                    ]}
                                />
                            </div>
                        )}

                        <div className="pt-2">
                            <h3 className="text-[14px] font-black text-gray-800 uppercase tracking-tight mb-6">Additional Content</h3>
                            
                            <div className="space-y-8">
                                {/* Attach PDF 1 */}
                                <div className="space-y-3">
                                    <FormLabel label="Attach PDF" />
                                    <div className="grid grid-cols-[130px_1fr] gap-4 items-start">
                                        <div className="h-[130px] bg-[#ececec] rounded-3xl flex flex-col items-center justify-center p-4 text-center transition-all">
                                            <span className={`material-symbols-outlined text-[36px] mb-3 ${formData.pdf1 ? 'text-blue-600' : 'text-gray-500'}`}>
                                                {formData.pdf1 ? 'description' : 'unknown_document'}
                                            </span>
                                            <span className="text-[14px] font-bold text-gray-700 truncate w-full">
                                                {formData.pdf1 ? formData.pdf1.name : 'No PDF'}
                                            </span>
                                        </div>
                                        <div 
                                            onClick={() => {
                                                const input = document.createElement('input');
                                                input.type = 'file';
                                                input.accept = '.pdf';
                                                input.onchange = (e) => {
                                                    const f = (e.target as HTMLInputElement).files?.[0];
                                                    if (f) handleFileChange('pdf1', f);
                                                };
                                                input.click();
                                            }}
                                            className="h-[130px] border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center p-4 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer group"
                                        >
                                            <div className="w-10 h-10 bg-[#f8fafc] rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                                <span className="material-symbols-outlined text-[20px] text-gray-400 group-hover:text-blue-500">upload_file</span>
                                            </div>
                                            <h4 className="text-[13px] font-bold text-gray-400 group-hover:text-gray-900 tracking-tight">Upload PDF</h4>
                                            <span className="text-[9px] font-medium text-gray-300 text-center leading-tight">Click or Drag & Drop your file here.</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Attach PDF 2 */}
                                <div className="space-y-3">
                                    <FormLabel label="Attach PDF" />
                                    <div className="grid grid-cols-[130px_1fr] gap-4 items-start">
                                        <div className="h-[130px] bg-[#ececec] rounded-3xl flex flex-col items-center justify-center p-4 text-center transition-all">
                                            <span className={`material-symbols-outlined text-[36px] mb-3 ${formData.pdf2 ? 'text-blue-600' : 'text-gray-500'}`}>
                                                {formData.pdf2 ? 'description' : 'unknown_document'}
                                            </span>
                                            <span className="text-[14px] font-bold text-gray-700 truncate w-full">
                                                {formData.pdf2 ? formData.pdf2.name : 'No PDF'}
                                            </span>
                                        </div>
                                        <div 
                                            onClick={() => {
                                                const input = document.createElement('input');
                                                input.type = 'file';
                                                input.accept = '.pdf';
                                                input.onchange = (e) => {
                                                    const f = (e.target as HTMLInputElement).files?.[0];
                                                    if (f) handleFileChange('pdf2', f);
                                                };
                                                input.click();
                                            }}
                                            className="h-[130px] border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center p-4 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer group"
                                        >
                                            <div className="w-10 h-10 bg-[#f8fafc] rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                                <span className="material-symbols-outlined text-[20px] text-gray-400 group-hover:text-blue-500">upload_file</span>
                                            </div>
                                            <h4 className="text-[13px] font-bold text-gray-400 group-hover:text-gray-900 tracking-tight">Upload PDF</h4>
                                            <span className="text-[9px] font-medium text-gray-300 text-center leading-tight">Click or Drag & Drop your file here.</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Study Material */}
                                <div className="space-y-3">
                                    <FormLabel label="Study Material" />
                                    <div className="grid grid-cols-[130px_1fr] gap-4 items-start">
                                        <div className="h-[130px] bg-[#ececec] rounded-3xl flex flex-col items-center justify-center p-4 text-center transition-all">
                                            <span className={`material-symbols-outlined text-[36px] mb-3 ${formData.studyMaterial ? 'text-blue-600' : 'text-gray-500'}`}>
                                                {formData.studyMaterial ? 'article' : 'unknown_document'}
                                            </span>
                                            <span className="text-[14px] font-bold text-gray-700 truncate w-full">
                                                {formData.studyMaterial ? formData.studyMaterial.name : 'No File'}
                                            </span>
                                        </div>
                                        <div 
                                            onClick={() => {
                                                const input = document.createElement('input');
                                                input.type = 'file';
                                                input.accept = '.pdf';
                                                input.onchange = (e) => {
                                                    const f = (e.target as HTMLInputElement).files?.[0];
                                                    if (f) handleFileChange('studyMaterial', f);
                                                };
                                                input.click();
                                            }}
                                            className="h-[130px] border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center p-4 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer group"
                                        >
                                            <div className="w-10 h-10 bg-[#f8fafc] rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                                <span className="material-symbols-outlined text-[20px] text-gray-400 group-hover:text-blue-500">upload_file</span>
                                            </div>
                                            <h4 className="text-[13px] font-bold text-gray-400 group-hover:text-gray-900 tracking-tight">Upload File</h4>
                                            <span className="text-[9px] font-medium text-gray-300 text-center leading-tight">Click or Drag & Drop your file here.</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-10 pb-6 mt-10">
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 h-[56px] bg-gray-50 text-gray-400 border border-gray-100 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-gray-100 transition-all active:scale-[0.98]"
                            >
                                CANCEL
                            </button>
                            <button
                                type="button"
                                onClick={() => onSubmit(formData)}
                                disabled={!formData.title || !formData.streamId || !formData.courseId}
                                className={`flex-[1.8] h-[56px] rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all active:scale-[0.98] shadow-lg shadow-gray-200 ${(!formData.title || !formData.streamId || !formData.courseId) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[#1a1c1e] text-white hover:bg-black'}`}
                            >
                                SCHEDULE STREAM
                            </button>
                        </div>
                    </div>
                </div>
            </DrawerBody>
        </RightSideDrawer>
    );
};
// 10. WEBINAR DRAWER
export const WebinarDrawer: React.FC<{ isOpen: boolean; onClose: () => void; onSubmit: (data: any) => void }> = ({ isOpen, onClose, onSubmit }) => {
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
            <DrawerBody className="px-8 py-8">
                <div className="space-y-7">
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
                        onClick={() => onSubmit(formData)}
                        className="flex-[2] h-[60px] bg-[#1a1c1e] text-white rounded-2xl font-bold text-[15px] hover:bg-black transition-all shadow-lg active:scale-[0.98]"
                    >
                        CONNECT WEBINAR
                    </button>
                </div>
            </div>
        </RightSideDrawer>
    );
};

