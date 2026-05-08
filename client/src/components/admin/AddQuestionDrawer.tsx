import React, { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { 
  RightSideDrawer, 
  DrawerHeader, 
  DrawerBody, 
  DrawerFooter, 
  FormLabel, 
  FormInput, 
  PrimaryButton 
} from './DrawerSystem';
import RichTextEditor from '../shared/RichTextEditor';
import { extractYouTubeId, toYouTubeEmbed } from '../../lib/utils';
import { uploadAPI } from '../../services/apiClient';

interface QuestionForm {
  id?: string | number;
  questionType: string;
  sectionId: string;
  questionHeading: string;
  questionText: string;
  questionEn?: string;
  questionImages: (File | string | null)[];  // array of 3
  options: {
    text: string;
    file: File | string | null;
    isCorrect: boolean;
  }[];  // array of 5
  answerMode: 'Single' | 'Multiple';
  solution: {
    heading: string;
    text: string;
    images: (File | string | null)[];  // array of 2
    video: string;
  };
  positiveMarks: number;
  negativeMarks: number;
}

interface AddQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  sections?: { id: string; name: string }[];
  testId?: string;
  onUploadImage?: (file: File) => Promise<string>;
  editingQuestion?: any; // To support future edits
  onSaveAndGoToPrevious?: (data: any) => void;
  onSaveAndGoToNext?: (data: any) => void;
  test?: any; // New prop for test context
}

interface OptionRowProps {
  index: number;
  option: {
    text: string;
    file: File | string | null;
    isCorrect: boolean;
  };
  errors: Record<string, string>;
  handleCorrectToggle: (index: number) => void;
  handleOptionTextChange: (index: number, text: string) => void;
  handleOptionFileUpload: (index: number, file: File | string | null) => void;
}

const OptionRow: React.FC<OptionRowProps> = ({ 
  index, 
  option, 
  errors, 
  handleCorrectToggle, 
  handleOptionTextChange, 
  handleOptionFileUpload 
}) => {
  const isRequired = index < 2;
  const [upLoading, setUpLoading] = useState(false);

  return (
    <div className="space-y-4 mb-8">
      <div className="space-y-2">
        <label className="text-[13px] font-bold text-[#444] mb-2 block">
          Option {index + 1}{isRequired && <span className="text-red-500">*</span>}
        </label>
        <div className="flex items-center gap-4">
          <div 
            onClick={() => handleCorrectToggle(index)}
            className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center cursor-pointer transition-all ${option.isCorrect ? 'border-black bg-black' : 'border-gray-300 bg-white'}`}
          >
            {option.isCorrect && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={option.text}
              onChange={(e) => handleOptionTextChange(index, e.target.value)}
              placeholder=""
              className={`w-full h-12 bg-white border border-gray-200 rounded-xl px-4 text-[14px] font-medium text-gray-700 outline-none focus:border-gray-400 transition-all ${errors[`option${index + 1}`] ? 'border-red-500' : ''}`}
            />
            {errors[`option${index + 1}`] && <p className="text-red-500 text-[11px] mt-1">{errors[`option${index + 1}`]}</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[160px_1fr] gap-4">
        <div className="h-[120px] bg-gray-100 rounded-lg flex flex-col items-center justify-center text-center p-2 relative overflow-hidden group border border-gray-100 bg-white shadow-inner">
          {upLoading ? (
            <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                <span className="text-[10px] font-bold text-gray-400 uppercase">Uploading...</span>
            </div>
          ) : option.file ? (
            <>
              {typeof option.file === 'string' ? (
                 <img src={option.file} className="w-full h-full object-contain" />
              ) : option.file instanceof File && option.file.type.startsWith('image/') ? (
                 <img src={URL.createObjectURL(option.file)} className="w-full h-full object-contain" />
              ) : (
                <div className="flex flex-col items-center">
                  <span className="material-symbols-outlined text-gray-400 text-[32px]">description</span>
                  <span className="text-[10px] text-gray-400 truncate w-full px-1 mt-1 font-medium">{typeof option.file === 'string' ? 'File' : 'Selected File'}</span>
                </div>
              )}
              <button 
                onClick={() => handleOptionFileUpload(index, null)}
                className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <span className="material-symbols-outlined">delete</span>
              </button>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-gray-400 text-[32px]">description</span>
              <span className="text-[12px] font-bold text-gray-400 mt-1">No File</span>
            </>
          )}
        </div>
        <label className="border-2 border-dashed border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:border-gray-300 transition-all bg-white relative">
          <input 
            type="file" 
            className="hidden" 
            accept="image/*, application/pdf" 
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                  setUpLoading(true);
                  await handleOptionFileUpload(index, file);
                  setUpLoading(false);
              }
            }}
          />
          <span className="text-[14px] font-bold text-gray-700">Upload File</span>
          <span className="text-[12px] text-gray-400 text-center mt-1 font-medium">Click or Drag & Drop your file here.</span>
        </label>
      </div>
    </div>
  );
};

interface ImageUploadSetProps {
  label: string;
  index: number;
  type?: 'question' | 'solution';
  file: File | string | null;
  handleImageUpload: (index: number, type: 'question' | 'solution', file: File | string | null) => void;
}

const ImageUploadSet: React.FC<ImageUploadSetProps> = ({ 
  label, 
  index, 
  type = 'question',
  file,
  handleImageUpload
}) => {
  const [isUploading, setIsUploading] = useState(false);

  return (
    <div className="space-y-4">
      <label className="text-[13px] font-bold text-[#444] block">{label}</label>
      <div className="grid grid-cols-[160px_1fr] gap-4">
        <div className="h-[120px] bg-gray-100 rounded-lg flex flex-col items-center justify-center relative overflow-hidden group border border-gray-100 bg-white">
          {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-[3px] border-black/10 border-t-black rounded-full animate-spin" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Uploading...</span>
              </div>
          ) : file ? (
            <>
              <img src={typeof file === 'string' ? file : URL.createObjectURL(file)} className="w-full h-full object-contain" />
              <button 
                onClick={() => handleImageUpload(index, type, null)}
                className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <span className="material-symbols-outlined">delete</span>
              </button>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-gray-400 text-[32px]">image</span>
              <span className="text-[12px] font-bold text-gray-400 mt-1">No Image</span>
            </>
          )}
        </div>
        <label className="border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-300 transition-all bg-white p-4">
          <input 
            type="file" 
            className="hidden" 
            accept="image/*" 
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                  setIsUploading(true);
                  await handleImageUpload(index, type, file);
                  setIsUploading(false);
              }
            }}
          />
          <span className="text-[14px] font-bold text-gray-700">Upload Image</span>
          <span className="text-[12px] text-gray-400 text-center mt-1 leading-[1.3] font-medium tracking-tight">Click or Drag & Drop your file here.</span>
        </label>
      </div>
    </div>
  );
};

const AddQuestionDrawer: React.FC<AddQuestionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  sections = [],
  testId,
  onUploadImage,
  editingQuestion,
  onSaveAndGoToPrevious,
  onSaveAndGoToNext,
  test
}) => {
  const [activeEditor, setActiveEditor] = useState<string | null>(null);
  const [form, setForm] = useState<QuestionForm>({
    questionType: 'Multiple Choice Question',
    sectionId: sections[0]?.id || '',
    questionHeading: '',
    questionText: '',
    questionImages: [null, null, null],
    options: Array(5).fill(null).map(() => ({ text: '', file: null, isCorrect: false })),
    answerMode: 'Single',
    solution: {
      heading: 'Full Solution',
      text: '',
      images: [null, null] as (File | string | null)[],
      video: ''
    },
    positiveMarks: test?.marksPerQuestion || 1,
    negativeMarks: test?.negativeMarking || 0
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
        // Drawer just opened - initialize form
        if (editingQuestion) {
          // Robustly map existing question data to form
          let rawOptions: { text: string; file: File | string | null; isCorrect: boolean }[] = [];
          
          if (editingQuestion.displayOptions && Array.isArray(editingQuestion.displayOptions)) {
            rawOptions = editingQuestion.displayOptions.map((o: any, i: number) => ({
              text: typeof o === 'string' ? o : (o?.text || ''),
              file: o?.image || editingQuestion?.[`option${String.fromCharCode(65 + i)}Image`] || null,
              isCorrect: typeof o === 'object' ? (o?.isCorrect || false) : false
            }));
          } else if (editingQuestion.options && Array.isArray(editingQuestion.options)) {
            rawOptions = editingQuestion.options.map((o: any, i: number) => {
              if (typeof o === 'string') {
                return { text: o, file: editingQuestion?.[`option${String.fromCharCode(65 + i)}Image`] || null, isCorrect: false };
              } else if (typeof o === 'object' && o !== null) {
                return { text: o.text || o.label || '', file: o.image || editingQuestion?.[`option${String.fromCharCode(65 + i)}Image`] || null, isCorrect: o.isCorrect || false };
              }
              return { text: '', file: null, isCorrect: false };
            });
          }

          // Fallback for options if not in displays
          if (rawOptions.length === 0) {
              ['A', 'B', 'C', 'D', 'E'].forEach((opt, idx) => {
                  if (editingQuestion[`option${opt}`]) {
                      rawOptions.push({
                          text: editingQuestion[`option${opt}`],
                          file: editingQuestion[`option${opt}Image`] || null,
                          isCorrect: editingQuestion.correctAnswer === opt
                      });
                  }
              });
          }

          const paddedOptions = [...rawOptions];
          while (paddedOptions.length < 5) {
            paddedOptions.push({ text: '', file: null, isCorrect: false });
          }
          const finalOptions = paddedOptions.slice(0, 5);

          let normalizedSolution: { heading: string; text: string; images: (File | string | null)[]; video: string };
          const rawSolution = editingQuestion.solution;
          const legacySolutionImage = editingQuestion.solutionImage;

          if (typeof rawSolution === 'string') {
            normalizedSolution = {
              heading: 'Full Solution',
              text: rawSolution,
              images: [legacySolutionImage || null, null],
              video: ''
            };
          } else if (rawSolution && typeof rawSolution === 'object') {
            normalizedSolution = {
              heading: rawSolution.heading || 'Full Solution',
              text: rawSolution.text || '',
              images: Array.isArray(rawSolution.images) && rawSolution.images.length > 0 
                ? [...rawSolution.images, null, null].slice(0, 2) 
                : [legacySolutionImage || null, null],
              video: typeof rawSolution.video === 'string' ? rawSolution.video : ''
            };
          } else {
            normalizedSolution = { 
              heading: 'Full Solution', 
              text: '', 
              images: [legacySolutionImage || null, null], 
              video: '' 
            };
          }

          let normalizedQImages: (File | string | null)[] = [null, null, null];
          if (Array.isArray(editingQuestion.questionImages)) {
            normalizedQImages = [...editingQuestion.questionImages, null, null, null].slice(0, 3);
          } else if (editingQuestion.questionImage || editingQuestion.image) {
            normalizedQImages[0] = editingQuestion.questionImage || editingQuestion.image;
          }

          setForm({
            id: editingQuestion.id || editingQuestion._id,
            questionType: editingQuestion.questionType || 'Multiple Choice Question',
            sectionId: editingQuestion.sectionId || sections[0]?.id || '',
            questionHeading: editingQuestion.questionHeading || '',
            questionText: editingQuestion.questionText || editingQuestion.questionEn || '',
            questionImages: normalizedQImages,
            options: finalOptions,
            answerMode: editingQuestion.answerMode || 'Single',
            solution: normalizedSolution,
            positiveMarks: editingQuestion.positiveMarks || editingQuestion.marks || test?.marksPerQuestion || 1,
            negativeMarks: editingQuestion.negativeMarks || editingQuestion.negative || test?.negativeMarking || 0
          });
        } else {
          // Reset form for fresh creation
          setForm({
            questionType: 'Multiple Choice Question',
            sectionId: sections[0]?.id || '',
            questionHeading: '',
            questionText: '',
            questionImages: [null, null, null],
            options: Array(5).fill(null).map(() => ({ text: '', file: null, isCorrect: false })),
            answerMode: 'Single',
            solution: { heading: 'Full Solution', text: '', images: [null, null], video: '' },
            positiveMarks: test?.marksPerQuestion || 1,
            negativeMarks: test?.negativeMarking || 0
          });
        }
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, editingQuestion, sections, test]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.questionText) newErrors.questionText = 'Question is required';
    if (!form.options?.[0]?.text) newErrors.option1 = 'Option 1 is required';
    if (!form.options?.[1]?.text) newErrors.option2 = 'Option 2 is required';
    if (!form.solution?.heading) newErrors.solutionHeading = 'Solution heading is required';
    if (form.positiveMarks === undefined || form.positiveMarks === null) newErrors.positiveMarks = 'Positive marks is required';
    if (form.negativeMarks === undefined || form.negativeMarks === null) newErrors.negativeMarks = 'Negative marks is required';
    if (!form.sectionId) newErrors.sectionId = 'Section is required';

    setErrors(newErrors);
    
    // Scroll to first error if any
    if (Object.keys(newErrors).length > 0) {
      const errorKeys = Object.keys(newErrors);
      const firstErrorKey = errorKeys[0];
      // Try to find the first error element and scroll to it
      setTimeout(() => {
        const errorEl = document.querySelector(`[class*="border-red-500"]`);
        if (errorEl) {
          errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
    
    return Object.keys(newErrors).length === 0;
  };

  const buildSubmissionData = () => {
    // Find which option is marked as correct → derive the letter ("A", "B", "C", "D")
    const correctIndex = (form.options || []).findIndex(opt => opt.isCorrect);
    const correctAnswer = correctIndex >= 0 ? String.fromCharCode(65 + correctIndex) : 'A';

    const data: any = {
      ...form,
      question: form.questionText,
      questionEn: form.questionText,
      marks: form.positiveMarks,     
      negative: form.negativeMarks,
      // ✅ Correct answer as a letter — this is what the backend stores and the UI reads
      correctAnswer,
      // Plain string array (legacy format used by old questions in DB)
      options: (form.options || [])
        .filter(opt => opt?.text)
        .map(opt => opt.text),
      optionsContent: (form.options || []).map((opt, i) => ({
        id: String.fromCharCode(97 + i),
        label: opt?.text || ''
      })),
      displayOptions: (form.options || []).map((opt, i) => ({
        id: i + 1,
        text: opt?.text || '',
        isCorrect: opt?.isCorrect || false,
        image: typeof opt.file === 'string' ? opt.file : null // Placeholder, will be replaced by actual upload result if File
      }))
    };

    // Ensure questionImage (singular) is set for compatibility
    if (form.questionImages[0] && typeof form.questionImages[0] === 'string') {
      data.questionImage = form.questionImages[0];
    } else if (!form.questionImages[0]) {
      data.questionImage = null;
    }

    // Ensure solutionImage (singular) is set for compatibility
    if (form.solution?.images?.[0] && typeof form.solution.images[0] === 'string') {
        data.solutionImage = form.solution.images[0];
    }

    // Map option files too
    (form.options || []).forEach((opt, i) => {
        const char = String.fromCharCode(65 + i);
        if (typeof opt.file === 'string') {
            data[`option${char}Image`] = opt.file;
        }
    });

    return data;
  };

  const handleSave = () => {
    if (validate()) {
      const submissionData = buildSubmissionData();
      onSubmit(submissionData);
      onClose();
    }
  };

  const handleImageUpload = async (index: number, type: 'question' | 'solution', file: File | string | null) => {
    if (!file) {
      if (type === 'question') {
        const newImages = [...form.questionImages];
        newImages[index] = null;
        setForm({ ...form, questionImages: newImages });
      } else {
        const newImages = [...form.solution.images];
        newImages[index] = null;
        setForm({ ...form, solution: { ...form.solution, images: newImages } });
      }
      return;
    }

    if (file instanceof File) {
      try {
        const res = await uploadAPI.uploadImage(file);
        if (res && res.url) {
          if (type === 'question') {
            const newImages = [...form.questionImages];
            newImages[index] = res.url;
            setForm({ ...form, questionImages: newImages });
          } else {
            const newImages = [...form.solution.images];
            newImages[index] = res.url;
            setForm({ ...form, solution: { ...form.solution, images: newImages } });
          }
        }
      } catch (err) {
        console.error("Upload failed", err);
      }
    } else {
      if (type === 'question') {
        const newImages = [...form.questionImages];
        newImages[index] = file;
        setForm({ ...form, questionImages: newImages });
      } else {
        const newImages = [...form.solution.images];
        newImages[index] = file;
        setForm({ ...form, solution: { ...form.solution, images: newImages } });
      }
    }
  };

  const handleOptionFileUpload = async (index: number, file: File | string | null) => {
    if (!file) {
      const newOptions = [...form.options];
      newOptions[index].file = null;
      setForm({ ...form, options: newOptions });
      return;
    }

    if (file instanceof File) {
      try {
        const res = await uploadAPI.uploadImage(file);
        if (res && res.url) {
          const newOptions = [...form.options];
          newOptions[index].file = res.url;
          setForm({ ...form, options: newOptions });
        }
      } catch (err) {
        console.error("Option upload failed", err);
      }
    } else {
      const newOptions = [...form.options];
      newOptions[index].file = file;
      setForm({ ...form, options: newOptions });
    }
  };

  const handleOptionTextChange = (index: number, text: string) => {
    const newOptions = [...form.options];
    newOptions[index].text = text;
    setForm({ ...form, options: newOptions });
  };

  const handleCorrectToggle = (index: number) => {
    const newOptions = [...form.options];
    if (form.answerMode === 'Single') {
      newOptions.forEach((opt, i) => opt.isCorrect = i === index);
    } else {
      newOptions[index].isCorrect = !newOptions[index].isCorrect;
    }
    setForm({ ...form, options: newOptions });
  };

  return (
    <RightSideDrawer isOpen={isOpen} onClose={onClose} width="960px">
      <DrawerHeader title={editingQuestion ? 'Update Question' : 'Add Question'} onClose={onClose} />
      
      <DrawerBody className="bg-white px-8 py-6 space-y-10">
        {editingQuestion && (
          <div className="flex items-center gap-3 pt-2">
            <span className="text-[14px] font-bold text-gray-700">Report count</span>
            <span className="text-[14px] font-bold text-gray-500">:</span>
            <span className="text-[14px] font-bold text-gray-700">{editingQuestion.reportCount || 0}</span>
          </div>
        )}
        <div className={`grid grid-cols-2 gap-8 ${editingQuestion ? '' : 'pt-2'}`}>
          <div className="space-y-2">
            <label className="text-[13px] font-bold text-gray-800 tracking-tight">Question Type<span className="text-red-500">*</span></label>
            <div className="relative group">
              <select
                value={form.questionType}
                onChange={(e) => setForm({ ...form, questionType: e.target.value })}
                className="w-full h-[54px] bg-white border border-gray-200 rounded-xl px-4 text-[15px] font-medium outline-none focus:border-gray-400 transition-all appearance-none cursor-pointer"
              >
                <option>Multiple Choice Question</option>
                <option>True/False</option>
                <option>Fill in the Blank</option>
                <option>Match the Column</option>
              </select>
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-gray-600 transition-colors">expand_more</span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[13px] font-bold text-gray-800 tracking-tight">Section<span className="text-red-500">*</span></label>
            <div className="relative group">
              <select
                value={form.sectionId}
                onChange={(e) => setForm({ ...form, sectionId: e.target.value })}
                className={`w-full h-[54px] bg-white border border-gray-200 rounded-xl px-4 text-[15px] font-medium outline-none focus:border-gray-400 transition-all appearance-none cursor-pointer ${errors.sectionId ? 'border-red-500' : ''}`}
              >
                {sections.map(s => (
                  <option key={s.id} value={s.id}>{s.name || (s as any).title}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-gray-600 transition-colors">expand_more</span>
            </div>
            {errors.sectionId && <p className="text-red-500 text-[11px] mt-1">{errors.sectionId}</p>}
          </div>
        </div>

        <div className="border-t border-gray-50 pt-8" />

        <div className="space-y-6">
          <h3 className="text-[17px] font-bold text-gray-800 tracking-tight">Question</h3>
          <div className="space-y-6">
            <div className="space-y-1">
              <label className="text-[13px] font-bold text-gray-800 tracking-tight block">Question Heading</label>
              {activeEditor === 'heading' ? (
                <div>
                   <RichTextEditor
                    content={form.questionHeading}
                    onChange={(val) => setForm({ ...form, questionHeading: val })}
                    height="120px"
                  />
                </div>
              ) : (
                <div 
                  onClick={() => setActiveEditor('heading')}
                  className="w-full h-[54px] bg-white border border-gray-200 rounded-xl px-4 text-[15px] font-medium text-gray-400 cursor-text hover:border-gray-300 transition-all shadow-sm flex items-center overflow-hidden"
                >
                  {form.questionHeading ? (
                    <div className="text-gray-700 truncate" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(form.questionHeading || '') }} />
                  ) : (
                    "Type question heading here..."
                  )}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-[13px] font-bold text-gray-800 tracking-tight block">Question<span className="text-red-500">*</span></label>
              {activeEditor === 'question' ? (
                <div>
                   <RichTextEditor
                    content={form.questionText}
                    onChange={(val) => setForm({ ...form, questionText: val })}
                    height="180px"
                  />
                </div>
              ) : (
                <div 
                  onClick={() => setActiveEditor('question')}
                  className={`w-full min-h-[100px] bg-white border border-gray-200 rounded-xl p-4 text-[15px] font-medium text-gray-400 cursor-text hover:border-gray-300 transition-all shadow-sm ${errors.questionText ? 'border-red-500' : ''}`}
                >
                  {form.questionText ? (
                    <div className="text-gray-700 editor-preview" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(form.questionText || '') }} />
                  ) : (
                    "Type your question here..."
                  )}
                </div>
              )}
              {errors.questionText && <p className="text-red-500 text-[11px] mt-1">{errors.questionText}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <ImageUploadSet 
              label="Question Image 1" 
              index={0} 
              file={form.questionImages[0]}
              handleImageUpload={handleImageUpload}
            />
            <ImageUploadSet 
              label="Question Image 2" 
              index={1} 
              file={form.questionImages[1]}
              handleImageUpload={handleImageUpload}
            />
          </div>
          <div className="grid grid-cols-2 gap-8">
            <ImageUploadSet 
              label="Question Image 3" 
              index={2} 
              file={form.questionImages[2]}
              handleImageUpload={handleImageUpload}
            />
          </div>

        </div>

        <div className="border-t border-gray-100 pt-8" />

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[17px] font-bold text-gray-800 tracking-tight">Options</h3>
            <div className="relative group">
              <select
                value={form.answerMode}
                onChange={(e) => setForm({ ...form, answerMode: e.target.value as any })}
                className="w-[140px] h-10 bg-white border border-gray-200 rounded-xl px-4 text-[14px] font-bold text-gray-700 cursor-pointer outline-none hover:border-gray-300 transition-all appearance-none"
              >
                <option>Single</option>
                <option>Multiple</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-gray-600 transition-colors">expand_more</span>
            </div>
          </div>

          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map(idx => (
              <OptionRow 
                key={idx} 
                index={idx} 
                option={form.options?.[idx] || { text: '', file: null, isCorrect: false }}
                errors={errors}
                handleCorrectToggle={handleCorrectToggle}
                handleOptionTextChange={handleOptionTextChange}
                handleOptionFileUpload={handleOptionFileUpload}
              />
            ))}
          </div>

        </div>

        <div className="border-t border-gray-100 pt-8" />

        <div className="space-y-6">
          <h3 className="text-[17px] font-bold text-gray-800 tracking-tight">Solution</h3>
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-gray-800 tracking-tight block">Solution Heading<span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.solution.heading}
                onChange={(e) => setForm({ ...form, solution: { ...form.solution, heading: e.target.value } })}
                className={`w-full h-[54px] bg-white border border-gray-200 rounded-xl px-4 text-[15px] font-medium text-gray-700 outline-none focus:border-gray-400 transition-all shadow-sm ${errors.solutionHeading ? 'border-red-500' : ''}`}
              />
              {errors.solutionHeading && <p className="text-red-500 text-[11px] mt-1">{errors.solutionHeading}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-[13px] font-bold text-gray-800 tracking-tight block">Solution Text</label>
              {activeEditor === 'solution' ? (
                <div>
                  <RichTextEditor
                    content={form.solution.text}
                    onChange={(val) => setForm({ ...form, solution: { ...form.solution, text: val } })}
                    height="180px"
                  />
                </div>
              ) : (
                <div 
                  onClick={() => setActiveEditor('solution')}
                  className="w-full min-h-[100px] bg-white border border-gray-200 rounded-xl p-4 text-[15px] font-medium text-gray-400 cursor-text hover:border-gray-300 transition-all shadow-sm"
                >
                  {form.solution.text ? (
                    <div className="text-gray-700" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(form.solution.text || '') }} />
                  ) : (
                    "Type solution text here..."
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <ImageUploadSet 
              label="Solution Image 1" 
              index={0} 
              type="solution" 
              file={form.solution.images[0]}
              handleImageUpload={handleImageUpload}
            />
            <ImageUploadSet 
              label="Solution Image 2" 
              index={1} 
              type="solution" 
              file={form.solution.images[1]}
              handleImageUpload={handleImageUpload}
            />
          </div>


          <div className="space-y-4 pt-2">
            <div>
              <label className="text-[13px] font-bold text-gray-800 tracking-tight block mb-2">Solution Video (YouTube URL)</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-500 transition-colors">link</span>
                <input
                  type="text"
                  placeholder="Paste YouTube link: https://youtube.com/watch?v=..."
                  value={form.solution.video}
                  onChange={(e) => setForm({ ...form, solution: { ...form.solution, video: e.target.value } })}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all placeholder:text-gray-300 shadow-sm"
                />
              </div>
            </div>

            {extractYouTubeId(form.solution.video) ? (
              <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl border-4 border-white ring-1 ring-gray-100 group animate-in zoom-in-95 duration-300">
                <iframe
                  src={toYouTubeEmbed(form.solution.video)}
                  className="w-full h-full"
                  allowFullScreen
                  title="Video Preview"
                />
                <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-lg flex items-center gap-1.5 backdrop-blur-md">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                  YouTube Preview
                </div>
                <button 
                  onClick={() => setForm({ ...form, solution: { ...form.solution, video: '' } })}
                  className="absolute top-4 right-4 w-10 h-10 bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center hover:bg-black/60"
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            ) : form.solution.video ? (
              <div className="p-6 border-2 border-dashed border-red-100 bg-red-50 rounded-2xl flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-red-400 text-3xl mb-2">error</span>
                <p className="text-red-500 text-[11px] font-black uppercase tracking-widest leading-relaxed">
                  Invalid YouTube Link Provided<br/>
                  <span className="text-[10px] font-bold text-red-300">Check the URL or provide a different link</span>
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-8" />

        {/* SECTION 5 — SCORING */}
        {(!test?.marksPerQuestion && !test?.negativeMarking) && (
        <div className="space-y-6 pb-20">
          <h3 className="text-[17px] font-bold text-gray-800 tracking-tight">Scoring</h3>
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-gray-800 tracking-tight block">Positive Marks<span className="text-red-500">*</span></label>
              <input
                type="number"
                value={form.positiveMarks}
                onChange={(e) => setForm({ ...form, positiveMarks: parseFloat(e.target.value) })}
                className={`w-full h-[54px] bg-white border border-gray-200 rounded-xl px-4 text-[15px] font-medium text-gray-700 outline-none focus:border-gray-400 transition-all shadow-sm ${errors.positiveMarks ? 'border-red-500' : ''}`}
              />
              {errors.positiveMarks && <p className="text-red-500 text-[11px] mt-1">{errors.positiveMarks}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-gray-800 tracking-tight block">Negative Marks<span className="text-red-500">*</span></label>
              <input
                type="number"
                value={form.negativeMarks}
                onChange={(e) => setForm({ ...form, negativeMarks: parseFloat(e.target.value) })}
                className={`w-full h-[54px] bg-white border border-gray-200 rounded-xl px-4 text-[15px] font-medium text-gray-700 outline-none focus:border-gray-400 transition-all shadow-sm ${errors.negativeMarks ? 'border-red-500' : ''}`}
              />
              {errors.negativeMarks && <p className="text-red-500 text-[11px] mt-1">{errors.negativeMarks}</p>}
            </div>
          </div>
        </div>
        )}
        <div className="h-20" />
      </DrawerBody>

      <DrawerFooter className="p-0 border-t border-gray-100">
        <div className="flex w-full h-[60px]">
          <button
            onClick={() => {
              if (validate()) {
                const submissionData = buildSubmissionData();
                if (onSaveAndGoToPrevious) onSaveAndGoToPrevious(submissionData);
                else { onSubmit(submissionData); onClose(); }
              }
            }}
            className="flex-1 h-full bg-white text-gray-700 text-[14px] font-bold tracking-tight hover:bg-gray-50 transition-all flex items-center justify-center border-r border-gray-100"
          >
            Save and Go To Previous
          </button>
          <button
            onClick={handleSave}
            className="flex-1 h-full bg-[#333] text-white text-[14px] font-bold tracking-tight hover:bg-[#222] transition-all flex items-center justify-center"
          >
            Save changes
          </button>
          <button
            onClick={() => {
              if (validate()) {
                const submissionData = buildSubmissionData();
                if (onSaveAndGoToNext) onSaveAndGoToNext(submissionData);
                else { onSubmit(submissionData); onClose(); }
              }
            }}
            className="flex-1 h-full bg-white text-gray-700 text-[14px] font-bold tracking-tight hover:bg-gray-50 transition-all flex items-center justify-center border-l border-gray-100"
          >
            Save and Go To Next
          </button>
        </div>
      </DrawerFooter>
    </RightSideDrawer>
  );
};

export default AddQuestionDrawer;
