import React, { useState, useEffect } from 'react';
import { RightSideDrawer, DrawerHeader, DrawerBody, DrawerFooter, FormLabel, FormInput, FormSelect, PrimaryButton } from './DrawerSystem';

import { CATEGORY_VISUALS } from '../../config/visualConfig';

const iconOptions = CATEGORY_VISUALS.iconOptions;
const gradientOptions = CATEGORY_VISUALS.gradientOptions;


interface AddCategoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  editingCategory: any;
  nextOrder: number;
}

const AddCategoryDrawer: React.FC<AddCategoryDrawerProps> = ({ isOpen, onClose, onSubmit, editingCategory, nextOrder }) => {
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    subtitle: '',
    icon: 'school',
    gradient: 'from-blue-600 to-indigo-700',
    description: '',
    tag: '',
    order: nextOrder,
    isActive: true,
    imageUrl: '',
    hierarchyMode: 'simple',
    level1Label: '',
    level2Label: '',
    branchesL1: [] as { label: string; slug: string }[],
    branchesL2: [] as { label: string; slug: string }[],
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (editingCategory) {
        setFormData({
          id: editingCategory.id || '',
          title: editingCategory.title,
          subtitle: editingCategory.subtitle || '',
          icon: editingCategory.icon || 'school',
          gradient: editingCategory.gradient || 'from-blue-600 to-indigo-700',
          description: editingCategory.description || '',
          tag: editingCategory.tag || '',
          order: editingCategory.order || nextOrder,
          isActive: editingCategory.isActive ?? true,
          imageUrl: editingCategory.imageUrl || '',
          hierarchyMode: editingCategory.hierarchyMode || 'simple',
          level1Label: editingCategory.level1Label || '',
          level2Label: editingCategory.level2Label || '',
          branchesL1: editingCategory.branchesL1 || [],
          branchesL2: editingCategory.branchesL2 || [],
        });
      } else {
        setFormData({
          id: '',
          title: '',
          subtitle: '',
          icon: 'school',
          gradient: 'from-blue-600 to-indigo-700',
          description: '',
          tag: '',
          order: nextOrder,
          isActive: true,
          imageUrl: '',
          hierarchyMode: 'simple',
          level1Label: '',
          level2Label: '',
          branchesL1: [],
          branchesL2: [],
        });
      }
    }
  }, [isOpen, editingCategory, nextOrder]);

  return (
    <RightSideDrawer isOpen={isOpen} onClose={onClose} width="520px">
      <div className="flex justify-between items-center px-8 py-6 border-b border-gray-100 bg-white sticky top-0 z-20">
        <h3 className="text-[20px] font-black text-[#1e293b] tracking-tight uppercase">
          {editingCategory ? 'Edit Category' : 'Add Category'}
        </h3>
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 text-slate-400 hover:text-slate-600 rounded-full transition-all">
          <span className="material-symbols-outlined text-[24px]">close</span>
        </button>
      </div>

      <DrawerBody className="bg-gray-50/30">
        <div className="space-y-6">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                // Here you would typically upload to a server
                // For now, we'll use a local URL placeholder or ask the user
                const reader = new FileReader();
                reader.onloadend = () => {
                  setFormData({ ...formData, imageUrl: reader.result as string });
                };
                reader.readAsDataURL(file);
              }
            }}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FormLabel label="Category ID" required />
              <FormInput
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                placeholder="e.g. neet"
                className="bg-white border-slate-200"
              />
            </div>
            <div>
              <FormLabel label="Order" />
              <FormInput
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                placeholder="7"
                className="bg-white border-slate-200"
              />
            </div>
          </div>

          <div>
            <FormLabel label="Title" required />
            <FormInput
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. NEET"
              className="bg-white border-slate-200"
            />
          </div>

          <div>
            <FormLabel label="Subtitle" />
            <FormInput
              value={formData.subtitle}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              placeholder="e.g. Medical Entrance"
              className="bg-white border-slate-200"
            />
          </div>

          <div>
            <FormLabel label="Description" />
            <FormInput
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. Biology, Chemistry, Physics"
              className="bg-white border-slate-200"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <FormLabel label="Tag" />
              <FormInput
                value={formData.tag}
                onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                placeholder="e.g. Most Popular"
                className="bg-white border-slate-200"
              />
            </div>
            <div className="pt-6">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Active</span>
                <button
                  onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  className={`w-12 h-6 rounded-full transition-all duration-300 relative ${formData.isActive ? 'bg-emerald-500' : 'bg-slate-200'}`}
                >
                  <div className={`absolute w-4 h-4 bg-white rounded-full top-1 transition-all duration-300 ${formData.isActive ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </div>

          <div>
            <FormLabel label="Icon" />
            <div className="grid grid-cols-9 gap-2">
              {iconOptions.map(icon => (
                <button
                  key={icon}
                  onClick={() => setFormData({ ...formData, icon })}
                  className={`aspect-square rounded-lg flex items-center justify-center transition-all ${formData.icon === icon ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                >
                  <span className="material-symbols-outlined text-[18px]">{icon}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <FormLabel label="Gradient" />
            <div className="grid grid-cols-5 gap-3">
              {gradientOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFormData({ ...formData, gradient: opt.value })}
                  className={`h-12 rounded-lg bg-gradient-to-br ${opt.value} transition-all ${formData.gradient === opt.value ? 'ring-4 ring-blue-500/30 border-2 border-white' : 'hover:scale-105'}`}
                />
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100">
            <h4 className="text-[13px] font-black text-slate-800 mb-4 uppercase tracking-tight flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-blue-600">account_tree</span>
              Academic Hierarchy
            </h4>
            
            <div className="space-y-4">
              <div>
                <FormLabel label="Hierarchy Mode" />
                <FormSelect
                  value={formData.hierarchyMode}
                  onChange={(val) => {
                    let level1Label = '';
                    let level2Label = '';
                    let branchesL1 = [] as { label: string; slug: string }[];
                    let branchesL2 = [] as { label: string; slug: string }[];
                    
                    if (val === 'exam-branch') {
                      level1Label = 'Exam';
                      branchesL1 = [{ label: 'NEET', slug: 'neet' }, { label: 'IIT-JEE', slug: 'iit-jee' }];
                    } else if (val === 'board-class') {
                      level1Label = 'Board';
                      level2Label = 'Class';
                      branchesL1 = [{ label: 'CBSE', slug: 'cbse' }, { label: 'HBSE', slug: 'hbse' }];
                      branchesL2 = [{ label: '11th', slug: '11th' }, { label: '12th', slug: '12th' }];
                    }
                    
                    setFormData({ ...formData, hierarchyMode: val, level1Label, level2Label, branchesL1, branchesL2 });
                  }}
                  options={[
                    { value: 'simple', label: 'Simple (No Branches)' },
                    { value: 'exam-branch', label: 'Exam Branches (e.g. NEET/IIT)' },
                    { value: 'board-class', label: 'Board & Class Branches' },
                  ]}
                />
              </div>

              {formData.hierarchyMode !== 'simple' && (
                <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <FormLabel label="Level 1 Label (e.g. Exam, Board)" />
                    <FormInput
                      value={formData.level1Label}
                      onChange={(e) => setFormData({ ...formData, level1Label: e.target.value })}
                      placeholder="e.g. Exam"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-slate-500 mb-1 uppercase tracking-wider">Level 1 Branches</label>
                    {formData.branchesL1.map((b, idx) => (
                      <div key={idx} className="flex gap-2">
                        <FormInput
                          value={b.label}
                          onChange={(e) => {
                            const newB = [...formData.branchesL1];
                            newB[idx].label = e.target.value;
                            setFormData({ ...formData, branchesL1: newB });
                          }}
                          placeholder="Label"
                          className="flex-1"
                        />
                        <FormInput
                          value={b.slug}
                          onChange={(e) => {
                            const newB = [...formData.branchesL1];
                            newB[idx].slug = e.target.value;
                            setFormData({ ...formData, branchesL1: newB });
                          }}
                          placeholder="Slug"
                          className="flex-1"
                        />
                        <button
                          onClick={() => {
                            const newB = formData.branchesL1.filter((_, i) => i !== idx);
                            setFormData({ ...formData, branchesL1: newB });
                          }}
                          className="bg-red-50 text-red-500 w-10 h-10 rounded-xl flex items-center justify-center"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setFormData({ ...formData, branchesL1: [...formData.branchesL1, { label: '', slug: '' }] })}
                      className="text-[11px] font-bold text-blue-600 uppercase flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span> Add Branch
                    </button>
                  </div>

                  {formData.hierarchyMode === 'board-class' && (
                    <>
                      <div className="pt-2 border-t border-slate-200 mt-4">
                        <FormLabel label="Level 2 Label (e.g. Class)" />
                        <FormInput
                          value={formData.level2Label}
                          onChange={(e) => setFormData({ ...formData, level2Label: e.target.value })}
                          placeholder="e.g. Class"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-[11px] font-black text-slate-500 mb-1 uppercase tracking-wider">Level 2 Branches</label>
                        {formData.branchesL2.map((b, idx) => (
                          <div key={idx} className="flex gap-2">
                            <FormInput
                              value={b.label}
                              onChange={(e) => {
                                const newB = [...formData.branchesL2];
                                newB[idx].label = e.target.value;
                                setFormData({ ...formData, branchesL2: newB });
                              }}
                              placeholder="Label"
                              className="flex-1"
                            />
                            <FormInput
                              value={b.slug}
                              onChange={(e) => {
                                const newB = [...formData.branchesL2];
                                newB[idx].slug = e.target.value;
                                setFormData({ ...formData, branchesL2: newB });
                              }}
                              placeholder="Slug"
                              className="flex-1"
                            />
                            <button
                              onClick={() => {
                                const newB = formData.branchesL2.filter((_, i) => i !== idx);
                                setFormData({ ...formData, branchesL2: newB });
                              }}
                              className="bg-red-50 text-red-500 w-10 h-10 rounded-xl flex items-center justify-center"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => setFormData({ ...formData, branchesL2: [...formData.branchesL2, { label: '', slug: '' }] })}
                          className="text-[11px] font-bold text-blue-600 uppercase flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">add</span> Add Class Branch
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <FormLabel label="Category Image" />
              <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Recommended: 400x320 px (1.25:1 Ratio)</span>
            </div>
            <div className="flex gap-2">
              <FormInput
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="Paste URL or upload image"
                className="bg-white border-slate-200 placeholder:text-slate-300 flex-1"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-indigo-900 text-white px-5 rounded-xl flex items-center gap-2 font-bold text-sm hover:bg-indigo-950 transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">cloud_upload</span>
                Upload
              </button>
            </div>
            {formData.imageUrl && (
              <div className="mt-2 relative w-20 h-20 rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => setFormData({ ...formData, imageUrl: '' })}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </div>
      </DrawerBody>

      <div className="p-6 border-t border-gray-100 flex gap-3 bg-white">
        <button
          onClick={onClose}
          className="flex-1 h-12 rounded-xl bg-slate-50 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all"
        >
          Cancel
        </button>
        <button
          onClick={() => onSubmit(formData)}
          className="flex-1 h-12 rounded-xl bg-blue-600 text-white font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
        >
          {editingCategory ? 'Update Category' : 'Create Category'}
        </button>
      </div>
    </RightSideDrawer>
  );
};

export default AddCategoryDrawer;
