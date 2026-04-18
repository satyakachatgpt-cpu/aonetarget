import React, { useState, useEffect } from 'react';
import { RightSideDrawer, DrawerBody } from './DrawerSystem';
import { uploadAPI } from '../../services/apiClient';

interface BulkEditQuestionsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    questions: any[];
    onSave: (updatedQuestions: any[]) => void;
    testName?: string;
    test?: any;
}

const BulkEditQuestionsDrawer: React.FC<BulkEditQuestionsDrawerProps> = ({
    isOpen,
    onClose,
    questions,
    onSave,
    testName,
    test
}) => {
    const [range, setRange] = useState({ from: 1, to: Math.min(10, questions.length) });
    const [localQuestions, setLocalQuestions] = useState<any[]>([]);
    const [filteredQuestions, setFilteredQuestions] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setLocalQuestions(JSON.parse(JSON.stringify(questions))); // Deep clone
            setRange({ from: 1, to: Math.min(10, questions.length) });
        }
    }, [isOpen, questions]);

    useEffect(() => {
        const fromIdx = Math.max(0, range.from - 1);
        const toIdx = Math.min(localQuestions.length, range.to);
        setFilteredQuestions(localQuestions.slice(fromIdx, toIdx));
    }, [range, localQuestions]);

    const handleQuestionUpdate = (indexInLocal: number, field: string, value: any) => {
        const updated = [...localQuestions];
        updated[indexInLocal] = { ...updated[indexInLocal], [field]: value };
        setLocalQuestions(updated);
    };

    const handleOptionUpdate = (indexInLocal: number, optionKey: string, value: string) => {
        const updated = [...localQuestions];
        const q = { ...updated[indexInLocal] };
        q[optionKey] = value;
        updated[indexInLocal] = q;
        setLocalQuestions(updated);
    };

    const handleImageUpload = async (indexInLocal: number, field: string, file: File) => {
        try {
            const res = await uploadAPI.uploadImage(file);
            if (res && (res.url || res.path)) {
                handleQuestionUpdate(indexInLocal, field, res.url || res.path);
            }
        } catch (error) {
            console.error("Image upload failed:", error);
            alert("Image upload failed");
        }
    };

    const handleSave = async () => {
        // VALIDATION: Check for missing marks
        const defaultMarks = test?.marksPerQuestion || test?.marks;
        const missingMarks = localQuestions.filter(q => 
            (q.marks === undefined || q.marks === null || q.marks === "") && 
            (q.positiveMarks === undefined || q.positiveMarks === null || q.positiveMarks === "") && 
            (defaultMarks === undefined || defaultMarks === null || defaultMarks === "")
        );

        if (missingMarks.length > 0) {
            alert(`Validation Error: ${missingMarks.length} questions are missing Marks, and no Test-level default is set. Please specify marks before saving.`);
            return;
        }

        setIsSaving(true);
        try {
            await onSave(localQuestions);
            onClose();
        } catch (error) {
            console.error("Save failed:", error);
            alert("Failed to save changes");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <RightSideDrawer isOpen={isOpen} onClose={onClose} width="1100px">
            <div className="flex flex-col h-full bg-[#f8fafc] font-sans">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-5 bg-white border-b border-gray-100 shrink-0 sticky top-0 z-20 shadow-sm">
                    <div>
                        <h2 className="text-[18px] font-black text-gray-900 flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-600">edit_note</span>
                            Bulk Edit Questions
                        </h2>
                        <p className="text-[12px] font-bold text-gray-400 mt-0.5 uppercase tracking-wider">{testName || 'Editing Test'}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-1 px-3 gap-3">
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-black text-gray-400 uppercase">From</span>
                                <input
                                    type="number"
                                    value={range.from}
                                    onChange={(e) => setRange(prev => ({ ...prev, from: parseInt(e.target.value) || 1 }))}
                                    className="w-14 h-8 bg-white border border-gray-200 rounded-lg text-center text-[13px] font-bold outline-none focus:border-blue-500 transition-all"
                                />
                            </div>
                            <div className="w-[1px] h-4 bg-gray-200" />
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-black text-gray-400 uppercase">To</span>
                                <input
                                    type="number"
                                    value={range.to}
                                    onChange={(e) => setRange(prev => ({ ...prev, to: parseInt(e.target.value) || 1 }))}
                                    className="w-14 h-8 bg-white border border-gray-200 rounded-lg text-center text-[13px] font-bold outline-none focus:border-blue-500 transition-all"
                                />
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 flex items-center justify-center bg-gray-50 text-gray-400 hover:text-gray-600 rounded-full transition-all"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                <DrawerBody className="flex-1 overflow-y-auto p-8 space-y-10 hide-scrollbar scroll-smooth">
                    {filteredQuestions.map((q, idx) => {
                        const actualIdx = range.from - 1 + idx;
                        return (
                            <div key={actualIdx} className="bg-white rounded-[24px] border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden group">
                                {/* Card Header */}
                                <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-50 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center text-[14px] font-black shadow-lg">
                                            {actualIdx + 1}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">Question UID:</span>
                                            <span className="text-[12px] font-medium text-gray-600 font-mono">{(q.id || q._id || 'N/A').toString().slice(-8)}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-6">
                                        {(!test?.marksPerQuestion && !test?.negativeMarking) ? (
                                            <>
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Positive Marks</label>
                                                    <input
                                                        type="number"
                                                        value={q.marks || q.positiveMarks || ''}
                                                        onChange={(e) => handleQuestionUpdate(actualIdx, 'marks', e.target.value)}
                                                        placeholder="0"
                                                        className="w-20 h-9 bg-white border border-gray-200 rounded-lg text-center text-[13px] font-bold outline-none focus:border-green-500 transition-all"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Negative Marks</label>
                                                    <input
                                                        type="number"
                                                        value={q.negative || q.negativeMarks || ''}
                                                        onChange={(e) => handleQuestionUpdate(actualIdx, 'negative', e.target.value)}
                                                        placeholder="0"
                                                        className="w-20 h-9 bg-white border border-gray-200 rounded-lg text-center text-[13px] font-bold outline-none focus:border-red-500 transition-all text-red-500"
                                                    />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg">
                                                <span className="material-symbols-outlined text-[16px] text-blue-600">info</span>
                                                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-tight">Test-Level Scoring Active (+{test?.marksPerQuestion}/-{test?.negativeMarking})</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="p-8 space-y-8">
                                    {/* Question Text & Image */}
                                    <div className="grid grid-cols-12 gap-8">
                                        <div className="col-span-8 space-y-3">
                                            <label className="text-[12px] font-black text-gray-500 uppercase flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[18px]">subject</span>
                                                Question Statement
                                            </label>
                                            <textarea
                                                value={q.question || ''}
                                                onChange={(e) => handleQuestionUpdate(actualIdx, 'question', e.target.value)}
                                                className="w-full h-32 p-5 bg-gray-50 border border-gray-100 rounded-2xl text-[14px] font-medium resize-none outline-none focus:bg-white focus:border-blue-500/30 focus:shadow-sm transition-all leading-relaxed"
                                                placeholder="Enter question text..."
                                            />
                                        </div>
                                        <div className="col-span-4 space-y-3">
                                            <label className="text-[12px] font-black text-gray-500 uppercase flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[18px]">imagesmode</span>
                                                Diagram/Image
                                            </label>
                                            <div className="h-32 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center relative group/img overflow-hidden bg-white">
                                                {q.image || q.questionImage ? (
                                                    <>
                                                        <img src={q.image || q.questionImage} className="w-full h-full object-contain p-2" alt="diagram" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                                                            <button 
                                                                onClick={() => {
                                                                    const input = document.createElement('input');
                                                                    input.type = 'file';
                                                                    input.onchange = (e: any) => handleImageUpload(actualIdx, 'questionImage', e.target.files[0]);
                                                                    input.click();
                                                                }}
                                                                className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                                                            >
                                                                <span className="material-symbols-outlined text-[20px]">edit</span>
                                                            </button>
                                                            <button 
                                                                onClick={() => handleQuestionUpdate(actualIdx, 'questionImage', '')}
                                                                className="w-10 h-10 bg-white text-red-500 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                                                            >
                                                                <span className="material-symbols-outlined text-[20px]">delete</span>
                                                            </button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div 
                                                        onClick={() => {
                                                            const input = document.createElement('input');
                                                            input.type = 'file';
                                                            input.onchange = (e: any) => handleImageUpload(actualIdx, 'questionImage', e.target.files[0]);
                                                            input.click();
                                                        }}
                                                        className="flex flex-col items-center gap-1 cursor-pointer group-hover:bg-gray-50 w-full h-full justify-center transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-gray-300 text-[32px]">add_a_photo</span>
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Upload Diagram</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Options Grid */}
                                    <div className="space-y-4">
                                        <label className="text-[12px] font-black text-gray-500 uppercase flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[18px]">radio_button_checked</span>
                                            Answer Options
                                        </label>
                                        <div className="grid grid-cols-2 gap-6">
                                            {['A', 'B', 'C', 'D'].map((opt, i) => {
                                                const optText = q.displayOptions?.[i]?.text || q[`option${opt}`] || '';
                                                return (
                                                    <div key={opt} className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${q.correctAnswer === opt ? 'border-green-500 bg-green-50/30' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
                                                        <button 
                                                            onClick={() => handleQuestionUpdate(actualIdx, 'correctAnswer', opt)}
                                                            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all font-black text-[14px] ${q.correctAnswer === opt ? 'bg-green-500 text-white shadow-lg' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'}`}
                                                        >
                                                            {opt}
                                                        </button>
                                                        <div className="flex-1 space-y-3">
                                                            <textarea
                                                                value={optText}
                                                                onChange={(e) => {
                                                                    if (q.displayOptions?.[i]) {
                                                                        const newDisplay = [...q.displayOptions];
                                                                        newDisplay[i] = { ...newDisplay[i], text: e.target.value };
                                                                        handleQuestionUpdate(actualIdx, 'displayOptions', newDisplay);
                                                                    } else {
                                                                        handleOptionUpdate(actualIdx, `option${opt}`, e.target.value);
                                                                    }
                                                                }}
                                                                className="w-full p-0 bg-transparent text-[14px] font-semibold text-gray-800 outline-none resize-none hide-scrollbar placeholder:text-gray-300 placeholder:font-medium"
                                                                rows={2}
                                                                placeholder={`Option ${opt} text...`}
                                                            />
                                                            {/* Option Image Support */}
                                                            <div className="flex items-center gap-4">
                                                                {(q.displayOptions?.[i]?.image || q[`option${opt}Image`]) ? (
                                                                    <div className="h-20 w-32 border border-gray-100 rounded-xl overflow-hidden relative group/optimg bg-white">
                                                                        <img src={q.displayOptions?.[i]?.image || q[`option${opt}Image`]} className="w-full h-full object-contain" alt={`opt ${opt}`} />
                                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/optimg:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                                            <button 
                                                                                onClick={() => {
                                                                                    const input = document.createElement('input');
                                                                                    input.type = 'file';
                                                                                    input.onchange = (e: any) => handleImageUpload(actualIdx, `option${opt}Image`, e.target.files[0]);
                                                                                    input.click();
                                                                                }}
                                                                                className="w-7 h-7 bg-white text-black rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                                                                            >
                                                                                <span className="material-symbols-outlined text-[16px]">edit</span>
                                                                            </button>
                                                                            <button 
                                                                                onClick={() => {
                                                                                    if (q.displayOptions?.[i]) {
                                                                                        const newDisplay = [...q.displayOptions];
                                                                                        newDisplay[i] = { ...newDisplay[i], image: '' };
                                                                                        handleQuestionUpdate(actualIdx, 'displayOptions', newDisplay);
                                                                                    }
                                                                                    handleQuestionUpdate(actualIdx, `option${opt}Image`, '');
                                                                                }}
                                                                                className="w-7 h-7 bg-white text-red-500 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                                                                            >
                                                                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <button 
                                                                        onClick={() => {
                                                                            const input = document.createElement('input');
                                                                            input.type = 'file';
                                                                            input.onchange = (e: any) => handleImageUpload(actualIdx, `option${opt}Image`, e.target.files[0]);
                                                                            input.click();
                                                                        }}
                                                                        className="h-20 w-32 border-2 border-dashed border-gray-100 rounded-xl flex flex-col items-center justify-center text-gray-300 hover:border-gray-300 hover:text-gray-400 transition-all bg-gray-50/50"
                                                                    >
                                                                        <span className="material-symbols-outlined text-[20px]">add_a_photo</span>
                                                                        <span className="text-[9px] font-black uppercase mt-1">Add Image</span>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* End of results spacer */}
                    <div className="h-20" />
                </DrawerBody>

                <div className="bg-white border-t border-gray-100 p-6 px-10 flex items-center justify-between shrink-0">
                    <div className="text-[12px] font-bold text-gray-400">
                        Total Questions Selected: <span className="text-black">{filteredQuestions.length}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClose}
                            className="px-8 py-3.5 text-gray-500 text-[14px] font-bold hover:text-black transition-colors"
                        >
                            Discard
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-10 py-3.5 bg-black text-white rounded-[16px] text-[14px] font-black shadow-xl hover:shadow-2xl active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center gap-3"
                        >
                            {isSaving ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <span className="material-symbols-outlined text-[20px]">save</span>
                            )}
                            Save All Changes
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </RightSideDrawer>
    );
};

export default BulkEditQuestionsDrawer;
