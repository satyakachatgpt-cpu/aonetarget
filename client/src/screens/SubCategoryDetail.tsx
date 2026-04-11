import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { coursesAPI } from '../services/apiClient';
import { getImageUrl } from '../lib/utils';

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
  discount?: string;
  type?: string;
  category?: string;
  subcategory?: string;
  subcategoryId?: string;
  categoryId?: string;
  enrollments?: number;
  students?: number;
  studentsEnrolled?: number;
  videos?: number;
  tests?: number;
  isLive?: boolean;
  status?: string;
  settings?: {
    markNewBatch?: boolean;
    showTabs?: boolean;
    sortingOrder?: number;
  };
}

interface ContentItem {
  id: string;
  title?: string;
  name?: string;
  isFree?: boolean;
  duration?: string;
  youtubeUrl?: string;
  videoUrl?: string;
  questions?: any;
  status?: string;
}

const SubCategoryDetail: React.FC = () => {
  const navigate = useNavigate();
  const { categoryId, subId } = useParams<{ categoryId: string; subId: string }>();
  const [searchParams] = useSearchParams();
  const label = searchParams.get('label') || 'Course Details';
  const [activeTab, setActiveTab] = useState<'all' | 'recorded' | 'live'>('all');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [courseContent, setCourseContent] = useState<Record<string, { videos: ContentItem[]; tests: ContentItem[] }>>({});

  const getStudentId = () => {
    try {
      const data = localStorage.getItem('studentData');
      return data ? JSON.parse(data).id : '';
    } catch { return ''; }
  };
  const studentId = getStudentId();

  useEffect(() => {
    loadContent();
  }, [categoryId, subId]);

  const loadContent = async () => {
    try {
      setLoading(true);
      const coursesRes = await coursesAPI.getAll().catch(() => []);
      const allCourses = Array.isArray(coursesRes) ? coursesRes : [];
      setCourses(allCourses);

      if (studentId) {
        try {
          const enrolledRes = await fetch(`/api/students/${studentId}/courses`).then(r => r.json()).catch(() => []);
          const ids = Array.isArray(enrolledRes) ? enrolledRes.map((c: any) => c.id) : [];
          setEnrolledCourseIds(ids);
        } catch { }
      }

      // Strict Batch Filtering: Only show courses that match subId AND (guest or student-enrolled)
      const matchingCourses = allCourses.filter((c: Course) => {
        const matchesSub = c.subcategoryId === subId;
        if (!matchesSub) return false;
        
        if (studentId) {
          return enrolledCourseIds.includes(c.id || '') || enrolledCourseIds.includes(c._id || '');
        }
        return true; // Guest sees all (explore mode)
      });

      const contentMap: Record<string, { videos: ContentItem[]; tests: ContentItem[] }> = {};
      await Promise.all(matchingCourses.slice(0, 10).map(async (course: Course) => {
        const cId = course.id || course._id;
        if (!cId) return;
        try {
          const [vRes, tRes] = await Promise.all([
            fetch(`/api/courses/${cId}/videos`).then(r => r.json()).catch(() => []),
            fetch(`/api/courses/${cId}/tests`).then(r => r.json()).catch(() => [])
          ]);
          contentMap[cId] = {
            videos: Array.isArray(vRes) ? vRes : [],
            tests: Array.isArray(tRes) ? tRes.filter((t: any) => !t.status || t.status === 'active') : []
          };
        } catch { }
      }));
      setCourseContent(contentMap);
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGradient = () => {
    const l = label.toLowerCase();
    if (l.includes('neet')) return 'from-[#303F9F] to-[#1A237E]';
    if (l.includes('iit') || l.includes('jee')) return 'from-[#D32F2F] to-[#B71C1C]';
    if (l.includes('nursing')) return 'from-teal-500 to-emerald-600';
    if (l.includes('11') || l.includes('12')) return 'from-indigo-600 to-violet-700';
    if (l.includes('9') || l.includes('10')) return 'from-[#1A237E] to-[#303F9F]';
    return 'from-[#303F9F] to-[#1A237E]';
  };

  const filteredCourses = courses.filter(c => {
    const matchesSub = c.subcategoryId === subId;
    if (!matchesSub) return false;
    if (activeTab === 'recorded') return c.type === 'recorded' || (!c.type && !c.isLive);
    if (activeTab === 'live') return c.type === 'live' || c.isLive;
    return true;
  });

  const allMatchingCourses = courses.filter(c => c.subcategoryId === subId);
  const recordedCount = allMatchingCourses.filter(c => c.type === 'recorded' || (!c.type && !c.isLive)).length;
  const liveCount = allMatchingCourses.filter(c => c.type === 'live' || c.isLive).length;

  const tabs = [
    { id: 'all' as const, label: 'All Courses', icon: 'apps', count: allMatchingCourses.length },
    { id: 'recorded' as const, label: 'Recorded', icon: 'play_circle', count: recordedCount },
    { id: 'live' as const, label: 'Live', icon: 'cast_for_education', count: liveCount },
  ];

  const isEnrolled = (course: Course) => {
    const cId = course.id || course._id || '';
    return enrolledCourseIds.includes(cId);
  };

  const getContentSummary = (course: Course) => {
    const cId = course.id || course._id || '';
    const content = courseContent[cId];
    if (!content) return { freeVideos: 0, totalVideos: 0, freeTests: 0, totalTests: 0 };
    return {
      freeVideos: content.videos.filter(v => v.isFree).length,
      totalVideos: content.videos.length,
      freeTests: content.tests.filter(t => t.isFree).length,
      totalTests: content.tests.length
    };
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-gray-50 pb-20">
      <div className={`bg-gradient-to-br ${getGradient()} relative`}>
        <div className="pt-6 pb-16 px-4">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/20 text-white transition-all">
              <span className="material-symbols-rounded">arrow_back</span>
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-black text-white tracking-tight truncate">{label}</h1>
              <p className="text-white/60 text-xs mt-0.5">Aone Target Institute</p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-2xl p-5 flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-rounded text-white text-3xl">school</span>
            </div>
            <div className="text-white">
              <h2 className="text-base font-bold">{label.split(' - ').pop()}</h2>
              <div className="flex items-center gap-3 mt-2 text-[10px]">
                <span className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full">
                  <span className="material-symbols-rounded text-xs">menu_book</span>
                  {allMatchingCourses.length} Courses
                </span>
                {liveCount > 0 && (
                  <span className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full">
                    <span className="material-symbols-rounded text-xs">live_tv</span>
                    {liveCount} Live
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-10 bg-white shadow-sm -mt-6 mx-4 rounded-2xl border border-gray-100">
        <div className="flex">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-4 text-center flex flex-col items-center gap-1 transition-all relative ${
                activeTab === tab.id ? 'text-[#303F9F]' : 'text-gray-400'
              }`}
            >
              <span className="material-symbols-rounded text-lg">{tab.icon}</span>
              <span className="text-[10px] font-bold">{tab.label}</span>
              {tab.count > 0 && (
                <span className={`absolute top-2 right-3 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center ${
                  tab.id === 'live' ? 'bg-[#D32F2F]' : 'bg-[#303F9F]'
                }`}>
                  {tab.count}
                </span>
              )}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-[#303F9F] rounded-full"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      <main className="px-4 mt-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="material-symbols-rounded animate-spin text-4xl text-[#303F9F]">progress_activity</span>
          </div>
        ) : (
          <>
            {filteredCourses.length > 0 ? (
              <div className="space-y-4">
                {filteredCourses.map((course, idx) => {
                  const cId = course.id || course._id || '';
                  const enrolled = isEnrolled(course);
                  const summary = getContentSummary(course);
                  const courseName = course.name || course.title || 'Course';
                  const coursePrice = course.price || 0;
                  const isFree = coursePrice === 0;

                  return (
                    <div
                      key={cId || idx}
                      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                    >
                      <div className="relative">
                        <div className={`w-full h-36 bg-gradient-to-br ${getGradient()} flex items-center justify-center relative`}>
                          {course.settings?.markNewBatch && (
                            <div className="absolute top-2 left-2 z-10 px-2.5 py-1 bg-red-600 text-white text-[8px] font-black uppercase tracking-widest rounded-lg shadow-lg border border-white/20 animate-pulse">
                              NEW BATCH
                            </div>
                          )}
                          {(course.imageUrl || course.thumbnail) ? (
                            <img src={getImageUrl(course.imageUrl || course.thumbnail)} alt="" className="w-full h-full object-cover" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          ) : (
                            <span className="text-white text-4xl font-bold opacity-30">{courseName.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        {(course.type === 'live' || course.isLive) && (
                          <span className="absolute top-3 left-3 flex items-center gap-1 bg-[#D32F2F] text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                            LIVE
                          </span>
                        )}
                        {course.type === 'recorded' && (
                          <span className="absolute top-3 left-3 flex items-center gap-1 bg-[#1A237E] text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg">
                            <span className="material-symbols-rounded text-xs">play_circle</span>
                            RECORDED
                          </span>
                        )}
                        {enrolled && (
                          <span className="absolute top-3 right-3 flex items-center gap-1 bg-green-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg">
                            <span className="material-symbols-rounded text-xs">check_circle</span>
                            ENROLLED
                          </span>
                        )}
                      </div>

                      <div className="p-4">
                        <h3 className="text-sm font-bold text-[#1A237E] line-clamp-2 leading-tight">{courseName}</h3>

                        {course.instructor && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="material-symbols-rounded text-[#303F9F] text-xs">person</span>
                            <span className="text-xs text-gray-500">{course.instructor}</span>
                          </div>
                        )}

                        <p className="text-[11px] text-gray-400 mt-1.5 line-clamp-2">
                          {course.description ? course.description.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').substring(0, 100) : 'Complete preparation course'}
                        </p>

                        <div className="flex flex-wrap gap-2 mt-3">
                          {summary.totalVideos > 0 && (
                            <div className="flex items-center gap-1 bg-blue-50 text-[#303F9F] text-[10px] font-bold px-2 py-1 rounded-lg">
                              <span className="material-symbols-rounded text-xs">play_circle</span>
                              {summary.totalVideos} Videos
                              {summary.freeVideos > 0 && !enrolled && (
                                <span className="bg-green-500 text-white px-1.5 py-0.5 rounded text-[8px] ml-1">{summary.freeVideos} Free</span>
                              )}
                            </div>
                          )}
                          {summary.totalTests > 0 && (
                            <div className="flex items-center gap-1 bg-purple-50 text-purple-600 text-[10px] font-bold px-2 py-1 rounded-lg">
                              <span className="material-symbols-rounded text-xs">quiz</span>
                              {summary.totalTests} Tests
                              {summary.freeTests > 0 && !enrolled && (
                                <span className="bg-green-500 text-white px-1.5 py-0.5 rounded text-[8px] ml-1">{summary.freeTests} Free</span>
                              )}
                            </div>
                          )}
                          {(summary.totalVideos === 0 && summary.totalTests === 0) && (
                            <span className="text-[10px] text-gray-400">Content coming soon</span>
                          )}
                        </div>

                        {!enrolled && (summary.freeVideos > 0 || summary.freeTests > 0) && (
                          <div className="mt-3 bg-green-50 rounded-xl p-2.5 border border-green-100">
                            <p className="text-[10px] text-green-700 font-bold flex items-center gap-1">
                              <span className="material-symbols-rounded text-xs">visibility</span>
                              Free Preview Available
                              {summary.freeVideos > 0 && <span>- {summary.freeVideos} Video{summary.freeVideos > 1 ? 's' : ''}</span>}
                              {summary.freeTests > 0 && <span>- {summary.freeTests} Test{summary.freeTests > 1 ? 's' : ''}</span>}
                            </p>
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                          <div className="flex items-baseline gap-2">
                            <span className="text-lg font-black text-[#1A237E]">
                              {isFree ? 'Free' : `₹${coursePrice}`}
                            </span>
                            {course.mrp && course.mrp > coursePrice && (
                              <span className="text-xs text-gray-400 line-through">₹{course.mrp}</span>
                            )}
                            {course.mrp && course.mrp > coursePrice && (
                              <span className="bg-green-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">
                                {Math.round(((course.mrp - coursePrice) / course.mrp) * 100)}% OFF
                              </span>
                            )}
                          </div>
                          {enrolled ? (
                            <button
                              onClick={() => navigate(`/course/${cId}`)}
                              className="px-5 py-2.5 bg-green-600 text-white text-xs font-bold rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-1"
                            >
                              <span className="material-symbols-rounded text-sm">play_circle</span>
                              Continue
                            </button>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => navigate(`/course/${cId}`)}
                                className="px-3 py-2.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl active:scale-95 transition-all"
                              >
                                Details
                              </button>
                              <button
                                onClick={() => {
                                  if (!studentId) {
                                    navigate('/student-login');
                                    return;
                                  }
                                  if (isFree) {
                                    fetch(`/api/students/${studentId}/enroll`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ courseId: cId })
                                    }).then(r => r.json()).then(data => {
                                      if (data.error && !data.error.includes('Already')) {
                                        alert(data.error);
                                      } else {
                                        setEnrolledCourseIds(prev => [...prev, cId]);
                                      }
                                    });
                                  } else {
                                    navigate(`/checkout/${cId}`);
                                  }
                                }}
                                className={`px-5 py-2.5 text-white text-xs font-bold rounded-xl shadow-md active:scale-95 transition-all ${
                                  isFree ? 'bg-green-600' : 'bg-gradient-to-r from-[#303F9F] to-[#1A237E]'
                                }`}
                              >
                                {isFree ? 'Enroll Free' : 'Buy Now'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-rounded text-5xl text-gray-200">
                    {activeTab === 'live' ? 'cast_for_education' : activeTab === 'recorded' ? 'play_circle' : 'school'}
                  </span>
                </div>
                <p className="text-sm font-bold text-gray-500">
                  {activeTab === 'live' ? 'No live courses available' : activeTab === 'recorded' ? 'No recorded courses available' : 'No courses available yet'}
                </p>
                <p className="text-xs text-gray-400 mt-1.5 max-w-xs mx-auto">
                  Courses will be added soon. Check back later!
                </p>
                {activeTab !== 'all' && (
                  <button
                    onClick={() => setActiveTab('all')}
                    className="mt-4 px-5 py-2 bg-[#303F9F]/10 text-[#303F9F] text-xs font-bold rounded-full"
                  >
                    View All Courses
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default SubCategoryDetail;
