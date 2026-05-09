import React from 'react';
import { createPortal } from 'react-dom';

interface WebinarDrawerProps {
  showWebinarModal: boolean;
  setShowWebinarModal: (show: boolean) => void;
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

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 pb-40 custom-scrollbar">
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
                      <span className="material-symbols-outlined text-[32px] text-gray-400">image</span>
                      <span className="text-[12px] font-bold text-gray-400">No Image</span>
                    </>
                  )}
                </div>
                <div
                  onClick={() => webinarImageRef.current?.click()}
                  className="flex-1 border-2 border-dashed border-gray-200 rounded-[12px] flex flex-col items-center justify-center p-4 hover:bg-gray-50 transition-all cursor-pointer bg-white group text-center"
                >
                  <input type="file" ref={webinarImageRef} className="hidden" accept="image/*" onChange={handleWebinarImageUpload} />
                  <h4 className="text-[15px] font-bold text-gray-600 mb-0.5">Upload Image</h4>
                  <span className="text-[11px] font-medium text-gray-400 leading-tight">Click or Drag & Drop</span>
                </div>
              </div>
            </div>

            {/* Link */}
            <div className="space-y-2">
              <label className="block text-[13px] font-bold text-gray-600 tracking-tight uppercase">Webinar Link</label>
              <input
                type="text"
                value={webinarForm.link || ''}
                onChange={(e) => setWebinarForm({ ...webinarForm, link: e.target.value })}
                className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none focus:border-gray-400 transition-all shadow-sm"
                placeholder="https://..."
              />
            </div>

            {/* Schedule Section */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[13px] font-bold text-gray-600 tracking-tight uppercase">Date</label>
                <input
                  type="date"
                  value={webinarForm.scheduleDate || ''}
                  onChange={(e) => setWebinarForm({ ...webinarForm, scheduleDate: e.target.value })}
                  className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none focus:border-gray-400 transition-all shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[13px] font-bold text-gray-600 tracking-tight uppercase">Time</label>
                <input
                  type="time"
                  value={webinarForm.scheduleTime || ''}
                  onChange={(e) => setWebinarForm({ ...webinarForm, scheduleTime: e.target.value })}
                  className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none focus:border-gray-400 transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="block text-[13px] font-bold text-gray-600 tracking-tight uppercase">Access Type</label>
              <div className="flex bg-gray-50 p-1 rounded-[12px] border border-gray-100">
                <button
                  onClick={() => setWebinarForm({ ...webinarForm, isFree: true })}
                  className={`flex-1 py-3 text-[14px] font-bold rounded-[8px] transition-all ${webinarForm.isFree ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}
                >
                  Free
                </button>
                <button
                  onClick={() => setWebinarForm({ ...webinarForm, isFree: false })}
                  className={`flex-1 py-3 text-[14px] font-bold rounded-[8px] transition-all ${!webinarForm.isFree ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}
                >
                  Paid
                </button>
              </div>
            </div>

            {/* Attachments */}
            <div className="space-y-4 pt-4 border-t border-gray-50">
              <label className="block text-[13px] font-bold text-gray-600 tracking-tight uppercase">Attachments</label>
              
              <div className="space-y-4">
                {/* PDF 1 */}
                <div className="flex items-center gap-4">
                  <div className="w-[54px] h-[54px] bg-red-50 rounded-[12px] flex items-center justify-center border border-red-100 shrink-0">
                    <span className="material-symbols-outlined text-[24px] text-red-500">picture_as_pdf</span>
                  </div>
                  <div className="flex-1">
                    <button
                      onClick={() => webinarPdf1Ref.current?.click()}
                      className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[14px] font-bold text-gray-600 hover:border-gray-400 transition-all flex items-center justify-between"
                    >
                      <span>{webinarForm.pdf1 ? 'Change PDF 1' : 'Upload PDF 1'}</span>
                      <span className="material-symbols-outlined text-[20px] text-gray-400">upload</span>
                    </button>
                    <input type="file" ref={webinarPdf1Ref} className="hidden" accept="application/pdf" onChange={(e) => handleWebinarFileUpload(e, 'pdf1')} />
                  </div>
                </div>

                {/* PDF 2 */}
                <div className="flex items-center gap-4">
                  <div className="w-[54px] h-[54px] bg-red-50 rounded-[12px] flex items-center justify-center border border-red-100 shrink-0">
                    <span className="material-symbols-outlined text-[24px] text-red-500">picture_as_pdf</span>
                  </div>
                  <div className="flex-1">
                    <button
                      onClick={() => webinarPdf2Ref.current?.click()}
                      className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[14px] font-bold text-gray-600 hover:border-gray-400 transition-all flex items-center justify-between"
                    >
                      <span>{webinarForm.pdf2 ? 'Change PDF 2' : 'Upload PDF 2'}</span>
                      <span className="material-symbols-outlined text-[20px] text-gray-400">upload</span>
                    </button>
                    <input type="file" ref={webinarPdf2Ref} className="hidden" accept="application/pdf" onChange={(e) => handleWebinarFileUpload(e, 'pdf2')} />
                  </div>
                </div>

                {/* Study Material */}
                <div className="flex items-center gap-4">
                  <div className="w-[54px] h-[54px] bg-blue-50 rounded-[12px] flex items-center justify-center border border-blue-100 shrink-0">
                    <span className="material-symbols-outlined text-[24px] text-blue-500">description</span>
                  </div>
                  <div className="flex-1">
                    <button
                      onClick={() => webinarStudyMaterialRef.current?.click()}
                      className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[14px] font-bold text-gray-600 hover:border-gray-400 transition-all flex items-center justify-between"
                    >
                      <span>{webinarForm.studyMaterial ? 'Change Material' : 'Upload Material'}</span>
                      <span className="material-symbols-outlined text-[20px] text-gray-400">upload</span>
                    </button>
                    <input type="file" ref={webinarStudyMaterialRef} className="hidden" accept="*" onChange={(e) => handleWebinarFileUpload(e, 'studyMaterial')} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-gray-100 shrink-0">
          <button
            onClick={handleWebinarSubmit}
            className="w-full h-[60px] bg-black text-white rounded-[16px] text-[16px] font-bold hover:opacity-90 transition-all shadow-lg active:scale-[0.98]"
          >
            Submit Webinar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default WebinarDrawer;
