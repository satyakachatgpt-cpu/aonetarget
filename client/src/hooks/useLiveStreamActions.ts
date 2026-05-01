import { useCallback } from 'react';

interface UseLiveStreamActionsProps {
  selectedCourse: any;
  setVideos: React.Dispatch<React.SetStateAction<any[]>>;
  normalizeId: (id: any) => string | null;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  setOpenContentActionMenuId: React.Dispatch<React.SetStateAction<string | null>>;
  API_BASE_URL: string;
}

export const useLiveStreamActions = ({
  selectedCourse,
  setVideos,
  normalizeId,
  showToast,
  setOpenContentActionMenuId,
  API_BASE_URL
}: UseLiveStreamActionsProps) => {

  const handleSendContentNotification = useCallback(async (item: any) => {
    const defaultMsg = `Your class "${item.title || item.name}" is live!`;
    const message = prompt(`Enter notification message for students of this batch:`, defaultMsg);
    if (!message) return;

    try {
      const courseId = normalizeId((selectedCourse as any)._id || selectedCourse.id);
      const adminToken = localStorage.getItem('adminToken');

      const response = await fetch(`${API_BASE_URL}/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ batchId: courseId, message })
      });

      if (response.ok) {
        const data = await response.json();
        showToast(data.message || 'Notifications sent successfully!', 'success');
      } else {
        const err = await response.json().catch(() => ({}));
        showToast(err.message || 'Failed to send notifications', 'error');
      }
    } catch (error) {
      showToast('Failed to send notifications', 'error');
    }
  }, [selectedCourse, normalizeId, showToast, API_BASE_URL]);

  const handleEndLiveStream = useCallback(async (video: any) => {
    if (!confirm(`End live stream "${video.title}"? This will mark it as ended and save as a recording.`)) return;
    try {
      const courseId = (selectedCourse as any)?._id || selectedCourse?.id;
      const videoId = (video as any)._id || video.id;
      const adminToken = localStorage.getItem('adminToken');
      const url = video.meetingLink || video.link || video.url || video.videoUrl;
      const response = await fetch(`${API_BASE_URL}/courses/${courseId}/videos/${videoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ 
          ...video, 
          status: 'active', 
          streamStatus: 'recorded', 
          recordedLink: url,
          endTime: new Date().toISOString() 
        })
      });
      if (!response.ok) throw new Error('Failed to end stream');

      setVideos(prev => prev.map(v =>
        ((v as any)._id || v.id) === videoId
          ? { ...v, streamStatus: 'recorded', contentType: 'recorded', type: 'recorded', recordedLink: url } as any
          : v
      ));
      showToast('Live stream ended and converted to recorded class', 'success');
    } catch { showToast('Failed to end live stream', 'error'); }
  }, [selectedCourse, setVideos, showToast, API_BASE_URL]);

  const handleStartLiveStream = useCallback(async (video: any) => {
    if (!confirm(`Start live stream "${video.title}" now?`)) return;
    try {
      const courseId = normalizeId((selectedCourse as any)?._id || selectedCourse?.id);
      const videoId = normalizeId((video as any)._id || video.id);
      const adminToken = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/courses/${courseId}/videos/${videoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ ...video, status: 'active', streamStatus: 'live' })
      });
      if (!response.ok) throw new Error('Failed to start live stream');
      setVideos(prev => prev.map(v =>
        normalizeId((v as any)._id || v.id) === videoId
          ? { ...v, streamStatus: 'live', status: 'active' } as any
          : v
      ));
      showToast('Live stream started successfully', 'success');
      setOpenContentActionMenuId(null);
    } catch { showToast('Failed to start live stream', 'error'); }
  }, [selectedCourse, normalizeId, setVideos, showToast, setOpenContentActionMenuId, API_BASE_URL]);

  return {
    handleSendContentNotification,
    handleEndLiveStream,
    handleStartLiveStream
  };
};
