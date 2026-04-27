import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { coursesAPI } from '../services/apiClient';
import { getImageUrl } from '../lib/utils';
import { Course } from '../types';

const categoryGradients: string[] = [
  'from-[#1A237E] to-[#303F9F]',
  'from-[#C62828] to-[#D32F2F]',
  'from-[#00695C] to-[#00897B]',
  'from-[#4A148C] to-[#7B1FA2]',
  'from-[#E65100] to-[#F57C00]',
  'from-[#1565C0] to-[#1E88E5]',
];

const Batches: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const data = await coursesAPI.getAll();
        const coursesList = Array.isArray(data) ? data : [];
        
        // Final numeric sort fallback
        const sorted = [...coursesList].sort((a, b) => {
          const orderA = a.settings?.sortingOrder ?? 9999;
          const orderB = b.settings?.sortingOrder ?? 9999;
          return Number(orderA) - Number(orderB);
        });
        
        setCourses(sorted);
      } catch (error) {
        console.error('Failed to fetch batches:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  const filteredCourses = courses.filter(course => 
    (course.name || course.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (course.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (course.category || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f5f6f8] pb-24 animate-fade-in">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="px-4 h-[64px] flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <span className="material-symbols-rounded text-gray-700">arrow_back</span>
          </button>
          <div className="flex-1">
            <h1 className="text-[17px] font-bold text-gray-900 tracking-tight">All Batches</h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">Enroll & Start Learning</p>
          </div>
          <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors">
            <span className="material-symbols-rounded text-gray-700">filter_list</span>
          </button>
        </div>
      </header>

      {/* Search Bar */}
      <div className="p-4 bg-white border-b border-gray-100">
        <div className="relative group">
          <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[20px] group-focus-within:text-primary transition-colors">search</span>
          <input 
            type="text"
            placeholder="Search for batches..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-[14px] font-medium outline-none focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all placeholder:text-gray-400"
          />
        </div>
      </div>

      <main className="p-4 space-y-6">
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="aspect-[1.7/1] rounded-2xl skeleton" />
            ))}
          </div>
        ) : filteredCourses.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {filteredCourses.map((course, i) => {
              const bgGrad = categoryGradients[i % categoryGradients.length];
              const hasImage = !!(course.imageUrl || course.thumbnail);
              const batchName = course.title || course.name;
              
              return (
                <div 
                  key={course._id || course.id}
                  onClick={() => navigate(`/course/${course._id || course.id}`)}
                  className="w-full aspect-[1.6/1] rounded-[1.5rem] overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all duration-300 relative group"
                >
                  {(() => {
                    const studentData = localStorage.getItem('studentData');
                    const student = studentData ? JSON.parse(studentData) : null;
                    const isEnrolled = student?.enrolledCourses?.some((ec: any) => 
                      String(ec) === String(course.id) || String(ec) === String(course._id)
                    );

                    return hasImage ? (
                      <div className="w-full h-full relative">
                        {course.settings?.markNewBatch && (
                          <div className="absolute top-3 left-3 z-30 px-2.5 py-1 bg-gradient-to-r from-orange-600 to-red-600 text-white text-[9px] font-black uppercase tracking-[0.1em] rounded-full shadow-lg border border-white/20 animate-pulse">
                            NEW BATCH
                          </div>
                        )}
                        <img 
                          src={getImageUrl(course.imageUrl || course.thumbnail)} 
                          alt={batchName} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                        <div className="absolute inset-0 p-3 flex flex-col justify-between">
                          <div className="flex justify-between items-start">
                            <span className="inline-block px-2 py-0.5 bg-white/20 backdrop-blur-md rounded-lg text-[8px] text-white font-black uppercase tracking-widest border border-white/10 shadow-sm">
                              {course.category || 'BATCH'}
                            </span>
                            <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20">
                              <span className="material-symbols-rounded text-white text-[14px]">school</span>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-bold text-[13px] text-white leading-tight line-clamp-1 mb-1 drop-shadow-md">
                              {batchName}
                            </h4>
                            {(course.tsCount || 0) > 0 && (
                              <div className="flex items-center gap-1 mb-2">
                                <div className="px-1.5 py-0.5 bg-green-500/90 backdrop-blur-md rounded-md flex items-center gap-1 border border-green-400/30">
                                  <span className="material-symbols-rounded text-white text-[10px]">quiz</span>
                                  <span className="text-white text-[9px] font-black uppercase tracking-wider">Includes {course.tsCount} Test Series</span>
                                </div>
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                               {isEnrolled ? (
                                 <span className="text-[10px] font-black text-yellow-400 drop-shadow-md uppercase tracking-widest flex items-center gap-1">
                                   <span className="material-symbols-rounded text-xs">verified</span>
                                   Enrolled
                                 </span>
                               ) : (
                                 <span className="text-[16px] font-black text-white drop-shadow-md">
                                   {course.price === 0 || !course.price ? 'Free' : `₹${course.price}`}
                                 </span>
                               )}
                               <button className="bg-white text-black text-[9px] font-black px-4 py-2 rounded-xl shadow-lg uppercase tracking-wider active:scale-95 transition-all">
                                 {isEnrolled ? 'Open' : 'Join'}
                               </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${bgGrad} p-4 flex flex-col justify-between relative overflow-hidden`}>
                        {course.settings?.markNewBatch && (
                          <div className="absolute top-3 left-3 z-30 px-2.5 py-1 bg-red-600 text-white text-[9px] font-black uppercase tracking-[0.1em] rounded-full shadow-lg border border-white/20 animate-pulse">
                            NEW BATCH
                          </div>
                        )}
                        {/* Decorative elements */}
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-black/10 rounded-full blur-2xl"></div>
                        
                        <div className="relative z-10 flex justify-between items-start">
                          <span className="inline-block px-2 py-0.5 bg-white/20 backdrop-blur-md rounded-lg text-[8px] text-white font-black uppercase tracking-widest border border-white/10">
                            {course.category || 'BATCH'}
                          </span>
                          <div className="w-7 h-7 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20">
                            <span className="material-symbols-rounded text-white text-[14px]">school</span>
                          </div>
                        </div>
                        
                        <div className="relative z-10">
                          <h4 className="font-bold text-[14px] text-white leading-tight line-clamp-2 drop-shadow-sm">
                            {batchName}
                          </h4>
                          {(course.tsCount || 0) > 0 && (
                            <div className="flex items-center gap-1 mt-2">
                              <div className="px-1.5 py-0.5 bg-white/20 backdrop-blur-md rounded-md flex items-center gap-1 border border-white/10">
                                <span className="material-symbols-rounded text-white text-[10px]">quiz</span>
                                <span className="text-white text-[9px] font-black uppercase tracking-wider">Includes {course.tsCount} Test Series</span>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="relative z-10 flex items-center justify-between">
                           {isEnrolled ? (
                             <span className="text-[10px] font-black text-yellow-400 drop-shadow-md uppercase tracking-widest flex items-center gap-1">
                               <span className="material-symbols-rounded text-xs">verified</span>
                               Enrolled
                             </span>
                           ) : (
                             <span className="text-[17px] font-black text-white drop-shadow-sm">
                               {course.price === 0 || !course.price ? 'Free' : `₹${course.price}`}
                             </span>
                           )}
                           <button className="bg-white text-black text-[9px] font-black px-4 py-2 rounded-xl shadow-lg transition-all active:scale-95 uppercase tracking-wider">
                             {isEnrolled ? 'Open' : 'Join'}
                           </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-300">
            <div className="w-24 h-24 bg-white rounded-[2rem] shadow-xl shadow-primary/5 flex items-center justify-center mb-6">
              <span className="material-symbols-rounded text-gray-200 text-[48px]">inventory_2</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900">No batches found</h3>
            <p className="text-gray-400 text-sm mt-1 max-w-[240px] mx-auto">Try searching with a different keyword or check back later.</p>
            <button 
              onClick={() => setSearchQuery('')}
              className="mt-8 px-8 py-3 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-full shadow-xl shadow-primary/20 active:scale-95 transition-all"
            >
              Clear Search
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Batches;
