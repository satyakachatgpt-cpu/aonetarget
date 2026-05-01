import React from 'react';
import { Student } from './types';
import { StudentStatusBadges } from './StudentStatusBadges';
import { StudentPaymentBadge } from './StudentPaymentBadge';
import { StudentActionMenu } from './StudentActionMenu';

interface StudentTableRowProps {
    student: Student;
    serialNumber: number;
    viewMode: string;
    activeMenuId: string | null;
    setActiveMenuId: (id: string | null) => void;
    onView: (student: Student) => void;
    onEdit: (student: Student) => void;
    onFees: (student: Student) => void;
    onNotes: (student: Student) => void;
    onBan: (student: Student) => void;
    onUnblock: (student: Student) => void;
    onDelete: (id: string, name: string) => void;
}

export const StudentTableRow: React.FC<StudentTableRowProps> = ({
    student,
    serialNumber,
    viewMode,
    activeMenuId,
    setActiveMenuId,
    onView,
    onEdit,
    onFees,
    onNotes,
    onBan,
    onUnblock,
    onDelete
}) => {
    return (
        <tr className="hover:bg-gray-50/30 transition-colors group border-b border-gray-100 last:border-none">
            <td className="px-6 py-5 text-[12px] font-medium text-gray-400">
                {serialNumber}
            </td>
            <td className="px-6 py-5">
                <div className="text-[13px] font-medium text-gray-500">
                    {(() => {
                        const dateStr = (viewMode === 'blocked' && (student as any).blockedAt) 
                            ? (student as any).blockedAt 
                            : (student.registrationDate || student.createdAt);
                        const dateObj = new Date(dateStr);
                        if (!dateStr || isNaN(dateObj.getTime())) {
                            return <span className="text-gray-300 italic">No date set</span>;
                        }
                        return (
                            <>
                                {dateObj.toLocaleDateString('en-GB').replace(/\//g, '-')}{' '}
                                <span className="text-gray-400 font-normal">at</span>{' '}
                                {dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}
                            </>
                        );
                    })()}
                </div>
            </td>
            <td className="px-6 py-5">
                <div className="text-[14px] font-bold text-[#3f51b5] tracking-tight">{student?.name ?? 'Unknown Student'}</div>
                <StudentStatusBadges student={student} />
            </td>
            <td className="px-6 py-5">
                <p className="text-[13px] font-medium text-gray-500">{student?.id ?? 'N/A'}</p>
            </td>
            <td className="px-6 py-5">
                <p className="text-[13px] font-medium text-gray-500">{student?.email ?? 'N/A'}</p>
            </td>
            <td className="px-6 py-5">
                <p className="text-[13px] font-bold text-gray-600">{student?.phone ?? 'N/A'}</p>
            </td>
            <td className="px-6 py-5 text-center">
                <StudentPaymentBadge status={student.paymentStatus} />
            </td>
            <td className="px-6 py-5 text-right overflow-visible">
                <StudentActionMenu
                    student={student}
                    isOpen={activeMenuId === student.id}
                    onToggle={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(activeMenuId === student.id ? null : student.id);
                    }}
                    onView={onView}
                    onEdit={onEdit}
                    onFees={onFees}
                    onNotes={onNotes}
                    onBan={onBan}
                    onUnblock={onUnblock}
                    onDelete={onDelete}
                />
            </td>
        </tr>
    );
};
