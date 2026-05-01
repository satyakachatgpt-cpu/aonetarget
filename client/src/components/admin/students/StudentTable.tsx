import React from 'react';
import { Student } from './types';
import { StudentTableRow } from './StudentTableRow';
import { StudentPagination } from './StudentPagination';

interface StudentTableProps {
    students: Student[];
    loading: boolean;
    totalItems: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
    showingStart: number;
    showingEnd: number;
    startIndex: number;
    viewMode: string;
    activeMenuId: string | null;
    setActiveMenuId: (id: string | null) => void;
    handleSort: (key: keyof Student) => void;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    onView: (student: Student) => void;
    onEdit: (student: Student) => void;
    onFees: (student: Student) => void;
    onNotes: (student: Student) => void;
    onBan: (student: Student) => void;
    onUnblock: (student: Student) => void;
    onDelete: (id: string, name: string) => void;
    filteredStudentsLength: number;
}

export const StudentTable: React.FC<StudentTableProps> = ({
    students,
    loading,
    totalItems,
    totalPages,
    currentPage,
    pageSize,
    showingStart,
    showingEnd,
    startIndex,
    viewMode,
    activeMenuId,
    setActiveMenuId,
    handleSort,
    onPageChange,
    onPageSizeChange,
    onView,
    onEdit,
    onFees,
    onNotes,
    onBan,
    onUnblock,
    onDelete,
    filteredStudentsLength
}) => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-visible">
            <div className="">
                {loading ? (
                    <div className="p-20 text-center text-gray-400">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#111] mx-auto mb-4"></div>
                        <p className="font-bold uppercase tracking-widest text-[10px]">Loading students...</p>
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-[#ffffff] border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">S. NO.</th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-600 group" onClick={() => handleSort('registrationDate')}>
                                        DATE & TIME
                                        <span className="material-symbols-outlined text-sm text-gray-300 group-hover:text-gray-500 transition-colors">unfold_more</span>
                                    </div>
                                </th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-600 group" onClick={() => handleSort('name')}>
                                        NAME
                                        <span className="material-symbols-outlined text-sm text-gray-300 group-hover:text-gray-500 transition-colors">unfold_more</span>
                                    </div>
                                </th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-600 group" onClick={() => handleSort('id')}>
                                        USERNAME
                                        <span className="material-symbols-outlined text-sm text-gray-300 group-hover:text-gray-500 transition-colors">unfold_more</span>
                                    </div>
                                </th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <div className="flex items-center gap-1.5">
                                        EMAIL
                                    </div>
                                </th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <div className="flex items-center gap-1.5">
                                        MOBILE
                                    </div>
                                </th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">
                                    PAYMENT
                                </th>
                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {students.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-20 text-center">
                                        <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px]">No records found</p>
                                    </td>
                                </tr>
                            ) : (
                                students.map((s, idx) => (
                                    <StudentTableRow
                                        key={s.id}
                                        student={s}
                                        serialNumber={startIndex + idx + 1}
                                        viewMode={viewMode}
                                        activeMenuId={activeMenuId}
                                        setActiveMenuId={setActiveMenuId}
                                        onView={onView}
                                        onEdit={onEdit}
                                        onFees={onFees}
                                        onNotes={onNotes}
                                        onBan={onBan}
                                        onUnblock={onUnblock}
                                        onDelete={onDelete}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Standardized Pagination Footer */}
            {!loading && filteredStudentsLength > 0 && (
                <StudentPagination
                    currentPage={currentPage}
                    pageSize={pageSize}
                    totalItems={totalItems}
                    totalPages={totalPages}
                    showingStart={showingStart}
                    showingEnd={showingEnd}
                    onPageChange={onPageChange}
                    onPageSizeChange={onPageSizeChange}
                />
            )}
        </div>
    );
};
