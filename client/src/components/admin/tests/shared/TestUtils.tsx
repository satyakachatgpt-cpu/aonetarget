import React from "react";
import DOMPurify from 'dompurify';
import { InlineMath } from "react-katex";

export const renderQuestionText = (text: any) => {
  if (typeof text !== "string") return String(text || "");
  const parts = text.split(/(\$.*?\$)/g);
  return parts.map((part, i) => {
    if (part && part.startsWith("$") && part.endsWith("$")) {
      const math = part.slice(1, -1).trim();
      if (!math) return null;
      try {
        return <InlineMath key={i} math={math} />;
      } catch (e) {
        return (
          <span key={i} className="text-red-500 font-mono text-[10px]">
            {part}
          </span>
        );
      }
    }
    return (
      <span key={i} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(String(part)) }} />
    );
  });
};

interface RenderDiagramProps {
  q: any;
  field?: string;
  isEditable?: boolean;
  handleImageSelect?: (dataUrl: string, assignment: { questionId: any; field: string }) => void;
  handleRemoveImage?: (qId: any, field: string) => void;
}

export const renderDiagram = ({
  q,
  field = "question",
  isEditable = false,
  handleImageSelect,
  handleRemoveImage,
}: RenderDiagramProps) => {
  let dataUrl = "";
  if (field === "question") {
    dataUrl = q.questionImage || (Array.isArray(q.questionImages) ? q.questionImages[0] : "");
  } else if (field === "solution") {
    dataUrl = q.solutionImage || (q.solution?.images && Array.isArray(q.solution.images) ? q.solution.images[0] : "");
  } else {
    // Option Image (A, B, C, D)
    dataUrl = q.optionImages?.[field.charCodeAt(0) - 65] || "";
  }
  
  if (!dataUrl) {
    if (!isEditable) return null;
    return (
      <div className="mt-2 flex items-center gap-2 justify-start">
        <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-dashed border-gray-200 text-gray-400 hover:border-black hover:text-black cursor-pointer transition-all bg-white">
          <span className="material-symbols-outlined text-[16px]">upload_file</span>
          <span className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">Upload Image</span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (ev) => {
                if (handleImageSelect) {
                  setTimeout(() => handleImageSelect(ev.target?.result as string, { questionId: q.id, field }), 0);
                }
              };
              reader.readAsDataURL(file);
            }
          }} />
        </label>
      </div>
    );
  }

  const isPageLevel = field === "question" && q.hasDiagramOptions;

  return (
    <div className={`mt-3 border rounded-xl overflow-hidden relative group ${isPageLevel ? 'border-amber-200 bg-amber-50/40' : 'border-blue-100 bg-blue-50/40'} ${!isEditable ? 'max-w-[400px]' : ''}`}>
      <div className={`px-3 py-1.5 border-b flex items-center justify-between gap-1.5 ${isPageLevel ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-100'}`}>
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[14px]">{isPageLevel ? 'schema' : field === 'solution' ? 'psychology' : 'image'}</span>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${isPageLevel ? 'text-amber-600' : 'text-blue-500'}`}>
            {isPageLevel ? 'Options as Diagrams' : field === 'question' ? 'Question Diagram' : field === 'solution' ? 'Solution Diagram' : `Option ${field} Image`}
          </span>
        </div>
        {isEditable && (
          <button 
            onClick={() => handleRemoveImage && handleRemoveImage(q.id, field)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
          </button>
        )}
      </div>
      <div className="p-2 flex flex-col items-center">
        <img src={dataUrl} alt="Diagram" className={`w-full h-auto rounded-lg object-contain ${field === 'question' ? 'max-h-64' : 'max-h-32'}`} loading="lazy" />
        {isEditable && (
          <div className="flex items-center gap-4 mt-3">
            <label className="text-[10px] font-bold text-gray-500 hover:text-black flex items-center gap-1 transition-colors cursor-pointer bg-white px-2 py-1 rounded">
              <span className="material-symbols-outlined text-[14px]">upload_file</span> Change Image
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    if (handleImageSelect) {
                      setTimeout(() => handleImageSelect(ev.target?.result as string, { questionId: q.id, field }), 0);
                    }
                  };
                  reader.readAsDataURL(file);
                }
              }} />
            </label>
          </div>
        )}
      </div>
    </div>
  );
};
