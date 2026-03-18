import React, { useState, useEffect, useRef } from 'react';
import { RightSideDrawer, DrawerHeader, DrawerBody, DrawerFooter, PrimaryButton } from './DrawerSystem';
import FileUploadButton from '../shared/FileUploadButton';

interface AddVideoDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    editingVideo?: any;
}

const AddVideoDrawer: React.FC<AddVideoDrawerProps> = ({
    isOpen,
    onClose,
    onSubmit,
    editingVideo
}) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        youtubeUrl: '',
        videoUrl: '',
        duration: '',
        status: 'Paid',
        order: '0',
        isDemo: false
    });

    const [showAdvanced, setShowAdvanced] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadProgress(0);

        const xhr = new XMLHttpRequest();
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percent = Math.round((event.loaded / event.total) * 100);
                setUploadProgress(percent);
            }
        };

        xhr.onload = () => {
            if (xhr.status === 200) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    
                    // Automatically extract video duration
                    const tempVideo = document.createElement('video');
                    tempVideo.preload = 'metadata';
                    tempVideo.onloadedmetadata = function() {
                        const totalSeconds = Math.round(tempVideo.duration);
                        const mins = Math.floor(totalSeconds / 60);
                        const secs = totalSeconds % 60;
                        const durationStr = `${mins}m ${secs}s`;
                        
                        setFormData(prev => ({ 
                            ...prev, 
                            videoUrl: data.url, 
                            youtubeUrl: '',
                            duration: durationStr 
                        }));
                        setIsUploading(false);
                    };
                    tempVideo.onerror = function() {
                        // Fallback if metadata loading fails
                        setFormData(prev => ({ ...prev, videoUrl: data.url, youtubeUrl: '' }));
                        setIsUploading(false);
                    };
                    tempVideo.src = data.url;
                } catch (error) {
                    console.error('Error parsing response:', error);
                    alert('Upload failed: Invalid response from server');
                    setIsUploading(false);
                }
            } else {
                alert(`Upload failed: ${xhr.statusText}`);
                setIsUploading(false);
            }
            setUploadProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = '';
        };

        xhr.onerror = () => {
            alert('Network error occurred during upload');
            setIsUploading(false);
            setUploadProgress(0);
        };

        xhr.open('POST', '/api/upload', true);
        xhr.send(formDataUpload);
    };

    useEffect(() => {
        if (isOpen) {
            if (editingVideo) {
                setFormData({
                    title: editingVideo.title || '',
                    description: editingVideo.description || '',
                    youtubeUrl: editingVideo.youtubeUrl || '',
                    videoUrl: editingVideo.videoUrl || '',
                    duration: editingVideo.duration || '',
                    status: editingVideo.isFree ? 'Free' : 'Paid',
                    order: editingVideo.order?.toString() || '0',
                    isDemo: editingVideo.isDemo === true || editingVideo.isDemo === 'true' || editingVideo.isDemo === 1
                });
            } else {
                setFormData({
                    title: '',
                    description: '',
                    youtubeUrl: '',
                    videoUrl: '',
                    duration: '',
                    status: 'Paid',
                    order: '0',
                    isDemo: false
                });
            }
        }
    }, [isOpen, editingVideo]);

    const extractYouTubeId = (url: string): string => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : '';
    };

    const youtubeId = extractYouTubeId(formData.youtubeUrl);

    return (
        <RightSideDrawer isOpen={isOpen} onClose={onClose} width="500px">
            <DrawerHeader title={editingVideo ? `Edit Video (#${editingVideo._id || editingVideo.id || 'NEW'})` : 'Add Video'} onClose={onClose} />
            <DrawerBody className="bg-[#fcfcfc]">
                <div className="space-y-8 pb-10">
                    {/* Title */}
                    <div className="space-y-2">
                        <label className="text-[13px] font-bold text-gray-700 ml-1">Video Title <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            placeholder="Enter video title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full h-[54px] px-5 border border-gray-200 rounded-2xl text-[15px] font-medium outline-none focus:border-blue-500 transition-all placeholder:text-gray-300 bg-white shadow-sm"
                        />
                    </div>

                    {/* YouTube URL / Video Upload */}
                    {!formData.videoUrl && !isUploading && (
                        <div className="space-y-2">
                            <label className="text-[13px] font-bold text-gray-700 ml-1">YouTube URL <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                placeholder="https://youtube.com/watch?v=..."
                                value={formData.youtubeUrl}
                                onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
                                className="w-full h-[54px] px-5 border border-gray-200 rounded-2xl text-[15px] font-medium outline-none focus:border-blue-500 transition-all placeholder:text-gray-300 bg-white shadow-sm"
                            />
                            {youtubeId && (
                                <div className="mt-4 aspect-video bg-black rounded-2xl overflow-hidden shadow-lg border-2 border-white/10 ring-1 ring-gray-100">
                                    <iframe
                                        className="w-full h-full"
                                        src={`https://www.youtube.com/embed/${youtubeId}`}
                                        title="YouTube video player"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    ></iframe>
                                </div>
                            )}
                        </div>
                    )}

                    {!formData.youtubeUrl && (
                        <div className="space-y-3">
                            <label className="text-[13px] font-bold text-gray-700 ml-1 flex items-center gap-2">
                                Video File 
                                {!formData.videoUrl && <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-400 font-black uppercase tracking-widest">Optional</span>}
                            </label>

                            {formData.videoUrl ? (
                                <div className="space-y-4">
                                    <div className="aspect-video bg-[#1a1c1e] rounded-[32px] overflow-hidden shadow-2xl relative group border-4 border-white ring-1 ring-gray-100">
                                        <video
                                            className="w-full h-full object-cover"
                                            src={formData.videoUrl}
                                            controls
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all pointer-events-none flex items-center justify-center">
                                            <span className="material-symbols-outlined text-white text-[48px] animate-pulse">play_circle</span>
                                        </div>
                                        <button
                                            onClick={() => setFormData({ ...formData, videoUrl: '' })}
                                            className="absolute top-4 right-4 w-12 h-12 bg-white/20 backdrop-blur-xl text-white rounded-full flex items-center justify-center hover:bg-red-500 transition-all opacity-0 group-hover:opacity-100 z-10 border border-white/30"
                                        >
                                            <span className="material-symbols-outlined text-[24px]">delete</span>
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-center gap-2 py-3 bg-green-50 rounded-2xl border border-green-100 border-dashed">
                                        <span className="material-symbols-outlined text-[20px] text-green-500">check_circle</span>
                                        <p className="text-[12px] font-black text-green-600 uppercase tracking-widest leading-none">Video Ready to Save</p>
                                    </div>
                                </div>
                            ) : (
                                <div 
                                    className="border-2 border-dashed border-[#e2e8f0] rounded-[40px] p-14 flex flex-col items-center justify-center bg-white hover:bg-gray-50/50 transition-all cursor-pointer group relative overflow-hidden min-h-[220px]"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        accept="video/*" 
                                        onChange={handleFileSelect} 
                                    />
                                    
                                    {isUploading ? (
                                        <div className="flex flex-col items-center gap-6 w-full max-w-[280px]">
                                            <div className="relative w-20 h-20">
                                                <svg className="w-full h-full transform -rotate-90">
                                                    <circle
                                                        cx="40"
                                                        cy="40"
                                                        r="36"
                                                        stroke="currentColor"
                                                        strokeWidth="8"
                                                        fill="transparent"
                                                        className="text-blue-50"
                                                    />
                                                    <circle
                                                        cx="40"
                                                        cy="40"
                                                        r="36"
                                                        stroke="currentColor"
                                                        strokeWidth="8"
                                                        fill="transparent"
                                                        strokeDasharray={226.2}
                                                        strokeDashoffset={226.2 - (226.2 * uploadProgress) / 100}
                                                        className="text-blue-500 transition-all duration-300 ease-out"
                                                    />
                                                </svg>
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className="text-[16px] font-black text-blue-600">{uploadProgress}%</span>
                                                </div>
                                            </div>
                                            <div className="space-y-2 text-center">
                                                <p className="text-[14px] font-black text-blue-600 uppercase tracking-widest animate-pulse">Uploading Video...</p>
                                                <p className="text-[11px] font-bold text-gray-400">Please don't close this window</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-[0_12px_40px_rgba(0,0,0,0.06)] border border-gray-100 mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ease-out">
                                                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-[32px] text-blue-500">upload_file</span>
                                                </div>
                                            </div>
                                            <h3 className="text-[18px] font-black text-[#1e1e1e] tracking-tight uppercase mb-1">Select Video Files</h3>
                                            <p className="text-[14px] font-bold text-gray-300 tracking-tight">Drag and drop your MP4 files</p>
                                            
                                            {/* Subtle Decorative Elements */}
                                            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-blue-50 rounded-full blur-2xl opacity-50"></div>
                                            <div className="absolute -top-6 -left-6 w-24 h-24 bg-indigo-50 rounded-full blur-2xl opacity-50"></div>
                                        </>
                                    )}
                                </div>
                            )}
                            <p className="text-[11px] text-gray-400 font-medium text-center italic tracking-tight px-4 mt-2 leading-relaxed">
                                Uploaded videos will be stored on our secure cloud. Supports MP4, MOV, WebM formats.
                            </p>
                        </div>
                    )}

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-[13px] font-bold text-gray-700 ml-1">Description</label>
                        <textarea
                            placeholder="Enter video description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full h-[120px] px-5 py-4 border border-gray-200 rounded-2xl text-[15px] font-medium outline-none focus:border-blue-500 transition-all resize-none placeholder:text-gray-300 bg-white shadow-sm"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        {/* Duration */}
                        <div className="space-y-2">
                            <label className="text-[13px] font-bold text-gray-700 ml-1">Duration (MM:SS)</label>
                            <input
                                type="text"
                                placeholder="e.g. 45:00"
                                value={formData.duration}
                                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                className="w-full h-[54px] px-5 border border-gray-200 rounded-2xl text-[15px] font-medium outline-none focus:border-blue-500 transition-all bg-white shadow-sm"
                            />
                        </div>

                        {/* Status Toggle */}
                        <div className="space-y-2">
                            <label className="text-[13px] font-bold text-gray-700 ml-1">Access</label>
                            <div className="flex bg-[#f8fafc] p-1.5 rounded-[20px] w-full border border-gray-100 h-[54px]">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, status: 'Free' })}
                                    className={`flex-1 text-[13px] font-bold rounded-xl transition-all ${formData.status === 'Free' ? 'bg-white text-gray-900 shadow-sm border border-gray-100/50' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Free
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, status: 'Paid' })}
                                    className={`flex-1 text-[13px] font-bold rounded-xl transition-all ${formData.status === 'Paid' ? 'bg-white text-gray-900 shadow-sm border border-gray-100/50' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Paid
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <label className="text-[13px] font-bold text-gray-700">Display Settings</label>
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

                    {/* Advanced Settings */}
                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center gap-1.5 text-blue-600 text-[13px] font-bold hover:text-blue-700 transition-all focus:outline-none"
                        >
                            <span className={`material-symbols-outlined text-[20px] transition-transform duration-300 ${showAdvanced ? 'rotate-90' : ''}`}>arrow_right</span>
                            Advanced Settings
                        </button>

                        {showAdvanced && (
                            <div className="mt-5 space-y-6 pt-5 border-t border-gray-50 animate-in slide-in-from-top-3 duration-300">
                                <div className="space-y-2">
                                    <label className="text-[13px] font-bold text-gray-700">Sorting Order</label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={formData.order}
                                        onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                                        className="w-full h-[54px] px-5 border border-gray-200 rounded-2xl text-[15px] font-medium outline-none focus:border-blue-500 transition-all bg-white shadow-sm"
                                    />
                                    <p className="text-[11px] font-medium text-gray-400 italic mt-1 ml-1">Lower numbers appear first.</p>
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Action Buttons */}
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
                            onClick={() => onSubmit({ ...formData, isFree: formData.status === 'Free', isDemo: formData.isDemo })}
                            className="flex-[2] h-[60px] bg-[#1a1c1e] text-white rounded-2xl font-bold text-[15px] hover:bg-black transition-all shadow-lg active:scale-[0.98]"
                        >
                            {editingVideo ? 'SAVE VIDEO' : 'ADD VIDEO'}
                        </button>
                    </div>
                </div>
            </DrawerBody>
        </RightSideDrawer>
    );
};

export default AddVideoDrawer;
