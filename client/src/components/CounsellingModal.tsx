import React, { useState, useEffect } from 'react';
import { counsellingAPI } from '../services/communicationService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  showToast: (msg: string, type: 'success' | 'error') => void;
  categories?: any[];
}

const CounsellingModal: React.FC<Props> = ({ isOpen, onClose, student, showToast, categories = [] }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    message: '',
    interestedCategory: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && student) {
      setFormData({
        name: student.name || '',
        phone: student.phone || '',
        email: student.email || '',
        message: '',
        interestedCategory: ''
      });
      setErrors({});
      setTouched({});
    }
  }, [isOpen, student]);

  const validate = (data: typeof formData) => {
    const newErrors: Record<string, string> = {};

    // Name
    const name = data.name.trim();
    if (!name) newErrors.name = 'Full name is required';
    else if (name.length < 2) newErrors.name = 'Min 2 characters required';
    else if (name.length > 80) newErrors.name = 'Max 80 characters allowed';
    else if (!/^[a-zA-Z\s.'-]+$/.test(name) || /^[0-9\W]+$/.test(name)) {
      newErrors.name = 'Name contains invalid characters';
    }

    // Phone
    const phone = data.phone.trim();
    if (!phone) newErrors.phone = 'Mobile number is required';
    else if (phone.length !== 10) {
      newErrors.phone = 'Please enter a valid 10-digit mobile number';
    } else if (!/^[6-9]/.test(phone)) {
      newErrors.phone = 'Mobile number must start with 6, 7, 8, or 9';
    } else if (/^(\d)\1{9}$/.test(phone) || phone === '1234567890') {
      newErrors.phone = 'Please enter a valid mobile number';
    }

    // Email
    if (data.email) {
      const email = data.email.trim();
      if (email.length > 120) newErrors.email = 'Email is too long';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        newErrors.email = 'Invalid email format';
      }
    }

    // Category
    if (!data.interestedCategory) {
      newErrors.interestedCategory = 'Please select a category';
    }

    // Message
    const message = data.message.trim();
    if (!message) newErrors.message = 'Please enter your concern';
    else if (message.length < 5) newErrors.message = 'Min 5 characters required';
    else if (message.length > 500) newErrors.message = 'Max 500 characters allowed';

    return newErrors;
  };

  if (!isOpen) return null;

  const handleBlur = (field: string) => {
    setTouched({ ...touched, [field]: true });
    setErrors(validate(formData));
  };

  const handlePhonePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    
    // Reject if contains non-digits OR length > 10
    if (!/^\d+$/.test(pastedData) || pastedData.length > 10) {
      setErrors(prev => ({ 
        ...prev, 
        phone: 'Please enter only 10 digits without +91, spaces, or symbols.' 
      }));
      setTouched(prev => ({ ...prev, phone: true }));
      return;
    }

    setFormData(prev => ({ ...prev, phone: pastedData }));
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.phone;
      return newErrors;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors = validate(formData);
    setErrors(validationErrors);
    setTouched({
      name: true,
      phone: true,
      email: true,
      interestedCategory: true,
      message: true
    });

    if (Object.keys(validationErrors).length > 0) {
      showToast('Please fix the errors in the form', 'error');
      return;
    }

    setLoading(true);
    try {
      await counsellingAPI.submitLead({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        message: formData.message.trim() || undefined,
        interestedCategory: formData.interestedCategory,
        studentId: student?._id || student?.id
      });
      showToast('Request sent successfully. Our team will contact you soon.', 'success');
      onClose();
    } catch (error: any) {
      showToast(error.message || 'Failed to submit request', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-lg rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-slide-in-bottom max-h-[90vh]">
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <span className="material-symbols-rounded text-white text-3xl">support_agent</span>
            </div>
            <div>
              <h3 className="text-white font-black text-xl">Free Counselling</h3>
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Expert Career Guidance</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 text-white transition-all active:scale-90">
            <span className="material-symbols-rounded text-2xl">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar bg-gray-50/50">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name *</label>
              <div className="relative">
                <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">person</span>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  onBlur={() => handleBlur('name')}
                  placeholder="Enter your name"
                  className={`w-full h-12 bg-white border ${errors.name && touched.name ? 'border-red-500 focus:ring-red-500/20' : 'border-gray-100 focus:ring-amber-500/20'} rounded-2xl pl-11 pr-4 text-sm font-bold focus:border-amber-500 outline-none transition-all`}
                />
              </div>
              {errors.name && touched.name && (
                <p className="text-[10px] font-bold text-red-500 ml-1 mt-1 animate-fade-in">{errors.name}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mobile Number *</label>
              <div className="relative">
                <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">call</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  value={formData.phone}
                  onChange={e => {
                    const val = e.target.value;
                    // For typing: allow only digits and max 10
                    if (/^\d*$/.test(val) && val.length <= 10) {
                      setFormData({ ...formData, phone: val });
                    }
                  }}
                  onPaste={handlePhonePaste}
                  onBlur={() => handleBlur('phone')}
                  placeholder="10-digit mobile number"
                  className={`w-full h-12 bg-white border ${errors.phone && touched.phone ? 'border-red-500 focus:ring-red-500/20' : 'border-gray-100 focus:ring-amber-500/20'} rounded-2xl pl-11 pr-4 text-sm font-bold focus:border-amber-500 outline-none transition-all`}
                />
              </div>
              {errors.phone && touched.phone && (
                <p className="text-[10px] font-bold text-red-500 ml-1 mt-1 animate-fade-in">{errors.phone}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address (Optional)</label>
              <div className="relative">
                <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">mail</span>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  onBlur={() => handleBlur('email')}
                  placeholder="Enter your email"
                  className={`w-full h-12 bg-white border ${errors.email && touched.email ? 'border-red-500 focus:ring-red-500/20' : 'border-gray-100 focus:ring-amber-500/20'} rounded-2xl pl-11 pr-4 text-sm font-bold focus:border-amber-500 outline-none transition-all`}
                />
              </div>
              {errors.email && touched.email && (
                <p className="text-[10px] font-bold text-red-500 ml-1 mt-1 animate-fade-in">{errors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Interested Stream/Category *</label>
              <div className="relative">
                <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg z-10">category</span>
                <select
                  value={formData.interestedCategory}
                  onChange={e => setFormData({ ...formData, interestedCategory: e.target.value })}
                  onBlur={() => handleBlur('interestedCategory')}
                  className={`w-full h-12 bg-white border ${errors.interestedCategory && touched.interestedCategory ? 'border-red-500 focus:ring-red-500/20' : 'border-gray-100 focus:ring-amber-500/20'} rounded-2xl pl-11 pr-4 text-sm font-bold focus:border-amber-500 outline-none transition-all appearance-none cursor-pointer`}
                >
                  <option value="">Select interested category</option>
                  <option value="Not Sure">Not Sure / Need Guidance</option>
                  {categories.map((cat: any) => (
                    <option key={cat.id || cat._id} value={cat.title}>
                      {cat.title}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-rounded absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
              </div>
              {errors.interestedCategory && touched.interestedCategory && (
                <p className="text-[10px] font-bold text-red-500 ml-1 mt-1 animate-fade-in">{errors.interestedCategory}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Your Message/Concern *</label>
              <textarea
                value={formData.message}
                onChange={e => setFormData({ ...formData, message: e.target.value })}
                onBlur={() => handleBlur('message')}
                placeholder="Tell us how we can help you..."
                rows={3}
                className={`w-full bg-white border ${errors.message && touched.message ? 'border-red-500 focus:ring-red-500/20' : 'border-gray-100 focus:ring-amber-500/20'} rounded-2xl p-4 text-sm font-bold focus:border-amber-500 outline-none transition-all resize-none`}
              />
              {errors.message && touched.message && (
                <p className="text-[10px] font-bold text-red-500 ml-1 mt-1 animate-fade-in">{errors.message}</p>
              )}
            </div>
          </div>

          <div className="p-6 pt-2 bg-white border-t border-gray-100 shrink-0 sticky bottom-0">
            <button
              disabled={loading}
              type="submit"
              className="w-full h-14 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span className="material-symbols-rounded">send</span>
                  Request Counselling
                </>
              )}
            </button>
            <p className="text-center text-[10px] text-gray-400 mt-4 font-medium italic">
              Our experts will get in touch within 24 working hours.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CounsellingModal;
