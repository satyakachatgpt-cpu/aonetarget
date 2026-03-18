import React, { useState, useEffect } from 'react';
import { 
    RightSideDrawer, 
    DrawerHeader, 
    DrawerBody, 
    DrawerFooter, 
    PrimaryButton 
} from './DrawerSystem';
import CustomDropdown from './CustomDropdown';

interface ImportExistingTestDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (questions: any[]) => void;
    courses: any[];
    tests: any[];
}

const ImportExistingTestDrawer: React.FC<ImportExistingTestDrawerProps> = ({
    isOpen,
    onClose,
    onImport,
    courses,
    tests
}) => {
    const [selectedCourse, setSelectedCourse] = useState('');
    const [selectedTest, setSelectedTest] = useState('');
    const [sourceQuestions, setSourceQuestions] = useState<any[]>([]);
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    // Mock loading questions when a test is selected
    useEffect(() => {
        if (selectedTest) {
            setLoading(true);
            setTimeout(() => {
                const mockQs = [
                    { id: 'q1', textEn: 'What is the capital of France?', marks: 1, type: 'MCQ' },
                    { id: 'q2', textEn: 'Solve for x: 2x + 5 = 15', marks: 2, type: 'Numerical' },
                    { id: 'q3', textEn: 'Which of these is a noble gas?', marks: 1, type: 'MCQ' },
                    { id: 'q4', textEn: 'The process of photosynthesis occurs in which part of the plant?', marks: 1, type: 'MCQ' },
                    { id: 'q5', textEn: 'Define Newton\'s Second Law of Motion.', marks: 3, type: 'Subjective' }
                ];
                setSourceQuestions(mockQs);
                setLoading(false);
            }, 500);
        } else {
            setSourceQuestions([]);
        }
    }, [selectedTest]);

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

    const filteredQuestions = sourceQuestions.filter(q => 
        q.textEn.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleImportSubmit = () => {
        const questionsToImport = sourceQuestions.filter(q => selectedQuestionIds.includes(q.id));
        onImport(questionsToImport);
        onClose();
        // Reset state
        setSelectedCourse('');
        setSelectedTest('');
        setSelectedQuestionIds([]);
    };

    return (
        <RightSideDrawer isOpen={isOpen} onClose={onClose} width="850px">
            <DrawerHeader title="Import from Existing Test" onClose={onClose} />
            
            <DrawerBody className="bg-[#fcfdfe]/50 p-8 space-y-8">
                {/* Selection Section */}
                <div className="grid grid-cols-2 gap-8 bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm animate-in fade-in duration-500">
                    <div className="space-y-3">
                        <label className="text-[12px] font-black text-gray-400 uppercase tracking-widest px-1">Test Series Title</label>
                        <CustomDropdown
                            options={courses.map(c => ({ value: c.id, label: c.name || c.title }))}
                            value={selectedCourse}
                            onChange={(val: any) => { setSelectedCourse(val); setSelectedTest(''); }}
                            placeholder="Select Course"
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[12px] font-black text-gray-400 uppercase tracking-widest px-1">Test Title</label>
                        <CustomDropdown
                            options={tests.filter(t => t.courseId === selectedCourse).map(t => ({ value: t.id, label: t.name }))}
                            value={selectedTest}
                            onChange={(val: any) => setSelectedTest(val)}
                            placeholder="Select Test"
                            disabled={!selectedCourse}
                        />
                    </div>
                </div>

                {/* Questions List Section */}
                {selectedTest && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-[17px] font-black text-gray-800 tracking-tight uppercase">
                                Questions ({filteredQuestions.length})
                            </h3>
                            <div className="flex items-center gap-4">
                                <div className="relative w-[280px]">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
                                    <input 
                                        type="text"
                                        placeholder="Search questions..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full h-10 pl-10 pr-4 bg-white border border-gray-100 rounded-xl text-[13px] font-medium outline-none focus:border-blue-400 transition-all shadow-sm"
                                    />
                                </div>
                                <button 
                                    onClick={handleSelectAll}
                                    className="px-4 py-2 border border-gray-200 rounded-lg text-[12px] font-bold text-gray-600 hover:bg-gray-50 transition-all bg-white shadow-sm"
                                >
                                    {selectedQuestionIds.length === filteredQuestions.length ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border border-gray-50 shadow-sm">
                                <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin mb-4" />
                                <p className="text-[14px] font-bold text-gray-400 italic">Fetching questions...</p>
                            </div>
                        ) : filteredQuestions.length > 0 ? (
                            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                {filteredQuestions.map((q, idx) => (
                                    <div 
                                        key={q.id}
                                        onClick={() => handleToggleSelect(q.id)}
                                        className={`group relative bg-white border rounded-[1.5rem] p-6 transition-all cursor-pointer hover:shadow-md ${selectedQuestionIds.includes(q.id) ? 'border-blue-500 bg-blue-50/10' : 'border-gray-50'}`}
                                    >
                                        <div className="flex items-start gap-5">
                                            <div className={`mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${selectedQuestionIds.includes(q.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-200 group-hover:border-gray-400'}`}>
                                                {selectedQuestionIds.includes(q.id) && <span className="material-symbols-outlined text-white text-[18px]">check</span>}
                                            </div>
                                            <div className="flex-1 space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[13px] font-black text-gray-300 uppercase tracking-widest">Q{idx + 1}</span>
                                                    <div className="flex gap-2">
                                                        <span className="px-3 py-1 bg-gray-50 text-gray-500 rounded-lg text-[10px] font-black uppercase tracking-wider">{q.type}</span>
                                                        <span className="px-3 py-1 bg-[#E8F5E9] text-[#2E7D32] rounded-lg text-[10px] font-black uppercase tracking-wider">{q.marks} Marks</span>
                                                    </div>
                                                </div>
                                                <p className="text-[15px] font-bold text-gray-700 leading-relaxed font-sans" dangerouslySetInnerHTML={{ __html: q.textEn }} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-[2rem] p-20 border border-dashed border-gray-200 flex flex-col items-center justify-center">
                                <span className="material-symbols-outlined text-6xl text-gray-100 mb-4">find_in_page</span>
                                <p className="text-gray-400 font-bold italic">No questions found</p>
                            </div>
                        )}
                    </div>
                )}
            </DrawerBody>

            <DrawerFooter className="p-0 border-t border-gray-100">
                <PrimaryButton 
                    onClick={handleImportSubmit}
                    disabled={selectedQuestionIds.length === 0}
                    className="!h-[80px] bg-black hover:bg-[#1a1c1e] text-[17px] font-black uppercase tracking-[3px]"
                >
                    Import {selectedQuestionIds.length} Questions
                </PrimaryButton>
            </DrawerFooter>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            `}</style>
        </RightSideDrawer>
    );
};

export default ImportExistingTestDrawer;
