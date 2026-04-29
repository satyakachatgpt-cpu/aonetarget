import React from 'react';

const EmptyState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-4xl text-gray-200">dashboard_customize</span>
      </div>
      <p className="text-gray-400 font-bold text-[14px]">No content items found</p>
    </div>
  );
};

export default EmptyState;
