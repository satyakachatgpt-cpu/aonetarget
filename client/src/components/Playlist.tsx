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
    <div className="flex-1 overflow-y-auto bg-black/40 p-5 pb-24 font-outfit scroll-smooth hide-scrollbar">
      <div className="flex items-center justify-between mb-8">
        <div className="flex flex-col">
           <h3 className="text-white font-black text-xs uppercase tracking-[0.2em] mb-1">Course Curriculum</h3>
           <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest leading-none">{videos.length} Professional Lectures</p>
        </div>
        <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full">
           <span className="text-white/40 text-[9px] font-black uppercase tracking-widest italic">Locked Stream</span>
        </div>
      </div>
      
      <div className="space-y-4">
        {videos.map((v, idx) => {
          const vId = v.id || v._id || '';
          const isActive = String(vId).toLowerCase() === String(activeVideoId).toLowerCase();
          
          return (
            <button
              key={vId}
              onClick={() => onSelect(vId)}
              className={`w-full group/item flex items-center gap-5 p-4 rounded-[1.5rem] transition-all duration-300 active:scale-[0.97] border relative overflow-hidden ${
                isActive 
                  ? 'bg-white/10 border-white/20 shadow-[0_20px_40px_rgba(0,0,0,0.5)]' 
                  : 'bg-white/[0.02] border-white/[0.03] hover:bg-white/[0.07] hover:border-white/10'
              }`}
            >
              {/* VIBRANT GLOW BEHIND ACTIVE ITEM */}
              {isActive && (
                <div className="absolute top-0 left-0 w-1 h-full bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.8)]" />
              )}

              <div className="relative w-28 aspect-video rounded-2xl overflow-hidden shrink-0 bg-black/40 shadow-2xl transition-transform group-hover/item:scale-105 duration-500">
                {v.thumbnail ? (
                  <img src={v.thumbnail} alt="" className={`w-full h-full object-cover transition-opacity duration-700 ${isActive ? 'opacity-40' : 'opacity-60 group-hover/item:opacity-80'}`} />
                ) : (
                  <div className="w-full h-full bg-white/5 flex items-center justify-center">
                    <span className="material-symbols-rounded text-white/10 text-xl font-light tracking-tighter italic">AO</span>
                  </div>
                )}
                
                {isActive ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-[0_0_20px_white]">
                      <span className="material-symbols-rounded text-black text-sm font-black translate-x-0.5">play_arrow</span>
                    </div>
                  </div>
                ) : (
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/80 backdrop-blur-md rounded-md border border-white/10">
                    <span className="text-[8px] text-white/60 font-black tracking-widest">{v.duration || '00:00'}</span>
                  </div>
                )}
              </div>
              
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-2 mb-1.5 opacity-40">
                   <span className="text-[9px] font-black text-white/60 uppercase tracking-widest italic leading-none">Lecture {idx + 1}</span>
                </div>
                <p className={`text-[13px] font-black leading-tight tracking-tight mb-2 ${isActive ? 'text-white' : 'text-white/60 group-hover/item:text-white/80'}`}>
                  {v.title}
                </p>
                <div className="flex items-center gap-3">
                   <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-full">
                      <span className="material-symbols-rounded text-[12px] text-white/40">lock</span>
                      <span className="text-[9px] text-white/40 font-black tracking-widest uppercase">HD Locked</span>
                   </div>
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
