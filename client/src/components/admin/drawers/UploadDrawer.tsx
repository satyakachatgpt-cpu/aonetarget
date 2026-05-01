import React, { useState } from 'react';
import {
    RightSideDrawer,
    DrawerHeader,
    DrawerBody,
    UploadArea,
    FilePreviewItem
} from '../DrawerSystem';
import BatchMultiSelect from '../course-content/BatchMultiSelect';

export const UploadDrawer: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    title: string; 
    subtitle: string; 
    onSubmit: (files: File[]) => void; 
    accept?: string;
    showToast?: (msg: string, type?: 'success' | 'error') => void;
    globalCreateMode?: boolean;
    selectedBatchIds?: string[];
    setSelectedBatchIds?: (ids: string[]) => void;
    availableCourses?: any[];
}> = ({ 
    isOpen, onClose, title, subtitle, onSubmit, accept, showToast,
    globalCreateMode = false, selectedBatchIds = [], setSelectedBatchIds, availableCourses = []
}) => {
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
                        {/* Batch Multi-Select for Global Mode */}
                        {globalCreateMode && (
                            <BatchMultiSelect 
                                courses={availableCourses}
                                selectedIds={selectedBatchIds}
                                onChange={(ids) => setSelectedBatchIds?.(ids)}
                            />
                        )}

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
                            onClick={() => {
                                if (globalCreateMode && selectedBatchIds.length === 0) {
                                    showToast?.('Please select at least one batch', 'error');
                                    return;
                                }
                                handleSubmit();
                            }}
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
