import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { categoriesAPI } from '../services/apiClient';
import StudentSidebar from '../components/StudentSidebar';
import CounsellingModal from '../components/CounsellingModal';

interface Category {
  _id?: string;
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  gradient: string;
  description: string;
  tag: string;
  order: number;
  isActive: boolean;
}

const ExploreCourses: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [student, setStudent] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus({ preventScroll: true });
    }
  }, [isSearchOpen]);

  useEffect(() => {
    const storedStudent = localStorage.getItem('studentData');
    if (storedStudent) {
      setStudent(JSON.parse(storedStudent));
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await categoriesAPI.getAll();
        const active = (Array.isArray(data) ? data : []).filter((c: Category) => c.isActive);
        setCategories(active);
        if (active.length === 0) {
          await categoriesAPI.seed();
          const seeded = await categoriesAPI.getAll();
          setCategories((Array.isArray(seeded) ? seeded : []).filter((c: Category) => c.isActive));
        }
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredCategories = categories.filter(cat =>
    (cat.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (cat.subtitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (cat.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-surface-100 pb-24">
      <header className="bg-gradient-to-br from-primary-800 via-primary-600 to-primary-500 text-white pt-6 pb-10 px-4 rounded-b-[2rem] relative overflow-clip transition-all duration-300">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            {!isSearchOpen ? (
              <>
                <button
                  onClick={() => navigate(-1)}
                  className="w-10 h-10 rounded-full glass-dark flex items-center justify-center active:scale-[0.97] transition-all duration-200"
                >
                  <span className="material-symbols-rounded text-xl">arrow_back</span>
                </button>
                <div className="flex-1 animate-fade-in">
                  <h1 className="text-xl font-extrabold tracking-tight">Explore Courses</h1>
                  <p className="text-white/60 text-xs mt-0.5 font-medium">Choose your learning path</p>
                </div>
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="w-10 h-10 rounded-full glass-dark flex items-center justify-center active:scale-[0.97] transition-all duration-200"
                >
                  <span className="material-symbols-rounded text-xl">search</span>
                </button>
              </>
            ) : (
              <div className="flex-1 flex items-center gap-2 animate-slide-in-right">
                <div className="flex-1 relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search courses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-11 bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl px-11 py-2 text-sm font-bold placeholder:text-white/50 outline-none focus:ring-2 focus:ring-white/20 transition-all text-white"
                  />
                  <span className="material-symbols-rounded absolute left-3.5 top-1/2 -translate-y-1/2 text-white/60 text-xl">search</span>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/10"
                    >
                      <span className="material-symbols-rounded text-sm text-white/60">close</span>
                    </button>
                  )}
                </div>
                <button
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSearchQuery('');
                  }}
                  className="px-3 h-11 rounded-2xl glass-dark text-xs font-black uppercase tracking-widest active:scale-[0.97] transition-all"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
            {loading ? (
              [1, 2, 3, 4].map(i => (
                <div key={i} className="flex flex-col items-center gap-2 min-w-[72px]">
                  <div className="w-14 h-14 rounded-2xl skeleton opacity-20" />
                  <div className="w-10 h-2 rounded-full skeleton opacity-20" />
                </div>
              ))
            ) : (
              (searchQuery ? filteredCategories : categories).slice(0, 4).map((cat, i) => (
                <button
                  key={cat.id}
                  onClick={() => navigate(`/explore/${cat.id}`)}
                  className="flex flex-col items-center gap-2 min-w-[72px] animate-fade-in-up active:scale-[0.97] transition-all duration-200"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="w-14 h-14 glass rounded-2xl flex items-center justify-center hover:bg-white/30 transition-all duration-200 shadow-glass">
                    <span className="material-symbols-rounded text-2xl text-white">{cat.icon}</span>
                  </div>
                  <span className="text-[10px] font-bold text-white/90">{cat.title}</span>
                </button>
              ))
            )}
            {!loading && searchQuery && filteredCategories.length === 0 && (
              <div className="py-2 px-2 text-white/60 text-[10px] font-bold italic animate-fade-in">No categories found...</div>
            )}
          </div>
        </div>
      </header>

      <main className="px-5 mt-6 relative z-10 space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1.5 h-7 bg-gradient-to-b from-primary-600 to-primary-400 rounded-full shadow-sm" />
          <h2 className="text-[16px] font-extrabold text-gray-800 uppercase tracking-widest">
            {searchQuery ? `Found ${filteredCategories.length} Results` : 'Select Your Stream'}
          </h2>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 rounded-3xl skeleton" />
            ))}
          </div>
        ) : (
          filteredCategories.map((cat, i) => (
            <button
              key={cat.id}
              onClick={() => navigate(`/explore/${cat.id}`)}
              className="w-full card-premium p-4 flex items-center gap-4 active:scale-[0.97] transition-all duration-200 text-left animate-fade-in-up group"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className={`w-16 h-16 bg-gradient-to-br ${cat.gradient} rounded-3xl flex items-center justify-center flex-shrink-0 shadow-card group-hover:shadow-elevated transition-all duration-200 group-hover:scale-105`}>
                <span className="material-symbols-rounded text-white text-3xl">{cat.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-bold text-gray-800 line-clamp-1">{cat.title}</h3>
                  {cat.tag && (
                    <span className="bg-accent-50 text-accent-500 text-[8px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wide">{cat.tag}</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 font-medium mt-0.5 line-clamp-1">{cat.subtitle}</p>
                <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">{cat.description}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-surface-200 flex items-center justify-center group-hover:bg-primary-50 transition-all duration-200">
                <span className="material-symbols-rounded text-gray-400 text-lg group-hover:text-primary-600 transition-colors duration-200">chevron_right</span>
              </div>
            </button>
          ))
        )}

        {!loading && filteredCategories.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-rounded text-gray-300 text-5xl">inventory_2</span>
            </div>
            <p className="text-gray-500 font-bold">No results found for "{searchQuery}"</p>
            <p className="text-gray-400 text-[10px] mt-1 italic">Try searching with a different keyword</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setIsSearchOpen(false);
              }}
              className="mt-6 text-xs font-black text-primary-600 uppercase tracking-widest bg-primary-50 px-6 py-2.5 rounded-xl active:scale-95 transition-all"
            >
              View All Courses
            </button>
          </div>
        )}

        {!loading && filteredCategories.length > 0 && (
          <div className="card-premium p-4 mt-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100/60 animate-fade-in-up" style={{ animationDelay: `${filteredCategories.length * 60 + 100}ms` }}>
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-rounded text-amber-600 text-2xl">lightbulb</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-800">Not sure which course to pick?</p>
                <p className="text-xs text-amber-600/80 mt-1 leading-relaxed">Contact us for free career counselling and expert guidance!</p>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="mt-3 text-xs font-bold text-amber-700 bg-amber-200/60 px-4 py-2 rounded-xl active:scale-[0.97] transition-all duration-200 flex items-center gap-1.5 hover:bg-amber-200"
                >
                  <span className="material-symbols-rounded text-sm">support_agent</span>
                  Get Free Counselling
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <StudentSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        student={student}
      />

      <CounsellingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        student={student}
        showToast={showToast}
        categories={categories}
      />

      {toast && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl animate-slide-in-bottom flex items-center gap-3 border backdrop-blur-md ${toast.type === 'success' ? 'bg-green-500/90 border-green-400 text-white' : 'bg-red-500/90 border-red-400 text-white'}`}>
          <span className="material-symbols-rounded text-xl">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
          <span className="text-xs font-bold whitespace-nowrap">{toast.msg}</span>
        </div>
      )}
    </div>
  );
};

export default ExploreCourses;
