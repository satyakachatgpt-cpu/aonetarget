import React, { useState, useEffect } from 'react';
import { RightSideDrawer, DrawerHeader, DrawerBody, DrawerFooter, FormLabel, FormInput, FormSelect, PrimaryButton } from './DrawerSystem';

import { SUBCATEGORY_VISUALS } from '../../config/visualConfig';

const iconOptions = SUBCATEGORY_VISUALS.iconOptions;
const gradientOptions = SUBCATEGORY_VISUALS.gradientOptions;


interface AddSubcategoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  editingSubcategory: any;
  categories: any[];
  defaultCategoryId: string;
  defaultLevel1Branch?: string;
  defaultLevel2Branch?: string;
  nextOrder: number;
}

const AddSubcategoryDrawer: React.FC<AddSubcategoryDrawerProps> = ({ 
  isOpen, onClose, onSubmit, editingSubcategory, categories, 
  defaultCategoryId, defaultLevel1Branch, defaultLevel2Branch, nextOrder 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    categoryId: defaultCategoryId,
    level1Branch: defaultLevel1Branch || '',
    level2Branch: defaultLevel2Branch || '',
    parentPath: '',
    icon: 'folder',
    color: 'bg-blue-500',
    gradient: 'from-[#303F9F] to-[#1A237E]',
    description: '',
    order: nextOrder,
    isActive: true,
  });

  const selectedCategory = categories.find(c => c.id === formData.categoryId);

  useEffect(() => {
    if (isOpen) {
      if (editingSubcategory) {
        setFormData({
          title: editingSubcategory.title,
          categoryId: editingSubcategory.categoryId,
          level1Branch: editingSubcategory.level1Branch || '',
          level2Branch: editingSubcategory.level2Branch || '',
          parentPath: editingSubcategory.parentPath || '',
          icon: editingSubcategory.icon || 'folder',
          color: editingSubcategory.color || 'bg-blue-500',
          gradient: editingSubcategory.gradient || '',
          description: editingSubcategory.description || '',
          order: editingSubcategory.order || nextOrder,
          isActive: editingSubcategory.isActive ?? true,
        });
      } else {
        const cat = categories.find(c => c.id === (defaultCategoryId || categories[0]?.id));
        setFormData({
         title: '',
         categoryId: defaultCategoryId || (categories[0]?.id || ''),
         level1Branch: defaultLevel1Branch || cat?.branchesL1?.[0]?.slug || '',
         level2Branch: defaultLevel2Branch || cat?.branchesL2?.[0]?.slug || '',
         parentPath: '',
         icon: 'folder',
         color: 'bg-blue-500',
         gradient: 'from-[#303F9F] to-[#1A237E]',
         description: '',
         order: nextOrder,
         isActive: true,
        });
      }
    }
  }, [isOpen, editingSubcategory, nextOrder, defaultCategoryId, categories, defaultLevel1Branch, defaultLevel2Branch]);

  // Sync branches when category changes
  const handleCategoryChange = (val: string) => {
    const cat = categories.find(c => c.id === val);
    setFormData({
      ...formData,
      categoryId: val,
      level1Branch: cat?.branchesL1?.[0]?.slug || '',
      level2Branch: cat?.branchesL2?.[0]?.slug || ''
    });
  };

  return (
    <RightSideDrawer isOpen={isOpen} onClose={onClose}>
      <DrawerHeader title={editingSubcategory ? 'Edit Subcategory' : 'Add Subcategory'} onClose={onClose} />
      <DrawerBody>
        <div className="space-y-4">
          <div>
            <FormLabel label="Title" required />
            <FormInput value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Subcategory Title" />
          </div>
          <div>
            <FormLabel label="Parent Category" required />
            <FormSelect
               value={formData.categoryId}
               onChange={handleCategoryChange}
               options={categories.map(c => ({ value: c.id || c._id, label: c.title }))}
               placeholder="Select Category"
            />
          </div>

          {selectedCategory && selectedCategory.branchesL1 && selectedCategory.branchesL1.length > 0 && (
            <div>
              <FormLabel label={selectedCategory.level1Label || 'Level 1 Branch'} required />
              <FormSelect
                value={formData.level1Branch}
                onChange={(val) => setFormData({ ...formData, level1Branch: val })}
                options={selectedCategory.branchesL1.map((b: any) => ({ value: b.slug, label: b.label }))}
                placeholder={`Select ${selectedCategory.level1Label || 'Branch'}`}
              />
            </div>
          )}

          {selectedCategory && selectedCategory.hierarchyMode === 'board-class' && selectedCategory.branchesL2 && selectedCategory.branchesL2.length > 0 && (
            <div>
              <FormLabel label={selectedCategory.level2Label || 'Level 2 Branch'} required />
              <FormSelect
                value={formData.level2Branch}
                onChange={(val) => setFormData({ ...formData, level2Branch: val })}
                options={selectedCategory.branchesL2.map((b: any) => ({ value: b.slug, label: b.label }))}
                placeholder={`Select ${selectedCategory.level2Label || 'Class'}`}
              />
            </div>
          )}
          <div>
            <FormLabel label="Parent Path" />
            <FormInput value={formData.parentPath} onChange={(e) => setFormData({ ...formData, parentPath: e.target.value })} placeholder="e.g. Science / Biology" />
          </div>
          <div>
            <FormLabel label="Icon Picker" />
            <div className="grid grid-cols-5 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
              {iconOptions.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon })}
                  className={`aspect-square rounded-xl flex items-center justify-center transition-all ${formData.icon === icon ? 'bg-blue-600 text-white shadow-lg scale-110 z-10' : 'bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                >
                  <span className="material-symbols-outlined text-[20px]">{icon}</span>
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
            <FormLabel label="Description" />
             <FormInput value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Brief description" />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <input type="checkbox" id="subActive" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="w-4 h-4" />
            <label htmlFor="subActive" className="text-[14px] font-bold">Active</label>
          </div>
        </div>
      </DrawerBody>
       <DrawerFooter>
        <PrimaryButton onClick={() => onSubmit(formData)}>Save Subcategory</PrimaryButton>
      </DrawerFooter>
    </RightSideDrawer>
  );
};

export default AddSubcategoryDrawer;
