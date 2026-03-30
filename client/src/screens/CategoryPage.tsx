import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { categoriesAPI, subcategoriesAPI, coursesAPI } from '../services/apiClient';
import { getImageUrl } from '../lib/utils';

interface Category {
  _id?: string;
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  gradient: string;
  description: string;
  tag: string;
  isActive: boolean;
}

interface SubCategory {
  _id?: string;
  id: string;
  categoryId: string;
  title: string;
  parentPath: string;
  icon: string;
  color: string;
  description?: string;
  order: number;
  isActive: boolean;
}

interface Course {
  _id?: string;
  id?: string;
  name?: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  imageUrl?: string;
  instructor?: string;
  price?: number;
  mrp?: number;
  type?: string;
  examType?: string;
  contentType?: string;
  subject?: string;
  boardType?: string;
  categoryId?: string;
  subcategoryId?: string;
  isLive?: boolean;
  videos?: number;
  tests?: number;
}

const contentTypes = [
  { id: 'recorded_batch', label: 'Recorded Batch', icon: 'play_circle', color: 'from-[#303F9F] to-[#1A237E]' },
  { id: 'live_classroom', label: 'Live Classroom', icon: 'cast_for_education', color: 'from-[#D32F2F] to-[#B71C1C]' },
  { id: 'crash_course', label: 'Crash Course', icon: 'bolt', color: 'from-[#E65100] to-[#BF360C]' },
  { id: 'mock_test', label: 'Mock Test', icon: 'quiz', color: 'from-[#2E7D32] to-[#1B5E20]' },
];

const neetSubjects = [
  { id: 'biology', label: 'Biology', icon: 'biotech' },
  { id: 'chemistry', label: 'Chemistry', icon: 'science' },
  { id: 'physics', label: 'Physics', icon: 'electric_bolt' },
];

const jeeSubjects = [
  { id: 'chemistry', label: 'Chemistry', icon: 'science' },
  { id: 'physics', label: 'Physics', icon: 'electric_bolt' },
  { id: 'math', label: 'Mathematics', icon: 'calculate' },
];

const NeetIitJeePage: React.FC<{ courses: Course[]; loading: boolean }> = ({ courses, loading }) => {
  const navigate = useNavigate();
  const [activeExam, setActiveExam] = useState<'neet' | 'iit-jee'>('neet');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  const subjects = activeExam === 'neet' ? neetSubjects : jeeSubjects;

  const getFilteredCourses = () => {
    return courses.filter(c => {
      if (c.examType && c.examType !== activeExam) return false;
      if (!c.examType) {
        if (activeExam === 'neet' && c.categoryId !== 'neet') return false;
        if (activeExam === 'iit-jee' && c.categoryId !== 'iit-jee') return false;
      }
      if (selectedSubject && c.subject !== selectedSubject) return false;
      return true;
    });
  };

  const getContentCount = (contentTypeId: string) => {
    return courses.filter(c => {
      if (c.examType && c.examType !== activeExam) return false;
      if (!c.examType) {
        if (activeExam === 'neet' && c.categoryId !== 'neet') return false;
        if (activeExam === 'iit-jee' && c.categoryId !== 'iit-jee') return false;
      }
      return c.contentType === contentTypeId;
    }).length;
  };

  const filteredCourses = getFilteredCourses();

  const handleExamSwitch = (exam: 'neet' | 'iit-jee') => {
    setActiveExam(exam);
    setSelectedSubject(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-gradient-to-br from-[#1A237E] to-[#303F9F] text-white pt-6 pb-10 px-4 rounded-b-[2rem] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-white/20"></div>
          <div className="absolute bottom-0 left-8 w-20 h-20 rounded-full bg-white/10"></div>
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/20 transition-all">
              <span className="material-symbols-rounded">arrow_back</span>
            </button>
            <div>
              <h1 className="text-xl font-black tracking-tight">NEET / IIT-JEE</h1>
              <p className="text-white/60 text-xs mt-0.5">Aone Target Institute</p>
            </div>
          </div>

          <div className="flex bg-white/15 rounded-2xl p-1 backdrop-blur-sm">
            <button
              onClick={() => handleExamSwitch('neet')}
              className={`flex-1 py-3 rounded-xl text-center transition-all font-bold text-sm ${activeExam === 'neet'
                ? 'bg-white text-[#1A237E] shadow-lg'
                : 'text-white/80 hover:text-white'
                }`}
            >
              <span className="material-symbols-rounded text-lg align-middle mr-1">medical_services</span>
              NEET
            </button>
            <button
              onClick={() => handleExamSwitch('iit-jee')}
              className={`flex-1 py-3 rounded-xl text-center transition-all font-bold text-sm ${activeExam === 'iit-jee'
                ? 'bg-white text-[#D32F2F] shadow-lg'
                : 'text-white/80 hover:text-white'
                }`}
            >
              <span className="material-symbols-rounded text-lg align-middle mr-1">engineering</span>
              IIT-JEE
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 -mt-5 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 rounded-2xl h-32 w-full"></div>
              </div>
            ))
          ) : contentTypes.map(ct => {
            const count = getContentCount(ct.id);
            return (
              <button
                key={ct.id}
                onClick={() => navigate(`/content/${ct.id}?exam=${activeExam}`)}
                className="relative rounded-2xl p-4 text-left transition-all active:scale-95 overflow-hidden shadow-md hover:shadow-lg"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${ct.color}`}></div>
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                    <span className="material-symbols-rounded text-white text-2xl">{ct.icon}</span>
                  </div>
                  <h3 className="text-white font-bold text-sm leading-tight">{ct.label}</h3>
                  <p className="text-white/60 text-[10px] mt-1">{count} {count === 1 ? 'Course' : 'Courses'}</p>
                </div>
                <div className="absolute top-2 right-2 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center z-10">
                  <span className="material-symbols-rounded text-white text-sm">arrow_forward</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="material-symbols-rounded text-[#303F9F] text-sm">filter_list</span>
            Filter by Subject
          </h3>
          <div className="flex gap-2">
            {subjects.map(subj => (
              <button
                key={subj.id}
                onClick={() => setSelectedSubject(selectedSubject === subj.id ? null : subj.id)}
                className={`flex-1 py-3 rounded-xl text-center transition-all active:scale-95 flex flex-col items-center gap-1.5 ${selectedSubject === subj.id
                  ? 'bg-gradient-to-br from-[#303F9F] to-[#1A237E] text-white shadow-md'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100'
                  }`}
              >
                <span className="material-symbols-rounded text-lg">{subj.icon}</span>
                <span className="text-[10px] font-bold">{subj.label}</span>
              </button>
            ))}
          </div>
        </div>

        {selectedSubject && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-gray-700">
                {filteredCourses.length} {filteredCourses.length === 1 ? 'Course' : 'Courses'}
              </h3>
              <button
                onClick={() => setSelectedSubject(null)}
                className="text-xs text-[#303F9F] font-bold flex items-center gap-1"
              >
                <span className="material-symbols-rounded text-sm">clear_all</span>
                Clear Filter
              </button>
            </div>
            {filteredCourses.length > 0 ? (
              filteredCourses.map((course, idx) => {
                const cId = course.id || course._id || '';
                const courseName = course.name || course.title || 'Course';
                const coursePrice = course.price || 0;
                const isFree = coursePrice === 0;
                const ct = contentTypes.find(c => c.id === course.contentType);

                return (
                  <button
                    key={cId || idx}
                    onClick={() => navigate(`/course/${cId}`)}
                    className="w-full bg-white rounded-2xl p-4 shadow-sm flex gap-4 text-left active:scale-[0.98] transition-all border border-gray-100 hover:shadow-md"
                  >
                    <div className={`w-16 h-16 bg-gradient-to-br ${ct?.color || 'from-[#303F9F] to-[#1A237E]'} rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden`}>
                      {(course.imageUrl || course.thumbnail) ? (
                        <img src={getImageUrl(course.imageUrl || course.thumbnail)} alt="" className="w-full h-full object-cover" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      ) : (
                        <span className="material-symbols-rounded text-white text-2xl opacity-70">{ct?.icon || 'school'}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-[#1A237E] line-clamp-2 leading-tight">{courseName}</h4>
                      {course.instructor && (
                        <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                          <span className="material-symbols-rounded text-xs">person</span>
                          {course.instructor}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {course.subject && (
                          <span className="bg-blue-50 text-[#303F9F] text-[9px] font-bold px-2 py-0.5 rounded-full capitalize">{course.subject}</span>
                        )}
                        {ct && (
                          <span className="bg-gray-50 text-gray-500 text-[9px] font-bold px-2 py-0.5 rounded-full">{ct.label}</span>
                        )}
                        <span className="text-xs font-bold ml-auto">
                          {isFree ? (
                            <span className="text-green-600">Free</span>
                          ) : (
                            <span className="text-[#1A237E]">₹{coursePrice}</span>
                          )}
                        </span>
                      </div>
                    </div>
                    <span className="material-symbols-rounded text-gray-300 self-center text-lg">chevron_right</span>
                  </button>
                );
              })
            ) : (
              <div className="text-center py-8 bg-white rounded-2xl border border-gray-100">
                <span className="material-symbols-rounded text-4xl text-gray-200">school</span>
                <p className="text-sm text-gray-400 mt-2">No courses for this subject yet</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

const boardSubjects = [
  { id: 'hindi', label: 'Hindi', icon: 'translate' },
  { id: 'english', label: 'English', icon: 'menu_book' },
  { id: 'math', label: 'Mathematics', icon: 'calculate' },
  { id: 'science', label: 'Science', icon: 'science' },
  { id: 'social_science', label: 'Social Science', icon: 'public' },
  { id: 'sanskrit', label: 'Sanskrit', icon: 'auto_stories' },
];

const Class11_12Page: React.FC<{ courses: Course[]; loading: boolean }> = ({ courses, loading }) => {
  const navigate = useNavigate();
  const [activeBoard, setActiveBoard] = useState<'cbse' | 'hbse'>('cbse');

  const getContentCount = (contentTypeId: string) => {
    return courses.filter(c => {
      if (c.categoryId !== 'iit-jee') return false;
      if (c.boardType && c.boardType !== activeBoard) return false;
      return c.contentType === contentTypeId;
    }).length;
  };

  const handleBoardSwitch = (board: 'cbse' | 'hbse') => {
    setActiveBoard(board);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-gradient-to-br from-[#1A237E] to-[#303F9F] text-white pt-6 pb-10 px-4 rounded-b-[2rem] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-white/20"></div>
          <div className="absolute bottom-0 left-8 w-20 h-20 rounded-full bg-white/10"></div>
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/20 transition-all">
              <span className="material-symbols-rounded">arrow_back</span>
            </button>
            <div>
              <h1 className="text-xl font-black tracking-tight">11th - 12th</h1>
              <p className="text-white/60 text-xs mt-0.5">Aone Target Institute</p>
            </div>
          </div>

          <div className="flex bg-white/15 rounded-2xl p-1 backdrop-blur-sm">
            <button
              onClick={() => handleBoardSwitch('cbse')}
              className={`flex-1 py-3 rounded-xl text-center transition-all font-bold text-sm ${activeBoard === 'cbse'
                ? 'bg-white text-[#1A237E] shadow-lg'
                : 'text-white/80 hover:text-white'
                }`}
            >
              <span className="material-symbols-rounded text-lg align-middle mr-1">school</span>
              CBSE
            </button>
            <button
              onClick={() => handleBoardSwitch('hbse')}
              className={`flex-1 py-3 rounded-xl text-center transition-all font-bold text-sm ${activeBoard === 'hbse'
                ? 'bg-white text-[#D32F2F] shadow-lg'
                : 'text-white/80 hover:text-white'
                }`}
            >
              <span className="material-symbols-rounded text-lg align-middle mr-1">account_balance</span>
              HBSE
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 -mt-5 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 rounded-2xl h-32 w-full"></div>
              </div>
            ))
          ) : contentTypes.map(ct => {
            const count = getContentCount(ct.id);
            return (
              <button
                key={ct.id}
                onClick={() => navigate(`/content/${ct.id}?board=${activeBoard}&category=11-12`)}
                className="relative rounded-2xl p-4 text-left transition-all active:scale-95 overflow-hidden shadow-md hover:shadow-lg"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${ct.color}`}></div>
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                    <span className="material-symbols-rounded text-white text-2xl">{ct.icon}</span>
                  </div>
                  <h3 className="text-white font-bold text-sm leading-tight">{ct.label}</h3>
                  <p className="text-white/60 text-[10px] mt-1">{count} {count === 1 ? 'Course' : 'Courses'}</p>
                </div>
                <div className="absolute top-2 right-2 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center z-10">
                  <span className="material-symbols-rounded text-white text-sm">arrow_forward</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="material-symbols-rounded text-[#303F9F] text-sm">filter_list</span>
            Browse by Subject
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {boardSubjects.map(subj => (
              <button
                key={subj.id}
                onClick={() => {
                  const matchingCourse = courses.find(c => c.categoryId === 'iit-jee' && c.subject === subj.id && (!c.boardType || c.boardType === activeBoard));
                  if (matchingCourse) {
                    const cId = matchingCourse.id || matchingCourse._id || '';
                    navigate(`/course/${cId}`);
                  } else {
                    navigate(`/content/recorded_batch?board=${activeBoard}&category=11-12&subject=${subj.id}`);
                  }
                }}
                className="py-3 rounded-xl text-center transition-all active:scale-95 flex flex-col items-center gap-1.5 bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100 hover:border-[#303F9F]/30"
              >
                <span className="material-symbols-rounded text-lg">{subj.icon}</span>
                <span className="text-[9px] font-bold">{subj.label}</span>
                <span className="text-[8px] text-gray-400">
                  {courses.filter(c => c.categoryId === 'iit-jee' && c.subject === subj.id && (!c.boardType || c.boardType === activeBoard)).length} courses
                </span>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

const CategoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { categoryId } = useParams<{ categoryId: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedSubFilter, setSelectedSubFilter] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [cats, subs, coursesRes] = await Promise.all([
          categoriesAPI.getAll(),
          subcategoriesAPI.getAll(categoryId),
          coursesAPI.getAll(),
        ]);
        const cat = (Array.isArray(cats) ? cats : []).find((c: Category) => c.id === categoryId);
        setCategory(cat || null);
        setSubcategories((Array.isArray(subs) ? subs : []).filter((s: SubCategory) => s.isActive));
        setCourses(Array.isArray(coursesRes) ? coursesRes : []);
      } catch (error) {
        console.error('Error loading category:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [categoryId]);

  if (categoryId === 'neet') {
    return <NeetIitJeePage courses={courses} loading={loading} />;
  }

  if (categoryId === 'iit-jee') {
    return <Class11_12Page courses={courses} loading={loading} />;
  }

  if (!loading && !category) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Category not found</p>
      </div>
    );
  }

  if (loading || !category) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="animate-pulse">
          <div className="bg-gray-200 pt-6 pb-8 px-4 rounded-b-[2rem] h-40"></div>
          <div className="px-4 mt-4 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-2xl h-24 w-full"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const handleSubClick = (sub: SubCategory) => {
    const subId = sub.id.includes('_') ? sub.id : `${categoryId}_${sub.id}`;
    navigate(`/explore/${categoryId}/${subId}?label=${encodeURIComponent(sub.title)}`);
  };

  const getCoursesForCategory = () => {
    if (categoryId === 'mock-test') {
      return courses.filter(c =>
        c.categoryId === 'mock-test' ||
        c.contentType === 'mock_test' ||
        (c.name || c.title || '').toLowerCase().includes('mock test') ||
        (c.name || c.title || '').toLowerCase().includes('test series')
      );
    }
    return courses.filter(c => c.categoryId === categoryId);
  };

  const getCourseCountForSub = (sub: SubCategory) => {
    return courses.filter(c => c.subcategoryId === sub.id).length;
  };

  const parentGroups: string[] = Array.from(new Set(subcategories.map(s => s.parentPath).filter(Boolean) as string[]));
  const directSubs = subcategories.filter(s => !s.parentPath);
  const hasGroups = parentGroups.length > 0;

  const filteredGroupSubs = selectedGroup
    ? subcategories.filter(s => s.parentPath === selectedGroup)
    : [];

  const categoryCourses = getCoursesForCategory();
  const filteredCourses = selectedSubFilter
    ? categoryCourses.filter(c => c.subcategoryId === selectedSubFilter)
    : categoryCourses;

  const gradientColors: Record<string, string> = {
    'bg-blue-500': 'from-blue-500 to-blue-600',
    'bg-indigo-500': 'from-indigo-500 to-indigo-600',
    'bg-purple-500': 'from-purple-500 to-purple-600',
    'bg-teal-500': 'from-teal-500 to-teal-600',
    'bg-green-500': 'from-green-500 to-green-600',
    'bg-orange-500': 'from-orange-500 to-orange-600',
    'bg-red-500': 'from-red-500 to-red-600',
    'bg-pink-500': 'from-brandBlue to-[#1A237E]',
    'bg-cyan-500': 'from-cyan-500 to-cyan-600',
    'bg-emerald-500': 'from-emerald-500 to-emerald-600',
    'bg-amber-500': 'from-amber-500 to-amber-600',
    'bg-violet-500': 'from-violet-500 to-violet-600',
  };

  const getSubGradient = (color: string) => {
    return gradientColors[color] || 'from-[#303F9F] to-[#1A237E]';
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className={`bg-gradient-to-br ${category.gradient} text-white pt-6 pb-8 px-4 rounded-b-[2rem]`}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/20 transition-all">
            <span className="material-symbols-rounded">arrow_back</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="material-icons-outlined text-2xl">{category.icon}</span>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">{category.title}</h1>
              <p className="text-white/70 text-xs">{category.subtitle}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-full">
            <span className="material-icons-outlined text-sm">school</span>
            <span className="text-xs font-semibold">{categoryCourses.length} Courses</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-full">
            <span className="material-icons-outlined text-sm">category</span>
            <span className="text-xs font-semibold">{subcategories.length} Subcategories</span>
          </div>
        </div>
      </header>

      <main className="px-4 mt-4 relative z-10 space-y-5">
        {hasGroups && (
          <>
            <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
              {parentGroups.map(group => {
                const parts = group.split(' > ');
                const shortLabel = parts[parts.length - 1] || group;
                return (
                  <button
                    key={group}
                    onClick={() => setSelectedGroup(selectedGroup === group ? null : group)}
                    className={`rounded-2xl px-5 py-3 text-center transition-all active:scale-95 whitespace-nowrap shrink-0 ${selectedGroup === group
                      ? 'bg-white shadow-lg border-2 border-[#303F9F] text-[#303F9F]'
                      : 'bg-white shadow-sm border border-gray-100 text-gray-700'
                      }`}
                  >
                    <p className="text-xs font-bold">{shortLabel}</p>
                    <p className="text-[9px] text-gray-400 mt-0.5">{group !== shortLabel ? group : ''}</p>
                  </button>
                );
              })}
            </div>

            {selectedGroup && filteredGroupSubs.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-fade-in">
                <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
                  <span className="material-icons-outlined text-[#303F9F] text-lg">category</span>
                  {selectedGroup}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {filteredGroupSubs.map(sub => {
                    const courseCount = getCourseCountForSub(sub);
                    return (
                      <button
                        key={sub.id}
                        onClick={() => handleSubClick(sub)}
                        className="bg-gradient-to-br from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 rounded-xl p-4 text-left transition-all active:scale-95 flex items-center gap-3 border border-gray-100 hover:border-gray-200 hover:shadow-md"
                      >
                        <div className={`w-11 h-11 bg-gradient-to-br ${getSubGradient(sub.color)} rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm`}>
                          <span className="material-icons-outlined text-white text-lg">{sub.icon}</span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-gray-700 line-clamp-2">{sub.title.replace(sub.parentPath + ' - ', '').replace(sub.parentPath + ' ', '')}</span>
                          <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                            <span className="material-icons-outlined" style={{ fontSize: '10px' }}>menu_book</span>
                            {courseCount} {courseCount === 1 ? 'Course' : 'Courses'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {directSubs.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
              <span className="material-icons-outlined text-[#303F9F] text-lg">category</span>
              Course Categories
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {directSubs.map(sub => {
                const courseCount = getCourseCountForSub(sub);
                return (
                  <button
                    key={sub.id}
                    onClick={() => handleSubClick(sub)}
                    className="bg-gradient-to-br from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 rounded-xl p-4 text-left transition-all active:scale-95 border border-gray-100 hover:border-gray-200 hover:shadow-md group"
                  >
                    <div className={`w-12 h-12 bg-gradient-to-br ${getSubGradient(sub.color)} rounded-xl flex items-center justify-center mb-3 shadow-sm group-hover:shadow-md transition-shadow`}>
                      <span className="material-icons-outlined text-white text-xl">{sub.icon}</span>
                    </div>
                    <p className="text-xs font-bold text-gray-800">{sub.title}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="material-icons-outlined text-gray-400" style={{ fontSize: '10px' }}>menu_book</span>
                      <p className="text-[10px] text-gray-400">{courseCount} {courseCount === 1 ? 'Course' : 'Courses'}</p>
                    </div>
                    {sub.description && (
                      <p className="text-[10px] text-gray-400 mt-1 line-clamp-2">{sub.description}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {categoryCourses.length > 0 && (
          <div>
            <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider mb-3">Available Courses</h3>

            {subcategories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-3 hide-scrollbar">
                <button
                  onClick={() => setSelectedSubFilter(null)}
                  className={`rounded-full px-4 py-2 text-xs font-bold whitespace-nowrap shrink-0 transition-all active:scale-95 ${!selectedSubFilter
                    ? 'bg-[#1A237E] text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-200'
                    }`}
                >
                  All Courses ({categoryCourses.length})
                </button>
                {subcategories.map(sub => {
                  const count = getCourseCountForSub(sub);
                  return (
                    <button
                      key={sub.id}
                      onClick={() => setSelectedSubFilter(selectedSubFilter === sub.id ? null : sub.id)}
                      className={`rounded-full px-4 py-2 text-xs font-bold whitespace-nowrap shrink-0 transition-all active:scale-95 flex items-center gap-1.5 ${selectedSubFilter === sub.id
                        ? 'bg-[#303F9F] text-white shadow-md'
                        : 'bg-white text-gray-600 border border-gray-200'
                        }`}
                    >
                      <span className="material-icons-outlined" style={{ fontSize: '14px' }}>{sub.icon}</span>
                      {sub.title.replace(sub.parentPath ? sub.parentPath + ' - ' : '', '').replace(sub.parentPath ? sub.parentPath + ' ' : '', '')}
                      {count > 0 && <span className="opacity-70">({count})</span>}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="space-y-3">
              {filteredCourses.map((course: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => navigate(`/course/${course._id || course.id}`)}
                  className="w-full bg-white rounded-xl p-4 shadow-sm flex gap-4 text-left active:scale-[0.98] transition-transform border border-gray-100 hover:shadow-md"
                >
                  <div className={`w-16 h-16 bg-gradient-to-br ${category.gradient} rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden`}>
                    {(course.imageUrl || course.thumbnail) ? (
                      <img src={getImageUrl(course.imageUrl || course.thumbnail)} alt="" className="w-full h-full object-cover" loading="lazy" onError={(e: any) => { e.currentTarget.style.display = 'none'; const parent = e.currentTarget.parentElement; if (parent) { const span = document.createElement('span'); span.className = 'text-white text-xl font-bold opacity-60'; span.textContent = (course.name || course.title || '?').charAt(0).toUpperCase(); parent.appendChild(span); } }} />
                    ) : (
                      <span className="text-white text-xl font-bold opacity-60">{(course.name || course.title || '?').charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-gray-800">{course.name || course.title}</h4>
                    <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">{(course.description || 'Complete preparation course').replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ')}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
                      <span className="flex items-center gap-1">
                        <span className="material-icons-outlined text-xs">{(course.contentType === 'mock_test' || course.categoryId === 'mock-test') ? 'quiz' : 'play_circle'}</span>
                        {(course.contentType === 'mock_test' || course.categoryId === 'mock-test') ? `${course.tests || 0} Tests` : `${course.videos || 0} Videos`}
                      </span>
                      <span className="font-bold text-[#303F9F]">{course.price ? `₹${course.price}` : 'Free'}</span>
                    </div>
                  </div>
                  <span className="material-icons-outlined text-gray-300 self-center">chevron_right</span>
                </button>
              ))}
              {filteredCourses.length === 0 && selectedSubFilter && (
                <div className="text-center py-8 bg-white rounded-2xl border border-gray-100">
                  <span className="material-icons-outlined text-5xl text-gray-200">search_off</span>
                  <p className="text-sm font-bold text-gray-400 mt-3">No courses found</p>
                  <p className="text-xs text-gray-300 mt-1">Try selecting a different filter</p>
                </div>
              )}
            </div>
          </div>
        )}

        {categoryCourses.length === 0 && subcategories.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm mt-8 animate-fade-in">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-icons-outlined text-6xl text-gray-300">menu_book</span>
            </div>
            <h3 className="text-base font-bold text-gray-700">Content Coming Soon</h3>
            <p className="text-xs text-gray-400 mt-2 max-w-[250px] mx-auto">We are organizing the best materials for this section. Please check back shortly.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default CategoryPage;
