import React from 'react';
import { Student } from './types';

interface StudentStatusBadgesProps {
    student: Student;
}

export const StudentStatusBadges: React.FC<StudentStatusBadgesProps> = ({ student }) => {
    return (
        <div className="flex items-center gap-2 mt-1">
            <div className="inline-flex px-1.5 py-0.5 bg-[#e8eaf6] text-[#3f51b5] text-[9px] font-black rounded uppercase tracking-wider">
                Student
            </div>
            {(student.suspiciousActivityCount || 0) > 0 && (
                <div className="inline-flex px-1.5 py-0.5 bg-amber-50 text-amber-600 text-[9px] font-black rounded uppercase tracking-wider border border-amber-100 animate-pulse">
                    Suspicious ({student.suspiciousActivityCount})
                </div>
            )}
            {student.isBanned && (
                <div className="inline-flex px-1.5 py-0.5 bg-red-100 text-red-600 text-[9px] font-black rounded uppercase tracking-wider border border-red-200">
                    Banned
                </div>
            )}
            {student.deviceId && (
                <div className={`inline-flex px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border items-center gap-1 ${
                    student.pendingDeviceId 
                    ? 'bg-amber-100 text-amber-700 border-amber-200 animate-pulse' 
                    : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                }`}>
                    <span className="material-symbols-outlined text-[12px]">
                        {student.pendingDeviceId ? 'warning' : 'devices'}
                    </span>
                    {student.pendingDeviceId ? 'PENDING REQUEST' : 'LOCKED'}
                </div>
            )}
        </div>
    );
};
