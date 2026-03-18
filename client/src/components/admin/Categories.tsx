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
  imageUrl?: string;
}

interface Subject {
  _id?: string;
  id: string;
  name: string;
  course: string;
  icon: string;
  status: 'active' | 'inactive';
  createdDate: string;
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

  const filteredCategories = categories.filter(cat =>
    (cat.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (cat.subtitle || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSubs = subcategories.filter(s => {
    const matchesCategory = !selectedCategory || s.categoryId === selectedCategory;
    const matchesSearch = (s.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const filteredSubjects = subjects.filter(s =>
    (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.course || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-[17px] font-bold text-gray-800 tracking-tight">Categories Manager</h2>
          <p className="text-[12px] text-gray-400 font-medium">Manage course categories and subcategories</p>
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

      {activeTab === 'categories' && (
        <div className="space-y-4">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCategories.map(cat => (
              <div key={cat._id || cat.id} className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div className={`bg-gradient-to-r ${cat.gradient} p-5 text-white`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <span className="material-icons-outlined text-2xl">{cat.icon}</span>
                      </div>
                      <div>
                        <h3 className="font-black text-lg">{cat.title}</h3>
                        <p className="text-white/70 text-xs">{cat.subtitle}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEditCategory(cat)} className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-all">
                        <span className="material-icons-outlined text-sm">edit</span>
                      </button>
                      <button onClick={() => handleDeleteCategory(cat)} className="p-2 bg-white/20 rounded-lg hover:bg-red-500/50 transition-all">
                        <span className="material-icons-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-500">{cat.description}</p>
                  <div className="flex items-center gap-3 mt-3 text-xs">
                    <span className={`px-2 py-1 rounded-full ${cat.isActive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} font-bold`}>
                      {cat.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {cat.tag && <span className="px-2 py-1 bg-amber-100 text-amber-600 rounded-full font-bold">{cat.tag}</span>}
                    <span className="text-gray-400">Order: {cat.order}</span>
                    <span className="text-gray-400">ID: {cat.id}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    {subcategories.filter(s => s.categoryId === cat.id).length} subcategories
                  </p>
                </div>
              </div>
            ))}
          </div>
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
                {filteredSubs.map(sub => {
                  const parentCat = categories.find(c => c.id === sub.categoryId);
                  return (
                    <tr key={sub._id || sub.id} className="border-b hover:bg-gray-50 transition-all">
                      <td className="p-4">
                        <div className={`w-10 h-10 ${sub.color} rounded-lg flex items-center justify-center`}>
                          <span className="material-icons-outlined text-white text-lg">{sub.icon}</span>
                        </div>
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
                {filteredSubs.length === 0 && (
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
                {filteredSubjects.map((subj, idx) => (
                  <tr key={subj._id || subj.id} className="border-b hover:bg-gray-50 transition-all group">
                    <td className="p-4 text-sm font-bold text-gray-400">{idx + 1}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                          <span className="material-icons-outlined text-[18px]">{subj.icon}</span>
                        </div>
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
                {filteredSubjects.length === 0 && (
                  <tr><td colSpan={6} className="p-12 text-center text-gray-400 font-bold uppercase tracking-wider">No subjects found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AddCategoryDrawer
        isOpen={showCatModal}
        onClose={() => { setShowCatModal(false); setEditingCat(null); }}
        onSubmit={handleSaveCategory}
        editingCategory={editingCat}
        nextOrder={categories.length + 1}
      />

      <AddSubcategoryDrawer
        isOpen={showSubModal}
        onClose={() => { setShowSubModal(false); setEditingSub(null); }}
        onSubmit={handleSaveSubcategory}
        editingSubcategory={editingSub}
        categories={categories}
        defaultCategoryId={selectedCategory || ''}
        nextOrder={filteredSubs.length + 1}
      />

      <AddSubjectDrawer
        isOpen={showSubjModal}
        onClose={() => { setShowSubjModal(false); setEditingSubj(null); }}
        onSubmit={handleSaveSubject}
        editingSubject={editingSubj}
      />
    </div>
  );
};

export default Categories;

