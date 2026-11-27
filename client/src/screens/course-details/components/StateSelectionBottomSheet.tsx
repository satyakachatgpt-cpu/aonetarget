import React, { useState, useMemo } from 'react';
import { indiaStateDistrictMap } from '../../../utils/indiaStates';

interface StateSelectionBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedState: string;
  onSelectState: (state: string) => void;
}

const POPULAR_STATES = ['Haryana', 'Delhi', 'Uttar Pradesh', 'Rajasthan', 'Punjab', 'Bihar', 'Madhya Pradesh'];

export const StateSelectionBottomSheet: React.FC<StateSelectionBottomSheetProps> = ({
  isOpen,
  onClose,
  selectedState,
  onSelectState,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const allStates = useMemo(() => {
    return Object.keys(indiaStateDistrictMap).sort((a, b) => a.localeCompare(b));
  }, []);

  const filteredStates = useMemo(() => {
    if (!searchQuery.trim()) return allStates;
    const q = searchQuery.toLowerCase().trim();
    return allStates.filter((s) => s.toLowerCase().includes(q));
  }, [allStates, searchQuery]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs transition-opacity duration-300"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-white rounded-t-[28px] shadow-2xl p-5 pb-8 overflow-hidden animate-slide-up max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="material-symbols-rounded text-blue-600 text-2xl">location_on</span>
            <div>
              <h3 className="text-base font-black text-gray-900 tracking-tight">Select State</h3>
              <p className="text-[11px] text-gray-500 font-medium">For billing & invoice calculation</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all active:scale-95"
          >
            <span className="material-symbols-rounded text-xl">close</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="mt-4 relative">
          <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
          <input
            type="text"
            placeholder="Search state (e.g. Haryana, Delhi)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 focus:outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition-all bg-gray-50/70"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <span className="material-symbols-rounded text-base">close</span>
            </button>
          )}
        </div>

        {/* Popular States Pills */}
        {!searchQuery && (
          <div className="mt-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 px-0.5">Popular States</p>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_STATES.map((st) => {
                const isSelected = selectedState.toLowerCase() === st.toLowerCase();
                return (
                  <button
                    key={st}
                    onClick={() => {
                      onSelectState(st);
                      onClose();
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 flex items-center gap-1 ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span>{st}</span>
                    {isSelected && <span className="material-symbols-rounded text-xs">check</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* States List */}
        <div className="mt-4 flex-1 overflow-y-auto divide-y divide-gray-100 pr-1">
          {filteredStates.map((st) => {
            const isSelected = selectedState.toLowerCase() === st.toLowerCase();
            return (
              <div
                key={st}
                onClick={() => {
                  onSelectState(st);
                  onClose();
                }}
                className={`py-3 px-3 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                  isSelected ? 'bg-blue-50/80 text-blue-700' : 'hover:bg-gray-50 text-gray-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`material-symbols-rounded text-base ${isSelected ? 'text-blue-600' : 'text-gray-400'}`}>
                    {isSelected ? 'radio_button_checked' : 'radio_button_unchecked'}
                  </span>
                  <span className="text-xs font-bold tracking-tight">{st}</span>
                </div>
                {isSelected && (
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 bg-blue-100/60 px-2 py-0.5 rounded-md">
                    Selected
                  </span>
                )}
              </div>
            );
          })}
          {filteredStates.length === 0 && (
            <div className="py-8 text-center text-xs text-gray-400">
              No states found matching "{searchQuery}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
