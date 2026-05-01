import React from 'react';

interface TestSeriesEmptyStateProps {
  onAddClick: () => void;
}

const TestSeriesEmptyState: React.FC<TestSeriesEmptyStateProps> = ({ onAddClick }) => {
  return (
    <div className="bg-white rounded-[2rem] p-20 border border-dashed border-gray-200 flex flex-col items-center justify-center text-center space-y-4">
      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
        <span className="material-symbols-outlined text-[32px]">assignment_late</span>
      </div>
      <div className="space-y-1">
        <h3 className="text-[16px] font-bold text-gray-800">No tests found</h3>
        <p className="text-[13px] text-gray-400 font-medium max-w-[280px]">
          We couldn't find any tests for this series. Try adjusting your search or add a new test.
        </p>
      </div>
      <button
        onClick={onAddClick}
        className="px-6 py-2 bg-black text-white rounded-xl text-[13px] font-bold shadow-sm hover:scale-105 transition-all mt-2"
      >
        Add Your First Test
      </button>
    </div>
  );
};

export default React.memo(TestSeriesEmptyState);
