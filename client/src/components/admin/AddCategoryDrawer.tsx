import React, { useState, useEffect } from 'react';
import { RightSideDrawer, DrawerHeader, DrawerBody, DrawerFooter, FormLabel, FormInput, FormSelect, PrimaryButton } from './DrawerSystem';

const gradientOptions = [
  { value: 'from-blue-600 to-indigo-700', label: 'Blue to Indigo' },
  { value: 'from-orange-500 to-red-600', label: 'Orange to Red' },
  { value: 'from-teal-500 to-emerald-600', label: 'Teal to Emerald' },
  { value: 'from-purple-500 to-violet-600', label: 'Purple to Violet' },
  { value: 'from-pink-500 to-rose-600', label: 'Pink to Rose' },
  { value: 'from-cyan-500 to-blue-600', label: 'Cyan to Blue' },
  { value: 'from-amber-500 to-orange-600', label: 'Amber to Orange' },
  { value: 'from-green-500 to-teal-600', label: 'Green to Teal' },
];

interface AddCategoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  editingCategory: any;
  nextOrder: number;
}

const AddCategoryDrawer: React.FC<AddCategoryDrawerProps> = ({ isOpen, onClose, onSubmit, editingCategory, nextOrder }) => {
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    icon: 'category',
    gradient: 'from-blue-600 to-indigo-700',
    description: '',
    tag: '',
    order: nextOrder,
    isActive: true,
  });

  useEffect(() => {
    if (isOpen) {
      if (editingCategory) {
        setFormData({
          title: editingCategory.title,
          subtitle: editingCategory.subtitle,
          icon: editingCategory.icon,
          gradient: editingCategory.gradient,
          description: editingCategory.description || '',
          tag: editingCategory.tag || '',
          order: editingCategory.order || nextOrder,
          isActive: editingCategory.isActive ?? true,
        });
      } else {
        setFormData({
          title: '',
          subtitle: '',
          icon: 'category',
          gradient: 'from-blue-600 to-indigo-700',
          description: '',
          tag: '',
          order: nextOrder,
          isActive: true,
        });
      }
    }
  }, [isOpen, editingCategory, nextOrder]);

  return (
    <RightSideDrawer isOpen={isOpen} onClose={onClose}>
      <DrawerHeader title={editingCategory ? 'Edit Category' : 'Add Category'} onClose={onClose} />
      <DrawerBody>
        <div className="space-y-4">
          <div>
            <FormLabel label="Title" required />
            <FormInput value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Category Title" />
          </div>
          <div>
            <FormLabel label="Subtitle" />
            <FormInput value={formData.subtitle} onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })} placeholder="Category Subtitle" />
          </div>
          <div>
            <FormLabel label="Icon (Material Icon Name)" />
            <FormInput value={formData.icon} onChange={(e) => setFormData({ ...formData, icon: e.target.value })} placeholder="e.g. school, science" />
          </div>
          <div>
            <FormLabel label="Gradient" />
            <FormSelect
              value={formData.gradient}
              onChange={(val) => setFormData({ ...formData, gradient: val })}
              options={gradientOptions}
            />
          </div>
          <div>
            <FormLabel label="Description" />
            <FormInput value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Brief description" />
          </div>
          <div>
            <FormLabel label="Tag (Optional)" />
            <FormInput value={formData.tag} onChange={(e) => setFormData({ ...formData, tag: e.target.value })} placeholder="e.g. NEW, HOT" />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <input type="checkbox" id="catActive" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="w-4 h-4" />
            <label htmlFor="catActive" className="text-[14px] font-bold">Active</label>
          </div>
        </div>
      </DrawerBody>
      <DrawerFooter>
        <PrimaryButton onClick={() => onSubmit(formData)}>Save Category</PrimaryButton>
      </DrawerFooter>
    </RightSideDrawer>
  );
};

export default AddCategoryDrawer;
