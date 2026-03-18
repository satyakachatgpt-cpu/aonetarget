import React, { useState, useEffect } from 'react';
import FileUploadButton from '../shared/FileUploadButton';

interface TestQuestion {
  id: string;
  question: string;
  questionImage?: string;
  optionA: string;
  optionAImage?: string;
  optionB: string;
  optionBImage?: string;
  optionC: string;
  optionCImage?: string;
  optionD: string;
  optionDImage?: string;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  marks: number;
  negativeMarks: number;
}

interface Test {
  id: string;
  courseId: string;
  name: string;
  description?: string;
  duration: number;
  totalMarks: number;
  passingMarks: number;
  numberOfQuestions: number;
  marksPerQuestion: number;
  negativeMarking: number;
  questions: TestQuestion[];
  status: string;
}

interface Course {
  id: string;
  name: string;
  category?: string;
}

interface Props {
  showToast: (m: string, type?: 'success' | 'error') => void;
  view?: 'list' | 'bank';
}

const Questions: React.FC<Props> = ({ showToast }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingTests, setLoadingTests] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterCorrectAnswer, setFilterCorrectAnswer] = useState('');
  const [filterMarks, setFilterMarks] = useState('');
  const filterDropdownRef = React.useRef<HTMLDivElement>(null);

  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [bulkQuestions, setBulkQuestions] = useState<any[]>([]);
  const [bulkUploading, setBulkUploading] = useState(false);

  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<TestQuestion | null>(null);
  const [questionForm, setQuestionForm] = useState({
    question: '',
    questionImage: '',
    optionA: '',
    optionAImage: '',
    optionB: '',
    optionBImage: '',
    optionC: '',
    optionCImage: '',
    optionD: '',
    optionDImage: '',
    correctAnswer: 'A' as 'A' | 'B' | 'C' | 'D',
    explanation: '',
    marks: 4,
    negativeMarks: 0
  });

  useEffect(() => {
    loadCourses();
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/courses');
      if (res.ok) {
        const data = await res.json();
        setCourses(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTestsForCourse = async (course: Course) => {
    try {
      setLoadingTests(true);
      setSelectedCourse(course);
      setSelectedTest(null);
      const res = await fetch(`/api/courses/${course.id}/tests`);
      if (res.ok) {
        const data = await res.json();
        setTests(Array.isArray(data) ? data : []);
      } else {
        const allRes = await fetch('/api/tests');
        if (allRes.ok) {
          const allTests = await allRes.json();
          const courseTests = (Array.isArray(allTests) ? allTests : []).filter((t: any) => t.courseId === course.id);
          setTests(courseTests);
        }
      }
    } catch (error) {
      console.error('Error loading tests:', error);
      setTests([]);
    } finally {
      setLoadingTests(false);
    }
  };

  const selectTest = async (test: Test) => {
    try {
      const res = await fetch(`/api/tests/${test.id}`);
      if (res.ok) {
        const fullTest = await res.json();
        setSelectedTest({ ...fullTest, questions: fullTest.questions || [] });
      } else {
        setSelectedTest({ ...test, questions: test.questions || [] });
      }
    } catch {
      setSelectedTest({ ...test, questions: test.questions || [] });
    }
  };

  const resetQuestionForm = () => {
    setQuestionForm({
      question: '', questionImage: '', optionA: '', optionAImage: '', optionB: '', optionBImage: '',
      optionC: '', optionCImage: '', optionD: '', optionDImage: '', correctAnswer: 'A', explanation: '', marks: 4, negativeMarks: 0
    });
    setEditingQuestion(null);
  };

  const handleQuestionSubmit = async () => {
    if (!questionForm.question || !questionForm.optionA || !questionForm.optionB || !questionForm.correctAnswer) {
      showToast('Please fill question and at least 2 options', 'error');
      return;
    }
    if (!selectedTest) return;

    try {
      const questions = [...(selectedTest.questions || [])];
      const qData: TestQuestion = {
        id: editingQuestion?.id || `q_${Date.now()}`,
        question: questionForm.question,
        questionImage: questionForm.questionImage,
        optionA: questionForm.optionA,
        optionAImage: questionForm.optionAImage,
        optionB: questionForm.optionB,
        optionBImage: questionForm.optionBImage,
        optionC: questionForm.optionC,
        optionCImage: questionForm.optionCImage,
        optionD: questionForm.optionD,
        optionDImage: questionForm.optionDImage,
        correctAnswer: questionForm.correctAnswer,
        explanation: questionForm.explanation,
        marks: questionForm.marks,
        negativeMarks: questionForm.negativeMarks
      };

      if (editingQuestion) {
        const idx = questions.findIndex(q => q.id === editingQuestion.id);
        if (idx >= 0) questions[idx] = qData;
      } else {
        questions.push(qData);
      }

      const testId = selectedTest.id || (selectedTest as any)._id;
      const res = await fetch(`/api/tests/${testId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...selectedTest, questions })
      });

      if (res.ok) {
        setSelectedTest({ ...selectedTest, questions });
        showToast(editingQuestion ? 'Question updated!' : 'Question added!', 'success');
        setShowQuestionModal(false);
        resetQuestionForm();
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Error saving question:', error);
      showToast('Failed to save question', 'error');
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!selectedTest) return;
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      const questions = (selectedTest.questions || []).filter(q => q.id !== questionId);
      const testId = selectedTest.id || (selectedTest as any)._id;
      const res = await fetch(`/api/tests/${testId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...selectedTest, questions })
      });

      if (res.ok) {
        setSelectedTest({ ...selectedTest, questions });
        showToast('Question deleted!', 'success');
      }
    } catch (error) {
      showToast('Failed to delete question', 'error');
    }
  };

  const editQuestion = (q: TestQuestion) => {
    setEditingQuestion(q);
    setQuestionForm({
      question: q.question,
      questionImage: q.questionImage || '',
      optionA: q.optionA,
      optionAImage: q.optionAImage || '',
      optionB: q.optionB,
      optionBImage: q.optionBImage || '',
      optionC: q.optionC,
      optionCImage: q.optionCImage || '',
      optionD: q.optionD,
      optionDImage: q.optionDImage || '',
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      marks: q.marks || 4,
      negativeMarks: q.negativeMarks || 0
    });
    setShowQuestionModal(true);
  };

  const parseCSVLine = (line: string): string[] => {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());
    return fields;
  };

  const handleCSVFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) {
        showToast('CSV must have a header row and at least one data row', 'error');
        return;
      }
      const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, ''));
      const parsed: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const vals = parseCSVLine(lines[i]);
        if (vals.length < 6) continue;
        const row: any = {};
        headers.forEach((h, idx) => { row[h] = vals[idx] || ''; });
        if (!row.question || !row.optiona || !row.optionb || !row.correctanswer) continue;
        parsed.push({
          question: row.question,
          optionA: row.optiona,
          optionB: row.optionb,
          optionC: row.optionc || '',
          optionD: row.optiond || '',
          correctAnswer: row.correctanswer?.toUpperCase() || 'A',
          explanation: row.explanation || '',
          marks: parseInt(row.marks) || 4,
          negativeMarks: parseFloat(row.negativemarks) || 0,
        });
      }
      if (parsed.length === 0) {
        showToast('No valid questions found in CSV', 'error');
        return;
      }
      setBulkQuestions(parsed);
      showToast(`Parsed ${parsed.length} question(s) from CSV`, 'success');
    };
    reader.readAsText(file);
  };

  const downloadCSVTemplate = () => {
    const header = 'question,optionA,optionB,optionC,optionD,correctAnswer,explanation,marks,negativeMarks';
    const sample = '"What is 2+2?","3","4","5","6","B","2+2 equals 4",4,1';
    const blob = new Blob([header + '\n' + sample + '\n'], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkUpload = async () => {
    if (!selectedTest || bulkQuestions.length === 0) return;
    setBulkUploading(true);
    try {
      const questionsToUpload = bulkQuestions.map((q, i) => ({
        id: `q_bulk_${Date.now()}_${i}`,
        ...q,
      }));
      const testIdentifier = selectedTest.id || (selectedTest as any)._id;
      const res = await fetch(`/api/tests/${testIdentifier}/bulk-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: questionsToUpload }),
      });
      if (res.ok) {
        showToast(`${bulkQuestions.length} questions uploaded successfully!`, 'success');
        setShowBulkUpload(false);
        setBulkQuestions([]);
        const refreshRes = await fetch(`/api/tests/${testIdentifier}`);
        if (refreshRes.ok) {
          const fullTest = await refreshRes.json();
          setSelectedTest({ ...fullTest, questions: fullTest.questions || [] });
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to upload');
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to upload questions', 'error');
    } finally {
      setBulkUploading(false);
    }
  };

  const filteredQuestions = (selectedTest?.questions || []).filter(q => {
    const matchesSearch = !searchQuery || q.question.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAnswer = !filterCorrectAnswer || q.correctAnswer === filterCorrectAnswer;
    const matchesMarks = !filterMarks || q.marks === parseInt(filterMarks);
    return matchesSearch && matchesAnswer && matchesMarks;
  });

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy mx-auto mb-3"></div>
        <p className="text-gray-400 text-sm">Loading courses...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <button onClick={() => { setSelectedCourse(null); setSelectedTest(null); }} className={`font-bold ${!selectedCourse ? 'text-navy' : 'hover:text-navy cursor-pointer'}`}>
          <span className="material-icons-outlined text-[16px] align-middle mr-1">school</span>
          All Courses
        </button>
        {selectedCourse && (
          <>
            <span className="material-icons-outlined text-gray-300 text-[14px]">chevron_right</span>
            <button onClick={() => setSelectedTest(null)} className={`font-bold ${!selectedTest ? 'text-navy' : 'hover:text-navy cursor-pointer'}`}>
              {selectedCourse.name.length > 30 ? selectedCourse.name.substring(0, 30) + '...' : selectedCourse.name}
            </button>
          </>
        )}
        {selectedTest && (
          <>
            <span className="material-icons-outlined text-gray-300 text-[14px]">chevron_right</span>
            <span className="font-bold text-navy">{selectedTest.name}</span>
          </>
        )}
      </div>

      {!selectedCourse && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-black text-navy">Select Course</h2>
              <p className="text-sm text-gray-500 mt-1">Choose a course to manage its test questions</p>
            </div>
          </div>

          {courses.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
              <span className="material-icons-outlined text-6xl text-gray-200 mb-3 block">menu_book</span>
              <p className="text-gray-400 font-bold">No courses found</p>
              <p className="text-gray-300 text-sm mt-1">Create courses first from the Misc section</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map(course => (
                <button
                  key={course.id}
                  onClick={() => loadTestsForCourse(course)}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-left hover:shadow-md hover:border-blue-200 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1A237E] to-[#303F9F] flex items-center justify-center shrink-0">
                      <span className="material-icons-outlined text-white text-xl">school</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-navy text-sm group-hover:text-[#303F9F] transition-colors line-clamp-2">{course.name}</h3>
                      {course.category && <p className="text-xs text-gray-400 mt-1">{course.category}</p>}
                      <p className="text-xs text-gray-300 mt-1">ID: {course.id}</p>
                    </div>
                    <span className="material-icons-outlined text-gray-300 group-hover:text-[#303F9F] transition-colors">arrow_forward</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedCourse && !selectedTest && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-black text-navy">Select Test</h2>
              <p className="text-sm text-gray-500 mt-1">Choose a test from "{selectedCourse.name}" to manage questions</p>
            </div>
            <button
              onClick={() => { setSelectedCourse(null); setSelectedTest(null); }}
              className="px-4 py-2 bg-gray-100 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-200 flex items-center gap-1"
            >
              <span className="material-icons-outlined text-[16px]">arrow_back</span>
              Back
            </button>
          </div>

          {loadingTests ? (
            <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy mx-auto mb-3"></div>
              <p className="text-gray-400 text-sm">Loading tests...</p>
            </div>
          ) : tests.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
              <span className="material-icons-outlined text-6xl text-gray-200 mb-3 block">quiz</span>
              <p className="text-gray-400 font-bold">No tests found for this course</p>
              <p className="text-gray-300 text-sm mt-1">Create tests first from Course Content Manager (Misc → Courses → Manage)</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tests.map(test => (
                <button
                  key={test.id}
                  onClick={() => selectTest(test)}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-left hover:shadow-md hover:border-blue-200 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shrink-0">
                      <span className="material-icons-outlined text-white text-xl">quiz</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-navy text-sm group-hover:text-purple-600 transition-colors">{test.name}</h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">
                          {test.questions?.length || 0} Questions
                        </span>
                        <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-bold">
                          {test.duration} mins
                        </span>
                        <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-bold">
                          {test.totalMarks} marks
                        </span>
                        {(test.negativeMarking || 0) > 0 && (
                          <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold">
                            -{test.negativeMarking} neg
                          </span>
                        )}
                      </div>
                      <span className={`inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full font-bold ${test.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                        {test.status || 'active'}
                      </span>
                    </div>
                    <span className="material-icons-outlined text-gray-300 group-hover:text-purple-600 transition-colors">arrow_forward</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedTest && (
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-black text-navy">Questions</h2>
              <p className="text-sm text-gray-500 mt-1">
                {selectedTest.name} — {selectedTest.questions?.length || 0} question(s) | {selectedTest.totalMarks} marks | Negative: {selectedTest.negativeMarking || 0}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedTest(null)}
                className="px-4 py-2.5 bg-gray-100 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-200 flex items-center gap-1"
              >
                <span className="material-icons-outlined text-[16px]">arrow_back</span>
                Back
              </button>
              <button
                onClick={() => { resetQuestionForm(); setShowQuestionModal(true); }}
                className="px-5 py-2.5 bg-navy text-white text-sm font-bold rounded-xl hover:bg-navy/90 flex items-center gap-2"
              >
                <span className="material-icons-outlined text-lg">add</span>
                Add Question
              </button>
              <button
                onClick={() => { setBulkQuestions([]); setShowBulkUpload(true); }}
                className="px-5 py-2.5 bg-[#303F9F] text-white text-sm font-bold rounded-xl hover:bg-[#303F9F]/90 flex items-center gap-2"
              >
                <span className="material-icons-outlined text-lg">upload_file</span>
                Bulk Upload
              </button>
            </div>
          </div>

          <div className="flex gap-4 items-center mb-6">
            <div className="flex-1 relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[20px] group-focus-within:text-navy transition-colors">search</span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-[#f3f4f6] rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:border-navy focus:ring-4 focus:ring-navy/5 transition-all shadow-sm placeholder:text-gray-400"
                placeholder="Search questions by text or keywords..."
              />
            </div>
            <div className="relative" ref={filterDropdownRef}>
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center gap-2 px-6 py-3 border rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all shadow-sm ${isFilterOpen || filterCorrectAnswer || filterMarks
                    ? 'bg-navy text-white border-navy shadow-lg shadow-navy/20'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
              >
                <span className="material-symbols-outlined text-[18px]">tune</span>
                Filters
                {(filterCorrectAnswer || filterMarks) && (
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                )}
              </button>

              {isFilterOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-100 rounded-2xl shadow-2xl z-[200] p-5 origin-top-right">
                  <div className="flex justify-between items-center mb-5">
                    <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Filter Questions</h4>
                    <button
                      onClick={() => { setFilterCorrectAnswer(''); setFilterMarks(''); }}
                      className="text-[10px] font-bold text-blue-600 hover:underline"
                    >
                      Reset All
                    </button>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Correct Answer</label>
                      <div className="flex flex-wrap gap-1.5">
                        {['', 'A', 'B', 'C', 'D'].map((ans) => (
                          <button
                            key={ans || 'all'}
                            onClick={() => setFilterCorrectAnswer(ans)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${filterCorrectAnswer === ans ? 'bg-navy text-white shadow-md' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                              }`}
                          >
                            {ans || 'All'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Marks Per Question</label>
                      <div className="flex flex-wrap gap-1.5">
                        {['', '1', '2', '4', '5'].map((m) => (
                          <button
                            key={m || 'all'}
                            onClick={() => setFilterMarks(m)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${filterMarks === m ? 'bg-navy text-white shadow-md' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                              }`}
                          >
                            {m ? `+${m}` : 'All'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-gray-50">
                    <button
                      onClick={() => setIsFilterOpen(false)}
                      className="w-full py-2.5 bg-gray-50 text-navy text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-gray-100 transition-all"
                    >
                      Show {filteredQuestions.length} Results
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {filteredQuestions.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
              <span className="material-icons-outlined text-6xl text-gray-200 mb-3 block">help_outline</span>
              <p className="text-gray-400 font-bold">No questions yet</p>
              <p className="text-gray-300 text-sm mt-1">Click "Add Question" to add questions to this test</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQuestions.map((q, idx) => (
                <div key={q.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <span className="text-sm font-black text-[#303F9F]">{idx + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 leading-relaxed">{q.question}</p>
                      {q.questionImage && (
                        <img src={q.questionImage} alt="Q" className="mt-2 h-20 rounded-lg border object-contain" />
                      )}
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        {(['A', 'B', 'C', 'D'] as const).map(opt => {
                          const optText = (q as any)[`option${opt}`];
                          const optImg = (q as any)[`option${opt}Image`];
                          if (!optText && !optImg) return null;
                          const isCorrect = q.correctAnswer === opt;
                          return (
                            <div key={opt} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-100'}`}>
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isCorrect ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                {opt}
                              </span>
                              <span className={`${isCorrect ? 'text-green-700 font-bold' : 'text-gray-600'}`}>{optText}</span>
                              {isCorrect && <span className="material-icons-outlined text-green-500 text-[14px] ml-auto">check_circle</span>}
                            </div>
                          );
                        })}
                      </div>
                      {q.explanation && (
                        <div className="mt-2 bg-amber-50 border border-amber-100 rounded-lg p-2">
                          <p className="text-[10px] text-amber-700"><strong>Explanation:</strong> {q.explanation}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">+{q.marks} marks</span>
                        {(q.negativeMarks || 0) > 0 && (
                          <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold">-{q.negativeMarks} negative</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => editQuestion(q)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg" title="Edit">
                        <span className="material-icons-outlined text-lg">edit</span>
                      </button>
                      <button onClick={() => handleDeleteQuestion(q.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Delete">
                        <span className="material-icons-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showQuestionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center px-6 py-4 border-b sticky top-0 bg-white z-10">
              <h3 className="font-black text-navy">{editingQuestion ? 'Edit Question' : 'Add Question'}</h3>
              <button onClick={() => { setShowQuestionModal(false); resetQuestionForm(); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <span className="material-icons-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Question *</label>
                <textarea
                  value={questionForm.question}
                  onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg"
                  rows={3}
                  placeholder="Enter your question..."
                />
                <div className="mt-2 flex items-center gap-2">
                  <FileUploadButton
                    accept="image/*"
                    label="Question Image"
                    icon="add_photo_alternate"
                    onUpload={(url) => setQuestionForm({ ...questionForm, questionImage: url })}
                  />
                  {questionForm.questionImage && (
                    <div className="relative">
                      <img src={questionForm.questionImage} alt="Q" className="h-16 rounded-lg border" />
                      <button type="button" onClick={() => setQuestionForm({ ...questionForm, questionImage: '' })} className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">
                        <span className="material-icons-outlined text-xs">close</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                  <div key={opt}>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Option {opt} {opt === 'A' || opt === 'B' ? '*' : ''}</label>
                    <input
                      type="text"
                      value={(questionForm as any)[`option${opt}`]}
                      onChange={(e) => setQuestionForm({ ...questionForm, [`option${opt}`]: e.target.value })}
                      className="w-full px-4 py-3 border rounded-lg"
                      placeholder={`Option ${opt}...`}
                    />
                    <div className="mt-1 flex items-center gap-2">
                      <FileUploadButton
                        accept="image/*"
                        label="Image"
                        icon="image"
                        onUpload={(url) => setQuestionForm({ ...questionForm, [`option${opt}Image`]: url })}
                      />
                      {(questionForm as any)[`option${opt}Image`] && (
                        <div className="relative">
                          <img src={(questionForm as any)[`option${opt}Image`]} alt={`Opt ${opt}`} className="h-10 rounded border" />
                          <button type="button" onClick={() => setQuestionForm({ ...questionForm, [`option${opt}Image`]: '' })} className="absolute -top-1 -right-1 bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px]">
                            <span className="material-icons-outlined text-[10px]">close</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Correct Answer *</label>
                  <select
                    value={questionForm.correctAnswer}
                    onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value as 'A' | 'B' | 'C' | 'D' })}
                    className="w-full px-4 py-3 border rounded-lg"
                  >
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Marks</label>
                  <input
                    type="number"
                    value={questionForm.marks}
                    onChange={(e) => setQuestionForm({ ...questionForm, marks: parseInt(e.target.value) || 4 })}
                    className="w-full px-4 py-3 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Negative Marks</label>
                  <input
                    type="number"
                    step="0.25"
                    value={questionForm.negativeMarks}
                    onChange={(e) => setQuestionForm({ ...questionForm, negativeMarks: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Explanation</label>
                <textarea
                  value={questionForm.explanation}
                  onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg"
                  rows={3}
                  placeholder="Explain the correct answer..."
                />
              </div>
            </div>
            <div className="flex gap-4 px-6 py-4 border-t bg-gray-50">
              <button onClick={() => { setShowQuestionModal(false); resetQuestionForm(); }} className="flex-1 py-3 bg-gray-200 rounded-lg font-bold">
                Cancel
              </button>
              <button onClick={handleQuestionSubmit} className="flex-1 py-3 bg-navy text-white rounded-lg font-bold">
                {editingQuestion ? 'Update' : 'Add'} Question
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center px-6 py-4 border-b sticky top-0 bg-white z-10">
              <h3 className="font-black text-navy">Bulk Upload Questions (CSV)</h3>
              <button onClick={() => { setShowBulkUpload(false); setBulkQuestions([]); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <span className="material-icons-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <label className="px-5 py-2.5 bg-navy text-white text-sm font-bold rounded-xl hover:bg-navy/90 flex items-center gap-2 cursor-pointer">
                  <span className="material-icons-outlined text-lg">upload_file</span>
                  Choose CSV File
                  <input type="file" accept=".csv" onChange={handleCSVFile} className="hidden" />
                </label>
                <button onClick={downloadCSVTemplate} className="px-5 py-2.5 bg-gray-100 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-200 flex items-center gap-2">
                  <span className="material-icons-outlined text-lg">download</span>
                  Download Template
                </button>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-xs text-blue-700 font-semibold mb-1">CSV Format</p>
                <p className="text-[11px] text-blue-600">Headers: question, optionA, optionB, optionC, optionD, correctAnswer, explanation, marks, negativeMarks</p>
                <p className="text-[11px] text-blue-500 mt-1">correctAnswer should be A, B, C, or D. Use quotes around fields containing commas.</p>
              </div>

              {bulkQuestions.length > 0 && (
                <div>
                  <h4 className="font-bold text-navy text-sm mb-3">Preview ({bulkQuestions.length} questions)</h4>
                  <div className="border rounded-xl overflow-hidden">
                    <div className="overflow-x-auto max-h-[40vh] overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left font-bold text-gray-600">#</th>
                            <th className="px-3 py-2 text-left font-bold text-gray-600">Question</th>
                            <th className="px-3 py-2 text-left font-bold text-gray-600">A</th>
                            <th className="px-3 py-2 text-left font-bold text-gray-600">B</th>
                            <th className="px-3 py-2 text-left font-bold text-gray-600">C</th>
                            <th className="px-3 py-2 text-left font-bold text-gray-600">D</th>
                            <th className="px-3 py-2 text-left font-bold text-gray-600">Ans</th>
                            <th className="px-3 py-2 text-left font-bold text-gray-600">Marks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bulkQuestions.map((q, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-3 py-2 font-bold text-gray-500">{i + 1}</td>
                              <td className="px-3 py-2 text-gray-800 max-w-[200px] truncate">{q.question}</td>
                              <td className="px-3 py-2 text-gray-600 max-w-[80px] truncate">{q.optionA}</td>
                              <td className="px-3 py-2 text-gray-600 max-w-[80px] truncate">{q.optionB}</td>
                              <td className="px-3 py-2 text-gray-600 max-w-[80px] truncate">{q.optionC}</td>
                              <td className="px-3 py-2 text-gray-600 max-w-[80px] truncate">{q.optionD}</td>
                              <td className="px-3 py-2"><span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">{q.correctAnswer}</span></td>
                              <td className="px-3 py-2 text-gray-600">{q.marks}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-4 px-6 py-4 border-t bg-gray-50">
              <button onClick={() => { setShowBulkUpload(false); setBulkQuestions([]); }} className="flex-1 py-3 bg-gray-200 rounded-lg font-bold">
                Cancel
              </button>
              <button
                onClick={handleBulkUpload}
                disabled={bulkQuestions.length === 0 || bulkUploading}
                className="flex-1 py-3 bg-navy text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {bulkUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Uploading...
                  </>
                ) : (
                  <>Upload {bulkQuestions.length} Question{bulkQuestions.length !== 1 ? 's' : ''}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Questions;
