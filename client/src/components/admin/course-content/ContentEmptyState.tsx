import React from 'react';

interface ContentEmptyStateProps {
  type: 'empty' | 'end-of-list';
  message?: string;
}

const ContentEmptyState: React.FC<ContentEmptyStateProps> = ({ type, message }) => {
  if (type === 'end-of-list') {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <p className="text-[13px] font-medium text-gray-400">
          {message || "You've seen all the items in the list."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-4xl text-gray-200">dashboard_customize</span>
      </div>
      <p className="text-gray-400 font-bold text-[14px]">
        {message || "No content items found"}
      </p>
    </div>
  );
};

export default React.memo(ContentEmptyState);
