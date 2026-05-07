import React from 'react';
import { createPortal } from 'react-dom';

interface YoutubeZoomDrawerProps {
  showYoutubeZoomModal: boolean;
  setShowYoutubeZoomModal: (show: boolean) => void;
  editingYoutubeZoom: boolean;
  activeYoutubeZoomTab: 'basic' | 'advanced';
  setActiveYoutubeZoomTab: (tab: 'basic' | 'advanced') => void;
  youtubeZoomForm: any;
  setYoutubeZoomForm: (form: any | ((prev: any) => any)) => void;
  youtubeZoomImageRef: React.RefObject<HTMLInputElement>;
  handleYoutubeZoomImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  youtubeZoomPdf1Ref: React.RefObject<HTMLInputElement>;
  youtubeZoomPdf2Ref: React.RefObject<HTMLInputElement>;
  youtubeZoomStudyMaterialRef: React.RefObject<HTMLInputElement>;
  showYoutubeZoomSEO: boolean;
  setShowYoutubeZoomSEO: (show: boolean) => void;
  handleYoutubeZoomSubmit: () => void;
  getAuthHeaders: () => any;
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  resetYoutubeZoomForm: () => void;
}

const YoutubeZoomDrawer: React.FC<YoutubeZoomDrawerProps> = ({
  showYoutubeZoomModal,
  setShowYoutubeZoomModal,
  editingYoutubeZoom,
  activeYoutubeZoomTab,
  setActiveYoutubeZoomTab,
  youtubeZoomForm,
  setYoutubeZoomForm,
  youtubeZoomImageRef,
  handleYoutubeZoomImageUpload,
  youtubeZoomPdf1Ref,
  youtubeZoomPdf2Ref,
  youtubeZoomStudyMaterialRef,
  showYoutubeZoomSEO,
  setShowYoutubeZoomSEO,
  handleYoutubeZoomSubmit,
  getAuthHeaders,
  showToast,
  resetYoutubeZoomForm
}) => {
  if (!showYoutubeZoomModal) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex justify-end">
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in transition-opacity"
        onClick={() => { resetYoutubeZoomForm(); setShowYoutubeZoomModal(false); }}
      />
      <div className="relative w-[500px] bg-white h-full shadow-2xl flex flex-col animate-slide-in-right overflow-hidden transition-all duration-300">
        {/* Header */}
        <div className="flex justify-between items-center px-8 py-4 border-b border-gray-100 shrink-0">
          <h3 className="text-[20px] font-bold text-[#1e1e1e] tracking-tight">{editingYoutubeZoom ? 'Edit Live stream' : 'Add Live stream'}</h3>
          <button
            onClick={() => { resetYoutubeZoomForm(); setShowYoutubeZoomModal(false); }}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 text-gray-400 rounded-full transition-all"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 shrink-0">
          <button
            onClick={() => setActiveYoutubeZoomTab('basic')}
            className={`flex-1 flex items-center justify-center py-3 text-[15px] font-bold transition-all relative ${activeYoutubeZoomTab === 'basic' ? 'text-black after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-black' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Basic
          </button>
          <div className="w-[1px] bg-gray-100 my-2" />
          <button
            onClick={() => setActiveYoutubeZoomTab('advanced')}
            className={`flex-1 flex items-center justify-center py-3 text-[15px] font-bold transition-all relative ${activeYoutubeZoomTab === 'advanced' ? 'text-black after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-black' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Advanced
          </button>
        </div>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10 pb-10">
          {activeYoutubeZoomTab === 'basic' && (
            <div className="space-y-10">
              <div className="space-y-8">
                {/* Title */}
                <div className="space-y-2">
                  <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Title <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={youtubeZoomForm.title}
                    onChange={(e) => setYoutubeZoomForm({ ...youtubeZoomForm, title: e.target.value })}
                    className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none focus:border-gray-400 transition-all shadow-sm"
                    placeholder=""
                  />
                </div>

                {/* Status Toggle */}
                <div className="space-y-2">
                  <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Status <span className="text-red-500">*</span></label>
                  <div className="flex bg-[#f8f8f8] p-1.5 rounded-[12px] w-full border border-gray-100">
                    <button
                      onClick={() => setYoutubeZoomForm({ ...youtubeZoomForm, isFree: true })}
                      className={`flex-1 py-3 text-[14px] font-bold rounded-[8px] transition-all ${youtubeZoomForm.isFree ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'text-gray-400'}`}
                    >
                      Free
                    </button>
                    <button
                      onClick={() => setYoutubeZoomForm({ ...youtubeZoomForm, isFree: false })}
                      className={`flex-1 py-3 text-[14px] font-bold rounded-[8px] transition-all ${!youtubeZoomForm.isFree ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'text-gray-400'}`}
                    >
                      Paid
                    </button>
                  </div>
                </div>

                {/* Platform */}
                <div className="space-y-2">
                  <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Platform <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select
                      value={youtubeZoomForm.platform || 'YouTube Live'}
                      onChange={(e) => setYoutubeZoomForm({ ...youtubeZoomForm, platform: e.target.value })}
                      className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none focus:border-gray-400 transition-all appearance-none shadow-sm"
                    >
                      <option value="Google Meet">Google Meet</option>
                      <option value="Zoom">Zoom</option>
                      <option value="YouTube Live">YouTube Live</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-[24px] pointer-events-none">expand_more</span>
                  </div>
                </div>


                {/* Meeting Link */}
                <div className="space-y-2">
                  <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Meeting Link <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={youtubeZoomForm.link}
                    onChange={(e) => setYoutubeZoomForm({ ...youtubeZoomForm, link: e.target.value })}
                    className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none focus:border-gray-400 transition-all shadow-sm"
                    placeholder="https://..."
                  />
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
                        value={youtubeZoomForm.scheduleDate || ''}
                        onChange={(e) => setYoutubeZoomForm({ ...youtubeZoomForm, scheduleDate: e.target.value })}
                        className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none focus:border-gray-400 transition-all shadow-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Schedule Time</label>
                      <input
                        type="time"
                        value={youtubeZoomForm.scheduleTime || ''}
                        onChange={(e) => setYoutubeZoomForm({ ...youtubeZoomForm, scheduleTime: e.target.value })}
                        className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none focus:border-gray-400 transition-all shadow-sm"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-400 font-medium italic ml-1 leading-relaxed">Students will see a countdown until this time.</p>
                </div>

                {/* Recording / Replay URL */}
                <div className="space-y-2">
                  <label className="block text-[13px] font-bold text-gray-600 tracking-tight text-blue-600">Recording / Replay URL (Optional)</label>
                  <input
                    type="text"
                    value={youtubeZoomForm.recordedLink || ''}
                    onChange={(e) => setYoutubeZoomForm({ ...youtubeZoomForm, recordedLink: e.target.value })}
                    className="w-full h-[54px] px-5 bg-white border border-blue-100 rounded-[12px] text-[15px] font-medium outline-none focus:border-blue-400 transition-all shadow-sm"
                    placeholder="Paste YouTube replay or recorded video URL"
                  />
                </div>

                {/* Image Upload */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[13px] font-bold text-gray-600 tracking-tight">Image</label>
                    <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Recommended: 1280x720 px (16:9 Ratio)</span>
                  </div>
                  <div className="flex gap-4">
                    <input type="file" ref={youtubeZoomImageRef} className="hidden" accept="image/*" onChange={handleYoutubeZoomImageUpload} />
                    <div className="w-[170px] h-[130px] bg-[#f2f2f2] rounded-[18px] flex flex-col items-center justify-center gap-2 shrink-0 border border-gray-100 overflow-hidden relative group">
                      {youtubeZoomForm.image ? (
                        <img src={youtubeZoomForm.image} className="w-full h-full object-cover" alt="Preview" />
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[40px] text-[#8e8e8e]">image</span>
                          <span className="text-[14px] font-bold text-[#8e8e8e]">No Image</span>
                        </>
                      )}
                    </div>
                    <div
                      onClick={() => youtubeZoomImageRef.current?.click()}
                      className="flex-1 border-2 border-dashed border-[#e2e2e2] rounded-[18px] flex flex-col items-center justify-center p-4 hover:bg-gray-50 transition-all cursor-pointer bg-white group text-center"
                    >
                      <h4 className="text-[16px] font-bold text-[#7a7a7a] mb-0.5">Upload Image</h4>
                      <span className="text-[12px] font-medium text-[#c0c0c0] leading-tight">Click or Drag & Drop your file here.</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Additional Content Section */}
              <div className="space-y-8 pt-6 border-t border-gray-50">
                <h4 className="text-[14px] font-bold text-[#1e1e1e] tracking-tight uppercase">Additional Content</h4>

                {[1, 2].map((num) => {
                  const fieldName = `pdf${num}` as 'pdf1' | 'pdf2';
                  const fileUrl = youtubeZoomForm[fieldName];
                  const ref = num === 1 ? youtubeZoomPdf1Ref : youtubeZoomPdf2Ref;
                  return (
                    <div key={num} className="space-y-2">
                      <label className="block text-[13px] font-bold text-gray-600 tracking-tight uppercase">Attach PDF {num}</label>
                      <div className="flex gap-4">
                        <input
                          type="file"
                          ref={ref}
                          className="hidden"
                          accept="application/pdf"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              showToast('Uploading PDF...', 'success');
                              const formData = new FormData();
                              formData.append('file', file);
                              const res = await fetch('/api/v2/upload/pdf', {
                                method: 'POST',
                                headers: getAuthHeaders(),
                                body: formData
                              });
                              if (!res.ok) throw new Error('Upload failed');
                              const data = await res.json();
                              setYoutubeZoomForm((prev: any) => ({ ...prev, [fieldName]: data.url }));
                              showToast('PDF uploaded successfully!', 'success');
                            } catch (error) {
                              showToast('Failed to upload PDF', 'error');
                            }
                          }}
                        />
                        <div className="w-[170px] h-[130px] bg-[#f2f2f2] rounded-[18px] flex flex-col items-center justify-center gap-1.5 shrink-0 border border-gray-100 overflow-hidden relative group">
                          {fileUrl ? (
                            <div className="flex flex-col items-center gap-2 p-2">
                              <span className="material-symbols-outlined text-[40px] text-red-500">picture_as_pdf</span>
                              <span className="text-[11px] font-bold text-[#8e8e8e] text-center w-full break-all truncate block px-2">Uploaded PDF</span>
                            </div>
                          ) : (
                            <>
                              <div className="w-[44px] h-[44px] bg-white rounded-full flex items-center justify-center mb-1 shadow-sm">
                                <span className="material-symbols-outlined text-[20px] text-[#8e8e8e]">help</span>
                              </div>
                              <span className="text-[13px] font-bold text-[#8e8e8e]">No PDF</span>
                            </>
                          )}
                        </div>
                        <div
                          onClick={() => ref.current?.click()}
                          className="flex-1 border-2 border-dashed border-[#e2e2e2] rounded-[18px] flex flex-col items-center justify-center p-4 hover:bg-gray-50 transition-all cursor-pointer bg-white group text-center"
                        >
                          <h4 className="text-[16px] font-bold text-[#7a7a7a] mb-0.5">{fileUrl ? 'Change PDF' : 'Upload PDF'}</h4>
                          <span className="text-[12px] font-medium text-[#c0c0c0] leading-tight">Click or Drag & Drop your file here.</span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="space-y-2">
                  <label className="block text-[13px] font-bold text-gray-600 tracking-tight uppercase">Study Material</label>
                  <div className="flex gap-4">
                    <input
                      type="file"
                      ref={youtubeZoomStudyMaterialRef}
                      className="hidden"
                      accept="*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          showToast('Uploading material...', 'success');
                          const formData = new FormData();
                          formData.append('file', file);
                          const res = await fetch('/api/v2/upload/pdf', {
                            method: 'POST',
                            headers: getAuthHeaders(),
                            body: formData
                          });
                          if (!res.ok) throw new Error('Upload failed');
                          const data = await res.json();
                          setYoutubeZoomForm((prev: any) => ({ ...prev, studyMaterial: data.url }));
                          showToast('Material uploaded successfully!', 'success');
                        } catch (error) {
                          showToast('Failed to upload material', 'error');
                        }
                      }}
                    />
                    <div className="w-[170px] h-[130px] bg-[#f2f2f2] rounded-[18px] flex flex-col items-center justify-center gap-1.5 shrink-0 border border-gray-100 overflow-hidden relative group">
                      {youtubeZoomForm.studyMaterial ? (
                        <div className="flex flex-col items-center gap-2 p-2">
                          <span className="material-symbols-outlined text-[40px] text-blue-500">description</span>
                          <span className="text-[11px] font-bold text-[#8e8e8e] text-center w-full break-all truncate block px-2">Uploaded Material</span>
                        </div>
                      ) : (
                        <>
                          <div className="w-[44px] h-[44px] bg-white rounded-full flex items-center justify-center mb-1 shadow-sm">
                            <span className="material-symbols-outlined text-[20px] text-[#8e8e8e]">help</span>
                          </div>
                          <span className="text-[13px] font-bold text-[#8e8e8e]">No File</span>
                        </>
                      )}
                    </div>
                    <div
                      onClick={() => youtubeZoomStudyMaterialRef.current?.click()}
                      className="flex-1 border-2 border-dashed border-[#e2e2e2] rounded-[18px] flex flex-col items-center justify-center p-4 hover:bg-gray-50 transition-all cursor-pointer bg-white group text-center"
                    >
                      <h4 className="text-[16px] font-bold text-[#7a7a7a] mb-0.5">{youtubeZoomForm.studyMaterial ? 'Change File' : 'Upload File'}</h4>
                      <span className="text-[12px] font-medium text-[#c0c0c0] leading-tight">Click or Drag & Drop your file here.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeYoutubeZoomTab === 'advanced' && (
            <div className="space-y-10">


              <div className="pt-8 border-t border-gray-50">
                <h4 className="text-[14px] font-bold text-[#1e1e1e] tracking-tight uppercase mb-6">Access & Notifications</h4>
                <div className="space-y-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 max-w-[320px]">
                      <p className="text-[15px] font-bold text-gray-800 tracking-tight">Notify Students</p>
                      <p className="text-[12px] text-gray-400 font-bold tracking-tight leading-relaxed">Send notification when stream starts</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer mt-1">
                      <input type="checkbox" className="sr-only peer" checked={youtubeZoomForm.notifyStudents} onChange={(e) => setYoutubeZoomForm({ ...youtubeZoomForm, notifyStudents: e.target.checked })} />
                      <div className="w-[44px] h-[24px] bg-gray-200 rounded-full peer peer-checked:bg-black after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-[20px]"></div>
                    </label>
                  </div>

                  <div className="flex flex-col space-y-2 mt-4 pt-4 border-t border-gray-100">
                    <label className="text-[13px] font-bold text-gray-600 tracking-tight uppercase">Stream Visibility</label>
                    <select
                      value={youtubeZoomForm.visibility}
                      onChange={(e) => setYoutubeZoomForm({ ...youtubeZoomForm, visibility: e.target.value as 'public' | 'private' })}
                      className="w-full h-[48px] bg-white border border-gray-200 rounded-[12px] px-4 text-[15px] font-bold outline-none focus:border-gray-400 transition-all cursor-pointer"
                    >
                      <option value="public">Public (Visible to everyone)</option>
                      <option value="private">Private (Only enrolled/invited)</option>
                    </select>
                  </div>
                </div>
              </div>



              <div className="pt-8 border-t border-gray-100">
                <button
                  onClick={() => setShowYoutubeZoomSEO(!showYoutubeZoomSEO)}
                  className="flex items-center gap-2 text-[12px] font-bold text-blue-600 cursor-pointer hover:text-blue-700 uppercase tracking-widest transition-all"
                >
                  <span className={`material-symbols-outlined text-[18px] transition-transform duration-300 ${showYoutubeZoomSEO ? 'rotate-90' : 'rotate-0'}`}>arrow_right</span>
                  Configure SEO Meta settings
                </button>

                {showYoutubeZoomSEO && (
                  <div className="mt-6 space-y-6 animate-in slide-in-from-top-4 duration-500 bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                    <div className="space-y-2">
                      <label className="block text-[13px] font-bold text-gray-700 tracking-tight">Slug (URL Customization)</label>
                      <input
                        type="text"
                        value={youtubeZoomForm.slug || ''}
                        onChange={(e) => setYoutubeZoomForm({ ...youtubeZoomForm, slug: e.target.value })}
                        className="w-full px-5 py-4 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none focus:border-blue-500 transition-all shadow-sm"
                        placeholder="e.g. youtube-zoom-video"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="mt-10 mb-6">
            <button
              className="w-full h-[60px] bg-[#1a1c1e] text-white text-[16px] font-bold tracking-tight rounded-[16px] hover:bg-black transition-all flex items-center justify-center shadow-lg active:scale-[0.98]"
              onClick={handleYoutubeZoomSubmit}
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default YoutubeZoomDrawer;
