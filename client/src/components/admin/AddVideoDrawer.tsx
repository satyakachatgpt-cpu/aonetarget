import React, { useState, useEffect, useRef } from 'react';
import { RightSideDrawer, DrawerHeader, DrawerBody, DrawerFooter, PrimaryButton } from './DrawerSystem';
import FileUploadButton from '../shared/FileUploadButton';
import { getVideoUrl, extractYouTubeId, toYouTubeEmbed } from '../../lib/utils';

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
    const fileInputRef = useRef<HTMLInputElement>(null);


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

                    {/* YouTube URL & Preview */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[13px] font-bold text-gray-700 ml-1">YouTube URL <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                placeholder="Paste YouTube link: https://youtube.com/watch?v=..."
                                value={formData.youtubeUrl}
                                onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
                                className="w-full h-[54px] px-5 border border-gray-200 rounded-2xl text-[15px] font-medium outline-none focus:border-blue-500 transition-all placeholder:text-gray-300 bg-white shadow-sm"
                            />
                        </div>

                        {youtubeId ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-center gap-2 py-3 bg-green-50 rounded-2xl border border-green-100 border-dashed">
                                    <span className="material-symbols-outlined text-[20px] text-green-500">check_circle</span>
                                    <p className="text-[12px] font-black text-green-600 uppercase tracking-widest leading-none">YouTube Link Detected</p>
                                </div>
                                <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-lg border-2 border-white/10 ring-1 ring-gray-100">
                                    <iframe
                                        className="w-full h-full"
                                        src={`https://www.youtube.com/embed/${youtubeId}`}
                                        title="YouTube video player"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    ></iframe>
                                </div>
                            </div>
                        ) : formData.youtubeUrl ? (
                            <div className="flex items-center justify-center gap-2 py-3 bg-red-50 rounded-2xl border border-red-100 border-dashed">
                                <span className="material-symbols-outlined text-[20px] text-red-500">error</span>
                                <p className="text-[12px] font-black text-red-600 uppercase tracking-widest leading-none">Invalid YouTube Link</p>
                            </div>
                        ) : null}

                        {/* Legacy Cloudinary Video Fallback Display (Read Only) */}
                        {formData.videoUrl && !formData.youtubeUrl && (
                            <div className="space-y-3">
                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Legacy Cloudinary Video</label>
                                <div className="aspect-video bg-[#1a1c1e] rounded-[32px] overflow-hidden shadow-2xl relative group border-4 border-white ring-1 ring-gray-100">
                                    <video
                                        className="w-full h-full object-cover"
                                        src={getVideoUrl(formData.videoUrl)}
                                        controls
                                    />
                                    <button
                                        onClick={() => setFormData({ ...formData, videoUrl: '' })}
                                        className="absolute top-4 right-4 w-12 h-12 bg-white/20 backdrop-blur-xl text-white rounded-full flex items-center justify-center hover:bg-red-500 transition-all opacity-0 group-hover:opacity-100 z-10 border border-white/30"
                                    >
                                        <span className="material-symbols-outlined text-[24px]">delete</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

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
                            onClick={() => onSubmit({ 
                                ...formData, 
                                url: toYouTubeEmbed(formData.youtubeUrl) || formData.videoUrl,
                                youtubeUrl: toYouTubeEmbed(formData.youtubeUrl),
                                isFree: formData.status === 'Free', 
                                isDemo: formData.isDemo 
                            })}
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
