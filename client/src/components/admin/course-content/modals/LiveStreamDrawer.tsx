import React from 'react';
import { createPortal } from 'react-dom';

interface LiveStreamDrawerProps {
  showLiveStreamModal: boolean;
  setShowLiveStreamModal: (show: boolean) => void;
  activeLiveStreamTab: 'basic' | 'advanced';
  setActiveLiveStreamTab: (tab: 'basic' | 'advanced') => void;
  liveStreamForm: any;
  setLiveStreamForm: (form: any) => void;
  liveStreamImageRef: React.RefObject<HTMLInputElement>;
  handleLiveStreamImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  liveStreamPdf1Ref: React.RefObject<HTMLInputElement>;
  liveStreamPdf2Ref: React.RefObject<HTMLInputElement>;
  liveStreamStudyMaterialRef: React.RefObject<HTMLInputElement>;
  handleLiveStreamFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: string) => void;
  handleLiveStreamSubmit: () => void;
}

const LiveStreamDrawer: React.FC<LiveStreamDrawerProps> = ({
  showLiveStreamModal,
  setShowLiveStreamModal,
  activeLiveStreamTab,
  setActiveLiveStreamTab,
  liveStreamForm,
  setLiveStreamForm,
  liveStreamImageRef,
  handleLiveStreamImageUpload,
  liveStreamPdf1Ref,
  liveStreamPdf2Ref,
  liveStreamStudyMaterialRef,
  handleLiveStreamFileUpload,
  handleLiveStreamSubmit
}) => {
  if (!showLiveStreamModal) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex justify-end">
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in transition-opacity"
        onClick={() => { setShowLiveStreamModal(false); }}
      />
      <div className="relative w-[500px] bg-white h-full shadow-2xl flex flex-col animate-slide-in-right overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-8 py-6 border-b border-gray-100 shrink-0">
          <h3 className="text-[20px] font-bold text-[#1e1e1e] tracking-tight">Add Live Stream</h3>
          <button
            onClick={() => { setShowLiveStreamModal(false); }}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 text-gray-400 rounded-full transition-all"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 shrink-0">
          <button
            onClick={() => setActiveLiveStreamTab('basic')}
            className={`flex-1 flex items-center justify-center py-5 text-[15px] font-bold transition-all relative ${activeLiveStreamTab === 'basic' ? 'text-blue-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Basic
          </button>
          <div className="w-[1px] bg-gray-100 my-4" />
          <button
            onClick={() => setActiveLiveStreamTab('advanced')}
            className={`flex-1 flex items-center justify-center py-5 text-[15px] font-bold transition-all relative ${activeLiveStreamTab === 'advanced' ? 'text-blue-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Advanced
          </button>
        </div>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10 pb-40">
          {activeLiveStreamTab === 'basic' && (
            <div className="space-y-10">
              {/* Live Stream Details Section */}
              <div className="space-y-8">
                <h4 className="text-[14px] font-bold text-[#1e1e1e] tracking-tight uppercase">Live Stream Details</h4>

                {/* Title */}
                <div className="space-y-2">
                  <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Title <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={liveStreamForm.title}
                    onChange={(e) => setLiveStreamForm({ ...liveStreamForm, title: e.target.value })}
                    className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none focus:border-gray-400 transition-all placeholder:text-gray-300"
                    placeholder=""
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Description</label>
                  <textarea
                    value={liveStreamForm.description}
                    onChange={(e) => setLiveStreamForm({ ...liveStreamForm, description: e.target.value })}
                    className="w-full px-5 py-4 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none focus:border-gray-400 transition-all min-h-[140px] resize-none"
                    placeholder="Enter Live Stream Description"
                  />
                </div>

                {/* Image Upload */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Image</label>
                    <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Recommended: 1280x720 px (16:9 Ratio)</span>
                  </div>
                  <div className="flex gap-4">
                    <input type="file" ref={liveStreamImageRef} className="hidden" accept="image/*" onChange={handleLiveStreamImageUpload} />
                    <div className="w-[170px] h-[130px] bg-[#f2f2f2] rounded-[18px] flex flex-col items-center justify-center gap-2 shrink-0 border border-gray-100 overflow-hidden relative group">
                      {liveStreamForm.image ? (
                        <img src={liveStreamForm.image} className="w-full h-full object-cover" alt="Preview" />
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[40px] text-[#8e8e8e]">image</span>
                          <span className="text-[14px] font-bold text-[#8e8e8e]">No Image</span>
                        </>
                      )}
                    </div>
                    <div
                      onClick={() => liveStreamImageRef.current?.click()}
                      className="flex-1 border-2 border-dashed border-[#e2e2e2] rounded-[18px] flex flex-col items-center justify-center p-4 hover:bg-gray-50 transition-all cursor-pointer bg-white group"
                    >
                      <h4 className="text-[16px] font-bold text-[#7a7a7a] mb-0.5">Upload Image</h4>
                      <span className="text-[12px] font-medium text-[#c0c0c0] text-center leading-tight">Click or Drag & Drop your file here.</span>
                    </div>
                  </div>
                </div>

                {/* Schedule Section */}
                <div className="space-y-4 pt-4 border-t border-gray-50">
                  <div className="flex items-center justify-between">
                    <label className="block text-[13px] font-bold text-gray-600 tracking-tight uppercase">Schedule Live Stream</label>
                    <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 italic">Optional</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Schedule Date</label>
                      <input
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        value={liveStreamForm.scheduleDate || ''}
                        onChange={(e) => setLiveStreamForm({ ...liveStreamForm, scheduleDate: e.target.value })}
                        className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none focus:border-gray-400 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Schedule Time</label>
                      <input
                        type="time"
                        value={liveStreamForm.scheduleTime || ''}
                        onChange={(e) => setLiveStreamForm({ ...liveStreamForm, scheduleTime: e.target.value })}
                        className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none focus:border-gray-400 transition-all"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-400 font-medium italic ml-1 leading-relaxed">Students will see a countdown until this time. If left blank, stream will be visible immediately.</p>
                </div>

                {/* Status Checkbox-style Toggle */}
                <div className="space-y-2">
                  <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Status</label>
                  <div className="flex bg-[#f8f8f8] p-1.5 rounded-[12px] w-full border border-gray-100">
                    <button
                      onClick={() => setLiveStreamForm({ ...liveStreamForm, isFree: true })}
                      className={`flex-1 py-3 text-[14px] font-bold rounded-[8px] transition-all ${liveStreamForm.isFree ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      Free
                    </button>
                    <button
                      onClick={() => setLiveStreamForm({ ...liveStreamForm, isFree: false })}
                      className={`flex-1 py-3 text-[14px] font-bold rounded-[8px] transition-all ${!liveStreamForm.isFree ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      Paid
                    </button>
                  </div>
                </div>



              </div>

              {/* Additional Content Section */}
              <div className="space-y-8 pt-6 border-t border-gray-50">
                <h4 className="text-[14px] font-bold text-[#1e1e1e] tracking-tight uppercase">Additional Content</h4>

                {/* Attach PDF 1 */}
                <div className="space-y-2">
                  <label className="block text-[13px] font-bold text-gray-600 tracking-tight uppercase">Attach PDF</label>
                  <div className="flex gap-4">
                    <input type="file" ref={liveStreamPdf1Ref} className="hidden" accept="application/pdf" onChange={(e) => handleLiveStreamFileUpload(e, 'pdf1')} />
                    <div className="w-[170px] h-[130px] bg-[#f2f2f2] rounded-[18px] flex flex-col items-center justify-center gap-1.5 shrink-0 border border-gray-100 overflow-hidden text-center px-4">
                      <span className="material-symbols-outlined text-[36px] text-[#8e8e8e]">help</span>
                      <span className="text-[13px] font-bold text-[#8e8e8e] truncate w-full">
                        No PDF
                      </span>
                    </div>
                    <div
                      onClick={() => liveStreamPdf1Ref.current?.click()}
                      className="flex-1 border-2 border-dashed border-[#e2e2e2] rounded-[18px] flex flex-col items-center justify-center p-4 hover:bg-gray-50 transition-all cursor-pointer bg-white group"
                    >
                      <h4 className="text-[16px] font-bold text-[#7a7a7a] mb-0.5">Upload PDF</h4>
                      <span className="text-[12px] font-medium text-[#c0c0c0] text-center leading-tight">Click or Drag & Drop your file here.</span>
                    </div>
                  </div>
                </div>

                {/* Attach PDF 2 */}
                <div className="space-y-2">
                  <label className="block text-[13px] font-bold text-gray-600 tracking-tight uppercase">Attach PDF</label>
                  <div className="flex gap-4">
                    <input type="file" ref={liveStreamPdf2Ref} className="hidden" accept="application/pdf" onChange={(e) => handleLiveStreamFileUpload(e, 'pdf2')} />
                    <div className="w-[170px] h-[130px] bg-[#f2f2f2] rounded-[18px] flex flex-col items-center justify-center gap-1.5 shrink-0 border border-gray-100 overflow-hidden text-center px-4">
                      <span className="material-symbols-outlined text-[36px] text-[#8e8e8e]">help</span>
                      <span className="text-[13px] font-bold text-[#8e8e8e] truncate w-full">
                        No PDF
                      </span>
                    </div>
                    <div
                      onClick={() => liveStreamPdf2Ref.current?.click()}
                      className="flex-1 border-2 border-dashed border-[#e2e2e2] rounded-[18px] flex flex-col items-center justify-center p-4 hover:bg-gray-50 transition-all cursor-pointer bg-white group"
                    >
                      <h4 className="text-[16px] font-bold text-[#7a7a7a] mb-0.5">Upload PDF</h4>
                      <span className="text-[12px] font-medium text-[#c0c0c0] text-center leading-tight">Click or Drag & Drop your file here.</span>
                    </div>
                  </div>
                </div>

                {/* Study Material */}
                <div className="space-y-2">
                  <label className="block text-[13px] font-bold text-gray-600 tracking-tight uppercase">Study Material</label>
                  <div className="flex gap-4">
                    <input type="file" ref={liveStreamStudyMaterialRef} className="hidden" accept="*" onChange={(e) => handleLiveStreamFileUpload(e, 'studyMaterial')} />
                    <div className="w-[170px] h-[130px] bg-[#f2f2f2] rounded-[18px] flex flex-col items-center justify-center gap-1.5 shrink-0 border border-gray-100 overflow-hidden text-center px-4">
                      <span className="material-symbols-outlined text-[36px] text-[#8e8e8e]">help</span>
                      <span className="text-[13px] font-bold text-[#8e8e8e] truncate w-full">
                        No File
                      </span>
                    </div>
                    <div
                      onClick={() => liveStreamStudyMaterialRef.current?.click()}
                      className="flex-1 border-2 border-dashed border-[#e2e2e2] rounded-[18px] flex flex-col items-center justify-center p-4 hover:bg-gray-50 transition-all cursor-pointer bg-white group"
                    >
                      <h4 className="text-[16px] font-bold text-[#7a7a7a] mb-0.5">Upload File</h4>
                      <span className="text-[12px] font-medium text-[#c0c0c0] text-center leading-tight">Click or Drag & Drop your file here.</span>
                    </div>
                  </div>
                </div>

                {/* Allow PDF Export */}
                <div className="space-y-2">
                  <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Allow PDF Export</label>
                  <div className="relative">
                    <select
                      value={liveStreamForm.allowPdfExport}
                      onChange={(e) => setLiveStreamForm({ ...liveStreamForm, allowPdfExport: e.target.value })}
                      className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none focus:border-gray-400 transition-all appearance-none"
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                      <option value="Password">Save with password</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-[24px] pointer-events-none">expand_more</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeLiveStreamTab === 'advanced' && (
            <div className="space-y-10">
              <h4 className="text-[14px] font-bold text-[#1e1e1e] tracking-tight uppercase">Advanced Settings</h4>
              <div className="flex items-start justify-between">
                <div className="space-y-1 max-w-[320px]">
                  <p className="text-[15px] font-bold text-gray-800 tracking-tight">In App download</p>
                  <p className="text-[12px] text-gray-400 font-medium leading-relaxed font-bold tracking-tight">Switch ON if you want the users to be able to download the video</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer mt-1 mr-[-5px]">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={liveStreamForm.allowDownload}
                    onChange={(e) => setLiveStreamForm({ ...liveStreamForm, allowDownload: e.target.checked })}
                  />
                  <div className="w-[44px] h-[24px] bg-gray-200 rounded-full peer peer-checked:bg-black after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-[20px]"></div>
                </label>
              </div>

              <div className="space-y-2">
                <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Live Chat Message Visibility</label>
                <select
                  value={liveStreamForm.chatVisibility}
                  onChange={(e) => setLiveStreamForm({ ...liveStreamForm, chatVisibility: e.target.value })}
                  className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none focus:border-gray-400 transition-all appearance-none"
                >
                  <option value="Everyone">Everyone</option>
                  <option value="Only Host and Self">Only Host and Self</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Sorting Order</label>
                <input
                  type="text"
                  value={liveStreamForm.order}
                  onChange={(e) => setLiveStreamForm({ ...liveStreamForm, order: e.target.value })}
                  className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none focus:border-gray-400 transition-all"
                  placeholder="0.00"
                />
              </div>
            </div>
          )}
        </div>

        {/* Fixed Bottom Button */}
        <div className="absolute bottom-0 left-0 right-0 p-0 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] bg-white">
          <button
            className="w-full h-[70px] bg-[#1a1c1e] text-white text-[16px] font-bold tracking-tight hover:bg-black transition-all flex items-center justify-center"
            onClick={handleLiveStreamSubmit}
          >
            Submit
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default LiveStreamDrawer;
