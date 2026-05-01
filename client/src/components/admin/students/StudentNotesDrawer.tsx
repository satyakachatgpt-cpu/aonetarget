import React from 'react';
import { RightSideDrawer, DrawerHeader, DrawerBody, FormLabel } from '../DrawerSystem';
import { Student } from './types';

interface StudentNotesDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    selectedStudent: Student | null;
    notes: string;
    setNotes: (notes: string) => void;
    onSave: () => void;
}

export const StudentNotesDrawer: React.FC<StudentNotesDrawerProps> = ({
    isOpen,
    onClose,
    selectedStudent,
    notes,
    setNotes,
    onSave
}) => {
    return (
        <RightSideDrawer isOpen={isOpen} onClose={onClose} width="440px">
            <DrawerHeader title="Internal Notes" onClose={onClose} />
            <DrawerBody>
                {selectedStudent && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                                <span className="material-symbols-outlined">description</span>
                            </div>
                            <div>
                                <p className="text-[12px] font-bold text-gray-900 leading-none">Notes for {selectedStudent.name}</p>
                                <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wider">{selectedStudent.id}</p>
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <FormLabel label="Observations & Comments" />
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full px-5 py-4 border border-gray-200 rounded-[24px] text-[14px] font-medium outline-none focus:border-amber-400 transition-all bg-white placeholder:text-gray-300 min-h-[300px] resize-none leading-relaxed"
                                placeholder="Type student-specific notes, performance remarks, or follow-up details here..."
                            />
                        </div>

                        <div className="flex gap-3 pt-8 pb-4">
                            <button
                                onClick={onClose}
                                className="flex-1 h-[56px] bg-gray-50 text-gray-700 rounded-xl font-bold text-[14px] hover:bg-gray-100 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onSave}
                                className="flex-[2] h-[56px] bg-amber-500 text-white rounded-xl font-bold text-[14px] hover:bg-amber-600 transition-all shadow-lg shadow-amber-200 active:scale-[0.98]"
                            >
                                Update Notes
                            </button>
                        </div>
                    </div>
                )}
            </DrawerBody>
        </RightSideDrawer>
    );
};
