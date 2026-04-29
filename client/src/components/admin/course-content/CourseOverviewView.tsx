import React from 'react';

interface CourseOverviewViewProps {
  course: any;
  showFullDesc: boolean;
  setShowFullDesc: (v: boolean) => void;
  isPublished: boolean;
  onEdit: () => void;
}

const CourseOverviewView: React.FC<CourseOverviewViewProps> = ({
  course,
  showFullDesc,
  setShowFullDesc,
  isPublished,
  onEdit
}) => {
  return (
    <div className="p-6 max-w-[1200px] mx-auto animate-fade-in transition-all">
      <div className="bg-white rounded-[24px] border border-[#f0f1f3] shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="p-8 flex items-start gap-8">
          {/* Course Thumbnail */}
          <div className="w-[180px] h-[120px] bg-[#f8fafc] rounded-2xl overflow-hidden border border-[#f1f5f9] shrink-0 shadow-sm relative group">
            {(course.thumbnail || (course as any).imageUrl) ? (
              <img
                src={course.thumbnail || (course as any).imageUrl}
                alt=""
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  (e.currentTarget.nextSibling as HTMLElement)?.style.setProperty('display', 'flex');
                }}
              />
            ) : null}
            <div
              className="w-full h-full flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50"
              style={{ display: (course.thumbnail || (course as any).imageUrl) ? 'none' : 'flex' }}
            >
              <span className="material-symbols-outlined text-blue-400 text-[40px]">school</span>
              <span className="text-[10px] font-black text-blue-500 mt-2 uppercase tracking-widest">No Image</span>
            </div>
          </div>

          {/* Course Details */}
          <div className="flex-1 space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-1.5">
                <h2 className="text-[24px] font-black text-[#111827] tracking-tight leading-tight">
                  {course.name || course.title}
                </h2>
                <p className="text-[15px] font-bold text-[#64748b] tracking-tight">
                  {course.title || course.name} - Live Classes!
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span className="text-[22px] font-black text-[#111827]">₹{course.price}</span>
                    {course.originalPrice && (
                      <>
                        <span className="text-[14px] font-bold text-[#94a3b8] line-through decoration-2">₹{course.originalPrice}</span>
                        <span className="text-[14px] font-black text-[#22c55e] uppercase tracking-wide">
                          {Math.round((1 - (Number(course.price) / Number(course.originalPrice))) * 100)}% OFF
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-[14px] font-medium text-[#475569] leading-relaxed max-w-[800px]">
                <p className={showFullDesc ? "" : "line-clamp-2"}>
                  {course.description ?
                    course.description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ') :
                    "Complete course management with videos, notes, and tests integrated into one bundle. This course is designed to provide comprehensive learning."
                  }
                </p>
                <button
                  onClick={() => setShowFullDesc(!showFullDesc)}
                  className="text-[#6366f1] font-bold mt-2 hover:text-[#4f46e5] transition-colors"
                >
                  {showFullDesc ? "Show less" : "Show more"}
                </button>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <span className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest shadow-sm ${isPublished ? 'bg-[#f0fdf4] text-[#16a34a] border border-[#dcfce7]' : 'bg-[#fff7ed] text-[#ea580c] border border-[#ffedd5]'}`}>
                  {isPublished ? 'Published' : 'Draft'}
                </span>
                <button
                  onClick={onEdit}
                  className="flex items-center gap-2 px-6 py-2 border border-[#e2e8f0] rounded-xl text-[13px] font-bold text-[#475569] hover:bg-[#f8fafc] hover:border-[#cbd5e1] transition-all duration-200 shadow-sm active:scale-95 ml-auto relative z-20 cursor-pointer">
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(CourseOverviewView);
