import React from 'react';
import { Student } from './types';

interface StudentActionMenuProps {
    student: Student;
    isOpen: boolean;
    onToggle: (e: React.MouseEvent) => void;
    onView: (student: Student) => void;
    onEdit: (student: Student) => void;
    onFees: (student: Student) => void;
    onNotes: (student: Student) => void;
    onBan: (student: Student) => void;
    onUnblock: (student: Student) => void;
    onDelete: (id: string, name: string) => void;
}

export const StudentActionMenu: React.FC<StudentActionMenuProps> = ({
    student,
    isOpen,
    onToggle,
    onView,
    onEdit,
    onFees,
    onNotes,
    onBan,
    onUnblock,
    onDelete
}) => {
    return (
        <div className="relative inline-block text-left">
            <button
                onClick={onToggle}
                className={`flex items-center gap-1.5 px-4 py-2 border rounded-xl text-[12px] font-bold transition-all shadow-sm ${isOpen ? 'bg-[#111] text-white border-[#111]' : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'}`}
            >
                Actions
                <span className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
            </button>

            <div className={`absolute right-0 top-full mt-1 origin-top-right w-36 bg-white border border-gray-100 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] z-[100] py-1 transition-all duration-200 ${isOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}>
                {student.status === 'inactive' ? (
                    <button
                        onClick={() => onUnblock(student)}
                        className="w-full px-4 py-2.5 text-left text-[12px] font-bold text-red-500 hover:bg-red-50 flex items-center gap-2 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[18px] text-red-500">cancel</span> Unblock
                    </button>
                ) : (
                    <>
                        <button
                            onClick={() => onView(student)}
                            className="w-full px-4 py-2.5 text-left text-[12px] font-bold text-gray-700 hover:bg-blue-50 flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-sm text-blue-500">visibility</span> View
                        </button>
                        <button
                            onClick={() => onEdit(student)}
                            className="w-full px-4 py-2.5 text-left text-[12px] font-bold text-gray-700 hover:bg-indigo-50 flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-sm text-indigo-500">edit</span> Edit
                        </button>
                        <button
                            onClick={() => onFees(student)}
                            className="w-full px-4 py-2.5 text-left text-[12px] font-bold text-gray-700 hover:bg-green-50 flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-sm text-green-500">payments</span> Fees
                        </button>
                        <button
                            onClick={() => onNotes(student)}
                            className="w-full px-4 py-2.5 text-left text-[12px] font-bold text-gray-700 hover:bg-amber-50 flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-sm text-amber-500">sticky_note_2</span> Notes
                        </button>
                        <button
                            onClick={() => onBan(student)}
                            className="w-full px-4 py-2.5 text-left text-[12px] font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-sm text-red-600">block</span> Ban Account
                        </button>
                        <button
                            onClick={() => onDelete(student.id, student.name)}
                            className="w-full px-4 py-2.5 text-left text-[12px] font-bold text-gray-700 hover:bg-red-50 flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-sm text-red-500">delete</span> Delete
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};
