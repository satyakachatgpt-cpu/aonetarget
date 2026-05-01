import React from 'react';

interface StudentPaymentBadgeProps {
    status?: string;
}

export const StudentPaymentBadge: React.FC<StudentPaymentBadgeProps> = ({ status }) => {
    return (
        <span className={`inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
            status === 'paid' 
                ? 'bg-green-100 text-green-700' 
                : status === 'pending' 
                    ? 'bg-yellow-100 text-yellow-700' 
                    : 'bg-red-100 text-red-700'
        }`}>
            {status || 'PENDING'}
        </span>
    );
};
