import React from 'react';
import { RightSideDrawer, DrawerHeader, DrawerBody, FormLabel } from '../DrawerSystem';
import { Student } from './types';

interface StudentFeesDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    selectedStudent: Student | null;
    onUpdateStatus: (id: string, status: 'paid' | 'pending' | 'failed') => void;
}

export const StudentFeesDrawer: React.FC<StudentFeesDrawerProps> = ({
    isOpen,
    onClose,
    selectedStudent,
    onUpdateStatus
}) => {
    return (
        <RightSideDrawer isOpen={isOpen} onClose={onClose} width="440px">
            <DrawerHeader title="Payment Management" onClose={onClose} />
            <DrawerBody>
                {selectedStudent && (
                    <div className="space-y-8">
                        <div className="bg-gray-50/50 p-6 rounded-[32px] border border-gray-100">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Currently Set As</p>
                            <span className={`inline-flex px-6 py-2.5 rounded-xl text-[12px] font-black uppercase shadow-sm ${selectedStudent.paymentStatus === 'paid' ? 'bg-green-500 text-white' : selectedStudent.paymentStatus === 'pending' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'}`}>
                                {selectedStudent.paymentStatus}
                            </span>
                        </div>

                        <div className="space-y-3">
                            <FormLabel label="Update Payment Status To" />
                            <div className="grid grid-cols-1 gap-3">
                                <button
                                    onClick={() => onUpdateStatus(selectedStudent.id, 'paid')}
                                    className="group flex items-center justify-between px-5 py-4 bg-white border border-gray-100 rounded-2xl hover:border-green-500 hover:bg-green-50/30 transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-green-600 group-hover:bg-green-500 group-hover:text-white transition-all">
                                            <span className="material-symbols-outlined text-[20px]">check_circle</span>
                                        </div>
                                        <span className="text-[14px] font-bold text-gray-700">Mark as Paid</span>
                                    </div>
                                    <span className="material-symbols-outlined text-gray-300 group-hover:text-green-500 transition-all">chevron_right</span>
                                </button>

                                <button
                                    onClick={() => onUpdateStatus(selectedStudent.id, 'pending')}
                                    className="group flex items-center justify-between px-5 py-4 bg-white border border-gray-100 rounded-2xl hover:border-yellow-500 hover:bg-yellow-50/30 transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center text-yellow-600 group-hover:bg-yellow-500 group-hover:text-white transition-all">
                                            <span className="material-symbols-outlined text-[20px]">pending</span>
                                        </div>
                                        <span className="text-[14px] font-bold text-gray-700">Mark as Pending</span>
                                    </div>
                                    <span className="material-symbols-outlined text-gray-300 group-hover:text-yellow-500 transition-all">chevron_right</span>
                                </button>

                                <button
                                    onClick={() => onUpdateStatus(selectedStudent.id, 'failed')}
                                    className="group flex items-center justify-between px-5 py-4 bg-white border border-gray-100 rounded-2xl hover:border-red-500 hover:bg-red-50/30 transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600 group-hover:bg-red-500 group-hover:text-white transition-all">
                                            <span className="material-symbols-outlined text-[20px]">cancel</span>
                                        </div>
                                        <span className="text-[14px] font-bold text-gray-700">Mark as Failed</span>
                                    </div>
                                    <span className="material-symbols-outlined text-gray-300 group-hover:text-red-500 transition-all">chevron_right</span>
                                </button>
                            </div>
                        </div>

                        <div className="pt-8 pb-4">
                            <button
                                onClick={onClose}
                                className="w-full h-[56px] bg-gray-900 text-white rounded-xl font-bold text-[14px] hover:bg-black transition-all active:scale-[0.98]"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                )}
            </DrawerBody>
        </RightSideDrawer>
    );
};
