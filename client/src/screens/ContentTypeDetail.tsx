import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getImageUrl } from '../lib/utils';
import { coursesAPI, subjectsAPI, getAuthHeaders } from '../services/apiClient';
import { subcategoriesAPI } from '../services/academicService';
import { isCategoryMatch, getCourseLevel1Key, getCourseLevel2Key, normalizeSubcategoryId } from './CategoryPage';

interface Course {
  _id?: string;
  id?: string;
  name?: string;
  title?: string;
  description?: string;
  price?: number;
  mrp?: number;
  instructor?: string;
  thumbnail?: string;
  imageUrl?: string;
  examType?: string;
  contentType?: string;
  subcategoryId?: string;
  level1Branch?: string;
  level2Branch?: string;
  subject?: string;
  subjectId?: string;
  boardType?: string;
  categoryId?: string;
  videos?: number;
  tests?: number;
  settings?: {
    markNewBatch?: boolean;
    showTabs?: boolean;
    sortingOrder?: number;
  };
}

interface Subject {
  _id?: string;
  id: string;
  name: string;
  label?: string; // for compatibility with hardcoded list
  icon: string;
  gradient?: string;
  categoryId?: string;
  subcategoryId?: string;
  level1Branch?: string;
  level2Branch?: string;
}

// Helper removed: using imported normalizeSubcategoryId if needed, 
// but this file uses contentTypeConfig keys.

// Helper removed: using imported isCategoryMatch

const contentTypeConfig: Record<string, { label: string; icon: string; gradient: string }> = {
  recorded_batch: { label: 'Recorded Batch', icon: 'play_circle', gradient: 'from-[#303F9F] to-[#1A237E]' },
  live_classroom: { label: 'Live Classroom', icon: 'cast_for_education', gradient: 'from-[#D32F2F] to-[#B71C1C]' },
  crash_course: { label: 'Crash Course', icon: 'bolt', gradient: 'from-[#E65100] to-[#BF360C]' },
  mock_test: { label: 'Mock Test', icon: 'quiz', gradient: 'from-[#2E7D32] to-[#1B5E20]' },
};

const ContentTypeDetail: React.FC = () => {
  const navigate = useNavigate();
  const { contentType } = useParams<{ contentType: string }>();
  const [searchParams] = useSearchParams();
  
  // New Hierarchy Params
  const branchParam = searchParams.get('branch') || '';
  const classParam = searchParams.get('class') || '';
  const categoryIdParam = searchParams.get('categoryId') || '';

  // Legacy Fallbacks
  const examType = searchParams.get('exam') || branchParam;
  const boardType = searchParams.get('board') || branchParam;
  const subjectParam = searchParams.get('subject') || '';
  const categorySource = searchParams.get('category') || '';

  const [courses, setCourses] = useState<Course[]>([]);
  const [dbSubjects, setDbSubjects] = useState<Subject[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>(subjectParam);

  const getStudentId = () => {
    try {
      const data = localStorage.getItem('studentData');
      if (data) {
        const parsed = JSON.parse(data);
        return parsed.id || '';
      }
    } catch { }
    return localStorage.getItem('studentId') || '';
  };
  const studentId = getStudentId();
  const config = contentTypeConfig[contentType || ''] || contentTypeConfig.recorded_batch;

  const subjectsList = dbSubjects.map(s => ({
    id: s.id || s._id || "", // Normalize ID
    label: s.name || s.label || '',
    icon: s.icon
  }));

  useEffect(() => {
    fetchData();
  }, [contentType, examType, boardType, branchParam, classParam]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Build a strict hierarchy query
      let url = '/api/courses?';
      
      // Determine the canonical category ID for query
      let finalCatId = categoryIdParam;
      if (!finalCatId) {
        if (categorySource === '11-12') finalCatId = 'iit-jee';
        else if (examType === 'neet' || examType === 'iit-jee') finalCatId = 'neet-iitjee';
      }

      // If we have a specific category, prioritize it, but allow neet-iitjee fallback for legacy
      if (finalCatId) url += `categoryId=${finalCatId}&`;
      if (branchParam) url += `level1Branch=${branchParam}&`;
      if (classParam) url += `level2Branch=${classParam}&`;
      
      // Safety fallbacks for narrow query optimization
      if (!branchParam && examType) url += `examType=${examType}&`;
      if (!branchParam && boardType) url += `boardType=${boardType}&`;

      const coursesRes = await fetch(url);
      const allCourses: Course[] = await coursesRes.json();
      
      // If no courses found for neet-iitjee, try fetching with neet or iit-jee based on branch context
      // This solves the backend strict categoryId filter issue for alias categories
      if (Array.isArray(allCourses) && allCourses.length === 0 && finalCatId === 'neet-iitjee' && branchParam) {
        const fallbackCatId = (branchParam === 'neet' || branchParam === 'iit-jee') ? branchParam : '';
        if (fallbackCatId) {
          const fallbackUrl = url.replace('categoryId=neet-iitjee', `categoryId=${fallbackCatId}`);
          const fallbackRes = await fetch(fallbackUrl);
          const fallbackCourses = await fallbackRes.json();
          if (Array.isArray(fallbackCourses) && fallbackCourses.length > 0) {
            setCourses(fallbackCourses);
            setLoading(false); // return early after second fetch
            // Proceed to fetch subjects below
          } else {
            setCourses([]);
          }
        } else {
          setCourses([]);
        }
      } else {
        setCourses(Array.isArray(allCourses) ? allCourses : []);
      }

      // FETCH SUBJECTS for this subcategory
      try {
        // Broad Fetch for the category context to perform strict local filtering
        // This handles cases like 'neet' vs 'neet-iitjee' mismatches safely
        let fetchCatId = categoryIdParam || (examType === 'neet' || examType === 'iit-jee' ? 'neet-iitjee' : finalCatId);
        
        // If it's a known multi-category exam, fetch by branch primarily to avoid category mismatch
        let subjUrl = `/api/subjects?`;
        if (examType === 'neet' || examType === 'iit-jee') {
          // Broad fetch for these exams
          if (branchParam) subjUrl += `level1Branch=${branchParam}`;
        } else {
          if (fetchCatId) subjUrl += `categoryId=${fetchCatId}&`;
          if (branchParam) subjUrl += `level1Branch=${branchParam}`;
        }
        if (classParam) subjUrl += `${subjUrl.endsWith('?') || subjUrl.endsWith('&') ? '' : '&'}level2Branch=${classParam}`;

        const subjRes = await fetch(subjUrl);
        const allContextSubjs = await subjRes.json();

        if (Array.isArray(allContextSubjs)) {
          const requestedSub = normalizeSubcategoryId(contentType || "");
          const branchVal = (branchParam || "").toLowerCase();
          const classVal = (classParam || "").toLowerCase();

          // Try strict path match (normalized)
          const exactSubjects = allContextSubjs.filter(s => {
            const subjectSub = normalizeSubcategoryId(s.subcategoryId || "");
            const isExactMatch = !!subjectSub && subjectSub === requestedSub;
            const isGlobal = !s.subcategoryId;

            const matchesBranch = !branchVal || String(s.level1Branch || "").toLowerCase() === branchVal;
            const matchesClass = !classVal || String(s.level2Branch || "").toLowerCase() === classVal;
            
            // Category Match: treat 'neet' and 'iit-jee' as compatible with 'neet-iitjee' context
            const matchesCat = isCategoryMatch(s.categoryId || "", finalCatId || "");

            return (
              (isExactMatch || isGlobal) &&
              matchesBranch &&
              matchesClass &&
              matchesCat
            );
          });

          const hasAnySubcategorySubjects = allContextSubjs.some(s => s.subcategoryId);

          console.log("SUBJECT DEBUG", {
            requestedSub,
            rawUrl: contentType,
            subjectsFromDB: allContextSubjs.map(s => ({
              name: s.name,
              sub: s.subcategoryId
            }))
          });

          if (exactSubjects.length > 0) {
            setDbSubjects(exactSubjects);
          } else if (!hasAnySubcategorySubjects) {
            // legacy mode only
            setDbSubjects(allContextSubjs.filter(s => !s.subcategoryId));
          } else {
            // STRICT: do not fallback to wrong data
            setDbSubjects([]);
          }
        }
      } catch (err) {
        console.error('Error fetching subjects:', err);
      }

      if (studentId) {
        try {
          const enrolledRes = await fetch(`/api/students/${studentId}/courses`, { headers: getAuthHeaders() });
          const enrolled = await enrolledRes.json();
          const ids = Array.isArray(enrolled) ? enrolled.map((c: any) => c.id || c.courseId || c._id) : [];
          setEnrolledCourseIds(ids);
        } catch { }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  const getFilteredCourses = () => {
    // Determine target category ID for local filtering
    let targetCatId = categoryIdParam;
    if (!targetCatId) {
      if (categorySource === '11-12') targetCatId = 'iit-jee';
      else if (examType === 'neet' || examType === 'iit-jee') targetCatId = 'neet-iitjee';
    }

    return courses.filter(c => {
      // 1. Strict-but-Compatible Hierarchy (STOPS LEAKAGE)
      const matchesCat = isCategoryMatch(c, { id: targetCatId });
      if (!matchesCat) return false;

      const cL1 = getCourseLevel1Key(c);
      const pL1 = String(branchParam || "").toLowerCase().trim();
      if (pL1 && cL1 && cL1 !== pL1) return false;

      const cL2 = getCourseLevel2Key(c);
      const pL2 = String(classParam || "").toLowerCase().trim();
      if (pL2 && cL2 && cL2 !== pL2) return false;

      // 2. Primary Subcategory Match (with legacy fallback and normalization)
      const requestedId = normalizeSubcategoryId(contentType || '');
      const courseSubId = normalizeSubcategoryId(c.subcategoryId || '');
      const courseContentType = normalizeSubcategoryId(c.contentType || '');
      
      const matchesSubcategory = (courseSubId === requestedId) || (courseContentType === requestedId);

      if (!matchesSubcategory) return false;

      // 3. Robust Subject Matching
      if (selectedSubject && selectedSubject !== 'all' && selectedSubject !== '') {
        const selectedObj = dbSubjects.find(
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
  };

  const filteredCourses = getFilteredCourses();

  const isEnrolled = (course: Course) => {
    const cId = course.id || course._id || '';
    return enrolledCourseIds.includes(cId);
  };

  const handleBuyNow = (course: Course) => {
    if (!studentId) {
      navigate('/student-login');
      return;
    }
    const cId = course.id || course._id || '';
    navigate(`/checkout/${cId}`);
  };

  const handleViewDetails = (course: Course) => {
    const cId = course.id || course._id || '';
    navigate(`/course/${cId}`);
  };

  const handleEnrollFree = async (course: Course) => {
    if (!studentId) {
      navigate('/student-login');
      return;
    }
    const cId = course.id || course._id || '';
    try {
      await fetch(`/api/students/${studentId}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ courseId: cId }),
      });
      setEnrolledCourseIds(prev => [...prev, cId]);
    } catch { }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className={`bg-gradient-to-br ${config.gradient} text-white pt-6 pb-8 px-4 rounded-b-[2rem] relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-white/20"></div>
          <div className="absolute bottom-0 left-8 w-20 h-20 rounded-full bg-white/10"></div>
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/20 transition-all">
              <span className="material-symbols-rounded">arrow_back</span>
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-black tracking-tight">{config.label}</h1>
              <p className="text-white/60 text-xs mt-0.5">
                {branchParam ? branchParam.toUpperCase() : examType ? examType.toUpperCase() : boardType ? boardType.toUpperCase() : ''}
                {classParam ? ` | ${classParam}` : ''}
                {categorySource === '11-12' ? ' | 11th-12th' : ''}
              </p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="material-symbols-rounded text-white text-2xl">{config.icon}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 mt-2">
            <span className="material-symbols-rounded text-white/70 text-sm">school</span>
            <span className="text-white/80 text-xs font-medium">{loading ? '...' : `${filteredCourses.length} ${filteredCourses.length === 1 ? 'Course' : 'Courses'} Available`}</span>
          </div>
        </div>
      </header>

      <main className="px-4 -mt-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="material-symbols-rounded text-[#303F9F] text-sm">filter_list</span>
            Filter by Subject
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {subjectsList.map(subj => (
              <button
                key={subj.id}
                onClick={() => setSelectedSubject(selectedSubject === subj.id ? '' : subj.id)}
                className={`py-2 rounded-xl text-center transition-all active:scale-95 flex flex-col items-center gap-0.5 ${selectedSubject === subj.id
                    ? `bg-gradient-to-br ${config.gradient} text-white shadow-md`
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100'
                  }`}
              >
                <span className="material-symbols-rounded text-base">{subj.icon}</span>
                <span className="text-[9px] font-bold">{subj.label}</span>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-2xl h-64 w-full"></div>
            ))}
          </div>
        ) : filteredCourses.length > 0 ? (
          <div className="space-y-4">
            {filteredCourses.map((course, index) => {
              const cId = course.id || course._id || '';
              const courseName = course.name || course.title || 'Course';
              const coursePrice = course.price || 0;
              const isFree = coursePrice === 0;
              const enrolled = isEnrolled(course);
              const discount = course.mrp && course.mrp > coursePrice
                ? Math.round(((course.mrp - coursePrice) / course.mrp) * 100)
                : 0;

              return (
                <div
                  key={cId || index}
                  className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_15px_rgba(0,0,0,0.06)] border border-gray-100 hover:shadow-[0_4px_25px_rgba(0,0,0,0.1)] transition-all"
                >
                  <div className={`h-36 bg-gradient-to-br ${config.gradient} flex items-center justify-center relative overflow-hidden`}>
                    {course.settings?.markNewBatch && (
                      <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-red-600 text-white text-[8px] font-black uppercase tracking-widest rounded-lg shadow-lg border border-white/20 animate-pulse">
                        NEW BATCH
                      </div>
                    )}
                    {(course.imageUrl || course.thumbnail) ? (
                      <img
                        src={getImageUrl(course.imageUrl || course.thumbnail)}
                        alt={courseName}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <>
                        <div className="absolute inset-0 opacity-10">
                          <div className="absolute top-2 right-6 w-24 h-24 rounded-full bg-white/30"></div>
                          <div className="absolute bottom-0 left-4 w-16 h-16 rounded-full bg-white/20"></div>
                        </div>
                        <span className="material-symbols-rounded text-white/20 text-7xl">{config.icon}</span>
                      </>
                    )}
                    {enrolled && (
                      <span className="absolute top-3 right-3 flex items-center gap-1 bg-green-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg z-20">
                        <span className="material-symbols-rounded text-xs">check_circle</span>
                        ENROLLED
                      </span>
                    )}
                    {!enrolled && discount > 0 && (
                      <span className="absolute top-3 left-3 bg-[#D32F2F] text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg z-20">
                        {discount}% OFF
                      </span>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/40 to-transparent z-10"></div>
                  </div>

                  <div className="p-4">
                    <h4 className="text-base font-bold text-gray-800 leading-tight line-clamp-2">{courseName}</h4>

                    {course.description && (
                      <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{course.description.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ')}</p>
                    )}

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {course.instructor && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <span className="material-symbols-rounded text-xs">person</span>
                          {course.instructor}
                        </span>
                      )}
                      {course.subject && (
                        <span className="bg-blue-50 text-[#303F9F] text-[9px] font-bold px-2 py-0.5 rounded-full capitalize">{course.subject}</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                      <div>
                        {isFree ? (
                          <span className="text-lg font-black text-green-600">Free</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-black text-[#1A237E]">₹{coursePrice}</span>
                            {course.mrp && course.mrp > coursePrice && (
                              <span className="text-xs text-gray-400 line-through">₹{course.mrp}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetails(course)}
                          className="px-4 py-2 rounded-xl text-xs font-bold border-2 border-[#1A237E] text-[#1A237E] hover:bg-[#1A237E]/5 active:scale-95 transition-all"
                        >
                          View Details
                        </button>
                        {enrolled ? (
                          <button
                            onClick={() => handleViewDetails(course)}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-green-500 text-white active:scale-95 transition-all shadow-md"
                          >
                            Continue
                          </button>
                        ) : isFree ? (
                          <button
                            onClick={() => handleEnrollFree(course)}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#2E7D32] to-[#1B5E20] text-white active:scale-95 transition-all shadow-md"
                          >
                            Enroll Free
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBuyNow(course)}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#D32F2F] to-[#B71C1C] text-white active:scale-95 transition-all shadow-md"
                          >
                            Buy Now
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-rounded text-5xl text-gray-200">{config.icon}</span>
            </div>
            <p className="text-sm font-bold text-gray-500">No courses available yet</p>
            <p className="text-xs text-gray-400 mt-1.5">Courses will be added soon!</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default ContentTypeDetail;
