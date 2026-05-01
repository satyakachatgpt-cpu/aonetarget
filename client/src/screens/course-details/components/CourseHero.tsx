import React from 'react';

interface CourseHeroProps {
  courseImage: string | null;
  courseName: string;
  onBack: () => void;
  onShare: () => void;
  shareSuccess: boolean;
}

const CourseHero: React.FC<CourseHeroProps> = ({
  courseImage,
  courseName,
  onBack,
  onShare,
  shareSuccess,
}) => {
  return (
    <div className="relative">
      {courseImage ? (
        <div className="w-full h-56 bg-gradient-to-br from-primary-800 to-primary-600 relative overflow-hidden">
          <img 
            src={courseImage} 
            alt={courseName} 
            className="w-full h-full object-cover" 
            onError={(e) => { e.currentTarget.style.display = 'none'; }} 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
        </div>
      ) : (
        <div className="w-full h-48 bg-gradient-to-br from-primary-800 via-primary-700 to-primary-50 relative flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full blur-3xl" />
          </div>
          <span className="material-symbols-rounded text-white/15 text-[120px]">school</span>
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      )}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-10">
        <button 
          onClick={onBack} 
          className="w-10 h-10 rounded-full glass-dark flex items-center justify-center active:scale-[0.97] transition-all duration-200"
        >
          <span className="material-symbols-rounded text-white text-xl">arrow_back</span>
        </button>
        <div className="relative">
          <button 
            onClick={onShare} 
            className="w-10 h-10 rounded-full glass-dark flex items-center justify-center active:scale-[0.97] transition-all duration-200"
          >
            <span className="material-symbols-rounded text-white text-xl">share</span>
          </button>
          {shareSuccess && (
            <div className="absolute -bottom-10 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-elevated animate-fade-in">
              <span className="material-symbols-rounded text-xs mr-1">check_circle</span>
              Link copied!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseHero;
