import React, { useState, useRef } from 'react';
import { getImageUrl, formatDurationBadge } from '../../../lib/utils';
import { Video } from '../../../types';

interface VisualPreviewCarouselProps {
  courseImage: string | null;
  courseTitle: string;
  demoVideos: Video[];
  onPlayDemo: (video: Video) => void;
}

export const VisualPreviewCarousel: React.FC<VisualPreviewCarouselProps> = ({
  courseImage,
  courseTitle,
  demoVideos,
  onPlayDemo,
}) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Combine items: First item is always the main Course Poster / Trailer
  // If demo video exists, the first item has the demo video attached
  const primaryDemo = demoVideos.length > 0 ? demoVideos[0] : null;
  const secondaryDemos = demoVideos.slice(1, 4);

  const totalSlides = 1 + secondaryDemos.length;

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, clientWidth } = scrollContainerRef.current;
      if (clientWidth > 0) {
        const index = Math.round(scrollLeft / clientWidth);
        setActiveSlide(index);
      }
    }
  };

  const scrollToSlide = (index: number) => {
    if (scrollContainerRef.current) {
      const width = scrollContainerRef.current.clientWidth;
      scrollContainerRef.current.scrollTo({
        left: index * width,
        behavior: 'smooth',
      });
      setActiveSlide(index);
    }
  };

  return (
    <div className="w-full px-4 pt-1 pb-2">
      {/* 100% Full-Width Swipeable Hero Carousel Container (Matching Screenshot 6) */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="w-full flex overflow-x-auto hide-scrollbar snap-x snap-mandatory rounded-2xl shadow-sm border border-gray-100 bg-slate-950"
      >
        {/* Slide 1: Main Course Poster / Trailer (Full Width, Zero Awkward Cut-off) */}
        <div 
          onClick={() => {
            if (primaryDemo) onPlayDemo(primaryDemo);
          }}
          className={`w-full shrink-0 snap-center aspect-[16/9] relative overflow-hidden flex items-center justify-center bg-slate-950 ${primaryDemo ? 'cursor-pointer group' : ''}`}
        >
          {courseImage ? (
            <img
              src={courseImage}
              alt={courseTitle}
              className="w-full h-full object-contain bg-slate-950"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 flex items-center justify-center p-6 text-center">
              <span className="text-white font-black text-lg opacity-80">{courseTitle}</span>
            </div>
          )}

          {/* If Demo Video exists, overlay Play button & Duration Badge matching Screenshot 6 */}
          {primaryDemo && (
            <>
              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 group-hover:from-black/70 transition-colors pointer-events-none" />

              {/* DEMO Tag in Top-Left */}
              <div className="absolute top-3 left-3 bg-emerald-500 text-white font-black text-[10px] px-2.5 py-1 rounded-md shadow-md tracking-wider uppercase flex items-center gap-1 z-10">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span>DEMO</span>
              </div>

              {/* Central Play Button */}
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/95 text-primary-700 flex items-center justify-center shadow-xl group-hover:scale-110 active:scale-90 transition-transform">
                  <span className="material-symbols-rounded text-2xl sm:text-3xl fill-1 ml-0.5">play_arrow</span>
                </div>
              </div>

              {/* Bottom Badges: Course Preview & Duration */}
              <div className="absolute bottom-3 inset-x-3 flex items-center justify-between text-white z-10 pointer-events-none">
                <span className="text-[11px] font-bold bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-md truncate max-w-[65%]">
                  {primaryDemo.title || 'Course Preview'}
                </span>
                <span className="text-[11px] font-black bg-black/80 backdrop-blur-xs px-2 py-0.5 rounded-md font-mono tracking-tight">
                  {formatDurationBadge(primaryDemo.duration || '00:00')}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Subsequent Slides: Additional Demo Lectures (Each takes 100% width) */}
        {secondaryDemos.map((video, idx) => {
          const thumb = video.thumbnail || video.thumbnailUrl || courseImage;
          return (
            <div 
              key={video.id || video._id || idx}
              onClick={() => onPlayDemo(video)}
              className="w-full shrink-0 snap-center aspect-[16/9] relative overflow-hidden flex items-center justify-center bg-slate-950 cursor-pointer group"
            >
              {thumb ? (
                <img
                  src={getImageUrl(thumb)}
                  alt={video.title}
                  className="w-full h-full object-contain bg-slate-950"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-900 to-indigo-950 flex items-center justify-center" />
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 group-hover:from-black/70 transition-colors pointer-events-none" />

              {/* DEMO Tag */}
              <div className="absolute top-3 left-3 bg-emerald-500 text-white font-black text-[10px] px-2.5 py-1 rounded-md shadow-md tracking-wider uppercase z-10">
                DEMO LECTURE {idx + 2}
              </div>

              {/* Play Button */}
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="w-12 h-12 rounded-full bg-white/95 text-primary-700 flex items-center justify-center shadow-xl group-hover:scale-110 active:scale-90 transition-transform">
                  <span className="material-symbols-rounded text-2xl fill-1 ml-0.5">play_arrow</span>
                </div>
              </div>

              {/* Bottom Labels */}
              <div className="absolute bottom-3 inset-x-3 flex items-center justify-between text-white z-10 pointer-events-none">
                <span className="text-[11px] font-bold bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-md truncate max-w-[65%]">
                  {video.title}
                </span>
                <span className="text-[11px] font-black bg-black/80 backdrop-blur-xs px-2 py-0.5 rounded-md font-mono tracking-tight">
                  {formatDurationBadge(video.duration || '00:00')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Dots (Only if multiple slides) */}
      {totalSlides > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-2">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <button
              key={i}
              onClick={() => scrollToSlide(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                activeSlide === i ? 'w-5 bg-primary-600' : 'w-1.5 bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
