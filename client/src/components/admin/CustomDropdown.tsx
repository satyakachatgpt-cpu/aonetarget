import React, { useState, useEffect, useRef } from 'react';

interface CustomDropdownProps {
    options: { value: string | number; label: string }[];
    value: any;
    onChange: (value: any) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    isMulti?: boolean;
    showSelectAll?: boolean;
    selectAllVariant?: 'inline' | 'buttons';
    dropup?: boolean;
    accentColor?: string;
    hideSearch?: boolean;
    disabled?: boolean;
}


const CustomDropdown: React.FC<CustomDropdownProps> = ({
    options,
    value,
    onChange,
    placeholder = 'Select',
    searchPlaceholder = 'Searching...',
    isMulti = false,
    showSelectAll = false,
    selectAllVariant = 'inline',
    dropup = false,
    accentColor = '#1a5fdf',
    hideSearch = false,
    disabled = false
}) => {

    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filtered = options.filter((o: any) =>
        String(o.label).toLowerCase().includes(search.toLowerCase())
    );

    const toggleOption = (optVal: any) => {
        if (isMulti) {
            if (Array.isArray(value) && value.includes(optVal)) {
                onChange(value.filter((v: any) => v !== optVal));
            } else {
                onChange([...(Array.isArray(value) ? value : []), optVal]);
            }
        } else {
            onChange(optVal);
            setIsOpen(false);
        }
    };

    const handleSelectAll = () => {
        if (Array.isArray(value) && value.length === options.length && options.length > 0) {
            onChange([]);
        } else {
            onChange(options.map((o: any) => o.value));
        }
    };

    const handleClear = () => onChange(isMulti ? [] : '');

    return (
        <div className={`relative w-full ${isOpen ? 'z-[100]' : 'z-10'}`} ref={wrapperRef}>
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full h-11 px-4 border rounded-xl text-[14px] font-medium transition-all shadow-sm flex items-center justify-between gap-2 outline-none ${
                    isOpen ? 'border-gray-400 ring-2 ring-gray-100' : ''
                } ${disabled ? 'bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white border-gray-200 text-gray-700 cursor-pointer hover:border-gray-300'}`}
            >
                <div className="flex-1 truncate text-left">
                    {isMulti
                        ? (Array.isArray(value) && value.length > 0 ? (placeholder === 'Select' ? `${value.length} selected` : placeholder) : placeholder)
                        : (value ? (options.find((o: any) => o.value === value)?.label || placeholder) : placeholder)}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {value && (isMulti ? Array.isArray(value) && value.length > 0 : true) && (
                        <span
                            onClick={(e) => { e.stopPropagation(); handleClear(); }}
                            className="text-gray-300 hover:text-gray-600 transition-colors material-symbols-outlined text-[18px]"
                        >
                            close
                        </span>
                    )}
                    <span className={`material-symbols-outlined text-gray-400 pointer-events-none transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
                </div>
            </div>

            {isOpen && (
                <div className={`absolute left-0 right-0 ${dropup ? 'bottom-full mb-1' : 'top-full mt-1'} bg-white border border-gray-300 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.1)] z-50 overflow-hidden flex flex-col`}>
                    {!dropup && !hideSearch && (
                        <div className="border-b border-gray-200">
                            <input
                                autoFocus
                                type="text"
                                placeholder={searchPlaceholder}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full h-11 px-4 bg-white text-[14px] font-medium text-gray-700 outline-none placeholder:text-gray-300"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    )}

                    {showSelectAll && isMulti && selectAllVariant === 'buttons' && (
                        <div className="flex justify-between items-center px-4 py-2 bg-[#fcfcfc] border-b border-gray-100">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleSelectAll(); }}
                                className="text-[12px] font-medium text-gray-600 hover:text-gray-800 uppercase tracking-wide"
                            >
                                SELECT ALL
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleClear(); }}
                                className="text-[12px] font-medium text-gray-600 hover:text-gray-800 uppercase tracking-wide"
                            >
                                CLEAR
                            </button>
                        </div>
                    )}

                    <div className="max-h-[300px] overflow-y-auto py-1">
                        {showSelectAll && isMulti && selectAllVariant === 'inline' && filtered.length > 0 && (
                            <div
                                onClick={(e) => { e.stopPropagation(); handleSelectAll(); }}
                                className={`px-4 py-2.5 text-[13px] cursor-pointer hover:bg-gray-50 flex items-center gap-3 transition-colors ${Array.isArray(value) && value.length === options.length && options.length > 0 ? 'bg-[#eff4ff] text-[#1a5fdf]' : 'text-gray-600'}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={Array.isArray(value) && value.length === options.length && options.length > 0}
                                    readOnly
                                    className="w-[16px] h-[16px] rounded-[4px] border-gray-300 pointer-events-none"
                                />
                                <span className="font-bold">Select All</span>
                            </div>
                        )}
                        {filtered.length === 0 ? (
                            <div className="px-4 py-3 text-[13px] text-gray-400 text-center">No results found</div>
                        ) : (
                            filtered.map((opt: any) => {
                                const isSelected = isMulti ? (Array.isArray(value) && value.includes(opt.value)) : value === opt.value;
                                return (
                                    <div
                                        key={opt.value}
                                        onClick={() => toggleOption(opt.value)}
                                        className={`px-4 py-3 text-[14px] cursor-pointer transition-colors flex items-center gap-3 ${isSelected && !isMulti ? 'bg-[#1a5fdf] text-white font-medium' : 'text-gray-600 hover:bg-[#eff4ff] hover:text-[#1a5fdf]'}`}
                                    >
                                        {isMulti && (
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                readOnly
                                                className="w-[16px] h-[16px] rounded-[4px] border-gray-300 pointer-events-none"
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
                                className="w-full h-10 px-3 bg-[#f8faff] rounded-lg border-0 text-[14px] font-medium text-gray-700 outline-none placeholder:text-gray-300"
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
