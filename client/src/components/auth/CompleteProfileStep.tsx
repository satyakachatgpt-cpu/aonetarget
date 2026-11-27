import React, { useState } from 'react';
import { indiaStateDistrictMap } from '../../utils/indiaStates';

interface CompleteProfileStepProps {
  formData: {
    name: string;
    gender: string;
    state: string;
    district: string;
    higherEducation: string;
    otherEducation?: string;
    password: string;
    confirmPassword: string;
  };
  setFormData: (data: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  loading: boolean;
  errors?: Record<string, string>;
}

export const CompleteProfileStep: React.FC<CompleteProfileStepProps> = ({
  formData,
  setFormData,
  onSubmit,
  onBack,
  loading,
  errors = {},
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const higherEducationOptions = [
    '10th Pass',
    '12th Pass',
    'Graduate',
    'Post Graduate',
    'Other'
  ];

  const handleGenderSelect = (gender: string) => {
    setFormData({ ...formData, gender });
  };

  const handleEducationSelect = (edu: string) => {
    setFormData({ 
      ...formData, 
      higherEducation: edu,
      ...(edu !== 'Other' ? { otherEducation: '' } : {})
    });
  };

  const availableDistricts = formData.state ? indiaStateDistrictMap[formData.state] || [] : [];

  return (
    <div className="flex flex-col h-full w-full bg-white relative">
      {/* Top Bar with Back Arrow */}
      <div className="px-5 pt-4 pb-1 flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-indigo-50/80 hover:bg-indigo-100 active:scale-95 text-[#5C59E8] transition-all cursor-pointer shadow-sm border border-indigo-100"
          aria-label="Back"
        >
          <span className="material-symbols-rounded text-xl font-bold">arrow_back</span>
        </button>
        <span className="text-[10px] font-black uppercase tracking-widest text-[#5C59E8] bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
          Step 2 of 2
        </span>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-5 py-2 space-y-2.5 hide-scrollbar">
          {/* Compact Centered Avatar Badge matching mockup */}
          <div className="flex flex-col items-center text-center -mt-1 mb-1">
            <div className="relative mb-1">
              <div className="w-14 h-14 rounded-full bg-[#EEF0FE] flex items-center justify-center shadow-inner">
                <span className="material-symbols-rounded text-3xl text-[#5C59E8]">
                  person
                </span>
              </div>
              {/* Checkmark circle badge at bottom right */}
              <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[#5C59E8] text-white flex items-center justify-center ring-2 ring-white shadow-sm">
                <span className="material-symbols-rounded text-xs font-black">
                  check
                </span>
              </div>
            </div>

            <h2 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
              Complete Profile
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              Just a few details to get started
            </p>
          </div>

          {/* Full Name * */}
          <div>
            <label className="text-[11px] font-bold text-slate-800 block mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="material-symbols-rounded text-slate-400 text-lg absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                person
              </span>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter your full name"
                className={`w-full pl-10 pr-3 py-2.5 bg-white border ${
                  errors.name ? 'border-red-500' : 'border-slate-200'
                } rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-[#5C59E8] focus:ring-2 focus:ring-[#5C59E8]/10 transition-all`}
              />
            </div>
            {errors.name && <p className="text-red-500 text-[10px] mt-0.5 font-semibold">{errors.name}</p>}
          </div>

          {/* Gender * */}
          <div>
            <label className="text-[11px] font-bold text-slate-800 block mb-1">
              Gender <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleGenderSelect('Male')}
                className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                  formData.gender === 'Male'
                    ? 'bg-[#EEF0FE] border-2 border-[#5C59E8] text-[#5C59E8] shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="text-sm font-black">♂</span>
                <span>Male</span>
              </button>

              <button
                type="button"
                onClick={() => handleGenderSelect('Female')}
                className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                  formData.gender === 'Female'
                    ? 'bg-[#EEF0FE] border-2 border-[#5C59E8] text-[#5C59E8] shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="text-sm font-black">♀</span>
                <span>Female</span>
              </button>

              <button
                type="button"
                onClick={() => handleGenderSelect('Other')}
                className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                  formData.gender === 'Other'
                    ? 'bg-[#EEF0FE] border-2 border-[#5C59E8] text-[#5C59E8] shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="material-symbols-rounded text-base">person</span>
                <span>Other</span>
              </button>
            </div>
            {errors.gender && <p className="text-red-500 text-[10px] mt-0.5 font-semibold">{errors.gender}</p>}
          </div>

          {/* State & District in side-by-side small boxes */}
          <div className="grid grid-cols-2 gap-2">
            {/* State */}
            <div>
              <label className="text-[11px] font-bold text-slate-800 block mb-1">
                State <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  required
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value, district: '' })}
                  className={`w-full px-3 py-2.5 bg-white border ${
                    errors.state ? 'border-red-500' : 'border-slate-200'
                  } rounded-xl text-xs font-semibold focus:outline-none focus:border-[#5C59E8] focus:ring-2 focus:ring-[#5C59E8]/10 appearance-none pr-8 transition-all text-slate-700`}
                >
                  <option value="">Select State</option>
                  {Object.keys(indiaStateDistrictMap).sort().map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
                <span className="material-symbols-rounded text-slate-400 text-lg absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  expand_more
                </span>
              </div>
              {errors.state && <p className="text-red-500 text-[10px] mt-0.5 font-semibold">{errors.state}</p>}
            </div>

            {/* District */}
            <div>
              <label className="text-[11px] font-bold text-slate-800 block mb-1">
                District <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  required
                  disabled={!formData.state}
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  className={`w-full px-3 py-2.5 bg-white border ${
                    errors.district ? 'border-red-500' : 'border-slate-200'
                  } rounded-xl text-xs font-semibold focus:outline-none focus:border-[#5C59E8] focus:ring-2 focus:ring-[#5C59E8]/10 appearance-none pr-8 transition-all text-slate-700 disabled:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  <option value="">Select District</option>
                  {availableDistricts.sort().map((dist: string) => (
                    <option key={dist} value={dist}>{dist}</option>
                  ))}
                </select>
                <span className="material-symbols-rounded text-slate-400 text-lg absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  expand_more
                </span>
              </div>
              {errors.district && <p className="text-red-500 text-[10px] mt-0.5 font-semibold">{errors.district}</p>}
            </div>
          </div>

          {/* Higher Education * */}
          <div>
            <label className="text-[11px] font-bold text-slate-800 block mb-1">
              Higher Education <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="material-symbols-rounded text-[#5C59E8] text-lg absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                school
              </span>
              <select
                required
                value={formData.higherEducation}
                onChange={(e) => handleEducationSelect(e.target.value)}
                className={`w-full pl-9 pr-8 py-2.5 bg-white border ${
                  errors.higherEducation ? 'border-red-500' : 'border-slate-200'
                } rounded-xl text-xs font-semibold focus:outline-none focus:border-[#5C59E8] focus:ring-2 focus:ring-[#5C59E8]/10 appearance-none transition-all text-slate-700`}
              >
                <option value="">Select qualification</option>
                {higherEducationOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <span className="material-symbols-rounded text-slate-400 text-lg absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                expand_more
              </span>
            </div>
            {errors.higherEducation && (
              <p className="text-red-500 text-[10px] mt-0.5 font-semibold">{errors.higherEducation}</p>
            )}
          </div>

          {/* DYNAMIC OTHER QUALIFICATION INPUT */}
          {formData.higherEducation === 'Other' && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-150">
              <label className="text-[11px] font-bold text-slate-800 block mb-1">
                Specify Qualification <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="material-symbols-rounded text-[#5C59E8] text-lg absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  history_edu
                </span>
                <input
                  type="text"
                  required
                  value={formData.otherEducation || ''}
                  onChange={(e) => setFormData({ ...formData, otherEducation: e.target.value })}
                  placeholder="e.g. Diploma, B.Sc, B.Tech, BDS"
                  className="w-full pl-10 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#5C59E8] focus:ring-2 focus:ring-[#5C59E8]/10 transition-all"
                />
              </div>
            </div>
          )}

          {/* Password & Confirm Password side-by-side to eliminate extra scrolling */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
            <div>
              <label className="text-[11px] font-bold text-slate-800 block mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Min 6 chars"
                  className={`w-full pl-3 pr-8 py-2 bg-white border ${
                    errors.password ? 'border-red-500' : 'border-slate-200'
                  } rounded-xl text-xs font-medium focus:outline-none focus:border-[#5C59E8] focus:ring-2 focus:ring-[#5C59E8]/10 transition-all`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <span className="material-symbols-rounded text-base">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-[10px] mt-0.5 font-semibold">{errors.password}</p>}
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-800 block mb-1">
                Confirm <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Re-enter"
                  className={`w-full pl-3 pr-8 py-2 bg-white border ${
                    errors.confirmPassword ? 'border-red-500' : 'border-slate-200'
                  } rounded-xl text-xs font-medium focus:outline-none focus:border-[#5C59E8] focus:ring-2 focus:ring-[#5C59E8]/10 transition-all`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <span className="material-symbols-rounded text-base">
                    {showConfirmPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-[10px] mt-0.5 font-semibold">{errors.confirmPassword}</p>
              )}
            </div>
          </div>
        </div>

        {/* Submit Action CTA Button */}
        <div className="px-5 py-3 border-t border-slate-100 bg-white shrink-0">
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-gradient-to-r from-[#1A237E] via-[#283593] to-[#3949AB] hover:opacity-95 active:scale-[0.99] text-white rounded-xl font-black text-xs sm:text-sm tracking-wide shadow-lg shadow-indigo-900/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving Profile...</span>
              </span>
            ) : (
              <>
                <span>Save & Continue</span>
                <span className="material-symbols-rounded text-lg">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
