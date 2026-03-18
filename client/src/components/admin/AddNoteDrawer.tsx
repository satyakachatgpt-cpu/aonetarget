import React, { useState, useEffect, useRef } from 'react';
import { RightSideDrawer, DrawerHeader, DrawerBody, DrawerFooter, PrimaryButton } from './DrawerSystem';

interface AddNoteDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    onUploadFile: (file: File) => Promise<string>;
    editingNote?: any;
}

const AddNoteDrawer: React.FC<AddNoteDrawerProps> = ({
    isOpen,
    onClose,
    onSubmit,
    onUploadFile,
    editingNote
}) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        fileUrl: '',
        fileSize: '',
        status: 'Paid',
        order: '0',
        isDemo: false
    });

    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            if (editingNote) {
                setFormData({
                    title: editingNote.title || '',
                    description: editingNote.description || '',
                    fileUrl: editingNote.fileUrl || '',
                    fileSize: editingNote.fileSize || '',
                    status: editingNote.isFree ? 'Free' : 'Paid',
                    order: editingNote.order?.toString() || '0',
                    isDemo: editingNote.isDemo === true || editingNote.isDemo === 'true' || editingNote.isDemo === 1
                });
            } else {
                setFormData({
                    title: '',
                    description: '',
                    fileUrl: '',
                    fileSize: '',
                    status: 'Paid',
                    order: '0',
                    isDemo: false
                });
            }
        }
    }, [isOpen, editingNote]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await uploadFile(file);
        }
    };

    const uploadFile = async (file: File) => {
        setIsUploading(true);
        try {
            const url = await onUploadFile(file);
            setFormData(prev => ({
                ...prev,
                fileUrl: url,
                fileSize: (file.size / (1024 * 1024)).toFixed(2) + ' MB'
            }));
        } catch (error) {
            console.error('Upload failed:', error);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <RightSideDrawer isOpen={isOpen} onClose={onClose} width="500px">
            <DrawerHeader title={editingNote ? `Edit Note (#${editingNote._id || editingNote.id || 'NEW'})` : 'Add Note'} onClose={onClose} />
            <DrawerBody className="bg-[#fcfcfc]">
                <div className="space-y-8 pb-10">
                    {/* Title */}
                    <div className="space-y-2">
                        <label className="text-[13px] font-bold text-gray-700 ml-1">Title <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            placeholder="Enter Note Title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full h-[54px] px-5 border border-gray-200 rounded-2xl text-[15px] font-medium outline-none focus:border-blue-500 transition-all placeholder:text-gray-300 bg-white shadow-sm"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-[13px] font-bold text-gray-700 ml-1">Description</label>
                        <textarea
                            placeholder="Enter Description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full h-[140px] px-5 py-4 border border-gray-200 rounded-2xl text-[15px] font-medium outline-none focus:border-blue-500 transition-all resize-none placeholder:text-gray-300 bg-white shadow-sm"
                        />
                    </div>

                    {/* File Upload Section */}
                    <div className="space-y-3">
                        <label className="text-[13px] font-bold text-gray-700 ml-1">PDF/Document File</label>
                        <div
                            className="border-2 border-dashed border-gray-200 rounded-[24px] p-8 flex flex-col items-center justify-center gap-3 bg-white hover:bg-gray-50 hover:border-blue-300 transition-all cursor-pointer group"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <span className={`material-symbols-outlined text-[28px] ${formData.fileUrl ? 'text-green-500' : 'text-blue-500'}`}>
                                    {isUploading ? 'sync' : (formData.fileUrl ? 'task' : 'upload_file')}
                                </span>
                            </div>
                            <div className="text-center">
                                <p className="text-[14px] font-bold text-gray-700 uppercase tracking-tight">
                                    {isUploading ? 'Uploading file...' : (formData.fileUrl ? 'File Selected' : 'Upload Document')}
                                </p>
                                <p className="text-[11px] font-medium text-gray-400 mt-0.5">Click or Drag & Drop (Max 50MB)</p>
                            </div>
                            {formData.fileUrl && (
                                <div className="mt-2 px-4 py-2 bg-green-50 rounded-xl border border-green-100 max-w-full overflow-hidden">
                                    <span className="text-[11px] font-bold text-green-700 truncate block">{formData.fileUrl}</span>
                                </div>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".pdf,.doc,.docx,application/pdf"
                                onChange={handleFileSelect}
                            />
                        </div>
                    </div>

                    {/* Demo Toggle */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <label className="text-[13px] font-bold text-gray-700">Display Settings</label>
                            {formData.status === 'Free' && (
                                <span className="text-[10px] font-black text-green-600 bg-green-50 px-2.5 py-1 rounded-full uppercase tracking-widest border border-green-100">Recommended for Demos</span>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
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
                        </div>
                        <p className="text-[11px] text-gray-400 italic px-1 font-medium leading-tight">
                            Free content shows in the "Free Study Material" section. Demo items show in the "Trial Lessons" section.
                        </p>
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
                                    <p className="text-[11px] font-medium text-gray-400 italic mt-1 ml-1 leading-tight">Lower numbers appear first.</p>
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
                            {editingNote ? 'SAVE NOTE' : 'ADD NOTE'}
                        </button>
                    </div>
                </div>
            </DrawerBody>
        </RightSideDrawer>
    );
};

export default AddNoteDrawer;

