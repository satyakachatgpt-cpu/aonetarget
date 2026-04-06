import React, { useRef, useState } from 'react';

interface Props {
  onUpload: (url: string) => void;
  accept?: string;
  label?: string;
  icon?: string;
  className?: string;
  hideLabel?: boolean;
  uploadType?: 'image' | 'video' | 'pdf';
}

const FileUploadButton: React.FC<Props> = ({
  onUpload,
  accept = 'image/*',
  label = 'Upload',
  icon = 'upload',
  className,
  hideLabel = false,
  uploadType = 'image'
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      const adminId = localStorage.getItem('adminId');
      const res = await fetch(`/api/v2/upload/${uploadType}`, {
        method: 'POST',
        headers: adminId ? { 'x-admin-id': adminId } : {},
        body: formData
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      onUpload(data.url);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
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
