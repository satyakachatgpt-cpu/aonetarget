import React from 'react';
import { createPortal } from 'react-dom';

interface ImportContentModalProps {
  showImportModal: boolean;
  setShowImportModal: (show: boolean) => void;
  importSource: string;
  setImportSource: (source: string) => void;
  importSearch: string;
  setImportSearch: (search: string) => void;
  importItems: any[];
  selectedImportItems: any[];
  setSelectedImportItems: (items: any[] | ((prev: any[]) => any[])) => void;
  isImportLoading: boolean;
  courses: any[];
  handleImportAction: (action: 'move' | 'copy') => void;
}

const ImportContentModal: React.FC<ImportContentModalProps> = ({
  showImportModal,
  setShowImportModal,
  importSource,
  setImportSource,
  importSearch,
  setImportSearch,
  importItems,
  selectedImportItems,
  setSelectedImportItems,
  isImportLoading,
  courses,
  handleImportAction
}) => {
  if (!showImportModal) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex justify-end">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fade-in transition-opacity"
        onClick={() => setShowImportModal(false)}
      />
      <div className="relative w-[480px] bg-white h-full shadow-2xl flex flex-col animate-slide-in-right overflow-hidden transition-all duration-300">
        {/* Header */}
        <div className="flex justify-between items-center px-8 py-6 border-b border-gray-100 shrink-0">
          <h3 className="text-[20px] font-bold text-[#1e1e1e] tracking-tight">Import Content</h3>
          <button
            onClick={() => setShowImportModal(false)}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 text-gray-400 rounded-full transition-all"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 pb-40">
          {/* Source Selection */}
          <div className="space-y-2">
            <label className="block text-[13px] font-bold text-gray-600 tracking-tight">
              Source <span className="text-red-500">*</span>
            </label>
            <div className="relative group">
              <select
                value={importSource}
                onChange={(e) => setImportSource(e.target.value)}
                className="w-full h-[54px] px-5 bg-white border border-gray-200 rounded-[12px] text-[15px] font-medium outline-none appearance-none focus:border-gray-400 transition-all shadow-sm"
              >
                <option value="">Select Course</option>
                {courses.map(course => (
                  <option key={course._id || course.id} value={course._id || course.id}>
                    {course.name || course.title}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-gray-600 transition-colors">expand_more</span>
            </div>
          </div>

          {importSource && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
              {/* List Header */}
              <div className="flex items-center justify-between">
                <h4 className="text-[17px] font-bold text-[#1e1e1e] tracking-tight">Course Content</h4>
                <div className="relative w-[180px]">
                  <input
                    type="text"
                    placeholder="Search"
                    value={importSearch}
                    onChange={(e) => setImportSearch(e.target.value)}
                    className="w-full h-[38px] pl-10 pr-4 bg-gray-50/50 border border-gray-200 rounded-[10px] text-[13px] font-medium outline-none focus:border-gray-400 transition-all"
                  />
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
                </div>
              </div>

              <div className="space-y-4">
                {/* Select All */}
                <div className="flex items-center justify-between py-2 border-b border-gray-50">
                  <span className="text-[14px] font-bold text-gray-400">Select all</span>
                  <input
                    type="checkbox"
                    checked={importItems.length > 0 && selectedImportItems.length === importItems.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedImportItems(importItems.map(i => i._id || i.id));
                      } else {
                        setSelectedImportItems([]);
                      }
                    }}
                    className="w-5 h-5 accent-black cursor-pointer rounded-md"
                  />
                </div>

                {/* Items List */}
                <div className="space-y-1 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {isImportLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                      <div className="w-10 h-10 border-4 border-gray-100 border-t-black rounded-full animate-spin"></div>
                      <span className="text-[14px] font-bold text-gray-400 uppercase tracking-widest">Loading Content...</span>
                    </div>
                  ) : importItems.length > 0 ? (
                    importItems.filter(item => (item.title || item.name || '').toLowerCase().includes(importSearch.toLowerCase())).map((item) => {
                      const type = item.type;
                      const title = (item.title || item.name || '').toLowerCase();
                      const isLive = item.platform || item.streamStatus || title.includes('live') || item.contentType === 'live' || item.streamSource;
                      
                      let badgeLabel = '';
                      let badgeColor = '';
                      
                      if (type === 'folder') {
                        badgeLabel = 'FOLDER';
                        badgeColor = 'bg-blue-50 text-blue-600 border-blue-100/50';
                      } else if (type === 'video') {
                        if (isLive) {
                          badgeLabel = 'LIVE';
                          badgeColor = 'bg-red-50 text-red-600 border-red-100/50';
                        } else {
                          badgeLabel = 'VIDEO';
                          badgeColor = 'bg-indigo-50 text-indigo-600 border-indigo-100/50';
                        }
                      } else {
                        badgeLabel = 'DOCUMENT';
                        badgeColor = 'bg-teal-50 text-teal-600 border-teal-100/50';
                      }

                      return (
                        <div
                          key={item._id || item.id}
                          onClick={() => {
                            const id = item._id || item.id;
                            setSelectedImportItems((prev: any[]) => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
                          }}
                          className="flex items-center justify-between py-4 px-3 hover:bg-gray-50 rounded-[15px] cursor-pointer transition-all border border-transparent group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow transition-all shrink-0">
                              <span className="material-symbols-outlined text-gray-400 text-[20px]">
                                {type === 'folder' ? 'folder' : (type === 'video' ? 'videocam' : 'description')}
                              </span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[15px] font-bold text-gray-700 tracking-tight">{item.title || item.name}</span>
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border uppercase tracking-wider ${badgeColor}`}>
                                  {badgeLabel}
                                </span>
                              </div>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={selectedImportItems.includes(item._id || item.id)}
                            onChange={() => { }} // Handled by div click
                            className="w-5 h-5 accent-black cursor-pointer rounded-md"
                          />
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-32 flex flex-col items-center justify-center text-center opacity-20">
                      <span className="material-symbols-outlined text-[64px] mb-4">move_to_inbox</span>
                      <p className="text-[16px] font-bold tracking-tight uppercase">Empty Course Content</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {!importSource && !isImportLoading && (
            <div className="py-40 flex flex-col items-center justify-center text-center opacity-20">
              <span className="material-symbols-outlined text-[72px] mb-6">dynamic_feed</span>
              <p className="text-[17px] font-bold tracking-tight uppercase">Select a course to see content</p>
            </div>
          )}
        </div>

        {/* Fixed Bottom Action Area */}
        <div className="absolute bottom-0 left-0 right-0 p-8 pt-6 border-t border-gray-100 bg-white z-[100] flex gap-4 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
          <button
            onClick={() => handleImportAction('move')}
            disabled={selectedImportItems.length === 0}
            className="flex-1 h-[56px] bg-white border border-gray-200 text-gray-800 text-[15px] font-bold rounded-[16px] hover:bg-gray-50 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed group active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px] text-gray-400 group-hover:text-gray-600 transition-colors">drive_file_move_rtl</span>
            Move
          </button>
          <button
            onClick={() => handleImportAction('copy')}
            disabled={selectedImportItems.length === 0}
            className="flex-1 h-[56px] bg-[#1a1c1e] text-white text-[15px] font-bold rounded-[16px] hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">content_copy</span>
            Copy
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ImportContentModal;
