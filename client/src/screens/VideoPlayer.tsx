import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import SecureVideoPlayer from '../components/SecureVideoPlayer';

const VideoPlayer: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { video, courseTitle, courseId } = location.state || {};
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    if (!video) {
      navigate(-1);
      return;
    }

    const handleResize = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    handleResize();

    // Hide everything else
    document.body.style.overflow = 'hidden';
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      document.body.style.overflow = 'auto';
    };
  }, [video, navigate]);

  if (!video) return null;

  const videoUrl = video.videoUrl || video.url || video.link || video.youtubeUrl || '';

  const handleMarkDone = () => {
    // We could call an API here if needed, but for now just navigate back
    navigate(-1);
  };

  return (
    <div className="fixed inset-0 bg-black z-[9999] flex flex-col font-outfit overflow-hidden">
      {/* Immersive Header - Visible in Portrait */}
      {!isLandscape && (
        <div className="p-4 flex items-center justify-between text-white bg-gradient-to-b from-black/90 to-transparent absolute top-0 left-0 right-0 z-20">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/5 active:scale-90 transition-all">
            <span className="material-symbols-rounded">arrow_back</span>
          </button>
          <div className="flex-1 px-4 text-center">
            <h1 className="text-sm font-black truncate tracking-tight">{video.title}</h1>
            <p className="text-[9px] opacity-60 uppercase tracking-[0.2em] font-bold text-blue-400">{courseTitle}</p>
          </div>
          <button onClick={handleMarkDone} className="px-4 py-2 rounded-full bg-green-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-lg shadow-green-500/20 active:scale-95 transition-all">
            <span className="material-symbols-rounded text-sm">done_all</span>
            Done
          </button>
        </div>
      )}

      {/* Video Hub */}
      <div className={`relative flex-1 flex items-center justify-center bg-black ${isLandscape ? 'h-full w-full' : ''}`}>
        {isLandscape && (
          <button 
            onClick={() => navigate(-1)} 
            className="absolute top-6 left-6 z-30 w-12 h-12 rounded-full bg-black/60 backdrop-blur-2xl flex items-center justify-center text-white border border-white/10 active:scale-90 transition-all shadow-2xl"
          >
            <span className="material-symbols-rounded text-2xl">arrow_back</span>
          </button>
        )}
        
        <div className={`w-full ${isLandscape ? 'h-full' : 'aspect-video shadow-[0_0_100px_rgba(0,0,0,0.5)]'}`}>
          <SecureVideoPlayer
            src={videoUrl}
            title={video.title}
            className="w-full h-full"
            videoId={video._id || video.id || video.videoId || videoUrl}
            courseId={courseId || video.courseId || ''}
            courseTitle={courseTitle || ''}
            thumbnail={video.thumbnail || video.thumbnailUrl || ''}
            duration={video.duration || ''}
          />
        </div>
      </div>

      {/* Modern Control Panel - Only in Portrait */}
      {!isLandscape && (
        <div className="bg-[#0A0A0A] p-6 text-white rounded-t-[3rem] -mt-10 relative z-10 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] border-t border-white/5 flex-shrink-0 animate-slide-up">
          <div className="w-16 h-1.5 bg-white/10 rounded-full mx-auto mb-8" />
          
          <div className="flex justify-between items-start gap-4 mb-8">
            <div className="flex-1">
              <h2 className="text-2xl font-black leading-tight tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">{video.title}</h2>
              <div className="flex items-center gap-3 mt-4">
                <span className="px-3 py-1 bg-brandBlue/20 text-brandBlue border border-brandBlue/20 rounded-lg text-[10px] font-black uppercase tracking-[0.1em]">{video.duration}</span>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  Now Playing
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-10">
            {[
              { icon: 'download_for_offline', label: 'Offline', color: 'blue' },
              { icon: 'speed', label: 'Speed', color: 'purple' },
              { icon: 'high_quality', label: '1080p', color: 'orange' },
              { icon: 'contact_support', label: 'Support', color: 'green' }
            ].map((btn, i) => (
              <button key={i} className="flex flex-col items-center gap-2.5 group">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center group-active:scale-95 transition-all group-active:bg-brandBlue/20 group-active:border-brandBlue/30">
                  <span className="material-symbols-rounded text-gray-300 group-hover:text-white transition-colors">{btn.icon}</span>
                </div>
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest group-hover:text-gray-300">{btn.label}</span>
              </button>
            ))}
          </div>

          <div className="p-5 bg-gradient-to-br from-white/5 to-transparent rounded-[2rem] border border-white/5 backdrop-blur-sm">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brandBlue to-blue-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-brandBlue/20">AT</div>
                <div className="flex-1">
                   <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-none">Institute Faculty</p>
                   <p className="text-base font-bold mt-1.5">Aone Target Team</p>
                </div>
                <button className="px-5 py-2.5 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Share</button>
             </div>
          </div>
          
          <div className="h-12" /> {/* Bottom Spacer */}
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
