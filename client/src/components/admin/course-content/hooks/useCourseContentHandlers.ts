import { useMemo } from 'react';
import { normalizeId } from '../courseContentUtils';

interface UseCourseContentHandlersProps {
  selectedCourse: any;
  API_BASE_URL: string;
  getAuthHeaders: () => any;
  loadCourseContent: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  navigate: any;
  setOpenContentActionMenuId: (id: string | null) => void;
  handleFolderClick: (item: any) => void;
  handleDragStart: (e: any, item: any) => void;
  handleDragOver: (e: any, item: any) => void;
  handleDrop: (e: any, item: any) => void;
  handleDragEnd: () => void;
  handleToggleVideoStatus: (item: any) => void;
  handleToggleNoteStatus: (item: any) => void;
  handleToggleTestStatus: (item: any) => void;
  handleToggleVideoFree: (item: any) => void;
  handleToggleNoteFree: (item: any) => void;
  handleToggleTestFree: (item: any) => void;
  handleSendContentNotification: (item: any) => void;
  handleStartLiveStream: (item: any) => void;
  handleEndLiveStream: (item: any) => void;
  handleEditFolder: (item: any) => void;
  handleEditYoutubeZoom: (item: any) => void;
  handleEditVideo: (item: any) => void;
  handleEditNote: (item: any) => void;
  handleEditTest: (item: any) => void;
  handleDeleteFolder: (id: string) => void;
  handleDeleteVideo: (id: string) => void;
  handleDeleteNote: (id: string) => void;
  handleDeleteTest: (id: string) => void;
}

export const useCourseContentHandlers = ({
  selectedCourse,
  API_BASE_URL,
  getAuthHeaders,
  loadCourseContent,
  showToast,
  navigate,
  setOpenContentActionMenuId,
  handleFolderClick,
  handleDragStart,
  handleDragOver,
  handleDrop,
  handleDragEnd,
  handleToggleVideoStatus,
  handleToggleNoteStatus,
  handleToggleTestStatus,
  handleToggleVideoFree,
  handleToggleNoteFree,
  handleToggleTestFree,
  handleSendContentNotification,
  handleStartLiveStream,
  handleEndLiveStream,
  handleEditFolder,
  handleEditYoutubeZoom,
  handleEditVideo,
  handleEditNote,
  handleEditTest,
  handleDeleteFolder,
  handleDeleteVideo,
  handleDeleteNote,
  handleDeleteTest
}: UseCourseContentHandlersProps) => {
  const handlers = useMemo(() => ({
    onToggleFolder: handleFolderClick,
    onNavigate: navigate,
    onShowToast: showToast,
    onDragStart: handleDragStart,
    onDragOver: handleDragOver,
    onDrop: handleDrop,
    onDragEnd: handleDragEnd,
    onSetActionMenu: setOpenContentActionMenuId,
    onToggleStatus: (item: any, isFolder: boolean, isVideo: boolean, isNote: boolean, isTest: boolean, isLiveStream: boolean) => {
      const itemId = normalizeId(item._id || item.id);
      if (isFolder) {
        const courseId = (selectedCourse as any)?._id || selectedCourse?.id;
        fetch(`${API_BASE_URL}/courses/${courseId}/folders/${itemId}`, {
          method: 'PUT',
          headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...item, status: item.status === 'active' ? 'inactive' : 'active' })
        }).then(() => { 
          showToast(item.status === 'active' ? 'Folder disabled' : 'Folder enabled'); 
          loadCourseContent(); 
        });
      }
      else if (isLiveStream || isVideo) handleToggleVideoStatus(item);
      else if (isNote) handleToggleNoteStatus(item);
      else if (isTest) handleToggleTestStatus(item);
      setOpenContentActionMenuId(null);
    },
    onToggleFree: (item: any, isFolder: boolean, isVideo: boolean, isNote: boolean, isTest: boolean) => {
      const itemId = normalizeId(item._id || item.id);
      if (isFolder) {
        const courseId = (selectedCourse as any)?._id || selectedCourse?.id;
        fetch(`${API_BASE_URL}/courses/${courseId}/folders/${itemId}`, {
          method: 'PUT',
          headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...item, isFree: !item.isFree })
        }).then(() => { 
          showToast(!item.isFree ? 'Folder set to Free' : 'Folder set to Locked'); 
          loadCourseContent(); 
        });
      }
      else if (isVideo) handleToggleVideoFree(item);
      else if (isNote) handleToggleNoteFree(item);
      else if (isTest) handleToggleTestFree(item);
      setOpenContentActionMenuId(null);
    },
    onNotifyStudents: (item: any) => { 
      handleSendContentNotification(item); 
      setOpenContentActionMenuId(null); 
    },
    onStartLive: (item: any) => { 
      handleStartLiveStream(item); 
      setOpenContentActionMenuId(null); 
    },
    onEndLive: (item: any) => { 
      handleEndLiveStream(item); 
      setOpenContentActionMenuId(null); 
    },
    onEdit: (item: any, isFolder: boolean, isVideo: boolean, isNote: boolean, isTest: boolean, isLiveStream: boolean) => {
      if (isFolder) handleEditFolder(item);
      else if (isVideo) {
        if (isLiveStream || item.streamStatus === 'recorded' || item.contentType === 'recorded' || item.pdf1 || item.pdf2 || item.studyMaterial) {
          handleEditYoutubeZoom(item);
        } else {
          handleEditVideo(item);
        }
      }
      else if (isNote) handleEditNote(item);
      else if (isTest) handleEditTest(item);
      setOpenContentActionMenuId(null);
    },
    onDelete: (itemId: string, itemType: string, isFolder: boolean, isVideo: boolean, isNote: boolean, isTest: boolean, isLiveStream: boolean) => {
      if (confirm(`Are you sure you want to delete this ${itemType}?`)) {
        if (isFolder) handleDeleteFolder(itemId);
        else if (isVideo) {
          handleDeleteVideo(itemId);
          if (isLiveStream) setTimeout(() => showToast('Live stream deleted successfully', 'success'), 500);
        }
        else if (isNote) handleDeleteNote(itemId);
        else if (isTest) handleDeleteTest(itemId);
      }
      setOpenContentActionMenuId(null);
    },
    getCourseId: () => (selectedCourse as any)?._id || selectedCourse?.id
  }), [
    selectedCourse, API_BASE_URL, getAuthHeaders, loadCourseContent, showToast, navigate, 
    setOpenContentActionMenuId, handleFolderClick, handleDragStart, handleDragOver, 
    handleDrop, handleDragEnd, handleToggleVideoStatus, handleToggleNoteStatus, 
    handleToggleTestStatus, handleToggleVideoFree, handleToggleNoteFree, handleToggleTestFree,
    handleSendContentNotification, handleStartLiveStream, handleEndLiveStream,
    handleEditFolder, handleEditYoutubeZoom, handleEditVideo, handleEditNote, handleEditTest,
    handleDeleteFolder, handleDeleteVideo, handleDeleteNote, handleDeleteTest
  ]);

  return handlers;
};
