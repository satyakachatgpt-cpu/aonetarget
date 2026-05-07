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
    showToast?: (msg: string, type?: 'success' | 'error') => void;
    globalCreateMode?: boolean;
    selectedBatchIds?: string[];
    setSelectedBatchIds?: (ids: string[]) => void;
    availableCourses?: any[];
}

export const OMRTestDrawer: React.FC<OMRTestDrawerProps> = ({
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
            <DrawerHeader title="Add OMR Test(s)" onClose={onClose} />
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
                            onClick={() => {
                                if (globalCreateMode && selectedBatchIds.length === 0) {
                                    showToast?.('Please select at least one batch', 'error');
                                    return;
                                }
                                onSubmit(selectedTests);
                            }}
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
export { TestDrawer } from './drawers/TestDrawer';

/**
 * 3. ADD QUIZ DRAWER
 */
export { QuizDrawer } from './drawers/QuizDrawer';

/**
 * 4/5/6. UPLOAD DRAWERS (AUDIO, IMAGE, DOCUMENT)
 */
import { FilePreviewItem } from './DrawerSystem';

export { UploadDrawer } from './drawers/UploadDrawer';

import BatchMultiSelect from './course-content/BatchMultiSelect';

/**
 * NEW: VIDEO DRAWER
 */
export const VideoDrawer: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    onSubmit: (data: any) => void; 
    contentMode?: 'free' | 'demo' | 'all';
    globalCreateMode?: boolean;
    selectedBatchIds?: string[];
    setSelectedBatchIds?: (ids: string[]) => void;
    availableCourses?: any[];
    showToast?: (msg: string, type?: 'success' | 'error') => void;
}> = ({ 
    isOpen, 
    onClose, 
    onSubmit, 
    contentMode = 'all',
    globalCreateMode = false,
    selectedBatchIds = [],
    setSelectedBatchIds,
    availableCourses = [],
    showToast
}) => {
    const [mode, setMode] = useState<'link' | 'upload'>('link');
    const [formData, setFormData] = useState({
        title: '',
        link: '',
        status: 'Paid'
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
                status: contentMode === 'demo' || contentMode === 'free' ? 'Free' : 'Paid'
            }));
        };
        loadData();
    }, [isOpen, contentMode]);

    const handleSubmit = async () => {
        if (globalCreateMode && selectedBatchIds.length === 0) {
            showToast?.('Please select at least one batch', 'error');
            return;
        }
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
                status: formData.status
            });
        }

        setFormData({
            title: '',
            link: '',
            status: contentMode === 'demo' || contentMode === 'free' ? 'Free' : 'Paid'
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
                        {/* Batch Multi-Select for Global Mode */}
                        {globalCreateMode && (
                            <BatchMultiSelect 
                                courses={availableCourses}
                                selectedIds={selectedBatchIds}
                                onChange={(ids) => setSelectedBatchIds?.(ids)}
                            />
                        )}

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


                                <div className="space-y-4 pt-4 border-t border-gray-50">
                                    <div className="flex items-center justify-between px-1">
                                        <label className="text-[13px] font-bold text-gray-700">Display Settings</label>
                                    </div>
                                    <div className="space-y-4">
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
                                        ) : (
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
export { LinkDrawer } from './drawers/LinkDrawer';

/**
 * 8. IMPORT CONTENT DRAWER
 */

export const LiveStreamDrawer: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    courses?: any[];
    subjects?: any[];
    fixedCourseId?: string;
    showToast?: (m: string, type?: 'success' | 'error') => void;
    globalCreateMode?: boolean;
    selectedBatchIds?: string[];
    setSelectedBatchIds?: (ids: string[]) => void;
    availableCourses?: any[];
}> = ({ 
    isOpen, onClose, onSubmit, courses = [], subjects = [], 
    fixedCourseId, showToast, globalCreateMode = false, 
    selectedBatchIds = [], setSelectedBatchIds, availableCourses = [] 
}) => {
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
        studyMaterialUrl: '',

        scheduleDate: '',
        scheduleTime: '',
        scheduledAt: ''
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
                studyMaterialUrl: '',
                scheduleDate: '',
                scheduleTime: '',
                scheduledAt: ''
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
                        {/* Batch Multi-Select for Global Mode */}
                        {globalCreateMode && (
                            <BatchMultiSelect 
                                courses={availableCourses}
                                selectedIds={selectedBatchIds}
                                onChange={(ids) => setSelectedBatchIds?.(ids)}
                            />
                        )}

                        <div className="space-y-2">
                            <FormLabel label="Stream Title" required />
                            <FormInput
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Enter title"
                            />
                        </div>

                        <div className="space-y-4 pt-2">
                            <div className="flex items-center justify-between px-1">
                                <label className="text-[13px] font-bold text-gray-700">Schedule (Optional)</label>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Date</label>
                                    <input
                                        type="date"
                                        min={new Date().toISOString().split('T')[0]}
                                        value={formData.scheduleDate}
                                        onChange={(e) => setFormData({ ...formData, scheduleDate: e.target.value })}
                                        className="w-full h-[54px] bg-[#f8fafc] border border-gray-100 rounded-2xl px-4 text-[14px] font-bold outline-none focus:border-blue-400 focus:bg-white transition-all shadow-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Time</label>
                                    <input
                                        type="time"
                                        value={formData.scheduleTime}
                                        onChange={(e) => setFormData({ ...formData, scheduleTime: e.target.value })}
                                        className="w-full h-[54px] bg-[#f8fafc] border border-gray-100 rounded-2xl px-4 text-[14px] font-bold outline-none focus:border-blue-400 focus:bg-white transition-all shadow-sm"
                                    />
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-400 ml-1 italic font-medium">Students will see a countdown until this time.</p>
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


                        {!fixedCourseId && !globalCreateMode && (
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
                                disabled={!formData.title || !formData.streamId || (!formData.courseId && !fixedCourseId && !globalCreateMode) || (globalCreateMode && selectedBatchIds.length === 0)}
                                className={`flex-[1.8] h-[56px] rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all active:scale-[0.98] shadow-lg shadow-gray-200 ${(!formData.title || !formData.streamId || (!formData.courseId && !fixedCourseId && !globalCreateMode) || (globalCreateMode && selectedBatchIds.length === 0)) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[#1a1c1e] text-white hover:bg-black'}`}
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

export { WebinarDrawer } from './drawers/WebinarDrawer';


