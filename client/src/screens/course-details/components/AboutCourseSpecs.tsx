import React, { useState } from 'react';
import DOMPurify from 'dompurify';
import { formatCourseValidity } from '../../../lib/utils';

interface AboutCourseSpecsProps {
  courseName: string;
  description?: string;
  validity: any;
  expiryMode?: string;
  totalVideos: number;
  totalTests: number;
  totalNotes: number;
  onViewContent: () => void;
}

export const AboutCourseSpecs: React.FC<AboutCourseSpecsProps> = ({
  courseName,
  description,
  validity,
  expiryMode,
  totalVideos,
  totalTests,
  totalNotes,
  onViewContent,
}) => {
  const [expandedDesc, setExpandedDesc] = useState(false);

  // Dynamic Validity formatting mirroring Admin Settings
  const validityInfo = formatCourseValidity(validity, expiryMode);

  // Dynamic Learning Material Count
  const totalCount = totalVideos + totalTests + totalNotes;
  const learningMaterialSummary = `${totalVideos} Video lectures, ${totalTests} Tests${totalNotes > 0 ? `, ${totalNotes} Notes` : ''}`;

  return (
    <div className="mx-4 my-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-4">
      {/* Title */}
      <div>
        <h3 className="text-sm font-black text-gray-900 tracking-tight">About This Course</h3>
        <p className="text-xs font-bold text-gray-700 mt-1 line-clamp-1">{courseName}</p>
      </div>

      {/* Specs List with Icons Matching Screenshot 6 */}
      <div className="space-y-3 pt-1">
        {/* Spec 1: Validity (Set dynamically from Admin panel) */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-rounded text-lg">schedule</span>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-black text-gray-900 leading-tight">{validityInfo.title}</h4>
            <p className="text-[11px] text-gray-500 font-medium">{validityInfo.subtitle}</p>
          </div>
        </div>

        {/* Spec 2: Learning Material (Clicking jumps to Content tab) */}
        <div 
          onClick={onViewContent}
          className="flex items-center justify-between gap-3 cursor-pointer group hover:bg-gray-50/80 -mx-1 p-1 rounded-xl transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <span className="material-symbols-rounded text-lg fill-1">play_arrow</span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-black text-gray-900 leading-tight group-hover:text-primary-700 transition-colors">
                {totalCount}+ Learning Material
              </h4>
              <p className="text-[11px] text-gray-500 font-medium truncate">{learningMaterialSummary}</p>
            </div>
          </div>
          <span className="material-symbols-rounded text-gray-400 group-hover:text-primary-600 group-hover:translate-x-0.5 transition-all text-lg">
            chevron_right
          </span>
        </div>
      </div>

      {/* Description */}
      {description && (
        <div className="pt-2 border-t border-gray-100">
          <div 
            className={`text-xs text-gray-600 leading-relaxed prose prose-xs max-w-none ${!expandedDesc ? 'line-clamp-3' : ''}`}
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(description) }}
          />
          {description.length > 150 && (
            <button
              onClick={() => setExpandedDesc(!expandedDesc)}
              className="text-[11px] font-bold text-primary-700 hover:text-primary-800 mt-1 cursor-pointer"
            >
              {expandedDesc ? 'Read Less' : 'Read More...'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
