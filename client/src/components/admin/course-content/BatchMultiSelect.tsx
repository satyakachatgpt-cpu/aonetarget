import React, { useState, useRef, useEffect } from 'react';

interface Course {
  id: string;
  _id?: string;
  name?: string;
  title?: string;
}

interface BatchMultiSelectProps {
  courses: Course[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

const BatchMultiSelect: React.FC<BatchMultiSelectProps> = ({ courses, selectedIds, onChange }) => {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredCourses = courses.filter(course => {
    const name = course.name || course.title || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    if (selectedIds.length === filteredCourses.length) {
      onChange([]);
    } else {
      onChange(filteredCourses.map(c => c.id || c._id || ''));
    }
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="space-y-4 bg-gray-50/80 p-6 rounded-[2rem] border border-gray-100 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <label className="text-[12px] font-black text-gray-900 uppercase tracking-tight">Select Batch</label>
        <button 
          onClick={selectAll}
          className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors"
        >
          {selectedIds.length === filteredCourses.length && filteredCourses.length > 0 ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      <div className="space-y-2">
        {/* Label above search */}
        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Batch</p>
        
        <div className="relative">
          <input
            type="text"
            value={search}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsOpen(true);
            }}
            placeholder="Search batch..."
            className="w-full h-[52px] pl-11 pr-4 bg-white border border-gray-100 rounded-2xl text-[14px] font-bold outline-none focus:border-blue-400 transition-all shadow-sm"
          />
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
          
          {/* Dropdown Indicator */}
          <span className={`material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </div>
      </div>

      {/* List (Conditional) */}
      {isOpen && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-h-[220px] overflow-y-auto pr-2 custom-scrollbar space-y-1 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
            {filteredCourses.length > 0 ? (
              filteredCourses.map(course => {
                const id = course.id || course._id || '';
                const isSelected = selectedIds.includes(id);
                return (
                  <div
                    key={id}
                    onClick={() => toggleSelection(id)}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${isSelected ? 'bg-blue-50/50 border-blue-100' : 'bg-white border-transparent hover:bg-gray-50'}`}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 bg-white'}`}>
                      {isSelected && <span className="material-symbols-outlined text-[14px] font-black">check</span>}
                    </div>
                    <span className={`text-[13px] font-bold truncate ${isSelected ? 'text-blue-900' : 'text-gray-600'}`}>
                      {course.name || course.title}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="py-6 text-center text-gray-400 text-[11px] font-black uppercase tracking-widest opacity-50">
                No batch found
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Count Indicator (Always visible if selection > 0) */}
      {selectedIds.length > 0 && (
        <div className="pt-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
              {selectedIds.length} {selectedIds.length === 1 ? 'Batch' : 'Batches'} Selected
            </span>
          </div>
          <button 
            onClick={() => onChange([])}
            className="text-[10px] font-bold text-gray-400 hover:text-red-500 uppercase tracking-widest transition-colors"
          >
            Clear Selection
          </button>
        </div>
      )}
    </div>
  );
};

export default BatchMultiSelect;
