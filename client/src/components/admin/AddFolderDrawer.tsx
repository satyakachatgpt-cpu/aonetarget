import React, { useState, useEffect, useRef } from 'react';
import { RightSideDrawer, DrawerHeader, DrawerBody, DrawerFooter, PrimaryButton } from './DrawerSystem';
import { getImageUrl } from '../../lib/utils';

interface AddFolderDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    onUploadImage: (file: File) => Promise<string>;
    editingFolder?: any;
}

const AddFolderDrawer: React.FC<AddFolderDrawerProps> = ({
    isOpen,
    onClose,
    onSubmit,
    onUploadImage,
    editingFolder
}) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        thumbnail: '',
        status: 'Paid',
        sortingOrder: '0.00'
    });

    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            if (editingFolder) {
                setFormData({
                    name: editingFolder.title || '',
                    description: editingFolder.description || '',
                    thumbnail: editingFolder.thumbnail || '',
                    status: editingFolder.isFree ? 'Free' : 'Paid',
                    sortingOrder: editingFolder.sortingOrder || '0.00'
                });
            } else {
                setFormData({
                    name: '',
                    description: '',
                    thumbnail: '',
                    status: 'Paid',
                    sortingOrder: '0.00'
                });
            }
        }
    }, [isOpen, editingFolder]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await uploadFile(file);
        }
    };

    const uploadFile = async (file: File) => {
        setIsUploading(true);
        try {
            const url = await onUploadImage(file);
            setFormData(prev => ({ ...prev, thumbnail: url }));
        } catch (error) {
            console.error('Upload failed:', error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            await uploadFile(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    return (
        <RightSideDrawer isOpen={isOpen} onClose={onClose} width="460px">
            <DrawerHeader title={editingFolder ? `Edit Folder (#${editingFolder._id || editingFolder.id || 'NEW'})` : 'Add Folder'} onClose={onClose} />
            <DrawerBody className="bg-[#fcfcfc]">
                <div className="space-y-7 pb-10">
                    {/* Name Field */}
                    <div className="space-y-2">
                        <label className="text-[13px] font-bold text-gray-700"> Name <span className="text-red-500">*</span> </label>
                        <input
                            type="text"
                            placeholder="Title"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full h-[46px] px-4 border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-blue-500 transition-all placeholder:text-gray-300 bg-white shadow-sm"
                        />
                    </div>

                    {/* Description Field */}
                    <div className="space-y-2">
                        <label className="text-[13px] font-bold text-gray-700">Description</label>
                        <textarea
                            placeholder="Enter Description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full h-[120px] px-4 py-3 border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-blue-500 transition-all resize-none placeholder:text-gray-300 bg-white shadow-sm"
                        />
                    </div>

                    {/* Image Section */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-[13px] font-bold text-gray-700">Image</label>
                            <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Recommended: 1280x720 px (16:9 Ratio)</span>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-[170px] h-[110px] bg-[#f2f2f2] rounded-[22px] flex flex-col items-center justify-center gap-1 border border-gray-100 overflow-hidden shrink-0">
                                {isUploading ? (
                                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                ) : formData.thumbnail ? (
                                    <img src={getImageUrl(formData.thumbnail)} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-[32px] text-[#8e8e8e]">image</span>
                                        <span className="text-[13px] font-bold text-[#8e8e8e]">No Image</span>
                                    </>
                                )}
                            </div>

                            <div
                                className="flex-1 border-2 border-dashed border-[#e0e0e0] rounded-[22px] flex flex-col items-center justify-center p-3 text-center bg-white hover:border-gray-400 hover:bg-gray-50 transition-all cursor-pointer group relative"
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                            >
                                <span className="material-symbols-outlined text-[28px] text-[#9a9a9a] group-hover:text-gray-600 transition-colors">touch_app</span>
                                <p className="text-[14px] font-bold text-[#9a9a9a] mt-1 group-hover:text-gray-700 uppercase tracking-tight">Upload Image</p>
                                <p className="text-[11px] font-medium text-[#c0c0c0] leading-tight">Click or Drag & Drop</p>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                            </div>
                        </div>
                    </div>

                    {/* Status Toggle */}
                    <div className="space-y-2">
                        <label className="text-[13px] font-bold text-gray-700">Status</label>
                        <div className="flex bg-[#f8fafc] p-1.5 rounded-[18px] w-full border border-gray-100">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, status: 'Free' })}
                                className={`flex-1 py-3 text-[13px] font-bold rounded-xl transition-all ${formData.status === 'Free' ? 'bg-white text-gray-900 shadow-sm border border-gray-100/50' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Free
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, status: 'Paid' })}
                                className={`flex-1 py-3 text-[13px] font-bold rounded-xl transition-all ${formData.status === 'Paid' ? 'bg-white text-gray-900 shadow-sm border border-gray-100/50' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Paid
                            </button>
                        </div>
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
                                        type="text"
                                        placeholder="0.00"
                                        value={formData.sortingOrder}
                                        onChange={(e) => setFormData({ ...formData, sortingOrder: e.target.value })}
                                        className="w-full h-[46px] px-4 border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-blue-500 transition-all placeholder:text-gray-300 bg-white shadow-sm"
                                    />
                                    <p className="text-[11px] font-medium text-gray-400 italic">Assign a number to sort this course.</p>
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
                            onClick={() => onSubmit(formData)}
                            className="flex-[2] h-[60px] bg-[#1a1c1e] text-white rounded-2xl font-bold text-[15px] hover:bg-black transition-all shadow-lg active:scale-[0.98]"
                        >
                            {editingFolder ? 'SAVE FOLDER' : 'ADD FOLDER'}
                        </button>
                    </div>
                </div>
            </DrawerBody>
        </RightSideDrawer>
    );
};

export default AddFolderDrawer;

