import React from 'react';

interface Video {
  id: string;
  _id?: string;
  title: string;
  thumbnail?: string;
  duration?: string;
}

interface PlaylistProps {
  videos: Video[];
  activeVideoId: string;
  onSelect: (videoId: string) => void;
}

const Playlist: React.FC<PlaylistProps> = ({ videos, activeVideoId, onSelect }) => {
  return (
    <div className="flex-1 overflow-y-auto bg-black/95 p-4 sm:p-6 pb-20 font-outfit">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em]">Playlist</h3>
        <span className="text-white/40 text-[9px] font-bold uppercase">{videos.length} Lectures</span>
      </div>
      
      <div className="space-y-3">
        {videos.map((v) => {
          const vId = v.id || v._id || '';
          const isActive = vId === activeVideoId;
          
          return (
            <button
              key={vId}
              onClick={() => onSelect(vId)}
              className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all active:scale-[0.98] ${
                isActive 
                  ? 'bg-primary-600/20 border border-primary-600/30' 
                  : 'bg-white/5 border border-transparent hover:bg-white/10'
              }`}
            >
              <div className="relative w-24 aspect-video rounded-xl overflow-hidden shrink-0 bg-white/5 shadow-lg shadow-black/20">
                {v.thumbnail && (
                  <img src={v.thumbnail} alt="" className="w-full h-full object-cover opacity-80" />
                )}
                {isActive && (
                  <div className="absolute inset-0 bg-primary-600/40 flex items-center justify-center backdrop-blur-[2px]">
                    <span className="material-symbols-rounded text-white animate-pulse">play_arrow</span>
                  </div>
                )}
              </div>
              
              <div className="flex-1 text-left min-w-0">
                <p className={`text-xs font-bold truncate ${isActive ? 'text-primary-400' : 'text-white'}`}>
                  {v.title}
                </p>
                <div className="flex items-center gap-1.5 mt-1 opacity-40">
                  <span className="material-symbols-rounded text-xs text-white">schedule</span>
                  <span className="text-[10px] text-white font-bold">{v.duration || '--:--'}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Playlist;
