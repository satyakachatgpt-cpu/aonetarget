import React from 'react';
import { createPortal } from 'react-dom';

interface WebinarDrawerProps {
  showWebinarModal: boolean;
  setShowWebinarModal: (show: boolean) => void;
  activeWebinarTab: 'basic' | 'advanced';
  setActiveWebinarTab: (tab: 'basic' | 'advanced') => void;
  webinarForm: any;
  setWebinarForm: (form: any | ((prev: any) => any)) => void;
  webinarImageRef: React.RefObject<HTMLInputElement>;
  handleWebinarImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  webinarPdf1Ref: React.RefObject<HTMLInputElement>;
  webinarPdf2Ref: React.RefObject<HTMLInputElement>;
  webinarStudyMaterialRef: React.RefObject<HTMLInputElement>;
  handleWebinarFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: string) => void;
  handleWebinarSubmit: () => void;
  getImageUrl: (url: string) => string;
}

const WebinarDrawer: React.FC<WebinarDrawerProps> = ({
  showWebinarModal,
  setShowWebinarModal,
  activeWebinarTab,
  setActiveWebinarTab,
  webinarForm,
  setWebinarForm,
  webinarImageRef,
  handleWebinarImageUpload,
  webinarPdf1Ref,
  webinarPdf2Ref,
  webinarStudyMaterialRef,
  handleWebinarFileUpload,
  handleWebinarSubmit,
  getImageUrl
}) => {
  if (!showWebinarModal) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex justify-end">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fade-in transition-opacity"
        onClick={() => setShowWebinarModal(false)}
      />
      <div className="relative w-[500px] bg-white h-full shadow-2xl flex flex-col animate-slide-in-right overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-8 py-6 border-b border-gray-100 shrink-0">
          <h3 className="text-[20px] font-bold text-[#1e1e1e] tracking-tight">Add Webinar</h3>
          <button
            onClick={() => setShowWebinarModal(false)}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 text-gray-400 rounded-full transition-all"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 h-[60px] shrink-0">
          <button
            onClick={() => setActiveWebinarTab('basic')}
            className={`flex-1 flex items-center justify-center text-[15px] font-bold transition-all ${activeWebinarTab === 'basic' ? 'text-black relative after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-[60px] after:h-[2px] after:bg-black' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Basic
          </button>
          <button
            onClick={() => setActiveWebinarTab('advanced')}
            className={`flex-1 flex items-center justify-center text-[15px] font-bold transition-all ${activeWebinarTab === 'advanced' ? 'text-black relative after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-[80px] after:h-[2px] after:bg-black' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Advanced
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 pb-40 custom-scrollbar">
          {activeWebinarTab === 'basic' ? (
            <>
              <div className="space-y-8">
                {/* Title */}
                <div className="space-y-2">
                  <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Title <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={webinarForm.title}
                    onChange={(e) => setWebinarForm({ ...webinarForm, title: e.target.value })}
                    className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none focus:border-gray-400 transition-all shadow-sm"
                    placeholder=""
                  />
                </div>

                {/* Image Upload */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Image</label>
                    <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Recommended: 1280x720 px (16:9 Ratio)</span>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-[120px] h-[100px] bg-gray-100 rounded-[12px] flex flex-col items-center justify-center gap-2 border border-gray-200 shrink-0 relative overflow-hidden group">
                      {webinarForm.image ? (
                        <img src={getImageUrl(webinarForm.image)} className="w-full h-full object-cover" alt="Preview" />
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[28px] text-gray-400">image</span>
                          <span className="text-[12px] font-bold text-gray-400">No Image</span>
                        </>
                      )}
                    </div>
                    <div
                      onClick={() => webinarImageRef.current?.click()}
                      className="flex-1 border-2 border-dashed border-gray-200 rounded-[12px] flex flex-col items-center justify-center p-4 hover:border-gray-400 hover:bg-gray-50/50 transition-all cursor-pointer group"
                    >
                      <h4 className="text-[15px] font-bold text-gray-400 mb-1 group-hover:text-gray-600 transition-colors">Upload Image</h4>
                      <span className="text-[11px] font-medium text-gray-400 text-center leading-[1.4] tracking-tight">Click or Drag & Drop your file here.</span>
                    </div>
                  </div>
                  <input type="file" ref={webinarImageRef} className="hidden" accept="image/*" onChange={handleWebinarImageUpload} />
                </div>

                {/* Status Toggle */}
                <div className="space-y-2">
                  <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Status</label>
                  <div className="flex bg-gray-100/50 p-1 rounded-[14px] border border-gray-100">
                    <button
                      onClick={() => setWebinarForm({ ...webinarForm, isFree: true })}
                      className={`flex-1 py-3 text-[14px] font-bold rounded-[10px] transition-all ${webinarForm.isFree ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-500'}`}
                    >
                      Free
                    </button>
                    <button
                      onClick={() => setWebinarForm({ ...webinarForm, isFree: false })}
                      className={`flex-1 py-3 text-[14px] font-bold rounded-[10px] transition-all ${!webinarForm.isFree ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-500'}`}
                    >
                      Paid
                    </button>
                  </div>
                </div>

                {/* Webinar Link */}
                <div className="space-y-2">
                  <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Webinar Link <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={webinarForm.link}
                    onChange={(e) => setWebinarForm({ ...webinarForm, link: e.target.value })}
                    className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none focus:border-gray-400 transition-all shadow-sm"
                    placeholder=""
                  />
                </div>

                {/* Generate Link Button */}
                <div className="pt-2">
                  <button
                    onClick={() => {
                      const randomId = Math.random().toString(36).substring(7);
                      setWebinarForm({ ...webinarForm, link: `https://webinar.gg/live/${randomId}` });
                    }}
                    className="h-[50px] px-8 bg-white border border-gray-200 text-gray-800 text-[14px] font-bold rounded-[14px] hover:bg-gray-50 transition-all w-fit shadow-sm active:scale-95 flex items-center justify-center"
                  >
                    Generate Webinar Link
                  </button>
                </div>

                {/* Stream Details Header */}
                <div className="pt-2">
                  <h4 className="text-[15px] font-bold text-gray-800 tracking-tight">Stream Details</h4>
                </div>

                {/* Stream Status */}
                <div className="space-y-2">
                  <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Stream Status</label>
                  <div className="relative group">
                    <select
                      value={webinarForm.streamStatus}
                      onChange={(e) => setWebinarForm({ ...webinarForm, streamStatus: e.target.value })}
                      className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none appearance-none focus:border-gray-400 transition-all shadow-sm"
                    >
                      <option value="Live">Live</option>
                      <option value="Upcoming">Upcoming</option>
                      <option value="Recorded">Recorded</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-colors group-hover:text-gray-600">expand_more</span>
                  </div>
                </div>



                {/* Additional Content Header */}
                <div className="pt-2">
                  <h4 className="text-[15px] font-bold text-gray-800 tracking-tight">Additional Content</h4>
                </div>

                {/* Attach PDF 1 */}
                <div className="space-y-2">
                  <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Attach PDF</label>
                  <div className="flex gap-4">
                    <div className="w-[120px] h-[100px] bg-gray-100 rounded-[12px] flex flex-col items-center justify-center gap-2 border border-gray-200 shrink-0 relative overflow-hidden group">
                      <span className="material-symbols-outlined text-[28px] text-gray-400">question_mark</span>
                      <span className="text-[12px] font-bold text-gray-400">No PDF</span>
                    </div>
                    <div
                      onClick={() => webinarPdf1Ref.current?.click()}
                      className="flex-1 border-2 border-dashed border-gray-200 rounded-[12px] flex flex-col items-center justify-center p-4 hover:border-gray-400 hover:bg-gray-50/50 transition-all cursor-pointer group"
                    >
                      <h4 className="text-[15px] font-bold text-gray-400 mb-1 group-hover:text-gray-600 transition-colors">Upload PDF</h4>
                      <span className="text-[11px] font-medium text-gray-400 text-center leading-[1.4] tracking-tight truncate w-full px-4">Click or Drag & Drop your file here.</span>
                    </div>
                  </div>
                  <input type="file" ref={webinarPdf1Ref} className="hidden" accept="application/pdf" onChange={(e) => handleWebinarFileUpload(e, 'pdf1')} />
                </div>

                {/* Attach PDF 2 */}
                <div className="space-y-2">
                  <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Attach PDF</label>
                  <div className="flex gap-4">
                    <div className="w-[120px] h-[100px] bg-gray-100 rounded-[12px] flex flex-col items-center justify-center gap-2 border border-gray-200 shrink-0 relative overflow-hidden group">
                      <span className="material-symbols-outlined text-[28px] text-gray-400">question_mark</span>
                      <span className="text-[12px] font-bold text-gray-400">No PDF</span>
                    </div>
                    <div
                      onClick={() => webinarPdf2Ref.current?.click()}
                      className="flex-1 border-2 border-dashed border-gray-200 rounded-[12px] flex flex-col items-center justify-center p-4 hover:border-gray-400 hover:bg-gray-50/50 transition-all cursor-pointer group"
                    >
                      <h4 className="text-[15px] font-bold text-gray-400 mb-1 group-hover:text-gray-600 transition-colors">Upload PDF</h4>
                      <span className="text-[11px] font-medium text-gray-400 text-center leading-[1.4] tracking-tight truncate w-full px-4">Click or Drag & Drop your file here.</span>
                    </div>
                  </div>
                  <input type="file" ref={webinarPdf2Ref} className="hidden" accept="application/pdf" onChange={(e) => handleWebinarFileUpload(e, 'pdf2')} />
                </div>

                {/* Study Material */}
                <div className="space-y-2">
                  <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Study Material</label>
                  <div className="flex gap-4">
                    <div className="w-[120px] h-[100px] bg-gray-100 rounded-[12px] flex flex-col items-center justify-center gap-2 border border-gray-200 shrink-0 relative overflow-hidden group">
                      <span className="material-symbols-outlined text-[28px] text-gray-400">question_mark</span>
                      <span className="text-[12px] font-bold text-gray-400">No File</span>
                    </div>
                    <div
                      onClick={() => webinarStudyMaterialRef.current?.click()}
                      className="flex-1 border-2 border-dashed border-gray-200 rounded-[12px] flex flex-col items-center justify-center p-4 hover:border-gray-400 hover:bg-gray-50/50 transition-all cursor-pointer group"
                    >
                      <h4 className="text-[15px] font-bold text-gray-400 mb-1 group-hover:text-gray-600 transition-colors">Upload File</h4>
                      <span className="text-[11px] font-medium text-gray-400 text-center leading-[1.4] tracking-tight truncate w-full px-4">Click or Drag & Drop your file here.</span>
                    </div>
                  </div>
                  <input type="file" ref={webinarStudyMaterialRef} className="hidden" accept="*" onChange={(e) => handleWebinarFileUpload(e, 'studyMaterial')} />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                <h4 className="text-[15px] font-bold text-gray-800 tracking-tight">Advanced Settings</h4>

                {/* Quiz */}
                <div className="space-y-2">
                  <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Quiz</label>
                  <div className="relative group">
                    <select
                      value={webinarForm.quizId}
                      onChange={(e) => setWebinarForm({ ...webinarForm, quizId: e.target.value })}
                      className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none appearance-none focus:border-gray-400 transition-all shadow-sm"
                    >
                      <option value="">Select Quiz</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-gray-600 transition-colors">expand_more</span>
                  </div>
                </div>

                {/* In App download Toggle */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5">
                    <p className="text-[15px] font-bold text-gray-800 tracking-tight">In App download</p>
                    <p className="text-[12px] text-gray-400 font-bold tracking-tight leading-relaxed max-w-[280px]">Switch ON if you want the users to be able to download the video</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={webinarForm.allowDownload}
                      onChange={(e) => setWebinarForm({ ...webinarForm, allowDownload: e.target.checked })}
                    />
                    <div className={`w-[48px] h-[26px] rounded-full transition-all relative after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${webinarForm.allowDownload ? 'bg-black after:translate-x-[22px]' : 'bg-gray-200'}`}></div>
                  </label>
                </div>

                {/* Live Chat Message Visibility */}
                <div className="space-y-2">
                  <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Live Chat Message Visibility</label>
                  <div className="relative group">
                    <select
                      value={webinarForm.chatVisibility}
                      onChange={(e) => setWebinarForm({ ...webinarForm, chatVisibility: e.target.value })}
                      className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none appearance-none focus:border-gray-400 transition-all shadow-sm"
                    >
                      <option value="Everyone">Everyone</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-gray-600 transition-colors">expand_more</span>
                  </div>
                </div>

                {/* Enable Video Restrictions Toggle */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5">
                    <p className="text-[15px] font-bold text-gray-800 tracking-tight">Enable Video Restrictions</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer mt-0.5">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={webinarForm.videoRestrictions}
                      onChange={(e) => setWebinarForm({ ...webinarForm, videoRestrictions: e.target.checked })}
                    />
                    <div className={`w-[48px] h-[26px] rounded-full transition-all relative after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${webinarForm.videoRestrictions ? 'bg-black after:translate-x-[22px]' : 'bg-gray-200'}`}></div>
                  </label>
                </div>

                {/* Sorting Order */}
                <div className="space-y-2">
                  <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Sorting Order</label>
                  <input
                    type="text"
                    value={webinarForm.order}
                    onChange={(e) => setWebinarForm({ ...webinarForm, order: e.target.value })}
                    className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none focus:border-gray-400 transition-all shadow-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Fixed Bottom Submit Button */}
        <div className="absolute bottom-0 left-0 right-0 p-8 pt-6 border-t border-gray-100 bg-white z-[100] shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
          <button
            onClick={handleWebinarSubmit}
            className="w-full h-[56px] bg-[#1a1c1e] text-white text-[16px] font-bold rounded-[16px] hover:bg-black transition-all shadow-lg active:scale-[0.98]"
          >
            Submit
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default WebinarDrawer;
