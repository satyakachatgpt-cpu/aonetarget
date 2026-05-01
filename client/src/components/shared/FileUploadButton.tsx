import React, { useRef, useState } from 'react';
import { uploadAPI } from '../../services/apiClient';

interface Props {
  onUpload: (url: string) => void;
  accept?: string;
  label?: string;
  icon?: string;
  className?: string;
  hideLabel?: boolean;
  uploadType?: 'image' | 'video' | 'pdf';
  onBeforeUpload?: (file: File) => Promise<boolean> | boolean;
}

const FileUploadButton: React.FC<Props> = ({
  onUpload,
  accept = 'image/*',
  label = 'Upload',
  icon = 'upload',
  className,
  hideLabel = false,
  uploadType = 'image',
  onBeforeUpload
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (onBeforeUpload) {
      const isValid = await onBeforeUpload(file);
      if (!isValid) {
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    try {
      setUploading(true);
      let data;
      if (uploadType === 'pdf') {
        data = await uploadAPI.uploadPDF(file);
      } else if (uploadType === 'video') {
        data = await uploadAPI.uploadVideo(file);
      } else {
        data = await uploadAPI.uploadImage(file);
      }

      if (data && data.url) {
        onUpload(data.url);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      alert(error.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className={className || "px-4 py-2.5 bg-gradient-to-r from-[#1A237E] to-[#303F9F] text-white rounded-xl text-xs font-bold hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 whitespace-nowrap"}
      >
        {uploading ? (
          <>
            <span className="material-icons-outlined text-sm animate-spin">progress_activity</span>
            {!hideLabel && "Uploading..."}
          </>
        ) : (
          <>
            <span className="material-icons-outlined text-sm">{icon}</span>
            {!hideLabel && label}
          </>
        )}
      </button>
    </>
  );
};

export default FileUploadButton;
