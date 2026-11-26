import React from 'react';
import { getImageUrl, formatDurationBadge } from '../../../lib/utils';
import { Video } from '../../../types';

interface FreeContentSectionProps {
  freeVideos: Video[];
  onPlayVideo: (video: Video) => void;
  onViewSyllabus: () => void;
}

export const FreeContentSection: React.FC<FreeContentSectionProps> = ({
  freeVideos,
  onPlayVideo,
  onViewSyllabus,
}) => {
  if (freeVideos.length === 0) return null;

  return (
    <div className="mx-4 my-4 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
          <span>Free Content</span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
            {freeVideos.length} Available
          </span>
        </h3>
        <button
          onClick={onViewSyllabus}
          className="text-xs font-bold text-primary-700 hover:text-primary-800 flex items-center gap-0.5 group"
        >
          View Full Syllabus
          <span className="material-symbols-rounded text-sm group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
        </button>
      </div>

      {/* Video Items List matching Screenshot 7 */}
      <div className="space-y-2.5">
        {freeVideos.slice(0, 4).map((video, idx) => {
          const thumb = video.thumbnail || video.thumbnailUrl;
          const duration = video.duration || '00:00';

          return (
            <div
              key={video.id || video._id || idx}
              onClick={() => onPlayVideo(video)}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer group border border-transparent hover:border-gray-100"
            >
              {/* Thumbnail with duration badge and play icon */}
              <div className="w-24 sm:w-28 h-15 rounded-xl bg-slate-900 relative overflow-hidden shrink-0 flex items-center justify-center">
                {thumb ? (
                  <img
                    src={getImageUrl(thumb)}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-950 to-slate-900" />
                )}
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/15 transition-colors" />

                <div className="w-7 h-7 rounded-full bg-white/95 text-primary-800 flex items-center justify-center shadow-md group-hover:scale-110 active:scale-95 transition-transform z-10">
                  <span className="material-symbols-rounded text-base fill-1 ml-0.5">play_arrow</span>
                </div>

                {duration && duration !== '00:00' && (
                  <div className="absolute bottom-1 right-1 px-1.5 py-0.2 bg-black/80 rounded text-[9px] font-bold text-white tracking-wider">
                    {formatDurationBadge(duration)}
                  </div>
                )}
              </div>

              {/* Title */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-800 line-clamp-2 leading-snug group-hover:text-primary-700 transition-colors">
                  {video.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                    Free Lecture
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Outline Button: View All Free Content matching Screenshot 7 */}
      <button
        onClick={onViewSyllabus}
        className="w-full py-2.5 rounded-xl border border-gray-300 hover:border-gray-400 bg-white font-bold text-xs text-gray-700 active:scale-[0.98] transition-all text-center"
      >
        View All Free Content
      </button>
    </div>
  );
};
