import React, { useState, useEffect } from 'react';
import { RightSideDrawer, DrawerHeader, DrawerBody, DrawerFooter, FormLabel, FormInput, FormSelect, PrimaryButton } from './DrawerSystem';

const iconOptions = [
  'biotech', 'groups', 'medical_services', 'menu_book', 'school', 'science',
  'calculate', 'public', 'language', 'bolt', 'video_library', 'cast_for_education',
  'edit_note', 'help_center', 'medical_information', 'shield_person', 'vaccines',
  'local_pharmacy', 'book_2', 'translate', 'workspace_premium', 'psychology',
  'architecture', 'sports_esports', 'palette', 'music_note'
];

const gradientOptions = [
  { value: 'from-blue-600 to-indigo-700', label: 'Blue to Indigo' },
  { value: 'from-orange-500 to-red-600', label: 'Orange to Red' },
  { value: 'from-teal-500 to-emerald-600', label: 'Teal to Emerald' },
  { value: 'from-purple-500 to-violet-600', label: 'Purple to Violet' },
  { value: 'from-indigo-800 to-blue-900', label: 'Dark blue' },
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
              <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-wider">Category ID</label>
              <FormInput
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                placeholder="e.g. neet"
                className="bg-white border-slate-200 placeholder:text-slate-300"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-wider">Order</label>
              <FormInput
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                placeholder="7"
                className="bg-white border-slate-200 placeholder:text-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-wider">Title</label>
            <FormInput
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. NEET"
              className="bg-white border-slate-200 placeholder:text-slate-300"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-wider">Subtitle</label>
            <FormInput
              value={formData.subtitle}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              placeholder="e.g. Medical Entrance"
              className="bg-white border-slate-200 placeholder:text-slate-300"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-wider">Description</label>
            <FormInput
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. Biology, Chemistry, Physics"
              className="bg-white border-slate-200 placeholder:text-slate-300"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-wider">Tag</label>
              <FormInput
                value={formData.tag}
                onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                placeholder="e.g. Most Popular"
                className="bg-white border-slate-200 placeholder:text-slate-300"
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
            <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-wider">Icon</label>
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
            <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-wider">Gradient</label>
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

          <div>
            <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-wider">Category Image</label>
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
