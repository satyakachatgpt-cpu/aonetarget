import React, { useState, useEffect } from 'react';
import { 
    RightSideDrawer, 
    DrawerHeader, 
    DrawerBody, 
    DrawerFooter, 
    PrimaryButton 
} from './DrawerSystem';

interface ImportGlobalLibraryDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (questions: any[]) => void;
}

const ImportGlobalLibraryDrawer: React.FC<ImportGlobalLibraryDrawerProps> = ({
    isOpen,
    onClose,
    onImport
}) => {
    const [questions, setQuestions] = useState<any[]>([]);
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        subject: '',
        topic: '',
        type: ''
    });

    // Mock loading library questions
    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            setTimeout(() => {
                const mockLibrary = [
                    { id: 'lib1', textEn: 'Who wrote the Indian Constitution?', marks: 1, type: 'MCQ', subject: 'General Knowledge' },
                    { id: 'lib2', textEn: 'Which element has the atomic number 1?', marks: 1, type: 'MCQ', subject: 'Science' },
                    { id: 'lib3', textEn: 'What is the sum of angles in a triangle?', marks: 1, type: 'MCQ', subject: 'Mathematics' },
                    { id: 'lib4', textEn: 'Identify the noun in the sentence: "The cat sat on the mat."', marks: 1, type: 'MCQ', subject: 'English' },
                    { id: 'lib5', textEn: 'Calculate the speed of an object moving 100m in 5s.', marks: 2, type: 'Numerical', subject: 'Physics' },
                    { id: 'lib6', textEn: 'Who is known as the "Iron Man of India"?', marks: 1, type: 'MCQ', subject: 'History' },
                    { id: 'lib7', textEn: 'Solve: $x^2 - 4 = 0$', marks: 2, type: 'Numerical', subject: 'Mathematics' }
                ];
                setQuestions(mockLibrary);
                setLoading(false);
            }, 800);
        }
    }, [isOpen]);

    const handleToggleSelect = (id: string) => {
        setSelectedQuestionIds(prev => 
            prev.includes(id) ? prev.filter(qId => qId !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedQuestionIds.length === filteredQuestions.length) {
            setSelectedQuestionIds([]);
        } else {
            setSelectedQuestionIds(filteredQuestions.map(q => q.id));
        }
    };

    const filteredQuestions = questions.filter(q => {
        const matchesSearch = q.textEn.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSubject = !filters.subject || q.subject === filters.subject;
        return matchesSearch && matchesSubject;
    });

    const handleImportSubmit = () => {
        const questionsToImport = questions.filter(q => selectedQuestionIds.includes(q.id));
        onImport(questionsToImport);
        onClose();
        setSelectedQuestionIds([]);
    };

    return (
        <RightSideDrawer isOpen={isOpen} onClose={onClose} width="900px">
            <DrawerHeader title="Import from Global Library" onClose={onClose} />
            
            <DrawerBody className="bg-[#fcfdfe]/50 p-8 flex flex-col gap-8">
                {/* Search & Statistics */}
                <div className="flex items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm animate-in fade-in duration-500">
                    <div className="flex-1 relative">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[22px]">search</span>
                        <input 
                            type="text"
                            placeholder="Search thousands of questions by text, topic or subject..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-[56px] pl-14 pr-6 bg-[#fafafa] border border-gray-100 rounded-2xl text-[15px] font-bold text-gray-700 outline-none focus:bg-white focus:border-blue-400 transition-all shadow-inner"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-[11px] font-black text-gray-300 uppercase tracking-widest">Selected</p>
                            <p className="text-[20px] font-black text-blue-600 tracking-tight">{selectedQuestionIds.length}</p>
                        </div>
                        <div className="w-[1px] h-8 bg-gray-100 mx-2" />
                        <div className="text-right">
                            <p className="text-[11px] font-black text-gray-300 uppercase tracking-widest">Available</p>
                            <p className="text-[20px] font-black text-gray-800 tracking-tight">{questions.length}</p>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar pb-2">
                    {['All', 'Mathematics', 'Science', 'English', 'History', 'General Knowledge', 'Physics'].map(sub => (
                        <button 
                            key={sub}
                            onClick={() => setFilters({ ...filters, subject: sub === 'All' ? '' : sub })}
                            className={`px-6 h-10 rounded-full text-[13px] font-black whitespace-nowrap transition-all border shadow-sm ${ (filters.subject === sub || (sub === 'All' && !filters.subject)) ? 'bg-black text-white border-black scale-105' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}
                        >
                            {sub}
                        </button>
                    ))}
                </div>

                {/* Questions Grid/List */}
                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-[3rem] border border-gray-50 shadow-sm animate-pulse">
                        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                        </div>
                        <p className="text-[18px] font-black text-gray-300 uppercase tracking-widest">Scanning Global Library</p>
                    </div>
                ) : (
                    <div className="flex-1 space-y-6 overflow-y-auto pr-4 custom-scrollbar">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest italic ml-2">Displaying {filteredQuestions.length} results</p>
                            <button 
                                onClick={handleSelectAll}
                                className="text-[12px] font-black text-[#1a5fdf] hover:underline"
                            >
                                {selectedQuestionIds.length === filteredQuestions.length ? 'Deselect All' : 'Select All Filtered'}
                            </button>
                        </div>

                        {filteredQuestions.map((q, idx) => (
                            <div 
                                key={q.id}
                                onClick={() => handleToggleSelect(q.id)}
                                className={`relative bg-white border rounded-[2rem] p-8 transition-all cursor-pointer group hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] ${selectedQuestionIds.includes(q.id) ? 'border-blue-500 ring-4 ring-blue-50' : 'border-gray-50'}`}
                            >
                                <div className="absolute top-8 right-8 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all group-hover:scale-110 shadow-sm ${selectedQuestionIds.includes(q.id) ? 'bg-blue-600 border-blue-600 scale-110' : 'bg-gray-50 border-gray-100 group-hover:border-gray-300'}">
                                    {selectedQuestionIds.includes(q.id) && <span className="material-symbols-outlined text-white text-[20px]">check</span>}
                                </div>

                                <div className="space-y-4 pr-10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-[14px] font-black text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">{idx + 1}</div>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="px-3 py-1 bg-[#F5F7FF] text-[#4361EE] rounded-lg text-[10px] font-black uppercase tracking-wider border border-[#E0E7FF]">{q.subject}</span>
                                            <span className="px-3 py-1 bg-gray-50 text-gray-400 rounded-lg text-[10px] font-black uppercase tracking-wider border border-gray-100">{q.type}</span>
                                        </div>
                                    </div>
                                    <p className="text-[16px] font-bold text-gray-700 leading-[1.6] font-sans" dangerouslySetInnerHTML={{ __html: q.textEn }} />
                                    
                                    <div className="pt-4 flex items-center gap-6">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[18px] text-gray-300">verified</span>
                                            <span className="text-[11px] font-bold text-gray-400 uppercase">Verified Content</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[18px] text-gray-300">trending_up</span>
                                            <span className="text-[11px] font-bold text-gray-400 uppercase">Popularity: High</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {filteredQuestions.length === 0 && (
                            <div className="py-20 text-center">
                                <span className="material-symbols-outlined text-[64px] text-gray-100 mb-4 animate-bounce">inventory_2</span>
                                <p className="text-[18px] font-black text-gray-300 uppercase tracking-widest">No Library Matches</p>
                                <p className="text-[12px] font-medium text-gray-300 mt-2">Try adjusting your filters or search keywords</p>
                            </div>
                        )}
                    </div>
                )}
            </DrawerBody>

            <DrawerFooter className="p-0 border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <div className="bg-white flex items-center p-6 gap-6">
                    <div className="flex-1">
                        <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest mb-1">Queue Summary</p>
                        <p className="text-[14px] font-bold text-gray-700 italic">You are adding {selectedQuestionIds.length} curated questions to your test paper</p>
                    </div>
                    <button 
                        onClick={handleImportSubmit}
                        disabled={selectedQuestionIds.length === 0}
                        className="h-[64px] px-12 bg-[#1a5fdf] hover:bg-[#154db3] disabled:opacity-30 disabled:grayscale text-white rounded-2xl text-[16px] font-black uppercase tracking-[2px] transition-all active:scale-95 shadow-[0_10px_30px_rgba(26,95,223,0.3)] flex items-center gap-4"
                    >
                        <span>Import Assets</span>
                        <span className="material-symbols-outlined text-[20px]">input</span>
                    </button>
                </div>
            </DrawerFooter>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </RightSideDrawer>
    );
};

export default ImportGlobalLibraryDrawer;
