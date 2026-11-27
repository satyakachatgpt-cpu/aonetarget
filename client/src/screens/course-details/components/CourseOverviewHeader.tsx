import React from 'react';

interface CourseOverviewHeaderProps {
  title: string;
  category?: string;
  likeCount?: number;
  hasLiveClasses?: boolean;
  hasFreeContent?: boolean;
  hasTests?: boolean;
}

export const CourseOverviewHeader: React.FC<CourseOverviewHeaderProps> = ({
  title,
  category,
  likeCount = 160,
  hasLiveClasses = true,
  hasFreeContent = true,
  hasTests = true,
}) => {
  return (
    <div className="px-4 pt-3 pb-1">
      {/* Title & Likes Matching Screenshot 6 */}
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base sm:text-lg font-black text-gray-950 leading-snug flex-1 font-outfit">
          {title}
        </h2>
        <div className="flex flex-col items-center shrink-0 text-gray-400 hover:text-primary-600 transition-colors pt-0.5">
          <span className="material-symbols-rounded text-xl leading-none">thumb_up</span>
          <span className="text-[11px] font-bold text-gray-500 mt-0.5">{likeCount}</span>
        </div>
      </div>

      {/* Category Subtitle */}
      {category && (
        <p className="text-xs font-semibold text-gray-500 mt-1">
          {category}
        </p>
      )}

      {/* Badges Row Matching Screenshot 6 */}
      <div className="flex flex-wrap items-center gap-2 mt-3">
        {hasLiveClasses && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-50 text-red-600 border border-red-100/60 text-[10px] font-black uppercase tracking-wider">
            <span className="material-symbols-rounded text-xs">play_arrow</span>
            <span>LIVE CLASSES</span>
          </div>
        )}

        {hasFreeContent && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-50 text-rose-600 border border-rose-100/60 text-[10px] font-black uppercase tracking-wider">
            <span className="material-symbols-rounded text-xs">auto_awesome</span>
            <span>FREE CONTENT</span>
          </div>
        )}

        {hasTests && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-100/60 text-[10px] font-black uppercase tracking-wider">
            <span className="material-symbols-rounded text-xs">assignment</span>
            <span>TEST</span>
          </div>
        )}
      </div>
    </div>
  );
};
