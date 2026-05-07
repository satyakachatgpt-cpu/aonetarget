import React, { useState, useEffect } from "react";

interface CustomDropdownProps {
  options: { value: any; label: string }[];
  value: any;
  onChange: (val: any) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  isMulti?: boolean;
  showSelectAll?: boolean;
  selectAllVariant?: "inline" | "buttons";
  dropup?: boolean;
  hideSearch?: boolean;
  disabled?: boolean;
}

const CustomDropdown = ({
  options,
  value,
  onChange,
  placeholder = "Select",
  searchPlaceholder = "Searching...",
  isMulti = false,
  showSelectAll = false,
  selectAllVariant = "inline",
  dropup = false,
  hideSearch = false,
  disabled = false,
}: CustomDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter((o: any) =>
    (o.label || "").toLowerCase().includes(search.toLowerCase()),
  );

  const toggleOption = (optVal: string) => {
    if (isMulti) {
      if (value.includes(optVal)) {
        onChange(value.filter((v: string) => v !== optVal));
      } else {
        onChange([...value, optVal]);
      }
    } else {
      onChange(optVal);
      setIsOpen(false);
    }
  };

  const handleSelectAll = () => {
    if (value.length === options.length && options.length > 0) {
      onChange([]);
    } else {
      onChange(options.map((o: any) => o.value));
    }
  };
  const handleClear = () => onChange(isMulti ? [] : "");

  return (
    <div className={`relative ${isOpen ? "z-[100]" : "z-10"} ${disabled ? "pointer-events-none" : ""}`} ref={wrapperRef}>
      <div
        className={`w-full h-11 bg-white border border-gray-200 rounded-xl text-[12px] font-medium text-gray-700 outline-none flex items-center justify-between focus-within:border-gray-400 group ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <div 
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className="flex-1 h-full px-4 flex items-center min-w-0"
        >
          <span className="truncate text-left flex-1">
            {isMulti
              ? value.length > 0
                ? placeholder === "Select"
                  ? `${value.length} selected`
                  : placeholder
                : placeholder
              : value
                ? options.find((o: any) => o.value === value)?.label || value
                : placeholder}
          </span>
        </div>
        
        <div className="flex items-center pr-3 gap-1">
          {value && !isMulti && (
            <button
              onClick={(e) => {
                if (disabled) return;
                e.stopPropagation();
                handleClear();
              }}
              className="text-gray-400 hover:text-red-500 transition-colors p-1 flex items-center justify-center rounded-full hover:bg-gray-50"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
          <span
            onClick={() => !disabled && setIsOpen(!isOpen)}
            className={`material-symbols-outlined text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          >
            expand_more
          </span>
        </div>
      </div>

      {isOpen && (
        <div
          className={`absolute left-0 right-0 ${dropup ? "bottom-full mb-1" : "top-full mt-1"} bg-white border border-gray-300 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.1)] z-50 overflow-hidden flex flex-col`}
        >
          {!dropup && !hideSearch && (
            <div className="border-b border-gray-200">
              <input
                autoFocus
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 px-4 bg-transparent border-0 text-[13px] text-gray-700 outline-none placeholder:text-gray-400"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {showSelectAll && isMulti && selectAllVariant === "buttons" && (
            <div className="flex justify-between items-center px-4 py-2 bg-[#fcfcfc] border-b border-gray-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectAll();
                }}
                className="text-[12px] font-medium text-gray-600 hover:text-gray-800 uppercase tracking-wide"
              >
                SELECT ALL
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="text-[12px] font-medium text-gray-600 hover:text-gray-800 uppercase tracking-wide"
              >
                CLEAR
              </button>
            </div>
          )}

          <div className="max-h-[300px] overflow-y-auto py-1">
            {showSelectAll &&
              isMulti &&
              selectAllVariant === "inline" &&
              filtered.length > 0 && (
                <div
                  onClick={() => handleSelectAll()}
                  className={`px-4 py-2.5 text-[13px] cursor-pointer hover:bg-gray-50 flex items-center gap-3 transition-colors ${value.length === options.length && options.length > 0 ? "bg-blue-50/50 text-[#4361EE] font-medium" : "text-gray-600"}`}
                >
                  <input
                    type="checkbox"
                    checked={
                      value.length === options.length && options.length > 0
                    }
                    readOnly
                    className="w-[16px] h-[16px] rounded-[4px] border-gray-300 text-[#4361EE] focus:ring-[#4361EE] pointer-events-none"
                  />
                  <span>Select All</span>
                </div>
              )}
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-[13px] text-gray-400 text-center">
                No results found
              </div>
            ) : (
              filtered.map((opt: any) => {
                const isSelected = isMulti
                  ? value.includes(opt.value)
                  : value === opt.value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => toggleOption(opt.value)}
                    className={`px-4 py-3 text-[13px] cursor-pointer transition-colors flex items-center gap-3 ${isSelected && !isMulti ? "bg-[#1a5fdf] text-white font-medium shadow-sm" : "text-gray-700 hover:bg-[#eff4ff] hover:text-[#1a5fdf]"}`}
                  >
                    {isMulti && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="w-[16px] h-[16px] rounded-[4px] border-gray-300 text-[#4361EE] focus:ring-[#4361EE] pointer-events-none"
                      />
                    )}
                    <span>{opt.label}</span>
                  </div>
                );
              })
            )}
          </div>

          {dropup && !hideSearch && (
            <div className="border-t border-gray-100 bg-white p-2">
              <input
                autoFocus
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 px-3 bg-[#f8faff] rounded-lg border-0 text-[13px] text-gray-700 outline-none placeholder:text-gray-400"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;
