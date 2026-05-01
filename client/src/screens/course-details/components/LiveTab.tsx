import React from 'react';
import { getImageUrl, getPdfUrl, getYouTubeThumbnail } from '../../../lib/utils';
import { Video } from '../../../types';

interface LiveTabProps {
  liveStreams: Video[];
  isEnrolled: boolean;
  isPaidCourse: boolean | null | undefined;
  coursePrice: number | undefined;
  enrolling: boolean;
  onJoinLive: (live: Video) => void;
  onEnroll: () => void;
  onBuyNow: () => void;
  computeStatus: (lc: any) => 'live' | 'upcoming' | 'ended' | 'recorded';
}

const LiveTab: React.FC<LiveTabProps> = ({
  liveStreams,
  isEnrolled,
  isPaidCourse,
  coursePrice,
  enrolling,
  onJoinLive,
  onEnroll,
  onBuyNow,
  computeStatus,
}) => {
  return (
    <div className="space-y-6">
      {!isEnrolled ? (
        <div className="card-premium p-10 text-center animate-fade-in-up">
          <div className="w-20 h-20 bg-surface-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-rounded text-4xl text-gray-300">lock</span>
          </div>
          <h3 className="text-xl font-black text-gray-800 mb-2 uppercase tracking-tight">Access Restricted</h3>
          <p className="text-gray-500 font-medium text-sm mb-6">Please enroll in this course to join live interactive sessions and expert-led classes.</p>
          {isPaidCourse ? (
            <button onClick={onBuyNow} className="btn-accent px-10 py-4 text-sm rounded-2xl shadow-xl hover:scale-105 transition-all">Buy Course - ₹{coursePrice}</button>
          ) : (
            <button onClick={onEnroll} disabled={enrolling} className="btn-primary px-10 py-4 text-sm rounded-2xl shadow-xl hover:scale-105 transition-all disabled:opacity-50">{enrolling ? 'Enrolling...' : 'Enroll Free'}</button>
          )}
        </div>
      ) : (
        <>
          {liveStreams.filter(live => computeStatus(live) === 'live').length > 0 && (
            <div className="space-y-4">
              <h3 className="font-black text-gray-800 text-xs uppercase tracking-[0.2em] flex items-center gap-2 mb-4 px-1">
                <div className="w-2 h-2 bg-red-600 rounded-full animate-ping" />
                Ongoing Live Sessions
              </h3>
              <div className="space-y-4">
                {liveStreams.filter(live => computeStatus(live) === 'live').map((live, idx) => {
                  return (
                    <div
                      key={live.id || live._id}
                      onClick={() => onJoinLive(live)}
                      className="group relative overflow-hidden p-[1px] rounded-2xl bg-gradient-to-br from-red-100/50 to-transparent shadow-xl transition-all duration-500 hover:shadow-red-500/10 hover:-translate-y-1 active:scale-95"
                    >
                       <div className="absolute inset-0 bg-white/80 backdrop-blur-xl rounded-2xl"></div>
                       <div className="absolute -top-12 -right-12 w-24 h-24 bg-red-500/10 rounded-full blur-3xl group-hover:bg-red-500/20 transition-all duration-700"></div>
                       
                       <div className="relative z-10 p-3 flex gap-3 items-center">
                        <div className="w-12 h-12 bg-gradient-to-tr from-rose-500 to-red-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/25 relative overflow-hidden group-hover:scale-110 transition-transform">
                          <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                          <span className="material-symbols-rounded text-white text-2xl relative z-10">sensors</span>
                          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-base text-gray-800 truncate tracking-tight">{live.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="flex items-center gap-1.5 bg-rose-500/10 backdrop-blur-md text-rose-600 text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider border border-rose-200/50 shadow-sm">
                               <span className="w-1.5 h-1.5 bg-rose-600 rounded-full"></span>
                               LIVE
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); onJoinLive(live); }}
                          className="relative overflow-hidden bg-gradient-to-r from-red-600 to-rose-600 text-white text-xs px-4 py-2 rounded-xl font-black flex items-center gap-1.5 transition-all shadow-lg shadow-red-600/20 group/btn"
                        >
                          <div className="absolute inset-0 bg-black opacity-0 group-hover/btn:opacity-10 transition-opacity"></div>
                          <span className="material-symbols-rounded text-lg">videocam</span>
                          JOIN
                        </button>
                      </div>

                      {(live.pdf1 || live.pdf2 || live.studyMaterial) && (
                        <div className="flex flex-wrap gap-2 px-4 pb-4 -mt-1 relative z-10">
                          {live.pdf1 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); window.open(`/#/pdf-viewer?url=${encodeURIComponent(getPdfUrl(live.pdf1))}&title=${encodeURIComponent('PDF 1')}`, '_blank'); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-red-600 text-[10px] font-black border border-red-100 uppercase tracking-widest shadow-sm"
                            >
                              <span className="material-symbols-rounded text-base">picture_as_pdf</span>
                              PDF 1
                            </button>
                          )}
                          {live.pdf2 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); window.open(`/#/pdf-viewer?url=${encodeURIComponent(getPdfUrl(live.pdf2))}&title=${encodeURIComponent('PDF 2')}`, '_blank'); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-red-600 text-[10px] font-black border border-red-100 uppercase tracking-widest shadow-sm"
                            >
                              <span className="material-symbols-rounded text-base">picture_as_pdf</span>
                              PDF 2
                            </button>
                          )}
                          {live.studyMaterial && (
                            <button
                              onClick={(e) => { e.stopPropagation(); window.open(`/#/pdf-viewer?url=${encodeURIComponent(getPdfUrl(live.studyMaterial))}&title=${encodeURIComponent('Study Material')}`, '_blank'); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-indigo-600 text-[10px] font-black border border-indigo-100 uppercase tracking-widest shadow-sm"
                            >
                              <span className="material-symbols-rounded text-base">auto_stories</span>
                              Material
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {liveStreams.filter(live => computeStatus(live) === 'upcoming').length > 0 && (
            <div className="space-y-3 mt-6">
              <h3 className="font-black text-gray-800 text-xs uppercase tracking-[0.2em] flex items-center gap-2 mb-4 px-1">
                <span className="material-symbols-rounded text-sm text-primary-500">schedule</span>
                Upcoming Live Classes
              </h3>
              {liveStreams.filter(live => computeStatus(live) === 'upcoming').map((live, idx) => {
                const scheduledTime = live.scheduledTime || live.startTime || live.publishOn || live.scheduledAt;
                
                const displayTime = (() => {
                  if (!scheduledTime) return '';
                  const d = new Date(String(scheduledTime).replace(' ', 'T'));
                  if (isNaN(d.getTime())) return '';
                  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                })();

                  return (
                    <div
                      key={live.id || live._id}
                      className="group relative overflow-hidden p-[1px] rounded-2xl bg-gradient-to-br from-indigo-100/50 to-transparent shadow-sm transition-all duration-500 hover:shadow-indigo-500/10 hover:-translate-y-1"
                      style={{ animationDelay: `${idx * 80}ms` }}
                    >
                      <div className="absolute inset-0 bg-white/70 backdrop-blur-xl rounded-2xl"></div>
                      
                      <div className="relative z-10 p-3 flex gap-3 items-center">
                        <div className="w-12 h-12 bg-indigo-50/80 backdrop-blur-sm rounded-2xl flex items-center justify-center shrink-0 border border-indigo-100 group-hover:bg-indigo-100 transition-colors">
                          <span className="material-symbols-rounded text-indigo-500 text-2xl">calendar_today</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-base text-gray-800 truncate tracking-tight group-hover:text-indigo-600 transition-colors">{live.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1.5 bg-indigo-500/10 backdrop-blur-md text-indigo-600 text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider border border-indigo-200/50 shadow-sm">
                              <span className="material-symbols-rounded text-[14px]">schedule</span>
                              {displayTime}
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0">
                           <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest opacity-60">Upcoming</span>
                        </div>
                      </div>

                    {(live.pdf1 || live.pdf2 || live.studyMaterial) && (
                      <div className="flex flex-wrap gap-2 px-3 pb-3 -mt-1 relative z-10">
                         {live.pdf1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const status = computeStatus(live);
                              if (status !== 'live') {
                                alert("PDF will be available once the class starts.");
                                return;
                              }
                              window.open(`/#/pdf-viewer?url=${encodeURIComponent(getPdfUrl(live.pdf1))}&title=${encodeURIComponent('PDF 1')}`, '_blank');
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-[9px] font-black uppercase tracking-widest border border-red-100/50 shadow-sm opacity-50 cursor-not-allowed"
                          >
                            <span className="material-symbols-rounded text-[14px]">picture_as_pdf</span>
                            PDF 1
                          </button>
                         )}
                         {live.pdf2 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const status = computeStatus(live);
                              if (status !== 'live') {
                                alert("PDF will be available once the class starts.");
                                return;
                              }
                              window.open(`/#/pdf-viewer?url=${encodeURIComponent(getPdfUrl(live.pdf2))}&title=${encodeURIComponent('PDF 2')}`, '_blank');
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-[9px] font-black uppercase tracking-widest border border-red-100/50 shadow-sm opacity-50 cursor-not-allowed"
                          >
                            <span className="material-symbols-rounded text-[14px]">picture_as_pdf</span>
                            PDF 2
                          </button>
                         )}
                         {live.studyMaterial && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const status = computeStatus(live);
                              if (status !== 'live') {
                                alert("Material will be available once the class starts.");
                                return;
                              }
                              window.open(`/#/pdf-viewer?url=${encodeURIComponent(getPdfUrl(live.studyMaterial))}&title=${encodeURIComponent('Study Material')}`, '_blank');
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-widest border border-indigo-100/50 shadow-sm opacity-50 cursor-not-allowed"
                          >
                            <span className="material-symbols-rounded text-[14px]">auto_stories</span>
                            Material
                          </button>
                         )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {liveStreams.filter(live => ['live', 'upcoming'].includes(computeStatus(live))).length === 0 && (
            <div className="card-premium p-10 text-center animate-fade-in-up">
              <div className="w-16 h-16 bg-surface-200 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-rounded text-3xl text-gray-300">sensors_off</span>
              </div>
              <p className="text-gray-400 font-medium text-sm">No live classes scheduled</p>
            </div>
          )}

        </>
      )}
    </div>
  );
};

export default LiveTab;
