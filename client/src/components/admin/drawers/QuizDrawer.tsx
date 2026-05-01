import React, { useState, useEffect } from 'react';
import {
    RightSideDrawer,
    DrawerHeader,
    DrawerBody,
    FormLabel,
    FormInput
} from '../DrawerSystem';

export const QuizDrawer: React.FC<{ isOpen: boolean; onClose: () => void; onSubmit: (data: any) => void }> = ({ isOpen, onClose, onSubmit }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [quizzes, setQuizzes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Mock load quizzes - in a real app this would be a fetch
            setQuizzes([
                { id: 'q1', title: 'Biology Chapter 1 Quiz', questions: 10 },
                { id: 'q2', title: 'Physics Basics Quiz', questions: 15 },
                { id: 'q3', title: 'Chemistry Foundation Quiz', questions: 12 },
                { id: 'q4', title: 'Mathematics Logic Quiz', questions: 20 },
                { id: 'q5', title: 'Organic Chemistry Mock', questions: 25 },
                { id: 'q6', title: 'NEET Practice Quiz', questions: 30 },
            ]);
        } else {
            setSearchTerm('');
            setSelectedIds([]);
        }
    }, [isOpen]);

    const filteredQuizzes = quizzes.filter(q =>
        q.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleQuiz = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    return (
        <RightSideDrawer isOpen={isOpen} onClose={onClose}>
            <DrawerHeader title="Add Quiz(s)" onClose={onClose} />
            <DrawerBody className="hide-scrollbar">
                <div className="flex flex-col h-full">
                    <div className="flex-1 space-y-6">
                        <div className="space-y-4">
                            <FormLabel label="Select Quizzes" />
                            <div className="relative">
                                <FormInput
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search Quizzes..."
                                    className="pl-11"
                                />
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
                            </div>

                            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1 custom-scrollbar">
                                {filteredQuizzes.length > 0 ? (
                                    filteredQuizzes.map(quiz => (
                                        <div
                                            key={quiz.id}
                                            onClick={() => toggleQuiz(quiz.id)}
                                            className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border ${selectedIds.includes(quiz.id) ? 'bg-indigo-50 border-indigo-100' : 'bg-gray-50/50 border-transparent hover:bg-gray-100'}`}
                                        >
                                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${selectedIds.includes(quiz.id) ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-200'}`}>
                                                {selectedIds.includes(quiz.id) && <span className="material-symbols-outlined text-[14px] text-white">check</span>}
                                            </div>
                                            <div className="flex-1">
                                                <p className={`text-[14px] font-bold ${selectedIds.includes(quiz.id) ? 'text-indigo-900' : 'text-gray-700'}`}>{quiz.title}</p>
                                                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{quiz.questions} Questions</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-24 flex flex-col items-center justify-center text-center opacity-30">
                                        <span className="material-symbols-outlined text-[48px]">search_off</span>
                                        <p className="text-[14px] font-bold mt-2 font-black uppercase tracking-widest">No quizzes found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </DrawerBody>
            <div className="px-8 pb-10">
                <div className="flex gap-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 h-[60px] bg-gray-100 text-gray-700 rounded-2xl font-bold text-[15px] hover:bg-gray-200 transition-all active:scale-[0.98]"
                    >
                        CANCEL
                    </button>
                    <button
                        type="button"
                        onClick={() => onSubmit(selectedIds)}
                        disabled={selectedIds.length === 0}
                        className={`flex-[2] h-[60px] rounded-2xl font-bold text-[15px] transition-all active:scale-[0.98] shadow-lg ${selectedIds.length === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[#1a1c1e] text-white hover:bg-black'}`}
                    >
                        SUBMIT
                    </button>
                </div>
            </div>
        </RightSideDrawer>
    );
};
