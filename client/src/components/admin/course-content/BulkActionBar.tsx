import React from 'react';

interface BulkActionBarProps {
  onBulkActionClick?: () => void;
  selectedCount?: number;
}

const BulkActionBar: React.FC<BulkActionBarProps> = ({
  onBulkActionClick,
  selectedCount,
}) => {
  if (!onBulkActionClick) return null;

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onBulkActionClick}
        className="flex items-center gap-2 px-4 h-[44px] bg-white border border-gray-200 rounded-[10px] text-[13px] font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95 shadow-sm"
      >
        <span 
          className="material-symbols-outlined text-[20px] text-amber-500" 
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          bolt
        </span>
        Bulk Action
        {selectedCount !== undefined && selectedCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded-md text-[10px]">
            {selectedCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default React.memo(BulkActionBar);
