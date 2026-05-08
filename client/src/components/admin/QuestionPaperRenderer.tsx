import React, { useState } from 'react';
import DOMPurify from 'dompurify';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

interface Question {
    id: number | string;
    questionEn: string;
    questionHi?: string;
    questionImage?: string | null;
    type: string;
    options: string[];
    correctAnswer: string;
    solution?: string;
    subject?: string;
    difficulty?: string;
    positiveMarks: number;
    negativeMarks: number;
}

interface Props {
    questions: Question[];
    onClose?: () => void;
    initialFormat?: 'default' | 'format1' | 'format2' | 'format3' | 'format4' | 'format5' | 'format6';
}

const QuestionPaperRenderer: React.FC<Props> = ({ questions, onClose, initialFormat = 'default' }) => {
    const [activeFormat, setActiveFormat] = useState<'default' | 'format1' | 'format2' | 'format3' | 'format4' | 'format5' | 'format6'>(initialFormat);

    React.useEffect(() => {
        if (initialFormat) {
            setActiveFormat(initialFormat);
        }
    }, [initialFormat]);

    const handlePrint = () => {
        window.print();
    };

    // Helper to render text with math support
    const renderText = (text: string) => {
        if (!text || typeof text !== 'string') return text || '';

        const parts = text.split(/(\$.*?\$)/g);
        return parts.map((part, i) => {
            if (part && part.startsWith('$') && part.endsWith('$')) {
                const math = part.slice(1, -1);
                try {
                    return <InlineMath key={i} math={math} />;
                } catch (e) {
                    return <span key={i} className="text-red-500 font-mono text-[10px]">{part}</span>;
                }
            }
            return <span key={i} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(part) }} />;
        });
    };

    const renderDefault = () => (
        <div className="bg-white p-4">
            {questions.map((q, idx) => (
                <div key={q.id || idx} className="mb-6 last:mb-0">
                    <table className="w-full border-collapse border border-gray-300">
                        <tbody>
                            <tr>
                                <td className="w-[120px] bg-gray-50 border border-gray-300 px-3 py-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-tight align-top">Question</td>
                                <td className="border border-gray-300 px-3 py-2 text-[13px] text-gray-900">
                                    <div className="space-y-2">
                                        <div className="font-semibold">{renderText(q.questionEn)}</div>
                                        {q.questionHi && <div className="text-gray-600 font-medium">{q.questionHi}</div>}
                                        {q.questionImage && <div className="mt-2 text-center"><img src={q.questionImage} alt="" className="max-h-60 object-contain inline-block" /></div>}
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td className="bg-gray-50 border border-gray-300 px-3 py-1 text-[9px] font-bold text-gray-400 uppercase tracking-tight">Type</td>
                                <td className="border border-gray-300 px-3 py-1 text-[12px] text-red-500 font-bold underline decoration-dotted capitalize italic">{q.type.replace('_', ' ')}</td>
                            </tr>
                            {q.options.map((opt, i) => (
                                <tr key={i}>
                                    <td className="bg-gray-50 border border-gray-300 px-3 py-1 text-[9px] font-bold text-gray-400 uppercase tracking-tight">Option</td>
                                    <td className="border border-gray-300 px-3 py-1 text-[12px] font-medium text-gray-800">{renderText(opt)}</td>
                                </tr>
                            ))}
                            <tr>
                                <td className="bg-gray-50 border border-gray-300 px-3 py-1 text-[9px] font-bold text-gray-400 uppercase tracking-tight">Answer</td>
                                <td className="border border-gray-300 px-3 py-1 text-[12px] font-bold text-gray-800">{q.correctAnswer}</td>
                            </tr>
                            <tr>
                                <td className="bg-gray-50 border border-gray-300 px-3 py-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-tight align-top">Solution</td>
                                <td className="border border-gray-300 px-3 py-2 text-[12px] text-gray-800">
                                    <div className="space-y-3">
                                        <div className="font-medium italic text-gray-600">{renderText(q.solution || '')}</div>
                                        {idx === 0 && <div className="text-center"><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Acetonitrile-2D-flat.png/200px-Acetonitrile-2D-flat.png" alt="" className="max-h-48 object-contain inline-block mt-2" /></div>}
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td className="bg-gray-50 border border-gray-300 px-3 py-1 text-[9px] font-bold text-gray-400 uppercase tracking-tight">Positive Marks</td>
                                <td className="border border-gray-300 px-3 py-1 text-[12px] text-gray-800 font-black">{q.positiveMarks}</td>
                            </tr>
                            <tr>
                                <td className="bg-gray-50 border border-gray-300 px-3 py-1 text-[9px] font-bold text-gray-400 uppercase tracking-tight">Negative Marks</td>
                                <td className="border border-gray-300 px-3 py-1 text-[12px] text-gray-800 font-black">{q.negativeMarks}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            ))}
        </div>
    );

    const renderFormat1 = () => (
        <div className="bg-white p-16 max-w-4xl mx-auto space-y-12 font-serif text-black leading-snug">
            <div className="text-center border-b-2 border-black pb-4 mb-12">
                <h2 className="text-3xl font-bold uppercase tracking-[0.2em]">Practice Test Paper</h2>
                <div className="text-sm mt-2 font-sans text-gray-500 font-bold italic">Standard Document View • Version 2.0</div>
            </div>
            {questions.map((q, idx) => (
                <div key={idx} className="text-[17px] group">
                    <div className="mb-4">
                        <span className="font-bold underline text-[18px]">Question {idx + 1}:</span>
                        <span className="ml-2 leading-relaxed">{renderText(q.questionEn)}</span>
                        {q.questionImage && (
                            <div className="mt-6 mb-6">
                                <img src={q.questionImage} alt="" className="max-h-80 object-contain rounded-lg border border-gray-100 shadow-sm mx-auto" />
                            </div>
                        )}
                    </div>
                    {q.questionHi && (
                        <div className="mb-6 italic text-gray-600 ml-6 border-l-4 border-gray-100 pl-6 py-1">
                            {q.questionHi}
                        </div>
                    )}

                    <div className="space-y-2 mb-8 pl-10 font-medium">
                        {q.options.map((opt, i) => (
                            <div key={i} className="flex gap-4 items-baseline hover:translate-x-1 transition-transform cursor-default">
                                <span className="w-10 shrink-0 font-bold">({String.fromCharCode(97 + i)})</span>
                                <span className="leading-relaxed">{renderText(opt)}</span>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-4 text-[15px] bg-gray-50/50 p-8 rounded-3xl border border-gray-100 group-hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-4">
                            <span className="font-black uppercase text-[11px] text-gray-400 tracking-[0.2em] bg-white px-4 py-2 rounded-xl shadow-sm">Correct Choice</span>
                            <span className="font-black text-black text-[18px] uppercase">{q.correctAnswer}</span>
                        </div>
                        <div className="pt-2">
                            <span className="font-black uppercase text-[11px] text-gray-400 tracking-[0.2em] bg-white px-4 py-2 rounded-xl shadow-sm inline-block mb-3">Solution Analysis</span>
                            <div className="italic text-gray-700 leading-relaxed font-medium pl-4 border-l-4 border-gray-200">
                                {renderText(q.solution || 'No detailed explanation provided for this question.')}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );


    const renderFormat2 = () => (
        <div className="bg-white p-14 max-w-5xl mx-auto space-y-20 font-sans relative text-black shadow-[0_50px_100px_rgba(0,0,0,0.04)] rounded-[4rem] group/root translate-y-4">
            {questions.map((q, idx) => (
                <div key={idx} className="relative border-b-2 border-dashed border-gray-100 pb-20 last:border-0 last:pb-0">
                    <div className="absolute top-0 right-0 z-10 rotate-3 group-hover:rotate-0 transition-transform">
                        <div className="bg-[#FF6D00] text-white text-[13px] font-black px-10 py-3 rounded-2xl shadow-[0_15px_30px_rgba(255,109,0,0.3)] tracking-[0.2em] uppercase">
                            Beta
                        </div>
                    </div>

                    <div className="space-y-10 pr-48">
                        <div className="space-y-4">
                            <div className="text-[24px] font-black text-black leading-snug flex gap-6">
                                <span className="bg-black text-white w-14 h-14 flex items-center justify-center rounded-[1.5rem] shrink-0 text-[20px] shadow-xl group-hover:scale-110 transition-transform">{idx + 1}</span>
                                <div className="pt-2">{renderText(q.questionEn)}</div>
                            </div>
                            {q.questionHi && (
                                <div className="text-[19px] text-gray-400 font-bold leading-relaxed ml-20 italic">
                                    {q.questionHi}
                                </div>
                            )}
                            {q.questionImage && (
                                <div className="ml-20 pt-4 pb-4">
                                    <div className="relative group/img overflow-hidden rounded-[3rem] border-[6px] border-[#F0F0FF] shadow-2xl inline-block max-w-full">
                                        <img src={q.questionImage} alt="" className="max-h-[400px] object-contain block group-hover:scale-105 transition-transform duration-700" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#4361EE]/10 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity" />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4 pt-4 ml-20">
                            {q.options.map((opt, i) => (
                                <div key={i} className="group p-6 rounded-[2rem] border-2 border-gray-50 hover:border-black hover:bg-gray-50 transition-all duration-300 cursor-default flex items-center justify-between">
                                    <div className="text-[19px] text-gray-800 font-bold flex gap-6 items-center">
                                        <span className="text-gray-200 group-hover:text-black transition-colors text-[24px]">{String.fromCharCode(65 + i)}.</span>
                                        <span className="group-hover:translate-x-2 transition-transform">{renderText(opt)}</span>
                                    </div>
                                    <div className="w-8 h-8 rounded-full border-2 border-gray-100 group-hover:border-black transition-all"></div>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-8 pt-6 ml-20 bg-[#FBFBFF] p-10 rounded-[2.5rem] border border-[#EEEEFF]">
                            <div className="flex items-center gap-6">
                                <div className="text-[12px] font-black uppercase text-[#4361EE] tracking-[0.3em] bg-white px-6 py-3 rounded-2xl shadow-sm border border-[#EEEEFF]">Target Key</div>
                                <div className="text-[32px] font-black text-black bg-white w-16 h-16 flex items-center justify-center rounded-[1.25rem] shadow-md border border-[#EEEEFF]">{q.correctAnswer}</div>
                            </div>

                            <div className="space-y-5 pt-2">
                                <div className="text-[19px] font-black text-black flex items-center gap-4">
                                    <div className="w-3 h-10 bg-[#4361EE] rounded-full shadow-[0_5px_15px_rgba(67,97,238,0.3)]"></div>
                                    Expert Solution
                                </div>
                                <div className="text-[18px] text-gray-600 leading-relaxed font-semibold pr-10 opacity-80">
                                    {q.solution?.split('\n').map((line, lidx) => (
                                        <div key={lidx} className="flex gap-5 mb-4 items-start">
                                            <span className="shrink-0 mt-3 w-2.5 h-2.5 bg-[#4361EE]/30 rounded-full group-hover:scale-125 transition-transform"></span>
                                            <span>{renderText(line)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );


    const renderFormat3 = () => (
        <div className="bg-white p-8 max-w-6xl mx-auto font-sans text-black animate-in fade-in duration-700">
            <div className="grid grid-cols-2 gap-x-12 gap-y-16">
                {questions.map((q, idx) => (
                    <div key={idx} className="relative border-l-2 border-gray-100 pl-8">
                        <div className="flex gap-4 items-start mb-4">
                            <span className="shrink-0 w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold text-[16px] shadow-lg">
                                {idx + 1}
                            </span>
                            <div className="space-y-2">
                                <div className="text-[17px] font-bold leading-tight">{renderText(q.questionEn)}</div>
                                {q.questionHi && <div className="text-[15px] text-gray-500 font-medium italic">{q.questionHi}</div>}
                                {q.questionImage && (
                                    <div className="mt-4 mb-2 p-1 bg-gray-50 rounded-lg inline-block border border-gray-100">
                                        <img src={q.questionImage} alt="" className="max-h-40 object-contain block mx-auto" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-6 ml-14">
                            {q.options.map((opt, i) => (
                                <div key={i} className="flex gap-3 items-center text-[15px] p-2 hover:bg-gray-50 rounded-xl transition-colors group">
                                    <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center font-black text-[11px] group-hover:bg-black group-hover:text-white transition-colors">
                                        {String.fromCharCode(65 + i)}
                                    </span>
                                    <span className="font-semibold text-gray-700">{renderText(opt)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="ml-14 bg-gray-50 border border-gray-100 p-4 rounded-2xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-[11px] font-black uppercase text-gray-400 tracking-widest">Key</span>
                                <span className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center font-black text-black shadow-sm text-[16px]">
                                    {q.correctAnswer}
                                </span>
                            </div>
                            <div className="flex gap-4 text-[11px] font-bold text-gray-300 uppercase italic">
                                <span>+{q.positiveMarks}</span>
                                <span>-{q.negativeMarks}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderFormat4 = () => (
        <div className="bg-white min-h-screen relative p-16 font-sans text-[#1A237E] animate-in fade-in duration-700">
            {/* Watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none rotate-[-35deg]">
                <div className="w-[800px] h-[800px] rounded-full border-[60px] border-[#1A237E] flex items-center justify-center">
                    <span className="text-[140px] font-black text-center leading-none">AONE<br />TARGET</span>
                </div>
            </div>

            {/* Institute Header */}
            <div className="relative border-b-4 border-[#1A237E] pb-10 mb-16 flex items-center justify-between">
                <div>
                    <h1 className="text-5xl font-black italic tracking-tighter text-[#1A237E]">AONE TARGET</h1>
                    <p className="text-sm font-bold uppercase tracking-[0.4em] mt-2 opacity-60">The Excellence of Learning</p>
                </div>
                <div className="text-right border-l-2 border-gray-200 pl-10">
                    <div className="text-[14px] font-black uppercase tracking-widest">Official Examination Paper</div>
                    <div className="text-[11px] font-bold opacity-50 mt-1 italic uppercase">Copyright © 2026 Admin Panel • Confidential</div>
                </div>
            </div>

            <div className="relative space-y-20">
                {questions.map((q, idx) => (
                    <div key={idx} className="group">
                        <div className="flex items-baseline gap-8 mb-10">
                            <div className="text-7xl font-black text-[#1A237E]/10 select-none group-hover:text-[#1A237E]/20 transition-colors">
                                {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                            </div>
                            <div className="space-y-4 pt-10">
                                <div className="text-2xl font-black leading-tight border-b border-[#1A237E]/5 pb-6">
                                    {renderText(q.questionEn)}
                                </div>
                                {q.questionHi && (
                                    <div className="text-lg font-bold text-[#1A237E]/40 italic">
                                        {q.questionHi}
                                    </div>
                                )}
                                {q.questionImage && (
                                    <div className="pt-6 pb-2">
                                        <div className="bg-white p-6 rounded-[3rem] border border-[#1A237E]/5 shadow-xl inline-block">
                                            <img src={q.questionImage} alt="" className="max-h-[350px] object-contain block mx-auto grayscale group-hover:grayscale-0 transition-all duration-700" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 pl-32 mb-12">
                            {q.options.map((opt, i) => (
                                <div key={i} className="flex gap-6 items-center border-[3px] border-gray-50 p-6 rounded-[2.5rem] hover:border-[#1A237E] hover:bg-gray-50/50 transition-all cursor-default">
                                    <span className="w-12 h-12 rounded-[1.2rem] bg-[#1A237E] text-white flex items-center justify-center font-black text-[20px] shadow-xl">
                                        {String.fromCharCode(65 + i)}
                                    </span>
                                    <span className="text-[18px] font-bold text-gray-800">{renderText(opt)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="pl-32">
                            <div className="bg-[#1A237E] text-white p-8 rounded-[3rem] shadow-[0_20px_50px_rgba(26,35,126,0.15)] flex flex-col gap-6">
                                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-3 h-10 bg-white rounded-full"></div>
                                        <span className="font-black uppercase tracking-widest text-[14px]">Solution Analysis</span>
                                    </div>
                                    <div className="bg-white text-[#1A237E] px-8 py-3 rounded-full font-black text-[18px]">
                                        ANSWER: {q.correctAnswer}
                                    </div>
                                </div>
                                <div className="text-[17px] font-semibold leading-relaxed opacity-80 pl-4 border-l-2 border-white/20">
                                    {renderText(q.solution || 'No detailed explanation provided for this question.')}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderFormat5 = () => (
        <div className="bg-white p-6 max-w-6xl mx-auto font-sans text-black animate-in fade-in duration-700">
            <div className="grid grid-cols-3 gap-6">
                {questions.map((q, idx) => (
                    <div key={idx} className="border border-gray-100 rounded-2xl p-5 hover:border-blue-400 transition-colors shadow-sm bg-[#fafbfc]/50">
                        <div className="flex gap-2 mb-3">
                            <span className="w-6 h-6 rounded bg-gray-900 text-white flex items-center justify-center text-[10px] font-black shrink-0">{idx + 1}</span>
                            <div className="text-[13px] font-bold leading-tight line-clamp-3">{renderText(q.questionEn)}</div>
                        </div>
                        <div className="space-y-1.5 mb-4 border-l border-gray-200 pl-3">
                            {(q.options || []).map((opt, i) => (
                                <div key={i} className="flex gap-2 text-[11px] font-semibold text-gray-500">
                                    <span className="text-gray-300">({String.fromCharCode(97 + i)})</span>
                                    <span className="line-clamp-1">{renderText(opt)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-auto">
                            <div className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Ans: {q.correctAnswer}</div>
                            <div className="text-[9px] font-bold text-gray-400">{q.positiveMarks}M / {q.negativeMarks}N</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderFormat6 = () => (
        <div className="bg-white p-12 max-w-5xl mx-auto space-y-16 font-sans text-stone-900">
            {questions.map((q, idx) => (
                <div key={idx} className="flex gap-10 items-start border-l-8 border-stone-100 pl-10 group">
                    <div className="space-y-6 flex-1">
                        <div className="space-y-4">
                            <h3 className="text-[28px] font-black leading-tight tracking-tight group-hover:text-amber-600 transition-colors">
                                <span className="text-stone-300 mr-4">#{idx + 1}</span>
                                {renderText(q.questionEn)}
                            </h3>
                            {q.questionHi && <p className="text-[18px] text-stone-400 font-bold italic">{q.questionHi}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {(q.options || []).map((opt, i) => (
                                <div key={i} className="flex items-center gap-4 bg-stone-50 p-5 rounded-[1.5rem] border-2 border-transparent hover:border-amber-400 hover:bg-white transition-all cursor-pointer">
                                    <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center font-black text-[14px] group-hover:bg-amber-100">{String.fromCharCode(65 + i)}</div>
                                    <div className="text-[16px] font-bold">{renderText(opt)}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {q.questionImage && (
                        <div className="w-[300px] shrink-0 pt-2">
                            <div className="bg-stone-50 p-4 rounded-3xl border-2 border-stone-100 hover:border-amber-200 transition-colors shadow-lg">
                                <img src={q.questionImage} alt="" className="w-full h-auto rounded-2xl block" />
                                <p className="text-center text-[10px] uppercase font-black tracking-widest text-stone-300 mt-4">Reference Figure</p>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );


    const FormatCard = ({ id, active, title, subtitle, onClick, badge }: any) => (
        <button
            onClick={() => onClick(id)}
            className={`relative flex flex-col items-center p-6 rounded-[2.5rem] border-2 transition-all duration-700 group no-print ${active ? 'border-[#00875A] bg-[#F4F9F6] shadow-[0_30px_60px_rgba(0,135,90,0.15)] scale-[1.05] z-10' : 'border-gray-50 bg-white hover:border-gray-200'}`}
        >
            {active && (
                <div className="absolute -top-4 -left-4 bg-[#00875A] text-white w-12 h-12 rounded-[1.25rem] flex items-center justify-center shadow-xl border-4 border-white z-20 animate-in zoom-in duration-500">
                    <span className="material-symbols-outlined text-[24px] font-bold">check</span>
                </div>
            )}

            <div className={`w-[200px] h-[130px] rounded-[1.5rem] shadow-inner mb-6 overflow-hidden border transition-all duration-500 relative ${active ? 'border-transparent' : 'border-gray-50 group-hover:shadow-md'}`}>
                {badge && (
                    <div className="absolute top-3 right-3 bg-[#FF6D00] text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg scale-[1.3] origin-top-right z-30">
                        {badge}
                    </div>
                )}

                {/* Realistic Thumbnail Mockup */}
                <img
                    src={`/thumbnails/${id}.png`}
                    alt={title}
                    className={`w-full h-full object-cover transition-all duration-700 ${active ? 'scale-110' : 'group-hover:scale-105 opacity-80 group-hover:opacity-100'}`}
                    onError={(e) => {
                        (e.target as any).src = "https://placehold.co/200x130?text=" + title;
                    }}
                />

                {/* Overlay for active state */}
                {active && <div className="absolute inset-0 bg-[#00875A]/5 backdrop-blur-[1px] z-10"></div>}
            </div>

            <div className="text-center space-y-1">
                <div className={`text-[20px] font-black transition-colors duration-500 ${active ? 'text-[#00875A]' : 'text-[#1A237E] group-hover:text-black'}`}>{title}</div>
                <div className="text-[12px] text-gray-400 font-bold uppercase tracking-widest opacity-70 group-hover:opacity-100 transition-opacity leading-tight">{subtitle}</div>
            </div>
        </button>
    );

    return (
        <div className="min-h-screen bg-[#F8F9FB] flex flex-col font-sans">
            {/* Real-time Header Design */}
            <div className="bg-white/80 backdrop-blur-3xl border-b border-gray-100 px-16 py-12 flex items-center justify-between no-print sticky top-0 z-[1000] shadow-[0_10px_40px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-16">
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="w-16 h-16 flex items-center justify-center hover:bg-black hover:text-white bg-gray-50 rounded-[2rem] text-gray-500 transition-all active:scale-90 border border-gray-100 shadow-sm group"
                        >
                            <span className="material-symbols-outlined text-[28px] group-hover:rotate-90 transition-transform">close</span>
                        </button>
                    )}

                    <div className="flex gap-10 no-print">
                        <FormatCard
                            id="default"
                            active={activeFormat === 'default'}
                            title="Default"
                            subtitle="Standard Table Format"
                            onClick={setActiveFormat}
                        />
                        <FormatCard
                            id="format1"
                            active={activeFormat === 'format1'}
                            title="Format 1"
                            subtitle="Standard Word Doc"
                            onClick={setActiveFormat}
                        />
                        <FormatCard
                            id="format2"
                            active={activeFormat === 'format2'}
                            title="Format 2"
                            subtitle="Detailed Bilingual View"
                            onClick={setActiveFormat}
                            badge="BETA"
                        />
                        <FormatCard
                            id="format3"
                            active={activeFormat === 'format3'}
                            title="Format 3"
                            subtitle="Competitive OMR Style"
                            onClick={setActiveFormat}
                            badge="HOT"
                        />
                        <FormatCard
                            id="format4"
                            active={activeFormat === 'format4'}
                            title="Format 4"
                            subtitle="Premium Institute"
                            onClick={setActiveFormat}
                            badge="PRO"
                        />
                        <FormatCard
                            id="format5"
                            active={activeFormat === 'format5'}
                            title="Format 5"
                            subtitle="Compact Professional Grid"
                            onClick={setActiveFormat}
                            badge="NEW"
                        />
                        <FormatCard
                            id="format6"
                            active={activeFormat === 'format6'}
                            title="Format 6"
                            subtitle="Academic Visual Focus"
                            onClick={setActiveFormat}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-6 group">
                    <button onClick={handlePrint} className="bg-black text-white px-12 py-6 rounded-[2.25rem] flex items-center gap-5 font-black text-[16px] transition-all hover:shadow-[0_20px_40px_rgba(0,0,0,0.2)] active:scale-95 shadow-[0_10px_30px_rgba(0,0,0,0.1)] no-print relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        <span className="material-symbols-outlined text-[26px]">print</span>
                        GENERATE PAPER
                    </button>
                </div>
            </div>

            {/* Renderer Viewport - Real Paper Simulation */}
            <div className="flex-1 overflow-y-auto px-16 py-20 no-scrollbar perspective-[2000px]">
                <div className="max-w-6xl mx-auto transform transition-all duration-700 animate-in fade-in zoom-in-95">
                    <div className="bg-white print:bg-white p-24 print:p-10 shadow-[0_100px_150px_rgba(0,0,0,0.05)] print:shadow-none rounded-[4rem] print:rounded-none min-h-screen">
                        {activeFormat === 'default' && renderDefault()}
                        {activeFormat === 'format1' && renderFormat1()}
                        {activeFormat === 'format2' && renderFormat2()}
                        {activeFormat === 'format3' && renderFormat3()}
                        {activeFormat === 'format4' && renderFormat4()}
                        {activeFormat === 'format5' && renderFormat5()}
                        {activeFormat === 'format6' && renderFormat6()}
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { size: A4; margin: 15mm; }
                    .no-print { display: none !important; }
                    body { background: white !important; padding: 0 !important; margin: 0 !important; overflow: visible !important; }
                    .bg-[#F8F9FB] { background: white !important; }
                    .p-24, .p-20, .p-16, .py-20 { padding: 0 !important; }
                    .shadow-[0_100px_150px_rgba(0,0,0,0.05)] { box-shadow: none !important; }
                    .rounded-[4rem] { border-radius: 0 !important; }
                    .max-w-6xl { max-width: none !important; width: 100% !important; margin: 0 !important; }
                }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}} />
        </div>
    );
};

export default QuestionPaperRenderer;
