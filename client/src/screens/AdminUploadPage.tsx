import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../services/apiClient';
import { Upload, FileText, Video, ImageIcon, CheckCircle2, Loader2, AlertCircle, Youtube } from 'lucide-react';
import { extractYouTubeId, toYouTubeEmbed } from '../lib/utils';
import { toast } from 'sonner';

/**
 * PRODUCTION-GRADE ADMIN UPLOAD PAGE
 * Implements the Hybrid Upload System:
 * - Small files (<100MB) via Backend/Multer
 * - Large videos (>100MB) via Direct Cloudinary Signed Upload
 */

const AdminUploadPage: React.FC = () => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [files, setFiles] = useState<{
        thumbnail: File | null;
        pdf: File | null;
    }>({ thumbnail: null, pdf: null });

    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'thumbnail' | 'pdf') => {
        if (e.target.files && e.target.files[0]) {
            setFiles(prev => ({ ...prev, [type]: e.target.files![0] }));
        }
    };

    const uploadSmallFile = async (file: File, type: 'image' | 'video' | 'pdf') => {
        const formData = new FormData();
        formData.append('file', file);
        const adminId = localStorage.getItem('adminId');
        const res = await axios.post(`${API_BASE_URL}/v2/upload/${type}`, formData, {
            headers: { 
                'Content-Type': 'multipart/form-data',
                'x-admin-id': adminId || ''
            }
        });
        return res.data.url;
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !youtubeUrl) {
            toast.error('Title and YouTube URL are required');
            return;
        }

        if (!extractYouTubeId(youtubeUrl)) {
            toast.error('Please enter a valid YouTube URL');
            return;
        }

        setLoading(true);
        try {
            toast.info('Starting multipart upload process...');

            // Step 1: Upload Thumbnail (Backend)
            let thumbnailBtn = '';
            if (files.thumbnail) {
                thumbnailBtn = await uploadSmallFile(files.thumbnail, 'image');
            }

            // Step 2: Upload PDF (Backend)
            let pdfUrl = '';
            if (files.pdf) {
                pdfUrl = await uploadSmallFile(files.pdf, 'pdf');
            }

            const videoUrl = toYouTubeEmbed(youtubeUrl);

            // Step 4: Create Course in DB
            const adminId = localStorage.getItem('adminId');
            await axios.post(`${API_BASE_URL}/courses`, {
                title,
                description,
                thumbnail: thumbnailBtn,
                videoUrl,
                pdfUrl
            }, {
                headers: { 'x-admin-id': adminId || '' }
            });

            toast.success('Course published successfully!');
            setTitle('');
            setDescription('');
            setYoutubeUrl('');
            setFiles({ thumbnail: null, pdf: null });
        } catch (error: any) {
            console.error('Upload Error:', error);
            toast.error(error.response?.data?.message || 'Publishing failed. Please check file sizes.');
        } finally {
            setLoading(false);
            setUploadProgress(0);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white p-8">
            <div className="max-w-3xl mx-auto">
                <header className="mb-10 text-center">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
                        Course Publisher
                    </h1>
                    <p className="text-slate-400 mt-2">Create premium content with automated cloud syncing</p>
                </header>

                <form onSubmit={handleSubmit} className="space-y-6 bg-slate-900/50 p-8 rounded-2xl border border-slate-800 backdrop-blur-xl shadow-2xl">
                    <div className="space-y-4">
                        <label className="block">
                            <span className="text-sm font-medium text-slate-300">Course Title</span>
                            <input 
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="mt-1 block w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="Enter an engaging title"
                            />
                        </label>

                        <label className="block">
                            <span className="text-sm font-medium text-slate-300">Description</span>
                            <textarea 
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="mt-1 block w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none h-32 resize-none transition-all"
                                placeholder="Describe what students will learn"
                            />
                        </label>
                    </div>

                    <div className="space-y-4">
                        <label className="block">
                            <span className="text-sm font-medium text-slate-300">YouTube Video URL</span>
                            <div className="mt-1 relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-red-500 transition-colors">
                                    <span className="material-symbols-outlined text-[20px]">link</span>
                                </span>
                                <input 
                                    type="text"
                                    value={youtubeUrl}
                                    onChange={(e) => setYoutubeUrl(e.target.value)}
                                    className="block w-full bg-slate-950 border border-slate-700 rounded-lg pl-12 pr-4 py-3 focus:ring-2 focus:ring-red-500 outline-none transition-all"
                                    placeholder="https://www.youtube.com/watch?v=..."
                                />
                            </div>
                        </label>

                        {/* YouTube Preview */}
                        {extractYouTubeId(youtubeUrl) && (
                            <div className="aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 shadow-2xl animate-in zoom-in-95 duration-300">
                                <iframe
                                    className="w-full h-full"
                                    src={toYouTubeEmbed(youtubeUrl)}
                                    title="YouTube preview"
                                    allowFullScreen
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Thumbnail Input */}
                            <div className="relative group">
                                <input type="file" id="thumb" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'thumbnail')} />
                                <label htmlFor="thumb" className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${files.thumbnail ? 'border-green-500 bg-green-500/10' : 'border-slate-700 hover:border-blue-500'}`}>
                                    {files.thumbnail ? <CheckCircle2 className="text-green-500 mb-2" /> : <ImageIcon className="text-slate-400 mb-2" />}
                                    <span className="text-xs text-slate-400">Thumbnail</span>
                                </label>
                            </div>

                            {/* PDF Input */}
                            <div className="relative group">
                                <input type="file" id="pdf" className="hidden" accept="application/pdf" onChange={(e) => handleFileChange(e, 'pdf')} />
                                <label htmlFor="pdf" className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${files.pdf ? 'border-purple-500 bg-purple-500/10' : 'border-slate-700 hover:border-blue-500'}`}>
                                    {files.pdf ? <CheckCircle2 className="text-purple-500 mb-2" /> : <FileText className="text-slate-400 mb-2" />}
                                    <span className="text-xs text-slate-400">PDF Guide</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {loading && (
                        <div className="space-y-2">
                            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div color="blue" className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                            </div>
                            <div className="flex items-center justify-center gap-2 text-blue-400 animate-pulse">
                                <Loader2 className="animate-spin w-4 h-4" />
                                <span className="text-xs font-medium">Syncing with Cloud... {uploadProgress > 0 ? `${uploadProgress}%` : ''}</span>
                            </div>
                        </div>
                    )}

                    <button 
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-900/20 transition-all transform hover:scale-[1.01] active:scale-95"
                    >
                        Publish Course
                    </button>
                </form>

                <div className="mt-8 flex items-start gap-3 p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                    <AlertCircle className="text-blue-400 shrink-0 mt-0.5" size={18} />
                    <p className="text-xs text-slate-400 leading-relaxed">
                        All videos must be provided via YouTube links. Cloud storage is automatically managed for thumbnails and PDF guides. All assets are validated on the backend.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminUploadPage;
