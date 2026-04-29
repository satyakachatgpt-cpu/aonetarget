import React from 'react';

interface BreadcrumbHeaderProps {
  folderStack: any[];
  onBackFolder: () => void;
  currentFolder: any;
}

const BreadcrumbHeader: React.FC<BreadcrumbHeaderProps> = ({
  folderStack,
  onBackFolder,
  currentFolder
}) => {
  return (
    <div className="flex-1 min-w-[200px]">
      <div className="flex items-center gap-3 mb-1">
        {folderStack.length > 0 && (
          <button
            onClick={onBackFolder}
            className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-full text-gray-500 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
        )}
        <h3 className="text-[20px] font-bold text-[#1a1a1a] tracking-tight">Batch Content</h3>
      </div>
      {currentFolder ? (
        <p className="text-[12px] font-medium text-blue-600 flex items-center gap-1 uppercase tracking-wider">
          <span className="material-symbols-outlined text-[14px]">folder_open</span>
          {currentFolder.title || currentFolder.name}
        </p>
      ) : (
        <p className="text-[12px] font-medium text-gray-400 uppercase tracking-widest">Adding content to root</p>
      )}
    </div>
  );
};

export default BreadcrumbHeader;
