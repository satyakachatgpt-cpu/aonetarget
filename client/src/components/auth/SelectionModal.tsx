import React from 'react';

interface SelectionModalProps {
  isOpen: boolean;
  type: 'state' | 'district' | 'class' | 'higherEducation' | null;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  options: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
}

export const SelectionModal: React.FC<SelectionModalProps> = ({
  isOpen,
  type,
  onClose,
  searchQuery,
  onSearchChange,
  options,
  selectedValue,
  onSelect
}) => {
  if (!isOpen) return null;

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-lg bg-white rounded-t-[32px] sm:rounded-[32px] h-[80vh] sm:h-auto sm:max-h-[70vh] flex flex-col overflow-hidden animate-slide-in-bottom sm:animate-fade-in">
        <div className="p-6 border-b border-gray-100 shrink-0">
          <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden"></div>
          <h3 className="text-xl font-black text-gray-800 capitalize">Select {type}</h3>
          <div className="mt-4 relative">
            <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
            <input
              type="text"
              placeholder={`Search ${type}...`}
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#1A237E] text-sm"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              autoFocus
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-1 hide-scrollbar">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => onSelect(opt)}
                className={`w-full px-6 py-4 rounded-2xl text-left text-sm font-bold transition-all ${selectedValue === opt
                  ? 'bg-[#1A237E]/10 text-[#1A237E] border-2 border-[#1A237E]/20'
                  : 'text-gray-600 hover:bg-gray-50 hover:pl-8'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span>{opt}</span>
                  {selectedValue === opt && (
                    <span className="material-symbols-rounded text-lg">check_circle</span>
                  )}
                </div>
              </button>
            ))
          ) : (
            <div className="p-10 text-center">
              <span className="material-symbols-rounded text-5xl text-gray-200">search_off</span>
              <p className="text-gray-400 mt-2 font-bold">No results found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
