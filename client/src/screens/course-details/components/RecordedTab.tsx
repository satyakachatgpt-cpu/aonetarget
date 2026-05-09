import React from 'react';
import { getImageUrl, getYouTubeThumbnail, getPdfUrl, getGradientPlaceholder } from '../../../lib/utils';
import { CATEGORY_GRADIENTS } from '../../../constants';
import { Video } from '../../../types';

interface RecordedTabProps {
  filteredFolders: any[];
  filteredVideos: Video[];
  navigationHistory: any[];
  isEnrolled: boolean;
  isExpired?: boolean;
  uniqueCompletedVideos: Set<string>;
  failedImages: Set<string>;
  onNavigateIntoFolder: (folder: any) => void;
  onNavigateUp: () => void;
  onVideoClick: (video: Video) => void;
  onImageError: (id: string) => void;
  getVideoId: (video: any, index: number) => string;
  normalizeId: (id: any) => string | null;
  computeStatus: (v: any) => string;
}

const RecordedTab: React.FC<RecordedTabProps> = ({
  filteredFolders,
  filteredVideos,
  navigationHistory,
  isEnrolled,
  isExpired,
  uniqueCompletedVideos,
  failedImages,
  onNavigateIntoFolder,
  onNavigateUp,
  onVideoClick,
  onImageError,
  getVideoId,
  normalizeId,
  computeStatus,
}) => {
  return (
    <div className="space-y-3">
      {navigationHistory.length > 0 && (
        <button
          onClick={onNavigateUp}
          className="flex items-center gap-1.5 text-primary-600 font-black text-[10px] mb-4 px-3 py-2 bg-primary-50 w-fit rounded-xl hover:bg-primary-100 transition-all uppercase tracking-widest border border-primary-100/50 active:scale-95"
        >
          <span className="material-symbols-rounded text-base">chevron_left</span>
          Back to {navigationHistory.length > 1 ? navigationHistory[navigationHistory.length - 2].title : 'All Content'}
        </button>
      )}

      <div className="space-y-4">
        {filteredFolders.map((folder) => (
          <div
            key={normalizeId(folder.id || folder._id)}
            onClick={() => onNavigateIntoFolder(folder)}
            className="bg-white p-4 cursor-pointer active:scale-[0.98] transition-all flex items-center justify-between group rounded-[1.8rem] border-[1.5px] border-gray-50 shadow-sm hover:shadow-md hover:border-primary-100"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-[#3F51B5] rounded-[1.2rem] flex items-center justify-center text-white shadow-lg overflow-hidden relative">
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span className="material-symbols-rounded text-2xl">folder</span>
              </div>
              <div>
                <h4 className="font-black text-gray-900 text-sm tracking-tight leading-none mb-1.5 transition-colors group-hover:text-primary-600">
                  {folder.title || (folder as any).name || 'Chapter'}
                </h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.15em] opacity-40">SECTION</p>
              </div>
            </div>
            <span className="material-symbols-rounded text-gray-300 group-hover:text-primary-500 transition-all mr-1">chevron_right</span>
          </div>
        ))}
      </div>

      {filteredVideos.length === 0 &&
        filteredFolders.length === 0 ? (
        <div className="card-premium p-10 text-center animate-fade-in-up">
          <div className="w-16 h-16 bg-surface-200 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-rounded text-3xl text-gray-300">video_library</span>
          </div>
          <p className="text-gray-400 font-medium text-sm">No items in this folder</p>
        </div>
      ) : (
        filteredVideos.map((video, index) => {
          const videoId = getVideoId(video, index);
          const isCompleted = uniqueCompletedVideos.has(videoId);
          const canPlay = ((isEnrolled && !isExpired) || video.isFree || video.isDemo || (index === 0 && navigationHistory.length === 0));
          const isLocked = !canPlay;
          return (
            <div
              key={videoId}
              onClick={() => !isLocked && onVideoClick(video)}
              className={`card-premium overflow-hidden cursor-pointer active:scale-[0.97] transition-all duration-200 animate-fade-in-up ${isLocked ? 'opacity-70' : ''}`}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="flex gap-3 p-3 pb-2">
                <div className="relative w-28 h-20 rounded-2xl overflow-hidden flex-shrink-0">
                  {!failedImages.has(video.id) ? (
                    <img
                      src={getImageUrl(video.thumbnail) || getYouTubeThumbnail(video.youtubeUrl || video.videoUrl || '') || `https://picsum.photos/400/225?sig=${video.id}`}
                      alt={video.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={() => onImageError(video.id)}
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${getGradientPlaceholder(video.title, CATEGORY_GRADIENTS).gradient} flex items-center justify-center`}>
                      <span className="text-white text-2xl font-bold opacity-60">{getGradientPlaceholder(video.title, CATEGORY_GRADIENTS).initial}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    {isLocked ? (
                      <div className="w-9 h-9 bg-gray-800/80 rounded-full flex items-center justify-center">
                        <span className="material-symbols-rounded text-lg text-white">lock</span>
                      </div>
                    ) : (
                      <div className="w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow-card">
                        <span className="material-symbols-rounded text-lg text-primary-600">play_arrow</span>
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                    {video.duration || '00:00'}
                  </div>
                  {(video.isFree || video.isDemo || (index === 0 && navigationHistory.length === 0)) && !isEnrolled && (
                    <div className="absolute top-1.5 left-1.5 bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                      {video.isDemo ? 'DEMO' : 'FREE'}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-start gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5 ${isLocked ? 'bg-surface-200 text-gray-400' : isCompleted ? 'bg-green-100 text-green-600' : 'bg-primary-50 text-primary-600'}`}>
                      {isCompleted ? <span className="material-symbols-rounded text-xs">check</span> : index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-gray-800 line-clamp-2 leading-tight">{video.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gray-400 font-medium">{video.duration || '00:00'} min</span>
                        {isCompleted && (
                          <span className="text-[10px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded">Completed</span>
                        )}
                        {isLocked && (
                          <span className="text-[10px] text-orange-600 font-bold bg-orange-50 px-1.5 py-0.5 rounded">Locked</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {isEnrolled && !isLocked && (
                  <div
                    className={`self-center w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 ${isCompleted ? 'bg-green-100 text-green-600 shadow-sm' : 'bg-surface-100 text-gray-300 opacity-50'}`}
                    title={isCompleted ? 'Completed' : 'Watching progress...'}
                  >
                    <span className="material-symbols-rounded text-lg">{isCompleted ? 'check_circle' : 'circle'}</span>
                  </div>
                )}
              </div>
              {/* DEFENSIVE RENDERING FOR ATTACHMENTS (PRESERVED FROM LIVE) */}
              {(video.pdf1 || video.pdf2 || video.studyMaterial || video.pdf1Url || video.pdf2Url || video.studyMaterialUrl || video.pdfUrl || video.documentUrl) && !isLocked && (
                <div className="flex flex-wrap gap-2 px-3 pb-3 relative z-10 border-t border-gray-50 pt-2 mx-3">
                  {(video.pdf1 || video.pdf1Url || video.pdfUrl) && (
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        const url = video.pdf1 || video.pdf1Url || video.pdfUrl;
                        window.open(`/#/pdf-viewer?url=${encodeURIComponent(getPdfUrl(url))}&title=${encodeURIComponent('PDF 1')}`, '_blank'); 
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 text-[9px] font-black uppercase tracking-widest border border-red-100/50 shadow-sm"
                    >
                      <span className="material-symbols-rounded text-[14px]">picture_as_pdf</span>
                      PDF 1
                    </button>
                  )}
                  {(video.pdf2 || video.pdf2Url) && (
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        const url = video.pdf2 || video.pdf2Url;
                        window.open(`/#/pdf-viewer?url=${encodeURIComponent(getPdfUrl(url))}&title=${encodeURIComponent('PDF 2')}`, '_blank'); 
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 text-[9px] font-black uppercase tracking-widest border border-red-100/50 shadow-sm"
                    >
                      <span className="material-symbols-rounded text-[14px]">picture_as_pdf</span>
                      PDF 2
                    </button>
                  )}
                  {(video.studyMaterial || video.studyMaterialUrl || video.documentUrl || video.material) && (
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        const url = video.studyMaterial || video.studyMaterialUrl || video.documentUrl || video.material;
                        window.open(`/#/pdf-viewer?url=${encodeURIComponent(getPdfUrl(url))}&title=${encodeURIComponent('Study Material')}`, '_blank'); 
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-widest border border-indigo-100/50 shadow-sm"
                    >
                      <span className="material-symbols-rounded text-[14px]">auto_stories</span>
                      Material
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default RecordedTab;
