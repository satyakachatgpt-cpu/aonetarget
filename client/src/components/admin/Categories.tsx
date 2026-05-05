import React, { useState, useEffect } from 'react';
import { categoriesAPI, subcategoriesAPI, subjectsAPI } from '../../services/apiClient';
import FileUploadButton from '../shared/FileUploadButton';
import Subjects from './misc/Subjects';
import AddCategoryDrawer from './AddCategoryDrawer';
import AddSubcategoryDrawer from './AddSubcategoryDrawer';
import AddSubjectDrawer from './AddSubjectDrawer';

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
  imageUrl?: string;
  hierarchyMode?: 'simple' | 'exam-branch' | 'board-class';
  branchesL1?: { label: string; slug: string }[];
  branchesL2?: { label: string; slug: string }[];
  level1Label?: string;
  level2Label?: string;
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
  imageUrl?: string;
  level1Branch?: string;
  level2Branch?: string;
}

interface Subject {
  _id?: string;
  id: string;
  name: string;
  course: string;
  icon: string;
  gradient?: string;
  status: 'active' | 'inactive';
  createdDate: string;
  categoryId?: string;
  level1Branch?: string;
  level2Branch?: string;
}

interface Props {
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const gradientOptions = [
  'from-blue-600 to-indigo-700',
  'from-orange-500 to-red-600',
  'from-teal-500 to-emerald-600',
  'from-purple-500 to-violet-600',
  'from-pink-500 to-rose-600',
  'from-cyan-500 to-blue-600',
  'from-amber-500 to-orange-600',
  'from-green-500 to-teal-600',
];

const colorOptions = [
  'bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-orange-500',
  'bg-purple-500', 'bg-teal-500', 'bg-amber-500', 'bg-indigo-500',
  'bg-pink-500', 'bg-cyan-500',
];

const iconOptions = [
  'biotech', 'engineering', 'local_hospital', 'menu_book', 'school',
  'science', 'calculate', 'language', 'public', 'bolt', 'video_library',
  'cast_for_education', 'speed', 'quiz', 'medical_services', 'health_and_safety',
  'medication', 'local_pharmacy', 'auto_stories', 'translate', 'workspace_premium',
  'psychology', 'architecture', 'sports_esports', 'palette', 'music_note',
];

const Categories: React.FC<Props> = ({ showToast }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectsCount, setSubjectsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'categories' | 'subcategories' | 'subjects'>('categories');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [showSubjModal, setShowSubjModal] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [editingSub, setEditingSub] = useState<SubCategory | null>(null);
  const [editingSubj, setEditingSubj] = useState<Subject | null>(null);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // --- Context-Aware Management States ---
  const [contextCategory, setContextCategory] = useState<Category | null>(null);
  const [selectedBranchL1, setSelectedBranchL1] = useState<string>('');
  const [selectedBranchL2, setSelectedBranchL2] = useState<string>('');

  const [subjForm, setSubjForm] = useState<Partial<Subject>>({
    id: '', name: '', course: '', icon: 'school', status: 'active',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cats, subs, subjs] = await Promise.all([
        categoriesAPI.getAll(),
        subcategoriesAPI.getAll(),
        subjectsAPI.getAll().catch(() => [])
      ]);
      setCategories(Array.isArray(cats) ? cats : []);
      setSubcategories(Array.isArray(subs) ? subs : []);
      setSubjects(Array.isArray(subjs) ? subjs : []);
      setSubjectsCount(Array.isArray(subjs) ? subjs.length : 0);

      // If categories are empty, try to seed
      if (Array.isArray(cats) && cats.length === 0) {
        console.log("No categories found, seeding default data...");
        await categoriesAPI.seed();
        // Since seed() now invalidates cache, these calls will get fresh data
        const [seededCats, seededSubs, seededSubjs] = await Promise.all([
          categoriesAPI.getAll(),
          subcategoriesAPI.getAll(),
          subjectsAPI.getAll().catch(() => [])
        ]);
        setCategories(Array.isArray(seededCats) ? seededCats : []);
        setSubcategories(Array.isArray(seededSubs) ? seededSubs : []);
        setSubjects(Array.isArray(seededSubjs) ? seededSubjs : []);
        setSubjectsCount(Array.isArray(seededSubjs) ? seededSubjs.length : 0);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  // Reset page when switching tabs or searching
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, selectedCategory]);

  const handleSaveCategory = async (data: Partial<Category>) => {
    try {
      if (editingCat) {
        await categoriesAPI.update(editingCat._id || editingCat.id, data);
        showToast('Category updated');
      } else {
        await categoriesAPI.create(data);
        showToast('Category created');
      }
      setShowCatModal(false);
      setEditingCat(null);
      loadData();
    } catch (error) {
      showToast('Failed to save category', 'error');
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (!confirm(`Delete "${cat.title}" and all its subcategories?`)) return;
    try {
      await categoriesAPI.delete(cat._id || cat.id);
      showToast('Category deleted');
      loadData();
    } catch (error) {
      showToast('Failed to delete category', 'error');
    }
  };

  const handleSaveSubcategory = async (data: Partial<SubCategory>) => {
    try {
      const dataToSave = {
        ...data,
        id: data.id || `${data.categoryId}_${data.title?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '')}`,
      };
      if (editingSub) {
        await subcategoriesAPI.update(editingSub._id || editingSub.id, dataToSave);
        showToast('Subcategory updated');
      } else {
        await subcategoriesAPI.create(dataToSave);
        showToast('Subcategory created');
      }
      setShowSubModal(false);
      setEditingSub(null);
      loadData();
    } catch (error) {
      showToast('Failed to save subcategory', 'error');
    }
  };

  const handleDeleteSubcategory = async (sub: SubCategory) => {
    if (!confirm(`Delete "${sub.title}"?`)) return;
    try {
      await subcategoriesAPI.delete(sub._id || sub.id);
      showToast('Subcategory deleted');
      loadData();
    } catch (error) {
      showToast('Failed to delete subcategory', 'error');
    }
  };

  const handleSaveSubject = async (data: Partial<Subject>) => {
    try {
      const finalData = {
        ...data,
        id: editingSubj?.id || `subj_${Date.now()}`,
        createdDate: editingSubj?.createdDate || new Date().toISOString()
      };
      if (editingSubj) {
        await subjectsAPI.update(editingSubj.id, finalData);
        showToast('Subject updated');
      } else {
        await subjectsAPI.create(finalData);
        showToast('Subject created');
      }
      setShowSubjModal(false);
      setEditingSubj(null);
      loadData();
    } catch (error) {
      showToast('Failed to save subject', 'error');
    }
  };

  const handleDeleteSubject = async (subj: Subject) => {
    if (!confirm(`Delete "${subj.name}"?`)) return;
    try {
      await subjectsAPI.delete(subj.id);
      showToast('Subject deleted');
      loadData();
    } catch (error) {
      showToast('Failed to delete subject', 'error');
    }
  };

  const openEditCategory = (cat: Category) => {
    setEditingCat(cat);
    setShowCatModal(true);
  };

  const openAddCategory = () => {
    setEditingCat(null);
    setShowCatModal(true);
  };

  const openEditSubcategory = (sub: SubCategory) => {
    setEditingSub(sub);
    setShowSubModal(true);
  };

  const openAddSubcategory = () => {
    setEditingSub(null);
    setShowSubModal(true);
  };

  const openAddSubject = () => {
    setEditingSubj(null);
    setShowSubjModal(true);
  };

  const openEditSubject = (subj: Subject) => {
    setEditingSubj(subj);
    setShowSubjModal(true);
  };

  const handleEnterContext = (cat: Category) => {
    setContextCategory(cat);
    setSelectedBranchL1(cat.branchesL1?.[0]?.slug || '');
    setSelectedBranchL2(cat.branchesL2?.[0]?.slug || '');
    setActiveTab('subcategories');
    setCurrentPage(1);
  };

  const handleExitContext = () => {
    setContextCategory(null);
    setSelectedBranchL1('');
    setSelectedBranchL2('');
    setActiveTab('categories');
    setCurrentPage(1);
  };

  const filteredCategories = categories.filter(cat =>
    (cat.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (cat.subtitle || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSubs = subcategories.filter(s => {
    if (contextCategory) {
      const matchesCategory = s.categoryId === contextCategory.id;
      const matchesL1 = !selectedBranchL1 || s.level1Branch === selectedBranchL1;
      const matchesL2 = !selectedBranchL2 || s.level2Branch === selectedBranchL2;
      return matchesCategory && matchesL1 && matchesL2;
    }
    const matchesCategory = !selectedCategory || s.categoryId === selectedCategory;
    const matchesSearch = (s.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const filteredSubjects = subjects.filter(s => {
    if (contextCategory) {
      // For subjects, 'course' field is often used as L1 branch in legacy, 
      // but we will prioritize level1Branch/level2Branch if present.
      const matchesCategory = s.categoryId === contextCategory.id;
      const matchesL1 = !selectedBranchL1 || (s.level1Branch || s.course) === selectedBranchL1;
      const matchesL2 = !selectedBranchL2 || s.level2Branch === selectedBranchL2;
      return matchesCategory && matchesL1 && matchesL2;
    }
    const matchesSearch = (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.course || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Pagination Logic for active tab
  const getActiveItems = () => {
    if (activeTab === 'categories') return filteredCategories;
    if (activeTab === 'subcategories') return filteredSubs;
    return filteredSubjects;
  };

  const totalItems = getActiveItems().length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedItems = getActiveItems().slice(startIndex, endIndex);

  const showingStart = totalItems === 0 ? 0 : startIndex + 1;
  const showingEnd = endIndex;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-[17px] font-bold text-gray-800 tracking-tight">Categories Manager</h2>
              {contextCategory && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-300">/</span>
                  <span className={`px-2 py-0.5 rounded-lg bg-gradient-to-r ${contextCategory.gradient} text-white text-[10px] font-black uppercase tracking-wider`}>
                    {contextCategory.title}
                  </span>
                </div>
              )}
            </div>
            <p className="text-[12px] text-gray-400 font-medium">
              {contextCategory ? `Managing hierarchy for ${contextCategory.title}` : 'Manage course categories and subcategories'}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Tab Switcher Pills */}
            <div className="flex bg-gray-100/80 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('categories')}
                className={`px-4 py-1.5 rounded-lg text-[12px] font-black tracking-tight transition-all ${activeTab === 'categories' ? 'bg-white text-[#1A237E] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Categories ({categories.length})
              </button>
              <button
                onClick={() => setActiveTab('subcategories')}
                className={`px-4 py-1.5 rounded-lg text-[12px] font-black tracking-tight transition-all ${activeTab === 'subcategories' ? 'bg-white text-[#1A237E] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Subcategories ({subcategories.length})
              </button>
              <button
                onClick={() => setActiveTab('subjects')}
                className={`px-4 py-1.5 rounded-lg text-[12px] font-black tracking-tight transition-all ${activeTab === 'subjects' ? 'bg-white text-[#1A237E] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Subjects ({subjectsCount})
              </button>
            </div>

            <div className="flex items-center gap-4 transition-all duration-300">
              <div className="relative group w-64 lg:w-80">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
                <input
                  type="text"
                  placeholder={`Search ${activeTab}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-[13px] font-medium outline-none focus:border-[#1A237E] transition-all placeholder:text-gray-400 shadow-sm"
                />
              </div>

              {contextCategory && (
                <button
                  onClick={handleExitContext}
                  className="w-10 h-10 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center hover:bg-slate-200 transition-all shadow-sm"
                  title="Exit Context"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              )}

              <button
                onClick={
                  activeTab === 'categories' ? openAddCategory :
                    activeTab === 'subcategories' ? openAddSubcategory :
                      openAddSubject
                }
                className="w-10 h-10 bg-[#1e293b] text-white rounded-full flex items-center justify-center hover:bg-black transition-all shadow-md group shrink-0"
                title={`Add ${activeTab}`}
              >
                <span className="material-symbols-outlined text-[20px] group-hover:rotate-90 transition-transform font-light">add</span>
              </button>
            </div>
          </div>
        </div>

        {/* Branch Selectors for Context Mode */}
        {contextCategory && contextCategory.hierarchyMode !== 'simple' && (
          <div className="flex flex-col gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm animate-in slide-in-from-top-2 duration-300">
            {contextCategory.branchesL1 && contextCategory.branchesL1.length > 0 && (
              <div className="flex items-center gap-4">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest min-w-[80px]">
                  {contextCategory.level1Label || 'Branch'}:
                </span>
                <div className="flex gap-2 flex-wrap">
                  {contextCategory.branchesL1.map(b => (
                    <button
                      key={b.slug}
                      onClick={() => setSelectedBranchL1(b.slug)}
                      className={`px-4 py-2 rounded-xl text-[12px] font-bold transition-all ${selectedBranchL1 === b.slug ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {contextCategory.hierarchyMode === 'board-class' && contextCategory.branchesL2 && contextCategory.branchesL2.length > 0 && (
              <div className="flex items-center gap-4 pt-4 border-t border-slate-50">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest min-w-[80px]">
                  {contextCategory.level2Label || 'Class'}:
                </span>
                <div className="flex gap-2 flex-wrap">
                  {contextCategory.branchesL2.map(b => (
                    <button
                      key={b.slug}
                      onClick={() => setSelectedBranchL2(b.slug)}
                      className={`px-4 py-2 rounded-xl text-[12px] font-bold transition-all ${selectedBranchL2 === b.slug ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {activeTab === 'categories' && (
        <div className="space-y-4">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(paginatedItems as Category[]).map(cat => (
              <div key={cat._id || cat.id} className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div className={`bg-gradient-to-r ${cat.gradient} p-5 text-white relative overflow-hidden`}>
                  {cat.imageUrl && (
                    <img src={cat.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
                  )}
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                      {cat.icon && (
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                          <span className="material-icons-outlined text-2xl">{cat.icon}</span>
                        </div>
                      )}
                      <div>
                        <h3 className="font-black text-lg tracking-tight">{cat.title}</h3>
                        <p className="text-white/70 text-xs font-medium">{cat.subtitle}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEditCategory(cat)} className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-all backdrop-blur-sm">
                        <span className="material-icons-outlined text-sm">edit</span>
                      </button>
                      <button onClick={() => handleDeleteCategory(cat)} className="p-2 bg-white/20 rounded-lg hover:bg-red-500/50 transition-all backdrop-blur-sm">
                        <span className="material-icons-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-500 min-h-[32px]">{cat.description}</p>
                  <div className="flex items-center gap-3 mt-3 text-xs mb-4">
                    <span className={`px-2 py-1 rounded-full ${cat.isActive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} font-bold`}>
                      {cat.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {cat.tag && <span className="px-2 py-1 bg-amber-100 text-amber-600 rounded-full font-bold">{cat.tag}</span>}
                    <span className="text-gray-400">Order: {cat.order}</span>
                    <span className="text-gray-400">ID: {cat.id}</span>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <p className="text-xs text-gray-400 font-medium">
                      {subcategories.filter(s => s.categoryId === cat.id).length} subcategories
                    </p>
                    <button
                      onClick={() => handleEnterContext(cat)}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase tracking-wider hover:bg-black transition-all shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[16px]">account_tree</span>
                      Manage Hierarchy
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Categories Pagination Footers (Will add one global one at the end of the file instead) */}
        </div>
      )}

      {activeTab === 'subcategories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedCategory('')}
                className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${!selectedCategory ? 'bg-[#1A237E] text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${selectedCategory === cat.id ? 'bg-[#1A237E] text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  {cat.title}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left p-4 text-xs font-bold text-gray-500 uppercase">Icon</th>
                  <th className="text-left p-4 text-xs font-bold text-gray-500 uppercase">Title</th>
                  <th className="text-left p-4 text-xs font-bold text-gray-500 uppercase">Category</th>
                  <th className="text-left p-4 text-xs font-bold text-gray-500 uppercase">Path</th>
                  <th className="text-left p-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                  <th className="text-left p-4 text-xs font-bold text-gray-500 uppercase">Order</th>
                  <th className="text-right p-4 text-xs font-bold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(paginatedItems as SubCategory[]).map(sub => {
                  const parentCat = categories.find(c => c.id === sub.categoryId);
                  return (
                    <tr key={sub._id || sub.id} className="border-b hover:bg-gray-50 transition-all">
                      <td className="p-4">
                        {sub.icon && (
                          <div className={`w-10 h-10 ${sub.gradient ? `bg-gradient-to-br ${sub.gradient}` : sub.color} rounded-lg flex items-center justify-center shadow-sm`}>
                            <span className="material-icons-outlined text-white text-lg">{sub.icon}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-bold text-gray-800">{sub.title}</p>
                        {sub.description && <p className="text-xs text-gray-400 mt-0.5">{sub.description}</p>}
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 bg-gradient-to-r ${parentCat?.gradient || 'from-gray-400 to-gray-500'} text-white text-xs font-bold rounded-full`}>
                          {parentCat?.title || sub.categoryId}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-gray-500">{sub.parentPath || '-'}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${sub.isActive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                          {sub.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-500">{sub.order}</td>
                      <td className="p-4 text-right">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => openEditSubcategory(sub)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all">
                            <span className="material-icons-outlined text-sm">edit</span>
                          </button>
                          <button onClick={() => handleDeleteSubcategory(sub)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all">
                            <span className="material-icons-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {paginatedItems.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-gray-400 text-sm">No subcategories found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'subjects' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase">#</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase">Subject Name</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase">Course</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase">Date Added</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(paginatedItems as Subject[]).map((subj, idx) => (
                  <tr key={subj._id || subj.id} className="border-b hover:bg-gray-50 transition-all group">
                    <td className="p-4 text-sm font-bold text-gray-400">{startIndex + idx + 1}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {subj.icon && (
                          <div className={`w-8 h-8 ${subj.gradient ? `bg-gradient-to-br ${subj.gradient} text-white` : 'bg-indigo-50 text-indigo-600'} rounded-lg flex items-center justify-center shadow-sm`}>
                            <span className="material-icons-outlined text-[18px]">{subj.icon}</span>
                          </div>
                        )}
                        <span className="text-sm font-bold text-gray-800">{subj.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-600 font-medium">{subj.course || 'General'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${subj.status === 'active' ? 'bg-green-100 text-green-600 border border-green-200' : 'bg-red-100 text-red-600 border border-red-200'}`}>
                        {subj.status}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-gray-400">
                      {subj.createdDate ? new Date(subj.createdDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditSubject(subj)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all shadow-sm">
                          <span className="material-icons-outlined text-sm">edit</span>
                        </button>
                        <button onClick={() => handleDeleteSubject(subj)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all shadow-sm">
                          <span className="material-icons-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paginatedItems.length === 0 && (
                  <tr><td colSpan={6} className="p-12 text-center text-gray-400 font-bold uppercase tracking-wider">No subjects found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Common Pagination Footer for all tabs */}
          {totalItems > 0 && (
            <div className="flex justify-between items-center mt-6 px-6 py-4 border border-gray-100 bg-white rounded-2xl shadow-sm">
              <div className="flex items-center gap-3">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border rounded-lg px-2 py-1 text-sm outline-none focus:border-black transition-all shadow-sm h-9 bg-white"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-[13px] text-gray-500 font-medium">
                  Showing {showingStart} to {showingEnd} of {totalItems} entries
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-gray-500 hover:text-black font-bold text-sm disabled:opacity-50 transition-colors"
                >
                  Previous
                </button>
                <button className="px-4 py-1 bg-black text-white rounded-lg font-bold text-sm shadow-md">
                  {currentPage}
                </button>
                <button
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="px-3 py-1 text-gray-500 hover:text-black font-bold text-sm disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <AddCategoryDrawer
        isOpen={showCatModal}
        onClose={() => { setShowCatModal(false); setEditingCat(null); }}
        onSubmit={handleSaveCategory}
        editingCategory={editingCat}
        nextOrder={categories.length + 1}
        showToast={showToast}
      />

      <AddSubcategoryDrawer
        isOpen={showSubModal}
        onClose={() => { setShowSubModal(false); setEditingSub(null); }}
        onSubmit={handleSaveSubcategory}
        editingSubcategory={editingSub}
        categories={categories}
        defaultCategoryId={contextCategory?.id || selectedCategory || ''}
        defaultLevel1Branch={selectedBranchL1}
        defaultLevel2Branch={selectedBranchL2}
        nextOrder={filteredSubs.length + 1}
      />

      <AddSubjectDrawer
        isOpen={showSubjModal}
        onClose={() => { setShowSubjModal(false); setEditingSubj(null); }}
        onSubmit={handleSaveSubject}
        editingSubject={editingSubj}
        defaultCategoryId={contextCategory?.id || ''}
        defaultLevel1Branch={selectedBranchL1}
        defaultLevel2Branch={selectedBranchL2}
        categories={categories}
        subcategories={subcategories}
      />
    </div>
  );
};

export default Categories;

