import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * GLOBAL DRAWER SYSTEM COMPONENTS
 * Reusable components for the Right-Side Drawer UI.
 */

interface RightSideDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    width?: string;
}

export const RightSideDrawer: React.FC<RightSideDrawerProps> = ({
    isOpen,
    onClose,
    children,
    width = '440px'
}) => {

    // Lock scroll when drawer is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // ESC key to close
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] overflow-hidden flex justify-end">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-[1px] animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className="relative bg-white h-full shadow-[-10px_0_40px_rgba(0,0,0,0.1)] flex flex-col z-[100000]"
                style={{
                    width,
                    animation: 'slideInRight 250ms ease-out forwards',
                    transform: 'translateX(100%)'
                }}
            >
                {children}
            </div>

            <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
        </div>,
        document.body
    );
};

export const CenterModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    maxWidth?: string;
    maxHeight?: string;
}> = ({
    isOpen,
    onClose,
    children,
    maxWidth = 'max-w-6xl',
    maxHeight = 'max-h-[92vh]'
}) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className={`relative bg-white w-full ${maxWidth} ${maxHeight} shadow-2xl rounded-[32px] flex flex-col z-[100000] overflow-hidden animate-in zoom-in-95 duration-200`}
            >
                {children}
            </div>
        </div>,
        document.body
    );
};

export const DrawerHeader: React.FC<{ title: string; onClose: () => void }> = ({ title, onClose }) => (
    <div className="flex justify-between items-center px-8 py-5 border-b border-gray-100 shrink-0 bg-white z-10">
        <h3 className="text-[19px] font-bold text-[#1e1e1e] tracking-tight">{title}</h3>
        <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 text-gray-400 hover:text-gray-600 rounded-full transition-all"
        >
            <span className="material-symbols-outlined text-[24px]">close</span>
        </button>
    </div>
);

export const DrawerBody: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
    <div className={`flex-1 overflow-y-auto px-6 py-6 scroll-smooth custom-scrollbar ${className}`}>
        {children}
    </div>
);

export const DrawerFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
    <div className={`mt-auto shrink-0 z-[100] shadow-[0_-4px_20px_rgba(0,0,0,0.05)] bg-white border-t border-gray-100 ${className}`}>
        {children}
    </div>
);

/**
 * REUSABLE FORM ELEMENTS
 */

export const FormLabel: React.FC<{ label: string; required?: boolean }> = ({ label, required }) => (
    <label className="block text-[13px] font-bold text-gray-700 mb-2 ml-1">
        {label} {required && <span className="text-red-500">*</span>}
    </label>
);

export const FormInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input
        {...props}
        className={`w-full h-[48px] px-4 border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-blue-400 transition-all bg-white placeholder:text-gray-300 ${props.className || ''}`}
    />
);

export const FormPasswordInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => {
    const [showPassword, setShowPassword] = React.useState(false);
    
    return (
        <div className="relative group/pass">
            <input
                {...props}
                type={showPassword ? 'text' : 'password'}
                className={`w-full h-[48px] pl-4 pr-12 border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-blue-400 transition-all bg-white placeholder:text-gray-300 ${props.className || ''}`}
            />
            <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-gray-300 hover:text-blue-500 transition-colors"
                title={showPassword ? "Hide Password" : "Show Password"}
            >
                <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                </span>
            </button>
        </div>
    );
};

export const FormSelect: React.FC<{
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    placeholder?: string;
    className?: string;
}> = ({ value, onChange, options, placeholder, className = "" }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const selectedOption = options.find(opt => opt.value === value);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={containerRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full h-[52px] px-4 border border-gray-200 rounded-xl text-[14px] font-medium flex items-center justify-between bg-white cursor-pointer hover:border-blue-300 transition-all ${isOpen ? 'border-blue-400 ring-4 ring-blue-50' : ''} ${className}`}
            >
                <span className={`truncate mr-4 ${!selectedOption ? 'text-gray-300' : 'text-gray-700'}`}>
                    {selectedOption ? selectedOption.label : placeholder || 'Select Option'}
                </span>
                <span className={`material-symbols-outlined text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
            </div>

            {isOpen && (
                <div className="absolute top-[60px] left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] z-[1000] overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-200">
                    <div className="max-h-[240px] overflow-y-auto hide-scrollbar">
                        {options.map((opt) => (
                            <div
                                key={opt.value}
                                onClick={() => {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                }}
                                className={`px-4 py-3 text-[14px] font-medium cursor-pointer transition-colors flex items-center gap-3 ${value === opt.value
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                            >
                                {value === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                                <span className="truncate">{opt.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export const UploadArea: React.FC<{
    title: string;
    subtitle: string;
    onFileSelect?: (file: File) => void;
    onFilesSelect?: (files: File[]) => void;
    accept?: string;
    multiple?: boolean;
    className?: string;
}> = ({ title, subtitle, onFileSelect, onFilesSelect, accept, multiple = false, className = "" }) => {
    const inputRef = React.useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            if (multiple) {
                onFilesSelect?.(files);
            } else {
                onFileSelect?.(files[0]);
            }
        }
    };

    return (
        <div
            onClick={() => inputRef.current?.click()}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`w-full h-[220px] border-2 border-dashed border-gray-100 rounded-[32px] flex flex-col items-center justify-center p-6 bg-[#fafafa]/50 hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer group ${className}`}
        >
            <input
                type="file"
                ref={inputRef}
                className="hidden"
                accept={accept}
                multiple={multiple}
                onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) {
                        if (multiple) {
                            onFilesSelect?.(files);
                        } else {
                            onFileSelect?.(files[0]);
                        }
                    }
                }}
            />
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-gray-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <span className="material-symbols-outlined text-[32px] text-gray-400 group-hover:text-blue-500 transition-colors">upload_file</span>
            </div>
            <h4 className="text-[17px] font-black text-gray-400 mb-1 transition-colors group-hover:text-gray-900 tracking-tight uppercase">{title}</h4>
            <span className="text-[12px] font-medium text-gray-300 text-center leading-tight max-w-[200px]">{subtitle}</span>
        </div>
    );
};

export const FilePreviewItem: React.FC<{ file: File; onRemove: () => void }> = ({ file, onRemove }) => (
    <div className="flex items-center gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100 group animate-in fade-in slide-in-from-left-4 duration-300">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-100 shrink-0">
            <span className="material-symbols-outlined text-gray-400 text-[20px]">
                {file.type.includes('image') ? 'image' :
                    file.type.includes('audio') ? 'audiotrack' :
                        file.type.includes('pdf') ? 'description' : 'insert_drive_file'}
            </span>
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-gray-700 truncate">{file.name}</p>
            <p className="text-[11px] font-medium text-gray-400 uppercase">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
        <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="w-8 h-8 rounded-lg bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
        >
            <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
    </div>
);

export const PrimaryButton: React.FC<{ children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string }> = ({ children, onClick, disabled, className = "" }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`w-full h-[70px] bg-[#1a1c1e] text-white text-[16px] font-bold tracking-tight hover:bg-black transition-all flex items-center justify-center active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
        {children}
    </button>
);
