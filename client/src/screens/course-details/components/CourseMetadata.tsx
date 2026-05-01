import React from 'react';

interface CourseMetadataProps {
  courseName: string;
  instructor: any;
  category: string | undefined;
  enrollmentCount: number | undefined;
  isEnrolled: boolean;
  progressPercent: number;
  completedVideosCount: number;
  totalVideos: number;
  onSharePlatform: (platform: string) => void;
}

const CourseMetadata: React.FC<CourseMetadataProps> = ({
  courseName,
  instructor,
  category,
  enrollmentCount,
  isEnrolled,
  progressPercent,
  completedVideosCount,
  totalVideos,
  onSharePlatform,
}) => {
  return (
    <div className="px-4 -mt-8 relative z-10 animate-fade-in-up">
      <div className="card-premium p-5">
        <h1 className="text-lg font-extrabold text-gray-800 leading-tight">{courseName}</h1>
        {instructor && (
          <div className="flex items-center gap-2.5 mt-3">
            <div className="w-8 h-8 bg-primary-50 rounded-full flex items-center justify-center">
              <span className="material-symbols-rounded text-primary-600 text-base">person</span>
            </div>
            <span className="text-sm text-gray-600 font-medium">
              {typeof instructor === 'string' 
                ? instructor 
                : (instructor?.name || instructor?.instructorHindi || '')}
            </span>
          </div>
        )}
        <div className="flex flex-wrap gap-2 mt-3">
          {category && (
            <span className="inline-flex items-center gap-1 bg-primary-50 text-primary-600 text-[10px] font-bold px-3 py-1.5 rounded-full">
              <span className="material-symbols-rounded text-xs">category</span>
              {category}
            </span>
          )}
          {(enrollmentCount !== undefined && enrollmentCount > 0) && (
            <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-[10px] font-bold px-3 py-1.5 rounded-full">
              <span className="material-symbols-rounded text-xs">group</span>
              {enrollmentCount} Enrolled
            </span>
          )}
        </div>

        {isEnrolled && (
          <div className="mt-4 bg-surface-100 rounded-2xl p-3">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-gray-500 font-medium">{completedVideosCount}/{totalVideos} videos completed</span>
              <span className="font-bold text-primary-600">{progressPercent}%</span>
            </div>
            <div className="h-2.5 bg-surface-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full transition-all duration-500 relative"
                style={{ width: `${progressPercent}%` }}
              >
                {progressPercent > 5 && <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse-soft" />}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2.5 mt-4 pt-4 border-t border-surface-200">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Share:</span>
          {[
            { 
              platform: 'whatsapp', 
              color: '#25D366', 
              icon: (
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              )
            },
            { 
              platform: 'telegram', 
              color: '#26A5E4', 
              icon: (
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.94-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .33z"/>
                </svg>
              )
            },
          ].map(s => (
            <button
              key={s.platform}
              onClick={() => onSharePlatform(s.platform)}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white active:scale-[0.97] transition-all duration-200 hover:shadow-card"
              style={{ backgroundColor: s.color }}
            >
              {s.icon}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CourseMetadata;
