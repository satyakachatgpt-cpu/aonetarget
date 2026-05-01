import { useCallback } from 'react';

interface UseLiveContentSubmitProps {
  selectedCourse: any;
  currentFolder: any;
  youtubeZoomForm: any;
  liveStreamForm: any;
  webinarForm: any;
  editingYoutubeZoom: any;
  setShowYoutubeZoomModal: (show: boolean) => void;
  setShowLiveStreamModal: (show: boolean) => void;
  setShowWebinarModal: (show: boolean) => void;
  setEditingYoutubeZoom: (item: any) => void;
  resetYoutubeZoomForm: () => void;
  resetLiveStreamForm: () => void;
  resetWebinarForm: () => void;
  loadCourseContent: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  normalizeId: (id: any) => string | null;
  getAuthHeaders: () => any;
  API_BASE_URL: string;
}

export const useLiveContentSubmit = ({
  selectedCourse,
  currentFolder,
  youtubeZoomForm,
  liveStreamForm,
  webinarForm,
  editingYoutubeZoom,
  setShowYoutubeZoomModal,
  setShowLiveStreamModal,
  setShowWebinarModal,
  setEditingYoutubeZoom,
  resetYoutubeZoomForm,
  resetLiveStreamForm,
  resetWebinarForm,
  loadCourseContent,
  showToast,
  normalizeId,
  getAuthHeaders,
  API_BASE_URL
}: UseLiveContentSubmitProps) => {

  const handleYoutubeZoomSubmit = useCallback(async () => {
    if (!youtubeZoomForm.title || !youtubeZoomForm.link || !selectedCourse) {
      showToast('Please fill required fields (Title, Link)', 'error');
      return;
    }

    try {
      const courseId = normalizeId((selectedCourse as any)._id || selectedCourse.id);
      const folderIdVal = currentFolder?._id || currentFolder?.id || null;
      const folderId = normalizeId(folderIdVal);
      const videoId = editingYoutubeZoom ? normalizeId(editingYoutubeZoom._id || editingYoutubeZoom.id) : null;

      let parsedLink = youtubeZoomForm.link;
      const youtubeMatch = parsedLink.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/|.*embed\/|.*e\/))([^"&?\/\s]{11})/i);
      if (youtubeMatch && youtubeMatch[1]) {
        parsedLink = `https://www.youtube.com/embed/${youtubeMatch[1]}?controls=0&modestbranding=1&rel=0`;
      }

      const streamStatus = youtubeZoomForm.streamStatus || 'upcoming';

      const streamData = {
        title: youtubeZoomForm.title,
        description: youtubeZoomForm.description,
        isFree: youtubeZoomForm.isFree,
        isPaid: !youtubeZoomForm.isFree,
        platform: youtubeZoomForm.platform,
        meetingLink: parsedLink,
        url: parsedLink,
        thumbnail: youtubeZoomForm.image,
        type: 'live',
        contentType: 'live_stream',
        status: 'active',
        streamStatus: streamStatus,
        endTime: youtubeZoomForm.endTime,
        endDateTime: youtubeZoomForm.endTime,
        liveChatEnabled: youtubeZoomForm.enableChat,
        qaEnabled: youtubeZoomForm.enableQA,
        notifyStudents: youtubeZoomForm.notifyStudents,
        allowReplay: youtubeZoomForm.allowReplay,
        visibility: youtubeZoomForm.visibility,
        autoStart: youtubeZoomForm.autoStart,
        chatModeration: youtubeZoomForm.chatModeration,
        slug: youtubeZoomForm.slug,
        seoTitle: youtubeZoomForm.seoTitle,
        seoDescription: youtubeZoomForm.seoDescription,
        pdf1: youtubeZoomForm.pdf1,
        pdf2: youtubeZoomForm.pdf2,
        studyMaterial: youtubeZoomForm.studyMaterial,
        courseId,
        folderId,
      };

      const endpointUrl = videoId
        ? `${API_BASE_URL}/courses/${courseId}/videos/${videoId}`
        : `${API_BASE_URL}/courses/${courseId}/videos`;

      const response = await fetch(endpointUrl, {
        method: videoId ? 'PUT' : 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(streamData)
      });

      if (response.ok) {
        showToast(videoId ? 'Live stream updated!' : 'Live stream added!', 'success');
        setShowYoutubeZoomModal(false);
        setEditingYoutubeZoom(null);
        resetYoutubeZoomForm();
        loadCourseContent();
      } else {
        const err = await response.json().catch(() => ({}));
        showToast(err.error || 'Failed to save live stream', 'error');
      }
    } catch (error) {
      showToast('Failed to save live stream', 'error');
    }
  }, [youtubeZoomForm, selectedCourse, currentFolder, editingYoutubeZoom, API_BASE_URL, getAuthHeaders, showToast, normalizeId, setShowYoutubeZoomModal, setEditingYoutubeZoom, resetYoutubeZoomForm, loadCourseContent]);

  const handleLiveStreamSubmit = useCallback(async () => {
    if (!liveStreamForm.title || !selectedCourse) {
      showToast('Please fill required fields', 'error');
      return;
    }

    try {
      const courseId = normalizeId((selectedCourse as any)._id || selectedCourse.id);
      const folderIdVal = currentFolder?._id || currentFolder?.id || null;
      const folderId = normalizeId(folderIdVal);
      const streamData = {
        title: liveStreamForm.title,
        description: liveStreamForm.description || '',
        thumbnail: liveStreamForm.image,
        courseId: courseId,
        folderId,
        contentType: 'live_stream',
        type: 'video',
        url: liveStreamForm.streamId,
        streamSource: liveStreamForm.streamSource,
        streamId: liveStreamForm.streamId,
        status: 'active',
        isFree: liveStreamForm.isFree,
        order: liveStreamForm.order || '0.00',
        pdf1: liveStreamForm.pdf1,
        pdf2: liveStreamForm.pdf2,
        studyMaterial: liveStreamForm.studyMaterial,
        allowDownload: liveStreamForm.allowDownload,
        chatVisibility: liveStreamForm.chatVisibility,
        enableChat: liveStreamForm.enableChat,
        enableAttendance: liveStreamForm.enableAttendance,
        notifyStudents: liveStreamForm.notifyStudents
      };

      const response = await fetch(`${API_BASE_URL}/courses/${courseId}/videos`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(streamData)
      });

      if (response.ok) {
        showToast('Live stream added successfully!', 'success');
        setShowLiveStreamModal(false);
        resetLiveStreamForm();
        loadCourseContent();
      } else {
        const err = await response.json().catch(() => ({}));
        showToast(err.error || 'Failed to save live stream', 'error');
      }
    } catch (error) {
      showToast('Failed to save live stream', 'error');
    }
  }, [liveStreamForm, selectedCourse, currentFolder, API_BASE_URL, getAuthHeaders, showToast, normalizeId, setShowLiveStreamModal, resetLiveStreamForm, loadCourseContent]);

  const handleWebinarSubmit = useCallback(async () => {
    if (!webinarForm.title || !webinarForm.link || !selectedCourse) {
      showToast('Please fill required fields', 'error');
      return;
    }

    try {
      const courseId = normalizeId((selectedCourse as any)._id || selectedCourse.id);
      const folderIdVal = currentFolder?._id || currentFolder?.id || null;
      const folderId = normalizeId(folderIdVal);
      const webinarData = {
        ...webinarForm,
        title: webinarForm.title,
        description: webinarForm.description || '',
        thumbnail: webinarForm.image,
        courseId: courseId,
        folderId,
        contentType: 'webinar',
        type: 'video',
        url: webinarForm.link,
        status: 'active',
        isFree: webinarForm.isFree,
        order: webinarForm.order || '0.00',
        pdf1: webinarForm.pdf1,
        pdf2: webinarForm.pdf2,
        studyMaterial: webinarForm.studyMaterial,
        allowDownload: webinarForm.allowDownload,
        chatVisibility: webinarForm.chatVisibility,
        streamStatus: webinarForm.streamStatus,
        quizId: webinarForm.quizId
      };

      const response = await fetch(`${API_BASE_URL}/courses/${courseId}/videos`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(webinarData)
      });

      if (response.ok) {
        showToast('Webinar added successfully!', 'success');
        setShowWebinarModal(false);
        resetWebinarForm();
        loadCourseContent();
      } else {
        const err = await response.json().catch(() => ({}));
        showToast(err.error || 'Failed to save webinar', 'error');
      }
    } catch (error) {
      showToast('Failed to save webinar', 'error');
    }
  }, [webinarForm, selectedCourse, currentFolder, API_BASE_URL, getAuthHeaders, showToast, normalizeId, setShowWebinarModal, resetWebinarForm, loadCourseContent]);

  return {
    handleYoutubeZoomSubmit,
    handleLiveStreamSubmit,
    handleWebinarSubmit
  };
};
