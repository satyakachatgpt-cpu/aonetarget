import { useCallback } from 'react';

interface UseCourseContentUploadsProps {
  uploadAPI: any;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  setImageUploadLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setCourseFormData: React.Dispatch<React.SetStateAction<any>>;
  setEditingFolder: React.Dispatch<React.SetStateAction<any>>;
  setLiveStreamForm: React.Dispatch<React.SetStateAction<any>>;
  setYoutubeZoomForm: React.Dispatch<React.SetStateAction<any>>;
  setWebinarForm: React.Dispatch<React.SetStateAction<any>>;
}

export const useCourseContentUploads = ({
  uploadAPI,
  showToast,
  setImageUploadLoading,
  setCourseFormData,
  setEditingFolder,
  setLiveStreamForm,
  setYoutubeZoomForm,
  setWebinarForm
}: UseCourseContentUploadsProps) => {

  const handleCourseImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploadLoading(true);
    try {
      const data = await uploadAPI.uploadImage(file);
      setCourseFormData((prev: any) => ({
        ...prev,
        imageUrl: data.url,
        thumbnail: data.url
      }));
      showToast('Image uploaded successfully', 'success');
    } catch (error) {
      console.error('Image upload error:', error);
      showToast('Failed to upload image', 'error');
    } finally {
      setImageUploadLoading(false);
    }
  }, [uploadAPI, showToast, setImageUploadLoading, setCourseFormData]);

  const handleFolderImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await uploadAPI.uploadImage(file);
      setEditingFolder((prev: any) => prev ? { ...prev, thumbnail: data.url } : { thumbnail: data.url });
      showToast('Image uploaded', 'success');
    } catch (error) {
      showToast('Upload failed', 'error');
    }
  }, [uploadAPI, showToast, setEditingFolder]);

  const handleLiveStreamImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await uploadAPI.uploadImage(file);
      setLiveStreamForm((prev: any) => ({ ...prev, image: data.url }));
      showToast('Image uploaded', 'success');
    } catch (error) {
      showToast('Upload failed', 'error');
    }
  }, [uploadAPI, showToast, setLiveStreamForm]);

  const handleLiveStreamFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, field: 'pdf1' | 'pdf2' | 'studyMaterial') => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await uploadAPI.uploadDocument(file);
      setLiveStreamForm((prev: any) => ({ ...prev, [field]: data.url }));
      showToast('File uploaded', 'success');
    } catch (error) {
      showToast('Upload failed', 'error');
    }
  }, [uploadAPI, showToast, setLiveStreamForm]);

  const handleYoutubeZoomImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await uploadAPI.uploadImage(file);
      setYoutubeZoomForm((prev: any) => ({ ...prev, image: data.url }));
      showToast('Image uploaded', 'success');
    } catch (error) {
      showToast('Upload failed', 'error');
    }
  }, [uploadAPI, showToast, setYoutubeZoomForm]);

  const handleYoutubeZoomFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, field: 'pdf1' | 'pdf2' | 'studyMaterial') => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await uploadAPI.uploadDocument(file);
      setYoutubeZoomForm((prev: any) => ({ ...prev, [field]: data.url }));
      showToast('File uploaded', 'success');
    } catch (error) {
      showToast('Upload failed', 'error');
    }
  }, [uploadAPI, showToast, setYoutubeZoomForm]);

  const handleWebinarImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await uploadAPI.uploadImage(file);
      setWebinarForm((prev: any) => ({ ...prev, image: data.url }));
      showToast('Image uploaded', 'success');
    } catch (error) {
      showToast('Upload failed', 'error');
    }
  }, [uploadAPI, showToast, setWebinarForm]);

  const handleWebinarFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, field: 'pdf1' | 'pdf2' | 'studyMaterial') => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await uploadAPI.uploadDocument(file);
      setWebinarForm((prev: any) => ({ ...prev, [field]: data.url }));
      showToast('File uploaded', 'success');
    } catch (error) {
      showToast('Upload failed', 'error');
    }
  }, [uploadAPI, showToast, setWebinarForm]);

  return {
    handleCourseImageUpload,
    handleFolderImageUpload,
    handleLiveStreamImageUpload,
    handleLiveStreamFileUpload,
    handleYoutubeZoomImageUpload,
    handleYoutubeZoomFileUpload,
    handleWebinarImageUpload,
    handleWebinarFileUpload
  };
};
