import React, { useState, useEffect } from 'react';
import { RightSideDrawer, DrawerHeader, DrawerBody, DrawerFooter, FormLabel, FormInput, FormSelect, PrimaryButton } from './DrawerSystem';
import { SUBJECT_VISUALS } from '../../config/visualConfig';

const iconOptions = SUBJECT_VISUALS.iconOptions;
const gradientOptions = SUBJECT_VISUALS.gradientOptions;

interface AddSubjectDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  editingSubject: any;
  categories?: any[];
  subcategories?: any[];
  defaultCategoryId?: string;
  defaultLevel1Branch?: string;
  defaultLevel2Branch?: string;
}

const AddSubjectDrawer: React.FC<AddSubjectDrawerProps> = ({ 
  isOpen, onClose, onSubmit, editingSubject, 
  categories = [], subcategories = [], 
  defaultCategoryId = '', defaultLevel1Branch = '', defaultLevel2Branch = '' 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    categoryId: defaultCategoryId,
    subcategoryId: '',
    level1Branch: defaultLevel1Branch,
    level2Branch: defaultLevel2Branch,
    course: '',
    icon: '',
    gradient: 'from-indigo-500 to-blue-600',
    status: 'active' as 'active' | 'inactive',
  });

  const selectedCategory = categories.find(c => c.id === formData.categoryId);
  
  // Filter subcategories based on category and branches
  const filteredSubcats = subcategories.filter(s => {
    const matchesCat = s.categoryId === formData.categoryId;
    const matchesL1 = !formData.level1Branch || s.level1Branch === formData.level1Branch;
    const matchesL2 = !formData.level2Branch || s.level2Branch === formData.level2Branch;
    return matchesCat && matchesL1 && matchesL2;
  });

  useEffect(() => {
    if (isOpen) {
      if (editingSubject) {
        setFormData({
          name: editingSubject.name,
          categoryId: editingSubject.categoryId || '',
          subcategoryId: editingSubject.subcategoryId || '',
          level1Branch: editingSubject.level1Branch || '',
          level2Branch: editingSubject.level2Branch || '',
          course: editingSubject.course || '',
          icon: editingSubject.icon || '',
          gradient: editingSubject.gradient || '',
          status: editingSubject.status || 'active',
        });
      } else {
         const cat = categories.find(c => c.id === defaultCategoryId);
         setFormData({
            name: '',
            categoryId: defaultCategoryId,
            subcategoryId: '',
            level1Branch: defaultLevel1Branch || cat?.branchesL1?.[0]?.slug || '',
            level2Branch: defaultLevel2Branch || cat?.branchesL2?.[0]?.slug || '',
            course: cat?.branchesL1?.find((b: any) => b.slug === defaultLevel1Branch)?.label || cat?.branchesL1?.[0]?.label || '',
            icon: '',
            gradient: 'from-indigo-500 to-blue-600',
            status: 'active',
         });
      }
    }
  }, [isOpen, editingSubject, defaultCategoryId, defaultLevel1Branch, defaultLevel2Branch, categories]);

  const handleCategoryChange = (val: string) => {
    const cat = categories.find(c => c.id === val);
    setFormData({
      ...formData,
      categoryId: val,
      subcategoryId: '',
      level1Branch: cat?.branchesL1?.[0]?.slug || '',
      level2Branch: cat?.branchesL2?.[0]?.slug || '',
      course: cat?.branchesL1?.[0]?.label || ''
    });
  };

  const handleBranchL1Change = (val: string) => {
    const branch = selectedCategory?.branchesL1?.find((b: any) => b.slug === val);
    setFormData({
      ...formData,
      level1Branch: val,
      subcategoryId: '',
      course: branch?.label || ''
    });
  };

  return (
    <RightSideDrawer isOpen={isOpen} onClose={onClose} width="520px">
      <div className="flex justify-between items-center px-8 py-6 border-b border-gray-100 bg-white sticky top-0 z-20">
        <h3 className="text-[20px] font-black text-[#1e293b] tracking-tight uppercase">
          {editingSubject ? 'Edit Subject' : 'Add Subject'}
        </h3>
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 text-slate-400 hover:text-slate-600 rounded-full transition-all">
          <span className="material-symbols-outlined text-[24px]">close</span>
        </button>
      </div>

      <DrawerBody className="bg-gray-50/30">
        <div className="space-y-6">
           <div>
            <FormLabel label="Subject Name" required />
            <FormInput value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Subject Name" />
          </div>

          <div>
            <FormLabel label="Category" required />
            <FormSelect
               value={formData.categoryId}
               onChange={handleCategoryChange}
               options={categories.map(c => ({ value: c.id, label: c.title }))}
               placeholder="Select Category"
            />
          </div>

          {selectedCategory && selectedCategory.branchesL1 && selectedCategory.branchesL1.length > 0 && (
            <div>
              <FormLabel label={selectedCategory.level1Label || 'Branch'} required />
              <FormSelect
                value={formData.level1Branch}
                onChange={handleBranchL1Change}
                options={selectedCategory.branchesL1.map((b: any) => ({ value: b.slug, label: b.label }))}
              />
            </div>
          )}

          {selectedCategory && selectedCategory.hierarchyMode === 'board-class' && selectedCategory.branchesL2 && selectedCategory.branchesL2.length > 0 && (
            <div>
              <FormLabel label={selectedCategory.level2Label || 'Class'} required />
              <FormSelect
                value={formData.level2Branch}
                onChange={(val) => setFormData({ ...formData, level2Branch: val, subcategoryId: '' })}
                options={selectedCategory.branchesL2.map((b: any) => ({ value: b.slug, label: b.label }))}
              />
            </div>
          )}

          <div>
            <FormLabel label="Subcategory" required />
            <FormSelect
               value={formData.subcategoryId}
               onChange={(val) => setFormData({ ...formData, subcategoryId: val })}
               options={filteredSubcats.map(s => ({ value: s.id, label: s.title }))}
               placeholder="Select Subcategory"
            />
          </div>

          <div>
            <div className="flex justify-between items-center pr-1">
              <FormLabel label="Icon Picker" />
              {formData.icon && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, icon: '' })}
                  className="text-[10px] font-black text-red-500 bg-red-50 px-2 py-1 rounded-full border border-red-100 flex items-center gap-1 hover:bg-red-500 hover:text-white transition-all active:scale-95 mb-2 uppercase"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                  Clear
                </button>
              )}
            </div>
            <div className="grid grid-cols-5 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 max-h-[220px] overflow-y-auto custom-scrollbar">
              {iconOptions.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon })}
                  className={`aspect-square rounded-xl flex items-center justify-center transition-all relative overflow-hidden group ${formData.icon === icon ? 'bg-blue-600 text-white shadow-lg scale-105 z-10' : 'bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-600 border border-slate-100'}`}
                  title={icon.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                >
                  <span className="material-symbols-outlined text-[20px] select-none pointer-events-none flex-shrink-0 leading-none">
                    {icon}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <FormLabel label="Gradient Picker" />
            <div className="grid grid-cols-5 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
              {gradientOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, gradient: opt.value })}
                  className={`h-10 rounded-xl bg-gradient-to-br ${opt.value} transition-all relative ${formData.gradient === opt.value ? 'ring-2 ring-blue-500 ring-offset-2 scale-105 z-10' : 'hover:scale-105'}`}
                  title={opt.label}
                >
                  {formData.gradient === opt.value && (
                    <span className="material-symbols-outlined text-white text-[16px] absolute inset-0 flex items-center justify-center">check</span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div>
            <FormLabel label="Status" />
            <FormSelect
               value={formData.status}
               onChange={(val) => setFormData({ ...formData, status: val as 'active' | 'inactive' })}
               options={[
                 { value: 'active', label: 'Active' },
                 { value: 'inactive', label: 'Inactive' }
               ]}
            />
          </div>
        </div>
      </DrawerBody>
      <div className="p-6 border-t border-gray-100 flex gap-3 bg-white">
        <button
          onClick={onClose}
          className="flex-1 h-[56px] border border-gray-200 text-gray-500 text-[14px] font-black uppercase tracking-wider rounded-xl hover:bg-gray-50 transition-all"
        >
          Cancel
        </button>
        <button
          onClick={() => onSubmit(formData)}
          className="flex-1 h-[56px] bg-[#1e293b] text-white text-[14px] font-black uppercase tracking-wider rounded-xl hover:bg-black transition-all shadow-lg shadow-gray-200"
        >
          {editingSubject ? 'Update Subject' : 'Create Subject'}
        </button>
      </div>
    </RightSideDrawer>
  );
};

export default AddSubjectDrawer;
