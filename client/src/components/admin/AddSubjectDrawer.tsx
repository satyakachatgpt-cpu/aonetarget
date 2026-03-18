import React, { useState, useEffect } from 'react';
import { RightSideDrawer, DrawerHeader, DrawerBody, DrawerFooter, FormLabel, FormInput, FormSelect, PrimaryButton } from './DrawerSystem';

interface AddSubjectDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  editingSubject: any;
}

const AddSubjectDrawer: React.FC<AddSubjectDrawerProps> = ({ isOpen, onClose, onSubmit, editingSubject }) => {
  const [formData, setFormData] = useState({
    name: '',
    course: '',
    icon: 'school',
    status: 'active',
  });

  useEffect(() => {
    if (isOpen) {
      if (editingSubject) {
        setFormData({
          name: editingSubject.name,
          course: editingSubject.course || '',
          icon: editingSubject.icon,
          status: editingSubject.status || 'active',
        });
      } else {
         setFormData({
            name: '',
            course: '',
            icon: 'school',
            status: 'active',
         });
      }
    }
  }, [isOpen, editingSubject]);

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
            <FormLabel label="Course" />
            <FormInput value={formData.course} onChange={(e) => setFormData({ ...formData, course: e.target.value })} placeholder="e.g. NEET UG, Class 12" />
          </div>
          <div>
             <FormLabel label="Icon (Material Icon Name)" />
            <FormInput value={formData.icon} onChange={(e) => setFormData({ ...formData, icon: e.target.value })} placeholder="e.g. science, school" />
          </div>
          <div>
            <FormLabel label="Status" />
            <FormSelect
               value={formData.status}
               onChange={(val) => setFormData({ ...formData, status: val })}
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
