import React from "react";

interface Props {
  tabs: string[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  viewingTestSeries: any;
}

const TestsTopTabs: React.FC<Props> = ({ tabs, activeTab, setActiveTab, viewingTestSeries }) => {
  if (viewingTestSeries) return null;

  return (
    <div className="mb-6">
      <div className="bg-white rounded-xl shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-gray-100 h-[52px] flex items-center px-2">
        <div className="flex items-center h-full">
          {tabs.map((tab, idx) => (
            <div key={tab} className="flex items-center h-full">
              <button
                onClick={() => setActiveTab(tab)}
                className={`h-full px-6 text-[13px] transition-all relative flex items-center whitespace-nowrap ${
                  activeTab === tab 
                    ? "text-[#1a202c] font-bold" 
                    : "text-[#718096] font-medium hover:text-gray-800"
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-[3px] bg-[#1a202c] rounded-full"></div>
                )}
              </button>
              {idx < tabs.length - 1 && (
                <div className="w-[1px] h-4 bg-gray-100 opacity-60"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(TestsTopTabs);
