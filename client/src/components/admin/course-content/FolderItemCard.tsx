import React from 'react';
import { getImageUrl } from '../../../lib/utils';

interface FolderItemCardProps {
  item: any;
  level: number;
  isActiveUploadFolder: boolean;
  isExpanded: boolean;
  draggedItemId?: string | null;
  dragOverItemId?: string | null;
  isSearching: boolean;
  folderCounts: any;
  openContentActionMenuId: string | null;
  handlers: {
    onToggleFolder: (item: any) => void;
    onDragStart: (e: any, item: any) => void;
    onDragOver: (e: any, item: any) => void;
    onDrop: (e: any, item: any) => void;
    onDragEnd: () => void;
    onSetActionMenu: (id: string | null) => void;
    onToggleStatus: (item: any, isFolder: boolean, isVideo: boolean, isNote: boolean, isTest: boolean, isLiveStream: boolean) => void;
    onToggleFree: (item: any, isFolder: boolean, isVideo: boolean, isNote: boolean, isTest: boolean) => void;
    onEdit: (item: any, isFolder: boolean, isVideo: boolean, isNote: boolean, isTest: boolean, isLiveStream: boolean) => void;
    onDelete: (itemId: string, itemType: string, isFolder: boolean, isVideo: boolean, isNote: boolean, isTest: boolean, isLiveStream: boolean) => void;
  };
  children?: React.ReactNode;
}

const normalizeId = (id: string | undefined | null) => id ? String(id).trim() : null;

const FolderItemCard: React.FC<FolderItemCardProps> = ({
  item,
  level,
  isActiveUploadFolder,
  isExpanded,
  draggedItemId,
  dragOverItemId,
  isSearching,
  folderCounts,
  openContentActionMenuId,
  handlers,
  children
}) => {
  const itemId = normalizeId(item._id || item.id);

  return (
    <React.Fragment>
      <div
        onClick={() => handlers.onToggleFolder(item)}
        title="Click to open folder"
        style={{ 
          marginLeft: `${level * 24}px`,
          opacity: draggedItemId === itemId ? 0.5 : 1,
          borderTop: dragOverItemId === itemId ? '2px solid #3b82f6' : ''
        }}
        className={`bg-white border ${isActiveUploadFolder ? 'border-blue-400 shadow-md ring-2 ring-blue-100' : 'border-gray-50'} rounded-[12px] py-4 px-4 flex items-center gap-4 group hover:bg-gray-50/50 transition-all cursor-pointer mb-3`}
        draggable={!isSearching}
        onDragStart={(e) => handlers.onDragStart(e, item)}
        onDragOver={(e) => handlers.onDragOver(e, item)}
        onDrop={(e) => handlers.onDrop(e, item)}
        onDragEnd={handlers.onDragEnd}
      >
        <div className="text-gray-300 shrink-0 flex items-center gap-1">
          <span className="material-symbols-outlined text-[20px] cursor-grab">drag_indicator</span>
        </div>

        <div className="w-[100px] h-[64px] rounded-[10px] overflow-hidden relative flex items-center justify-center shrink-0 border border-gray-100 bg-white">
          {item.thumbnail || item.image ? (
            <img src={getImageUrl(item.thumbnail || item.image)} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="material-symbols-outlined text-[28px] text-[#3b82f6]">
              {isExpanded ? 'folder_open' : 'folder'}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-[#1a1a1a] text-[15px] truncate">
            {item.title || item.name}
          </h4>
          <div className="mt-1">
            {(() => {
              const countsObj = folderCounts[itemId || ''];
              if (!countsObj || countsObj.total === 0) {
                return <span className="text-[12px] text-gray-400 font-medium">Empty Folder</span>;
              }
              
              const v = countsObj.videos ?? countsObj.v ?? 0;
              const ls = countsObj.liveStreams ?? 0;
              const p = countsObj.pdfs ?? countsObj.n ?? 0;
              const t = countsObj.tests ?? countsObj.t ?? 0;
              const d = countsObj.documents ?? 0;
              const fCount = countsObj.subfolders ?? 0;

              const chips = [
                { label: 'Video', count: v, classes: 'border-blue-100 bg-blue-50 text-blue-600' },
                { label: 'Live Stream', count: ls, classes: 'border-purple-100 bg-purple-50 text-purple-600' },
                { label: 'PDF', count: p, classes: 'border-cyan-100 bg-cyan-50 text-cyan-600' },
                { label: 'Test', count: t, classes: 'border-emerald-100 bg-emerald-50 text-emerald-600' },
                { label: 'Document', count: d, classes: 'border-orange-100 bg-orange-50 text-orange-600' },
                { label: 'Folder', count: fCount, classes: 'border-slate-100 bg-slate-50 text-slate-600' }
              ].filter(chip => chip.count > 0);
              
              return (
                <div className="flex flex-wrap gap-1.5">
                  {chips.map((chip, idx) => (
                    <span 
                      key={idx} 
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight ${chip.classes}`}
                    >
                      {chip.count} {chip.label}{chip.count > 1 ? 's' : ''}
                    </span>
                  ))}
                </div>
              );
            })()}
          </div>
          <div className="flex items-center gap-2 mt-2.5">
            <div className="px-3 py-0.5 rounded-full text-[10px] font-bold text-gray-500 bg-gray-100 w-fit uppercase tracking-wider">
              Folder
            </div>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlers.onSetActionMenu(openContentActionMenuId === itemId ? null : itemId);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold transition-all border ${openContentActionMenuId === itemId ? 'bg-black text-white border-black shadow-lg shadow-black/10' : 'bg-white text-gray-700 border-gray-100 hover:border-gray-300'}`}
          >
            Actions
            <span className={`material-symbols-outlined text-[18px] transition-transform duration-300 ${openContentActionMenuId === itemId ? 'rotate-180' : ''}`}>expand_more</span>
          </button>

          {openContentActionMenuId === itemId && (
            <div
              className="absolute right-0 top-full mt-2 w-[220px] bg-white rounded-2xl shadow-2xl z-[100] border border-gray-100 py-3 animate-in fade-in zoom-in duration-200 origin-top-right"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlers.onToggleStatus(item, true, false, false, false, false);
                }}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className={`material-symbols-outlined text-[20px] ${item.status === 'active' ? 'text-green-500' : 'text-gray-400'}`}>
                    {item.status === 'active' ? 'visibility' : 'visibility_off'}
                  </span>
                  <span className="text-[13px] font-bold text-gray-600 group-hover:text-gray-900">
                    {item.status === 'active' ? 'Enabled (Visible)' : 'Disabled (Hidden)'}
                  </span>
                </div>
                <div className={`w-[24px] h-[14px] rounded-full relative flex items-center transition-all ${item.status === 'active' ? 'bg-green-500' : 'bg-gray-200'}`}>
                  <div className={`absolute ${item.status === 'active' ? 'right-[2px]' : 'left-[2px]'} w-[10px] h-[10px] bg-white rounded-full shadow-sm`}></div>
                </div>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlers.onToggleFree(item, true, false, false, false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors group"
              >
                <span className={`material-symbols-outlined text-[20px] ${item.isFree ? 'text-amber-400' : 'text-gray-400'}`}>
                  {item.isFree ? 'lock_open' : 'lock'}
                </span>
                <span className="text-[13px] font-bold text-gray-600 group-hover:text-gray-900">
                  {item.isFree ? 'Unlock Content' : 'Lock Content'}
                </span>
              </button>

              <div className="h-px bg-gray-50 my-2 mx-3"></div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlers.onEdit(item, true, false, false, false, false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors group"
              >
                <span className="material-symbols-outlined text-[20px] text-indigo-400">edit_square</span>
                <span className="text-[13px] font-bold text-gray-600 group-hover:text-gray-900">Edit Details</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlers.onDelete(itemId || '', 'folder', true, false, false, false, false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 text-red-600 transition-all group"
              >
                <span className="material-symbols-outlined text-[20px] text-red-300 group-hover:text-red-600">delete</span>
                <span className="text-[13px] font-bold">Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>
      {children}
    </React.Fragment>
  );
};

export default React.memo(FolderItemCard);
