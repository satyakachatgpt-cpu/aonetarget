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
    icon: 'school',
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
          icon: editingSubject.icon || 'school',
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
            icon: 'school',
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
    <RightSideDrawer isOpen={isOpen} onClose={onClose}>
      <DrawerHeader title={editingSubject ? 'Edit Subject' : 'Add Subject'} onClose={onClose} />
      <DrawerBody>
        <div className="space-y-4">
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
            <FormLabel label="Icon Picker" />
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
            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
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
      <DrawerFooter>
        <PrimaryButton onClick={() => onSubmit(formData)}>Save Subject</PrimaryButton>
      </DrawerFooter>
    </RightSideDrawer>
  );
};

export default AddSubjectDrawer;
