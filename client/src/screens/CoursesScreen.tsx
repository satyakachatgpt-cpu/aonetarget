import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { coursesAPI } from '../services/apiClient';
import { getImageUrl } from '../lib/utils';

const CoursesScreen: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const studentData = localStorage.getItem('studentData');
  const student = studentData ? JSON.parse(studentData) : null;

  const categories = [
    { key: 'all', label: 'All Courses' },
    { key: 'neet', label: 'NEET' },
    { key: 'jee', label: 'IIT-JEE' },
    { key: 'foundation', label: 'Foundation' },
    { key: 'boards', label: 'Boards' }
  ];

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const [allCourses, enrolledCoursesRes] = await Promise.all([
        coursesAPI.getAll(),
        student?.id ? fetch(`/api/students/${student.id}/courses`).then(r => r.json()) : Promise.resolve([])
      ]);
      
      const enrolled = Array.isArray(enrolledCoursesRes) ? enrolledCoursesRes : [];
      
      setCourses(Array.isArray(allCourses) ? allCourses : []);
      setEnrolledCourses(Array.isArray(enrolled) ? enrolled : []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const enrolledCourseIds = enrolledCourses.map(c => c.id);

  const filteredCourses = courses.filter(course => {
    const matchesCategory = activeCategory === 'all' || 
      course.category?.toLowerCase().includes(activeCategory) ||
      course.name?.toLowerCase().includes(activeCategory);
    const matchesSearch = !searchQuery || 
      course.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.title?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-brandBlue text-white pt-6 pb-4 px-4 sticky top-0 z-40">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/20">
            <span className="material-symbols-rounded">arrow_back</span>
          </button>
          <h1 className="text-lg font-bold">Our Courses</h1>
        </div>

        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="material-symbols-rounded text-gray-400">search</span>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search courses..."
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 text-white placeholder-blue-200 focus:outline-none focus:bg-white/20"
          />
        </div>
      </header>

      <div className="px-4 py-4 overflow-x-auto">
        <div className="flex gap-2 whitespace-nowrap">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                activeCategory === cat.key
                  ? 'bg-brandBlue text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <main className="px-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="material-symbols-rounded animate-spin text-4xl text-brandBlue">progress_activity</span>
          </div>
        ) : (
          <>
            {enrolledCourses.length > 0 && (
              <section className="mb-6">
                <h2 className="text-lg font-bold mb-3">My Enrolled Courses</h2>
                <div className="space-y-3">
                  {enrolledCourses.map((course, idx) => (
                    <div
                      key={`enrolled-${idx}`}
                      onClick={() => navigate(`/course/${course.id}`)}
                      className="bg-white rounded-xl p-4 shadow-sm flex gap-4 cursor-pointer active:scale-[0.98] transition-transform"
                    >
                      <div className="w-20 h-20 bg-gradient-to-br from-brandBlue to-[#1A237E] rounded-xl shrink-0 flex items-center justify-center overflow-hidden">
                        {course.thumbnail ? (
                          <img src={getImageUrl(course.thumbnail)} alt={course.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-rounded text-white text-3xl">play_circle</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-sm">{course.name || course.title}</h3>
                        <p className="text-[10px] text-gray-400">{course.instructor || 'Instructor'}</p>
                        <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-500">
                          <span>{course.videos || 0} Videos</span>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${course.progress || 30}%` }}></div>
                          </div>
                          <span className="text-[10px] font-bold text-gray-500">{course.progress || 30}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-lg font-bold mb-3">Recommended For You</h2>
              {filteredCourses.filter(c => !enrolledCourseIds.includes(c.id)).length > 0 ? (
                <div className="grid gap-4">
                  {filteredCourses.filter(c => !enrolledCourseIds.includes(c.id)).map((course, idx) => (
              <div
                key={idx}
                onClick={() => navigate(`/course/${course.id}`)}
                className="bg-white rounded-2xl shadow-sm overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
              >
                <div className="h-32 bg-gradient-to-br from-brandBlue to-[#1A237E] relative">
                  {course.thumbnail && (
                    <img src={getImageUrl(course.thumbnail)} alt={course.name} className="w-full h-full object-cover opacity-50" />
                  )}
                  <div className="absolute inset-0 p-4 flex flex-col justify-end">
                    <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-1 rounded w-fit uppercase">
                      {course.category || 'NEET'}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-sm">{course.name || course.title}</h3>
                  <p className="text-[10px] text-gray-400 mt-1 line-clamp-2">{course.description || 'Complete preparation course'}</p>
                  
                  <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-rounded text-sm">play_circle</span>
                      {course.videos || 0} Videos
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-rounded text-sm">description</span>
                      {course.notes || 0} Notes
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-rounded text-sm">quiz</span>
                      {course.tests || 0} Tests
                    </span>
                  </div>

                  <div className="flex justify-between items-center mt-4">
                    <div>
                      {course.originalPrice && (
                        <span className="text-gray-400 line-through text-[10px] mr-2">₹{course.originalPrice}</span>
                      )}
                      <span className="font-black text-brandBlue">₹{course.price || 'Free'}</span>
                    </div>
                    <button className="bg-brandBlue text-white px-4 py-2 rounded-lg text-[10px] font-bold flex items-center gap-1">
                      View Details
                      <span className="material-symbols-rounded text-sm">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <span className="material-symbols-rounded text-6xl text-gray-300">school</span>
                  <p className="text-gray-400 mt-4">No courses found</p>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default CoursesScreen;
