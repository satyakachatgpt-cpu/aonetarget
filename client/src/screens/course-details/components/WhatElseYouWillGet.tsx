import React from 'react';

export const WhatElseYouWillGet: React.FC = () => {
  return (
    <div className="mx-4 my-3 p-4 rounded-2xl bg-[#F0FDF4] border border-[#DCFCE7] shadow-xs">
      <h3 className="text-xs font-black text-emerald-950 uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <span className="material-symbols-rounded text-emerald-600 text-base">verified</span>
        What else you will get?
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Item 1: Live Classes */}
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-red-100/90 text-red-600 flex items-center justify-center shrink-0 mt-0.5">
            <span className="material-symbols-rounded text-base">smart_display</span>
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900 leading-tight">Live Classes</h4>
            <p className="text-[11px] text-gray-500 font-medium">Interactive video lessons</p>
          </div>
        </div>

        {/* Item 2: Offline Download */}
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-100/90 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
            <span className="material-symbols-rounded text-base">download_for_offline</span>
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900 leading-tight">Offline Download</h4>
            <p className="text-[11px] text-gray-500 font-medium">Learn at your convenience</p>
          </div>
        </div>

        {/* Item 3: Available on PC */}
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-100/90 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
            <span className="material-symbols-rounded text-base">laptop_mac</span>
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900 leading-tight">Available on PC & Mobile</h4>
            <p className="text-[11px] text-gray-500 font-medium">Bigger screen, better clarity</p>
          </div>
        </div>
      </div>
    </div>
  );
};
