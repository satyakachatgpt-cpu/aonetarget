import React, { useState, useEffect } from 'react';
import { RightSideDrawer, DrawerHeader, DrawerBody, DrawerFooter, FormLabel, FormInput, FormSelect, PrimaryButton } from './DrawerSystem';

const colorOptions = [
  { value: 'bg-blue-500', label: 'Blue' },
  { value: 'bg-red-500', label: 'Red' },
  { value: 'bg-green-500', label: 'Green' },
  { value: 'bg-orange-500', label: 'Orange' },
  { value: 'bg-purple-500', label: 'Purple' },
  { value: 'bg-teal-500', label: 'Teal' },
  { value: 'bg-amber-500', label: 'Amber' },
  { value: 'bg-indigo-500', label: 'Indigo' },
  { value: 'bg-pink-500', label: 'Pink' },
  { value: 'bg-cyan-500', label: 'Cyan' },
];

interface AddSubcategoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  editingSubcategory: any;
  categories: any[];
  defaultCategoryId: string;
  nextOrder: number;
}

const AddSubcategoryDrawer: React.FC<AddSubcategoryDrawerProps> = ({ isOpen, onClose, onSubmit, editingSubcategory, categories, defaultCategoryId, nextOrder }) => {
  const [formData, setFormData] = useState({
    title: '',
    categoryId: defaultCategoryId,
    parentPath: '',
    icon: 'folder',
    color: 'bg-blue-500',
    description: '',
    order: nextOrder,
    isActive: true,
  });

  useEffect(() => {
    if (isOpen) {
      if (editingSubcategory) {
        setFormData({
          title: editingSubcategory.title,
          categoryId: editingSubcategory.categoryId,
          parentPath: editingSubcategory.parentPath || '',
          icon: editingSubcategory.icon,
          color: editingSubcategory.color,
          description: editingSubcategory.description || '',
          order: editingSubcategory.order || nextOrder,
          isActive: editingSubcategory.isActive ?? true,
        });
      } else {
        setFormData({
         title: '',
         categoryId: defaultCategoryId || (categories[0]?.id || ''),
         parentPath: '',
         icon: 'folder',
         color: 'bg-blue-500',
         description: '',
         order: nextOrder,
         isActive: true,
        });
      }
    }
  }, [isOpen, editingSubcategory, nextOrder, defaultCategoryId, categories]);

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
               onChange={(val) => setFormData({ ...formData, categoryId: val })}
               options={categories.map(c => ({ value: c.id || c._id, label: c.title }))}
               placeholder="Select Category"
            />
          </div>
          <div>
            <FormLabel label="Parent Path" />
            <FormInput value={formData.parentPath} onChange={(e) => setFormData({ ...formData, parentPath: e.target.value })} placeholder="e.g. Science / Biology" />
          </div>
          <div>
            <FormLabel label="Icon (Material Icon Name)" />
            <FormInput value={formData.icon} onChange={(e) => setFormData({ ...formData, icon: e.target.value })} placeholder="e.g. folder, menu_book" />
          </div>
          <div>
            <FormLabel label="Icon Color" />
            <FormSelect
              value={formData.color}
              onChange={(val) => setFormData({ ...formData, color: val })}
              options={colorOptions}
            />
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
