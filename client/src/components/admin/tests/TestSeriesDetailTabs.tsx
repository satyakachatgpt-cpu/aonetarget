import React from 'react';

interface TestSeriesDetailTabsProps {
  tabs: readonly string[];
  activeTab: string;
  setActiveTab: (tab: any) => void;
}

const TestSeriesDetailTabs: React.FC<TestSeriesDetailTabsProps> = ({
  tabs,
  activeTab,
  setActiveTab
}) => {
  return (
    <div className="bg-white px-10 flex gap-8 border-b border-gray-100 sticky top-[73px] z-20 shadow-sm overflow-x-auto no-scrollbar">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`py-4 text-[11.5px] font-bold tracking-[0.12em] uppercase transition-all relative whitespace-nowrap ${
            activeTab === tab ? "text-black" : "text-gray-400 hover:text-gray-800"
          }`}
        >
          {tab}
          {activeTab === tab && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
};

export default React.memo(TestSeriesDetailTabs);
