import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { categoriesAPI, subcategoriesAPI, coursesAPI, subjectsAPI, getAuthHeaders } from '../services/apiClient';
import { getImageUrl } from '../lib/utils';
import { useAuthStore } from '../store/authStore';

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
  hierarchyMode?: 'simple' | 'exam-branch' | 'board-class';
  level1Label?: string;
  level2Label?: string;
  branchesL1?: { label: string; slug: string }[];
  branchesL2?: { label: string; slug: string }[];
}

interface SubCategory {
  _id?: string;
  id: string;
  categoryId: string;
  title: string;
  parentPath: string;
  icon: string;
  color: string;
  gradient?: string;
  description?: string;
  order: number;
  isActive: boolean;
  level1Branch?: string;
  level2Branch?: string;
}

interface Subject {
  _id?: string;
  id: string;
  categoryId: string;
  subcategoryId?: string;
  name: string;
  label?: string; // Optional label for robust matching
  course: string;
  icon: string;
  gradient?: string;
  status: string;
  level1Branch?: string;
  level2Branch?: string;
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
  subjectId?: string;
  boardType?: string;
  categoryId?: string;
  subcategoryId?: string;
  level1Branch?: string; // Strict isolation field
  level2Branch?: string; // Strict isolation field
  isLive?: boolean;
  videos?: number;
  tests?: number;
  settings?: {
    markNewBatch?: boolean;
    showTabs?: boolean;
    sortingOrder?: number;
  };
}

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

const getVisualGradient = (item: { gradient?: string; color?: string }) => {
  if (item.gradient) return item.gradient;
  if (item.color && item.color.startsWith('from-')) return item.color;
  return gradientColors[item.color || ''] || 'from-[#303F9F] to-[#1A237E]';
};

const getSubGradient = (color: string) => getVisualGradient({ color });
export function normalizeSubcategoryId(val: string = "") {
  if (!val) return "";
  return String(val)
    .toLowerCase()
    .replace(/neet_|iit_jee_|iit-jee_/g, "")
    .replace(/batches/g, "batch")
    .replace(/-/g, "_")
    .trim();
}

export const normalizeKey = (val: any) => String(val || "").toLowerCase().trim().replace(/[-_]/g, " ");

export const getCourseCategoryKey = (c: any) => {
  const ids = [c.categoryId, c.category, c.categoryName, c.primaryCategory];
  if (Array.isArray(c.categories)) ids.push(...c.categories);
  return ids.map(normalizeKey).filter(Boolean);
};

export const getCourseLevel1Key = (c: any) => normalizeKey(c.level1Branch || c.examType || c.boardType || "");
export const getCourseLevel2Key = (c: any) => normalizeKey(c.level2Branch || c.class || c.className || "");
export const getCourseSubKey = (c: any) => normalizeKey(c.subcategoryId || c.contentType || c.subcategory || "");

export function isCategoryMatch(course: any, targetCategory: any) {
  if (!course || !targetCategory) return false;
  
  const targetId = normalizeKey(targetCategory.id || targetCategory._id);
  const targetTitle = normalizeKey(targetCategory.title);
  const courseKeys = getCourseCategoryKey(course);

  // 1. Direct match with target ID or Title
  if (courseKeys.includes(targetId) || courseKeys.includes(targetTitle)) return true;
  
  // 2. Special Case: Nursing (inclusive)
  const isNursingTarget = targetId.includes('nursing') || targetTitle.includes('nursing');
  if (isNursingTarget) {
     return courseKeys.some(k => k.includes('nursing'));
  }

  // 3. Special Case: NEET/IIT-JEE (slug mapping)
  if (targetId.includes('neet') || targetId.includes('jee') || targetTitle.includes('neet') || targetTitle.includes('jee')) {
    const isNeet = courseKeys.some(k => k.includes('neet'));
    const isJee = courseKeys.some(k => k.includes('jee') || k.includes('iit'));
    return isNeet || isJee;
  }
  
  return false;
}




const NeetIitJeePage: React.FC<{ 
  category: Category; 
  courses: Course[]; 
  loading: boolean; 
  subcategories: SubCategory[];
  subjects: Subject[];
  enrolledCourseIds: string[];
}> = ({ category, courses, loading, subcategories, subjects: allSubjects, enrolledCourseIds }) => {
  const navigate = useNavigate();
  const branches = category.branchesL1 || [];
  const [activeBranch, setActiveBranch] = useState<string>(branches[0]?.slug || '');

  const categorySubcategories = useMemo(() => {
    return subcategories.filter(s => s.categoryId === category.id && (s.level1Branch === activeBranch || !s.level1Branch));
  }, [subcategories, activeBranch, category.id]);

  const filteredCourses = useMemo(() => {
    return courses.filter(c => {
      const matchesCat = isCategoryMatch(c, category);
      if (!matchesCat) return false;
      
      const cL1 = getCourseLevel1Key(c);
      const aL1 = normalizeKey(activeBranch);
      
      // Strict Match for primary list
      if (cL1 && cL1 !== aL1) return false;

      return true;
    });
  }, [courses, activeBranch, category]);

  const getContentCount = (subId: string) => {
    const requested = normalizeSubcategoryId(subId);
    return courses.filter(c => {
      const matchesCat = isCategoryMatch(c, category);
      if (!matchesCat) return false;

      const cL1 = getCourseLevel1Key(c);
      const aL1 = normalizeKey(activeBranch);
      if (cL1 !== aL1) return false;

      const courseSub = getCourseSubKey(c);
      const matchesSub = courseSub === requested || normalizeSubcategoryId(courseSub) === requested;

      return matchesCat && matchesSub;
    }).length;
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-gray-50">
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
              <h1 className="text-xl font-black tracking-tight">{category.title}</h1>
              <p className="text-white/60 text-xs mt-0.5">{category.subtitle || 'Aone Target Institute'}</p>
            </div>
          </div>

          <div className="flex bg-white/15 rounded-2xl p-1 backdrop-blur-sm">
            {branches.map(b => (
              <button
                key={b.slug}
                onClick={() => { setActiveBranch(b.slug); }}
                className={`flex-1 py-3 rounded-xl text-center transition-all font-bold text-sm flex items-center justify-center gap-2 ${activeBranch === b.slug
                  ? 'bg-white text-[#1A237E] shadow-lg'
                  : 'text-white/80 hover:text-white'
                  }`}
              >
                {b.slug === 'custom_icon_logic_removed' && <span className="material-symbols-rounded text-lg">medical_services</span>}
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="px-4 -mt-5 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 rounded-2xl h-30 w-full"></div>
              </div>
            ))
          ) : categorySubcategories.map(ct => {
            const count = getContentCount(ct.id);
            return (
              <button
                key={ct.id}
                onClick={() => navigate(`/content/${ct.id}?branch=${activeBranch}&categoryId=${category.id}`)}
                className="relative rounded-2xl p-4 text-left transition-all active:scale-95 overflow-hidden shadow-md hover:shadow-lg h-28 flex flex-col justify-between"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${getVisualGradient(ct)}`}></div>
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    {ct.icon && (
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                        <span className="material-symbols-rounded text-white text-2xl">{ct.icon}</span>
                      </div>
                    )}
                    <h3 className="text-white font-bold text-[13px] leading-tight line-clamp-2">{ct.title}</h3>
                  </div>
                  <p className="text-white/70 text-[10px] mt-2 font-medium tracking-wide uppercase">{count} {count === 1 ? 'Course' : 'Courses'}</p>
                </div>
                <div className="absolute top-2 right-2 w-7 h-7 bg-white/20 rounded-full flex items-center justify-center z-10">
                  <span className="material-symbols-rounded text-white text-sm">arrow_forward</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-semibold text-gray-400 tracking-wide">
              Recently Added Batches
            </h3>
          </div>
          
          <div className="space-y-3">
            {(() => {
              const displayCourses = filteredCourses.filter(c => !getCourseSubKey(c) || !getCourseLevel1Key(c));

              return displayCourses.length > 0 ? (
                displayCourses.map((course, idx) => {
                  const cId = course.id || course._id || '';
                  const courseName = course.name || course.title || 'Course';
                  const coursePrice = course.price || 0;
                  const isFree = coursePrice === 0;
                  const ct = categorySubcategories.find(c => c.id === course.subcategoryId);

                  return (
                    <button
                      key={cId || idx}
                      onClick={() => navigate(`/course/${cId}`)}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white shadow-sm border border-gray-100 hover:shadow-md transition-all active:scale-[0.98] text-left w-full"
                    >
                      <div className="w-14 h-14 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden relative border border-gray-50">
                        {(course.imageUrl || course.thumbnail) ? (
                          <img 
                            src={getImageUrl(course.imageUrl || course.thumbnail)} 
                            alt="" 
                            className="w-full h-full object-cover" 
                            loading="lazy" 
                            onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                          />
                        ) : ct?.icon ? (
                          <div className={`w-full h-full bg-gradient-to-br ${getVisualGradient(ct || {})} flex items-center justify-center`}>
                            <span className="material-symbols-rounded text-white/50 text-xl">{ct.icon}</span>
                          </div>
                        ) : null}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight">{courseName}</h4>
                        <div className="flex items-center gap-2 mt-1.5">
                          {enrolledCourseIds.some(eid => String(eid) === String(course.id) || String(eid) === String(course._id)) ? (
                            <span className="px-2 py-0.5 text-[10px] bg-teal-50 text-teal-600 rounded-full font-bold">Enrolled</span>
                          ) : (
                            <span className="text-sm font-bold text-blue-600">{isFree ? 'Free' : `₹${coursePrice}`}</span>
                          )}
                          {course.subject && (
                            <span className="px-2 py-0.5 text-[10px] bg-blue-50 text-blue-600 rounded-full font-bold">{course.subject}</span>
                          )}
                        </div>
                      </div>
                      
                      <span className="material-symbols-rounded text-gray-300 text-lg">chevron_right</span>
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-10">
                  <p className="text-sm text-gray-400 font-medium">No batches available</p>
                </div>
              );
            })()}
          </div>

        </div>
      </main>
    </div>
  );
};



const GeneralClassPage: React.FC<{ 
  category: Category; 
  courses: Course[]; 
  loading: boolean; 
  subcategories: SubCategory[];
  subjects: Subject[];
  enrolledCourseIds: string[];
}> = ({ category, courses, loading, subcategories, subjects: allSubjects, enrolledCourseIds }) => {
  const navigate = useNavigate();
  const branchesL1 = category.branchesL1 || [];
  const branchesL2 = category.branchesL2 || [];
  
  const [activeL1, setActiveL1] = useState<string>(branchesL1[0]?.slug || '');
  const [activeL2, setActiveL2] = useState<string>(branchesL2[0]?.slug || '');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  const subjects = useMemo(() => {
    return allSubjects.filter(s => 
        isCategoryMatch(s, category) && 
        String(s.level1Branch || "").toLowerCase() === String(activeL1 || "").toLowerCase() &&
        String(s.level2Branch || "").toLowerCase() === String(activeL2 || "").toLowerCase() &&
        !s.subcategoryId // ONLY category-level/global subjects
    ).map(s => ({
       ...s,
       id: s.id || s._id || "" // Normalize ID
    }));
  }, [allSubjects, activeL1, activeL2, category]);

  const categorySubcategories = useMemo(() => {
    return subcategories.filter(s => s.categoryId === category.id && (s.level1Branch === activeL1 || !s.level1Branch));
  }, [subcategories, activeL1, category.id]);

  const filteredCourses = useMemo(() => {
    return courses.filter(c => {
      const matchesCat = isCategoryMatch(c, category);
      if (!matchesCat) return false;
      
      const cL1 = getCourseLevel1Key(c);
      const aL1 = normalizeKey(activeL1);
      
      const cL2 = getCourseLevel2Key(c);
      const aL2 = normalizeKey(activeL2);
      
      // Level 1 (Board) must match if present
      if (cL1 && cL1 !== aL1) return false;

      // Level 2 (Class) must match if present
      if (cL2 && cL2 !== aL2) return false;

      // Robust Subject Matching
      if (selectedSubject && selectedSubject !== 'all' && selectedSubject !== '') {
        const selectedObj = subjects.find(
          s => String(s.id || s._id) === String(selectedSubject)
        );

        const selectedId = selectedObj ? String(selectedObj.id || selectedObj._id) : "";
        const selectedName = selectedObj
          ? String(selectedObj.label || selectedObj.name || "").trim().toLowerCase()
          : "";

        const courseSubjectId = String(c.subjectId || "");
        const courseSubjectName = String(c.subject || "").trim().toLowerCase();

        const matchesSubject =
          (selectedId && courseSubjectId === selectedId) ||
          (selectedName && courseSubjectName === selectedName);

        if (!matchesSubject) return false;
      }

      return true;
    });
  }, [courses, activeL1, activeL2, selectedSubject, subjects, category]);

  return (
    <div className="flex flex-col w-full min-h-screen bg-gray-50">
      <header className="bg-gradient-to-br from-[#1A237E] to-[#303F9F] text-white pt-6 pb-12 px-4 rounded-b-[2rem] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-white/20"></div>
          <div className="absolute bottom-0 left-8 w-20 h-20 rounded-full bg-white/10"></div>
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white/20 backdrop-blur-md">
              <span className="material-symbols-rounded">arrow_back</span>
            </button>
            <div>
              <h1 className="text-xl font-black tracking-tight">{category.title}</h1>
              <p className="text-white/60 text-xs mt-0.5">{category.subtitle || 'Aone Target Institute'}</p>
            </div>
          </div>

          <div className="flex bg-white/15 rounded-2xl p-1 backdrop-blur-sm">
            {branchesL1.map(b => (
              <button
                key={b.slug}
                onClick={() => { setActiveL1(b.slug); setSelectedSubject(null); }}
                className={`flex-1 py-3 rounded-xl text-center transition-all font-bold text-sm flex items-center justify-center gap-2 ${activeL1 === b.slug
                  ? 'bg-white text-[#1A237E] shadow-lg'
                  : 'text-white/80 hover:text-white'
                  }`}
              >
                {b.slug === 'custom_icon_logic_removed' && <span className="material-symbols-rounded text-lg">school</span>}
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="px-4 -mt-6 space-y-5 pb-20">
        <div className="grid grid-cols-2 gap-3">
          {branchesL2.map(b => (
            <button
              key={b.slug}
              onClick={() => { setActiveL2(b.slug); setSelectedSubject(null); }}
              className={`relative rounded-3xl p-5 text-left transition-all active:scale-95 overflow-hidden h-40 shadow-sm ${
                activeL2 === b.slug ? 'ring-2 ring-white border-transparent' : 'border border-gray-100'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-violet-700"></div>
              <div className="relative z-10 flex flex-col h-full justify-between">
                {false && (
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg bg-white/20">
                    <span className="text-2xl font-black text-white">{b.slug.replace(/\D/g, '')}</span>
                  </div>
                )}
                <div>
                  <h3 className="font-black text-lg text-white">{b.label}</h3>
                  <p className="text-white/60 text-xs font-medium">{category.subtitle || 'Academic Success'}</p>
                </div>
              </div>
              {activeL2 === b.slug && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="material-symbols-rounded text-white text-xs">check</span>
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {categorySubcategories.map(ct => {
            return (
              <button
                key={ct.id}
                onClick={() => navigate(`/content/${ct.id}?branch=${activeL1}&class=${activeL2}&categoryId=${category.id}`)}
                className="relative rounded-2xl p-4 text-left transition-all active:scale-95 overflow-hidden shadow-md hover:shadow-lg h-30"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${getVisualGradient(ct)}`}></div>
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    {ct.icon && (
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                        <span className="material-symbols-rounded text-white text-xl">{ct.icon}</span>
                      </div>
                    )}
                    <h3 className="text-white font-bold text-[13px] leading-tight line-clamp-2">{ct.title}</h3>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-white/70 text-[9px] uppercase font-black tracking-widest leading-none">{activeL1} • {activeL2}</span>
                    <span className="material-symbols-rounded text-white text-sm">arrow_forward</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="material-symbols-rounded text-[#303F9F] text-sm">filter_list</span>
            Select Subject
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {subjects.map(subj => (
              <button
                key={subj.id}
                onClick={() => setSelectedSubject(selectedSubject === subj.id ? null : subj.id)}
                className={`py-3 rounded-xl text-center transition-all active:scale-95 flex flex-col items-center gap-1 ${
                  selectedSubject === subj.id
                    ? `bg-gradient-to-br ${subj.gradient || 'from-[#1A237E] to-[#303F9F]'} text-white shadow-md`
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100'
                }`}
              >
                {subj.icon && <span className="material-symbols-rounded text-lg">{subj.icon}</span>}
                <span className="text-[10px] font-bold">{subj.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-semibold text-gray-400 tracking-wide">
              {selectedSubject ? `${filteredCourses.length} ${filteredCourses.length === 1 ? 'Available Course' : 'Available Courses'}` : 'Recently Added Batches'}
            </h3>
            {selectedSubject && (
               <button onClick={() => setSelectedSubject(null)} className="text-[11px] text-blue-600 font-bold bg-blue-50 px-3 py-1 rounded-full transition-all active:scale-95">Clear Filter</button>
            )}
          </div>
          
          <div className="space-y-3">
            {(() => {
              const displayCourses = selectedSubject 
                ? filteredCourses 
                : filteredCourses.filter(c => !getCourseSubKey(c) || !getCourseLevel1Key(c) || !getCourseLevel2Key(c));

              return displayCourses.length > 0 ? (
                displayCourses.map((course, idx) => {
                const cId = course.id || course._id || '';
                const courseName = course.name || course.title || 'Course';
                const coursePrice = course.price || 0;
                const isFree = coursePrice === 0;

                return (
                  <button
                    key={cId || idx}
                    onClick={() => navigate(`/course/${cId}`)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white shadow-sm border border-gray-100 hover:shadow-md transition-all active:scale-[0.98] text-left w-full group"
                  >
                    <div className="w-14 h-14 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden relative border border-gray-50">
                      {(course.imageUrl || course.thumbnail) ? (
                        <img 
                          src={getImageUrl(course.imageUrl || course.thumbnail)} 
                          alt="" 
                          className="w-full h-full object-cover" 
                          loading="lazy" 
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center">
                          <span className="text-white/50 text-xl font-bold">{(courseName).charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">{courseName}</h4>
                      <div className="flex items-center gap-2 mt-1.5">
                        {enrolledCourseIds.some(eid => String(eid) === String(course.id) || String(eid) === String(course._id)) ? (
                          <span className="px-2 py-0.5 text-[10px] bg-teal-50 text-teal-600 rounded-full font-bold">Enrolled</span>
                        ) : (
                          <span className="text-sm font-bold text-blue-600">{isFree ? 'Free' : `₹${coursePrice}`}</span>
                        )}
                        <span className="px-2 py-0.5 text-[10px] bg-blue-50 text-blue-600 rounded-full font-bold uppercase">{activeL1} • {activeL2}</span>
                      </div>
                    </div>
                    
                    <span className="material-symbols-rounded text-gray-300 text-lg group-hover:text-blue-600 transition-colors">chevron_right</span>
                  </button>
                );
              })
              ) : (
                <div className="text-center py-10">
                  <p className="text-sm text-gray-400 font-medium">No batches available</p>
                </div>
              );
            })()}
          </div>
        </div>
      </main>
    </div>
  );
};



const Class11_12Page: React.FC<{ 
  category: Category; 
  courses: Course[]; 
  loading: boolean; 
  subcategories: SubCategory[];
  subjects: Subject[];
  enrolledCourseIds: string[];
}> = ({ category, courses, loading, subcategories, subjects: allSubjects, enrolledCourseIds }) => {
  return <GeneralClassPage category={category} courses={courses} loading={loading} subcategories={subcategories} subjects={allSubjects} enrolledCourseIds={enrolledCourseIds} />;
};



const NursingPage: React.FC<{ category: Category; subcategories: SubCategory[]; courses: Course[]; loading: boolean; enrolledCourseIds: string[] }> = ({ category, subcategories, courses, loading, enrolledCourseIds }) => {
  const categoryId = category.id;
  const navigate = useNavigate();

  return (
    <div className="flex flex-col w-full min-h-screen bg-gray-50 pb-20">
      <header className="bg-gradient-to-br from-teal-600 to-emerald-700 text-white pt-8 pb-12 px-4 rounded-b-[2.5rem] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white/20 backdrop-blur-md">
              <span className="material-symbols-rounded">arrow_back</span>
            </button>
            <div>
              <h1 className="text-xl font-black tracking-tight">{category.title}</h1>
              <p className="text-white/60 text-xs">{category.subtitle || 'Aone Target Institute'}</p>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
            <div className="flex items-center gap-3">
              {category.icon && (
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-lg transform rotate-3">
                  <span className="material-symbols-rounded text-teal-600 text-2xl">{category.icon}</span>
                </div>
              )}
              <div>
                <h2 className="font-bold text-sm">Specialized Coaching</h2>
                <p className="text-white/70 text-[10px]">{category.description || 'Preparation with expert medical faculty'}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 -mt-6">
        <div className="grid grid-cols-2 gap-3 pb-8">
          {subcategories.map((item) => {
            const count = courses.filter(c => 
              isCategoryMatch(c, category) && 
              (c.subcategoryId === item.id || (c.name || '').toLowerCase().includes(item.title.toLowerCase()) || (c.subcategoryId || '').toLowerCase().includes(item.id.toLowerCase()))
            ).length;

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'ebooks') navigate('/ebook-notes');
                  else if (item.id === 'mock-tests') navigate('/mock-tests');
                  else navigate(`/explore/${categoryId}/${item.id}?label=${encodeURIComponent(item.title)}`);
                }}
                className={`group bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between h-40 text-left active:scale-[0.97] transition-all hover:shadow-card-hover hover:-translate-y-1 relative overflow-hidden ${item.id === 'mock-tests' || item.id === 'ebooks' ? 'col-span-1' : ''}`}
              >
                <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${getVisualGradient(item)} opacity-[0.03] rounded-bl-full`}></div>
                
                {item.icon && (
                  <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${getVisualGradient(item)} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <span className="material-symbols-rounded text-[22px]">{item.icon}</span>
                  </div>
                )}
                
                <div className="relative z-10">
                  <h3 className="font-black text-[13px] text-gray-800 leading-tight">{item.title}</h3>
                  <p className="text-[9px] text-gray-400 mt-1 font-medium leading-tight">{item.description || 'Professional Course'}</p>
                  <div className="mt-3 flex items-center justify-between">
                     <span className="text-[8px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md">
                       {count > 0 ? `${count} Courses` : 'New Batches'}
                     </span>
                     <span className="material-symbols-rounded text-teal-200 text-sm group-hover:text-teal-500 transition-colors">arrow_forward</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-semibold text-gray-400 tracking-wide">
              {courses.length} {courses.length === 1 ? 'Available Course' : 'Available Courses'}
            </h3>
          </div>
          
          <div className="space-y-3">
            {courses.length > 0 ? (
              courses.map((course, idx) => {
                const cId = course.id || course._id || '';
                const courseName = course.name || course.title || 'Course';
                const coursePrice = course.price || 0;
                const isFree = coursePrice === 0;

                return (
                  <button
                    key={cId || idx}
                    onClick={() => navigate(`/course/${cId}`)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white shadow-sm border border-gray-100 hover:shadow-md transition-all active:scale-[0.98] text-left w-full group"
                  >
                    <div className="w-14 h-14 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden relative border border-gray-50">
                      {(course.imageUrl || course.thumbnail) ? (
                        <img 
                          src={getImageUrl(course.imageUrl || course.thumbnail)} 
                          alt="" 
                          className="w-full h-full object-cover" 
                          loading="lazy" 
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-teal-600 to-emerald-700 flex items-center justify-center">
                          <span className="text-white/50 text-xl font-bold">{(courseName).charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight group-hover:text-teal-600 transition-colors">{courseName}</h4>
                      <div className="flex items-center gap-2 mt-1.5">
                        {enrolledCourseIds.some(eid => String(eid) === String(course.id) || String(eid) === String(course._id)) ? (
                          <span className="px-2 py-0.5 text-[10px] bg-teal-50 text-teal-600 rounded-full font-bold">Enrolled</span>
                        ) : (
                          <span className="text-sm font-bold text-teal-600">{isFree ? 'Free' : `₹${coursePrice}`}</span>
                        )}
                        <span className="px-2 py-0.5 text-[10px] bg-teal-50 text-teal-600 rounded-full font-bold uppercase">{category.title}</span>
                      </div>
                    </div>
                    
                    <span className="material-symbols-rounded text-gray-300 text-lg group-hover:text-teal-600 transition-colors">chevron_right</span>
                  </button>
                );
              })
            ) : (
              <div className="text-center py-10">
                <p className="text-sm text-gray-400 font-medium">No batches available</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

const CategoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { categoryId } = useParams<{ categoryId: string }>();
  const { student } = useAuthStore();
  
  const [category, setCategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubFilter, setSelectedSubFilter] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const sId = student?.id || student?._id;

        const [cats, subs, subjs, coursesRes, enrolledRes] = await Promise.all([
          categoriesAPI.getAll().catch(() => []),
          subcategoriesAPI.getAll(categoryId).catch(() => []),
          subjectsAPI.getAll().catch(() => []),
          coursesAPI.getAll().catch(() => []),
          sId ? fetch(`/api/students/${sId}/courses`, { headers: getAuthHeaders() }).then(r => r.json()).catch(() => []) : Promise.resolve([])
        ]);

        const cat = (Array.isArray(cats) ? cats : []).find((c: Category) => 
          String(c.id).toLowerCase() === String(categoryId).toLowerCase() || 
          String(c._id).toLowerCase() === String(categoryId).toLowerCase()
        );
        setCategory(cat || null);
        setSubcategories((Array.isArray(subs) ? subs : []).filter((s: SubCategory) => s.isActive));
        setSubjects((Array.isArray(subjs) ? subjs : []).filter((s: Subject) => s.status === 'active'));
        
        const purchasedIds = Array.isArray(enrolledRes) ? enrolledRes.map((c: any) => c.id || c._id) : [];
        setEnrolledCourseIds(purchasedIds);
        setCourses(Array.isArray(coursesRes) ? coursesRes : []);
      } catch (error) {
        console.error('Error loading category:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [categoryId, student?.id]);

  const categoryCourses = useMemo(() => {
    if (categoryId === 'mock-test') {
      return courses.filter(c =>
        isCategoryMatch(c, { id: 'mock-test' }) ||
        normalizeSubcategoryId(c.contentType || "") === 'mock_test' ||
        (c.name || c.title || '').toLowerCase().includes('mock test') ||
        (c.name || c.title || '').toLowerCase().includes('test series')
      );
    }

    if (categoryId?.toLowerCase().includes('nursing')) {
      const normalizedTarget = "nursing";
      return courses.filter(course => {
        const values = [
          course.category,
          course.categoryName,
          course.primaryCategory,
          course.categoryId,
          course.categorySlug,
        ]
          .filter(Boolean)
          .map(v => String(v).trim().toLowerCase());

        return values.includes("nursing") || values.includes("nursing-cet");
      });
    }

    return courses.filter(c => isCategoryMatch(c, category || { id: categoryId }));
  }, [courses, categoryId, category]);

  const subcategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    subcategories.forEach(sub => {
      counts[sub.id] = (courses || []).filter(c => c.subcategoryId === sub.id).length;
    });
    return counts;
  }, [courses, subcategories]);

  const filteredCourses = useMemo(() => {
    return selectedSubFilter
      ? categoryCourses.filter(c => c.subcategoryId === selectedSubFilter)
      : categoryCourses;
  }, [categoryCourses, selectedSubFilter]);

  const parentGroups = useMemo(() => {
    const groups = new Set<string>();
    subcategories.forEach(s => s.parentPath && groups.add(s.parentPath));
    return Array.from(groups);
  }, [subcategories]);

  const filteredGroupSubs = useMemo(() => {
    return subcategories.filter(s => s.parentPath === selectedGroup);
  }, [subcategories, selectedGroup]);

  const directSubs = useMemo(() => {
    return subcategories.filter(s => !s.parentPath);
  }, [subcategories]);

  const isNeetId = categoryId?.toLowerCase().includes('neet');
  const isJeeId = categoryId?.toLowerCase().includes('iit') || categoryId?.toLowerCase().includes('jee');
  const isBoardId = categoryId?.toLowerCase().includes('11') || categoryId?.toLowerCase().includes('12');
  const isGeneralId = categoryId?.toLowerCase().includes('general') || categoryId?.toLowerCase().includes('9') || categoryId?.toLowerCase().includes('10') || categoryId?.toLowerCase().includes('foundation');
  const isNursingId = categoryId?.toLowerCase().includes('nursing');
  const hasGroups = parentGroups.length > 0;

  const handleSubClick = (sub: SubCategory) => {
    const subId = sub.id.includes('_') ? sub.id : `${categoryId}_${sub.id}`;
    navigate(`/explore/${categoryId}/${subId}?label=${encodeURIComponent(sub.title)}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin w-10 h-10 border-4 border-brandBlue border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-6 text-center">
        <span className="material-symbols-rounded text-6xl text-gray-300 mb-4">error</span>
        <h2 className="text-xl font-bold text-gray-800">Category Not Found</h2>
        <p className="text-gray-500 mt-2">The category you are looking for does not exist or has been moved.</p>
        <button onClick={() => navigate('/')} className="mt-6 bg-[#1A237E] text-white px-6 py-3 rounded-2xl font-bold">Go to Home</button>
      </div>
    );
  }

  // Specialized Layout Returns
  if (isNeetId || category.hierarchyMode === 'exam-branch') {
     return <NeetIitJeePage category={category} courses={categoryCourses} loading={loading} subcategories={subcategories} subjects={subjects} enrolledCourseIds={enrolledCourseIds} />;
  }

  if (isJeeId || isBoardId || category.hierarchyMode === 'board-class') {
     return <GeneralClassPage category={category} courses={categoryCourses} loading={loading} subcategories={subcategories} subjects={subjects} enrolledCourseIds={enrolledCourseIds} />;
  }

  if (isGeneralId) {
    return <GeneralClassPage category={category} courses={categoryCourses} loading={loading} subcategories={subcategories} subjects={subjects} enrolledCourseIds={enrolledCourseIds} />;
  }

  if (isNursingId) {
    return <NursingPage category={category} subcategories={subcategories} courses={categoryCourses} loading={loading} enrolledCourseIds={enrolledCourseIds} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className={`bg-gradient-to-br ${category.gradient} text-white pt-6 pb-8 px-4 rounded-b-[2rem]`}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/20 transition-all">
            <span className="material-symbols-rounded">arrow_back</span>
          </button>
          <div className="flex items-center gap-3">
            {category.icon && (
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="material-icons-outlined text-2xl">{category.icon}</span>
              </div>
            )}
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
          <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
            {parentGroups.map((group) => {
              if (typeof group !== 'string') return null;
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
        )}

        {selectedGroup && filteredGroupSubs.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-fade-in">
             <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
               <span className="material-icons-outlined text-[#303F9F] text-lg">category</span>
               {selectedGroup}
             </h3>
             <div className="grid grid-cols-2 gap-3">
               {filteredGroupSubs.map(sub => (
                 <button
                   key={sub.id}
                   onClick={() => handleSubClick(sub)}
                   className="bg-gradient-to-br from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 rounded-xl p-4 text-left transition-all active:scale-95 flex items-center gap-3 border border-gray-100 hover:border-gray-200 hover:shadow-md"
                 >
                   {sub.icon && (
                     <div className={`w-11 h-11 bg-gradient-to-br ${getVisualGradient(sub)} rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm`}>
                       <span className="material-icons-outlined text-white text-lg">{sub.icon}</span>
                     </div>
                   )}
                   <div className="min-w-0">
                     <span className="text-xs font-bold text-gray-700 line-clamp-2">{sub.title.replace(sub.parentPath + ' - ', '').replace(sub.parentPath + ' ', '')}</span>
                     <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                       <span className="material-icons-outlined" style={{ fontSize: '10px' }}>menu_book</span>
                       {subcategoryCounts[sub.id] || 0} {subcategoryCounts[sub.id] === 1 ? 'Course' : 'Courses'}
                     </p>
                   </div>
                 </button>
               ))}
             </div>
          </div>
        )}

        {directSubs.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
              <span className="material-icons-outlined text-[#303F9F] text-lg">category</span>
              Course Categories
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {directSubs.map(sub => (
                <button
                  key={sub.id}
                  onClick={() => handleSubClick(sub)}
                  className="bg-gradient-to-br from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 rounded-xl p-4 text-left transition-all active:scale-95 border border-gray-100 hover:border-gray-200 hover:shadow-md group"
                >
                  {sub.icon && (
                    <div className={`w-12 h-12 bg-gradient-to-br ${getVisualGradient(sub)} rounded-xl flex items-center justify-center mb-3 shadow-sm group-hover:shadow-md transition-shadow`}>
                      <span className="material-icons-outlined text-white text-xl">{sub.icon}</span>
                    </div>
                  )}
                  <p className="text-xs font-bold text-gray-800">{sub.title}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="material-icons-outlined text-gray-400" style={{ fontSize: '10px' }}>menu_book</span>
                    <p className="text-[10px] text-gray-400">{subcategoryCounts[sub.id] || 0} {subcategoryCounts[sub.id] === 1 ? 'Course' : 'Courses'}</p>
                  </div>
                  {sub.description && (
                    <p className="text-[10px] text-gray-400 mt-1 line-clamp-2">{sub.description}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {categoryCourses.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider">Available Courses</h3>

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
                {subcategories.map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setSelectedSubFilter(selectedSubFilter === sub.id ? null : sub.id)}
                    className={`rounded-full px-4 py-2 text-xs font-bold whitespace-nowrap shrink-0 transition-all active:scale-95 flex items-center gap-1.5 ${selectedSubFilter === sub.id
                      ? 'bg-[#303F9F] text-white shadow-md'
                      : 'bg-white text-gray-600 border border-gray-200'
                      }`}
                  >
                    {sub.icon && <span className="material-icons-outlined" style={{ fontSize: '14px' }}>{sub.icon}</span>}
                    <span className="truncate">{sub.title.replace(sub.parentPath ? sub.parentPath + ' - ' : '', '').replace(sub.parentPath ? sub.parentPath + ' ' : '', '')}</span>
                    {(subcategoryCounts[sub.id] || 0) > 0 && <span className="opacity-70">({subcategoryCounts[sub.id]})</span>}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-3">
              {filteredCourses.map((course: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => navigate(`/course/${course._id || course.id}`)}
                  className="w-full bg-white rounded-xl p-4 shadow-sm flex gap-4 text-left active:scale-[0.98] transition-all border border-gray-100 hover:shadow-md group"
                >
                  <div className={`w-16 h-16 bg-gradient-to-br ${category.gradient} rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden relative shadow-inner`}>
                    {(course.imageUrl || course.thumbnail) ? (
                      <img src={getImageUrl(course.imageUrl || course.thumbnail)} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                    ) : (
                      <span className="text-white text-xl font-bold opacity-60">{(course.name || course.title || '?').charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h4 className="text-sm font-bold text-gray-800 line-clamp-2 leading-tight group-hover:text-brandBlue transition-colors">{course.name || course.title}</h4>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
                      <span className="flex items-center gap-1">
                        <span className="material-icons-outlined text-xs">{(course.contentType === 'mock_test' || course.categoryId === 'mock-test') ? 'quiz' : 'play_circle'}</span>
                        {(course.contentType === 'mock_test' || course.categoryId === 'mock-test') ? `${course.tests || 0} Tests` : `${course.videos || 0} Videos`}
                      </span>
                      {enrolledCourseIds.some(eid => String(eid) === String(course.id) || String(eid) === String(course._id)) ? (
                        <span className="font-black text-brandBlue uppercase tracking-widest flex items-center gap-1">
                          <span className="material-icons-outlined text-xs">verified</span>
                          Enrolled
                        </span>
                      ) : (
                        <span className="font-bold text-[#303F9F]">{course.price ? `₹${course.price}` : 'Free'}</span>
                      )}
                    </div>
                  </div>
                  <span className="material-icons-outlined text-gray-300 self-center">chevron_right</span>
                </button>
              ))}
              {filteredCourses.length === 0 && selectedSubFilter && (
                <div className="text-center py-8 bg-white rounded-2xl border border-gray-100">
                  <span className="material-icons-outlined text-5xl text-gray-200">search_off</span>
                  <p className="text-sm font-bold text-gray-400 mt-3">No courses found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {categoryCourses.length === 0 && subcategories.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm mt-8 animate-fade-in">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-icons-outlined text-6xl text-gray-200">sentiment_satisfied</span>
            </div>
            <h3 className="text-base font-bold text-gray-700">Content Coming Soon</h3>
            <p className="text-xs text-gray-400 mt-2 max-w-[250px] mx-auto font-medium">We are organizing the best materials for this section. Check back shortly!</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default CategoryPage;
