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
    icon: '',
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
          icon: editingSubcategory.icon || '',
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
         icon: '',
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
    <RightSideDrawer isOpen={isOpen} onClose={onClose} width="520px">
      <div className="flex justify-between items-center px-8 py-6 border-b border-gray-100 bg-white sticky top-0 z-20">
        <h3 className="text-[20px] font-black text-[#1e293b] tracking-tight uppercase">
          {editingSubcategory ? 'Edit Subcategory' : 'Add Subcategory'}
        </h3>
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 text-slate-400 hover:text-slate-600 rounded-full transition-all">
          <span className="material-symbols-outlined text-[24px]">close</span>
        </button>
      </div>

      <DrawerBody className="bg-gray-50/30">
        <div className="space-y-6">
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
            <FormLabel label="Description" />
             <FormInput value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Brief description" />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <input type="checkbox" id="subActive" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="w-4 h-4" />
            <label htmlFor="subActive" className="text-[14px] font-bold">Active</label>
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
          {editingSubcategory ? 'Update Subcategory' : 'Create Subcategory'}
        </button>
      </div>
    </RightSideDrawer>
  );
};

export default AddSubcategoryDrawer;
