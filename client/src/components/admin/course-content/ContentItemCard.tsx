import React from 'react';
import { getImageUrl, getPdfUrl } from '../../../lib/utils';

interface ContentItemCardProps {
  item: any;
  type?: string;
  level: number;
  isActiveUploadFolder: boolean;
  draggedItemId?: string | null;
  dragOverItemId?: string | null;
  isSearching: boolean;
  openContentActionMenuId: string | null;
  handlers: {
    onNavigate: (path: string, state?: any) => void;
    onShowToast: (msg: string, type?: string) => void;
    onDragStart: (e: any, item: any) => void;
    onDragOver: (e: any, item: any) => void;
    onDrop: (e: any, item: any) => void;
    onDragEnd: () => void;
    onSetActionMenu: (id: string | null) => void;
    onToggleStatus: (item: any, isFolder: boolean, isVideo: boolean, isNote: boolean, isTest: boolean, isLiveStream: boolean) => void;
    onToggleFree: (item: any, isFolder: boolean, isVideo: boolean, isNote: boolean, isTest: boolean) => void;
    onNotifyStudents: (item: any) => void;
    onStartLive: (item: any) => void;
    onEndLive: (item: any) => void;
    onEdit: (item: any, isFolder: boolean, isVideo: boolean, isNote: boolean, isTest: boolean, isLiveStream: boolean) => void;
    onDelete: (itemId: string, itemType: string, isFolder: boolean, isVideo: boolean, isNote: boolean, isTest: boolean, isLiveStream: boolean) => void;
    getCourseId: () => string | undefined;
  };
}

const normalizeId = (id: string | undefined | null) => id ? String(id).trim() : null;

const ContentItemCard: React.FC<ContentItemCardProps> = ({
  item,
  level,
  isActiveUploadFolder,
  draggedItemId,
  dragOverItemId,
  isSearching,
  openContentActionMenuId,
  handlers,
}) => {
  const isVideo = item.type === 'video' || item.contentType === 'video' || item.contentType === 'recorded' || item.streamStatus === 'recorded';
  const isNote = item.type === 'note' || item.contentType === 'note' || item.type === 'document' || item.contentType === 'document';
  const isTest = item.type === 'test' || item.contentType === 'test';
  const itemId = normalizeId(item._id || item.id);
  const isLiveStream = (item?.contentType === 'live_stream' || item?.type === 'live' || item?.streamType === 'live' || item?.platform === 'youtube_zoom' || item?.streamStatus === 'recorded' || item?.contentType === 'recorded');

  const getCalculatedLiveStatus = (item: any) => {
    if (!isLiveStream) return null;
    const lifecycleStatus = (item.streamStatus || (['upcoming', 'live', 'ended'].includes(item.status) ? item.status : 'upcoming')).toLowerCase();

    if (['ended', 'inactive', 'completed', 'finished', 'disable', 'recorded'].includes(lifecycleStatus)) {
      return 'ended';
    }
    if (lifecycleStatus === 'live') {
      return 'live';
    }
    return 'upcoming';
  };

  const currentLiveStatus = getCalculatedLiveStatus(item);
  const isActuallyLive = currentLiveStatus === 'live';
  const isActuallyEnded = currentLiveStatus === 'ended';
  const isActuallyUpcoming = currentLiveStatus === 'upcoming';

  return (
    <div
      onClick={() => {
        const courseId = handlers.getCourseId();
        if (isLiveStream) {
          const link = item.meetingLink || item.link || item.url || item.videoUrl;
          if (link) {
            const isYoutube = link.includes('youtube.com') || link.includes('youtu.be');
            if (isYoutube && courseId) {
              handlers.onNavigate(`/watch/${courseId}/${itemId}`, {
                state: {
                  fromAdmin: true,
                  returnTo: window.location.pathname + window.location.search + window.location.hash
                }
              });
            } else {
              window.open(link, '_blank');
            }
          }
          else handlers.onShowToast('Meeting link not available', 'error');
        } else if (isVideo) {
          if (courseId) {
            handlers.onNavigate(`/watch/${courseId}/${itemId}`, {
              state: {
                fromAdmin: true,
                returnTo: window.location.pathname + window.location.search + window.location.hash
              }
            });
          }
        } else if (isNote) {
          const url = item.fileUrl || item.url || item.link;
          if (url) {
            window.open(`/#/pdf-viewer?url=${encodeURIComponent(getPdfUrl(url))}&title=${encodeURIComponent(item.title)}`, '_blank');
          }
        } else if (isTest) {
          // tests could also open in a new tab
        }
      }}
      title={`Click to view content`}
      style={{ 
        marginLeft: `${level * 24}px`,
        opacity: draggedItemId === itemId ? 0.5 : 1,
        borderTop: dragOverItemId === itemId ? '2px solid #3b82f6' : ''
      }}
      className={`bg-white border ${isActiveUploadFolder ? 'border-blue-400 shadow-md ring-2 ring-blue-100' : 'border-gray-50'} rounded-[12px] py-4 px-4 flex items-center gap-4 group hover:bg-gray-50/50 transition-all cursor-pointer mb-3`}
      draggable={!isSearching}
      onDragStart={(e) => handlers.onDragStart(e, item)}
      onDragOver={(e) => handlers.onDragOver(e, item)}
      onDrop={(e) => handlers.onDrop(e, item)}
      onDragEnd={handlers.onDragEnd}
    >
      <div className="text-gray-300 shrink-0 flex items-center gap-1">
        <span className="material-symbols-outlined text-[20px] cursor-grab">drag_indicator</span>
      </div>

      <div className={`w-[100px] h-[64px] rounded-[10px] overflow-hidden relative flex items-center justify-center shrink-0 border border-gray-100 ${isNote ? 'bg-[#fff7ed]' :
        isTest ? 'bg-[#f0fdf4]' :
          isLiveStream ? 'bg-[#fdf2ff]' : 'bg-[#eff6ff]'
        }`}>
        {item.thumbnail || item.image ? (
          <img src={getImageUrl(item.thumbnail || item.image)} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className={`material-symbols-outlined text-[28px] ${isNote ? 'text-[#f97316]' :
            isTest ? 'text-[#22c55e]' :
              isLiveStream ? 'text-[#d946ef]' : 'text-[#3b82f6]'
            }`}>
            {isNote ? 'description' :
              isTest ? 'assignment' :
                isLiveStream ? 'sensors' : 'play_circle'}
          </span>
        )}
        {isActuallyLive && (
          <div className="absolute top-1 left-1 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded flex items-center gap-1">
            <span className="w-1 h-1 bg-white rounded-full animate-pulse"></span>
            LIVE
          </div>
        )}
        {isActuallyEnded && (
          <div className="absolute top-1 left-1 bg-gray-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded flex items-center gap-1">
            ENDED
          </div>
        )}
        {isActuallyUpcoming && (
          <div className="absolute top-1 left-1 bg-blue-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded flex items-center gap-1">
            UPCOMING
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-[#1a1a1a] text-[15px] truncate">
          {item.title || item.name}
        </h4>
        <div className="flex flex-col mt-0.5">
          {isActuallyLive && (
            <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider mb-0.5">Event is live</span>
          )}
          {isActuallyEnded && (
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Event ended</span>
          )}
          {isActuallyUpcoming && (
            <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider mb-0.5">Event scheduled</span>
          )}
          <div className="mt-1">
            <span className="text-[12px] text-gray-500 font-medium">
              {isVideo ? (
                isLiveStream ?
                  `Platform: ${item.platform || 'YouTube'}, Instructor: ${item.instructor || 'N/A'}${item.publishOn ? ` | ${item.publishOn}` : ''}` :
                  (item.datetime ? `Duration: ${item.duration || 'N/A'}, Views: ${item.views ?? item.viewCount ?? 0}, Date & Time: ${item.datetime}` : `Duration: ${item.duration || 'N/A'}, Views: ${item.views ?? item.viewCount ?? 0}`)
              ) : (
                `Date & Time: ${item.datetime || '09:31 AM 06th March 2026'}`
              )}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2.5">
          <div className="px-3 py-0.5 rounded-full text-[10px] font-bold text-gray-500 bg-gray-100 w-fit uppercase tracking-wider">
            {isLiveStream ? 'Live stream' : isNote ? 'PDF' : isTest ? 'Test' : isVideo ? 'Video' : 'Content'}
          </div>
          {(item.pdf1 || item.pdf1Url || item.pdfUrl) && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                const url = item.pdf1 || item.pdf1Url || item.pdfUrl;
                window.open(`/#/pdf-viewer?url=${encodeURIComponent(getPdfUrl(url))}&title=${encodeURIComponent('PDF 1')}`, '_blank');
              }}
              className="px-2 py-0.5 rounded-md text-[9px] font-black text-red-600 bg-red-50 border border-red-100 uppercase tracking-tighter hover:bg-red-100 transition-colors cursor-pointer"
            >
              PDF 1
            </button>
          )}
          {(item.pdf2 || item.pdf2Url) && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                const url = item.pdf2 || item.pdf2Url;
                window.open(`/#/pdf-viewer?url=${encodeURIComponent(getPdfUrl(url))}&title=${encodeURIComponent('PDF 2')}`, '_blank');
              }}
              className="px-2 py-0.5 rounded-md text-[9px] font-black text-red-600 bg-red-50 border border-red-100 uppercase tracking-tighter hover:bg-red-100 transition-colors cursor-pointer"
            >
              PDF 2
            </button>
          )}
          {(item.studyMaterial || item.studyMaterialUrl || item.documentUrl || item.material) && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                const url = item.studyMaterial || item.studyMaterialUrl || item.documentUrl || item.material;
                window.open(`/#/pdf-viewer?url=${encodeURIComponent(getPdfUrl(url))}&title=${encodeURIComponent('Material')}`, '_blank');
              }}
              className="px-2 py-0.5 rounded-md text-[9px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 uppercase tracking-tighter hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              Material
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlers.onSetActionMenu(openContentActionMenuId === itemId ? null : itemId);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold transition-all border ${openContentActionMenuId === itemId ? 'bg-black text-white border-black shadow-lg shadow-black/10' : 'bg-white text-gray-700 border-gray-100 hover:border-gray-300'}`}
        >
          Actions
          <span className={`material-symbols-outlined text-[18px] transition-transform duration-300 ${openContentActionMenuId === itemId ? 'rotate-180' : ''}`}>expand_more</span>
        </button>

        {openContentActionMenuId === itemId && (
          <div
            className="absolute right-0 top-full mt-2 w-[220px] bg-white rounded-2xl shadow-2xl z-[100] border border-gray-100 py-3 animate-in fade-in zoom-in duration-200 origin-top-right"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlers.onToggleStatus(item, false, isVideo, isNote, isTest, isLiveStream);
              }}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className={`material-symbols-outlined text-[20px] ${item.status === 'active' ? 'text-green-500' : 'text-gray-400'}`}>
                  {item.status === 'active' ? 'visibility' : 'visibility_off'}
                </span>
                <span className="text-[13px] font-bold text-gray-600 group-hover:text-gray-900">
                  {item.status === 'active' ? 'Enabled (Visible)' : 'Disabled (Hidden)'}
                </span>
              </div>
              <div className={`w-[24px] h-[14px] rounded-full relative flex items-center transition-all ${item.status === 'active' ? 'bg-green-500' : 'bg-gray-200'}`}>
                <div className={`absolute ${item.status === 'active' ? 'right-[2px]' : 'left-[2px]'} w-[10px] h-[10px] bg-white rounded-full shadow-sm`}></div>
              </div>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handlers.onToggleFree(item, false, isVideo, isNote, isTest);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors group"
            >
              <span className={`material-symbols-outlined text-[20px] ${item.isFree ? 'text-amber-400' : 'text-gray-400'}`}>
                {item.isFree ? 'lock_open' : 'lock'}
              </span>
              <span className="text-[13px] font-bold text-gray-600 group-hover:text-gray-900">
                {item.isFree ? 'Unlock Content' : 'Lock Content'}
              </span>
            </button>

            {isLiveStream && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlers.onNotifyStudents(item);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors group"
              >
                <span className="material-symbols-outlined text-[20px] text-blue-400">notifications_active</span>
                <span className="text-[13px] font-bold text-gray-600 group-hover:text-gray-900">Notify Students</span>
              </button>
            )}

            {isLiveStream && isActuallyUpcoming && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlers.onStartLive(item);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-green-50 transition-colors group"
              >
                <span className="material-symbols-outlined text-[20px] text-green-500">sensors</span>
                <span className="text-[13px] font-bold text-green-600 group-hover:text-green-800">Start Live Now</span>
              </button>
            )}

            {isLiveStream && isActuallyLive && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlers.onEndLive(item);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 transition-colors group"
              >
                <span className="material-symbols-outlined text-[20px] text-orange-500">stop_circle</span>
                <span className="text-[13px] font-bold text-orange-600 group-hover:text-orange-800">End Live Stream</span>
              </button>
            )}

            <div className="h-px bg-gray-50 my-2 mx-3"></div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handlers.onEdit(item, false, isVideo, isNote, isTest, isLiveStream);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors group"
            >
              <span className="material-symbols-outlined text-[20px] text-indigo-400">edit_square</span>
              <span className="text-[13px] font-bold text-gray-600 group-hover:text-gray-900">Edit Details</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handlers.onDelete(itemId || '', item.type, false, isVideo, isNote, isTest, isLiveStream);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 text-red-600 transition-all group"
            >
              <span className="material-symbols-outlined text-[20px] text-red-300 group-hover:text-red-600">delete</span>
              <span className="text-[13px] font-bold">Delete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(ContentItemCard);
