import React, { useState, useEffect, useRef } from 'react';
import { RightSideDrawer, DrawerBody } from './DrawerSystem';
import CustomDropdown from './CustomDropdown';
import RichTextEditor from '../shared/RichTextEditor';

interface AddTestDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    editingTest?: any;
    courses: any[];
    defaultCourseId?: string;
}




const AddTestDrawer: React.FC<AddTestDrawerProps> = ({ isOpen, onClose, onSubmit, editingTest, courses, defaultCourseId }) => {
    const [activeTab, setActiveTab] = useState<'basic' | 'advanced'>('basic');
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        courseId: '',
        price: '',
        mrp: '',
        sortBy: '0.00',
        status: 'active' as 'active' | 'inactive',
        image: null as string | null,
        validity: '',
        expiryMode: 'Validity' as 'Validity' | 'End Date' | 'Lifetime Access',
        duration: '',
        noOfQuestions: '0',
    });
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [showCategoryOptions, setShowCategoryOptions] = useState(false);
    const [showMorePricingOptions, setShowMorePricingOptions] = useState(false);
    const [advSettings, setAdvSettings] = useState({
        disableCoupons: false,
        enableCombo: false,
        includeTestMaker: false,
        allowPayment: true,
        metaTitle: '',
        metaDescription: '',
        enableRichSnippets: false,
    });

    useEffect(() => {
        if (isOpen) {
            if (editingTest) {
                setFormData({
                    name: editingTest.name || '',
                    description: editingTest.description || '',
                    courseId: editingTest.courseId || '',
                    price: editingTest.price?.toString() || '',
                    mrp: editingTest.mrp?.toString() || '',
                    sortBy: editingTest.sortBy?.toString() || '0.00',
                    status: editingTest.status === 'active' ? 'active' : 'inactive',
                    image: editingTest.logo || null,
                    validity: editingTest.validity || '',
                    expiryMode: editingTest.expiryMode || 'Validity',
                    duration: editingTest.duration?.toString() || '',
                    noOfQuestions: editingTest.noOfQuestions?.toString() || editingTest.questions?.toString() || '0',
                });
                setImagePreview(editingTest.logo || null);
                setAdvSettings({
                    disableCoupons: !!editingTest.disableCoupons,
                    enableCombo: !!editingTest.enableCombo,
                    includeTestMaker: !!editingTest.includeTestMaker,
                    allowPayment: editingTest.allowPayment !== false,
                    metaTitle: editingTest.metaTitle || '',
                    metaDescription: editingTest.metaDescription || '',
                    enableRichSnippets: !!editingTest.enableRichSnippets,
                });
            } else {
                setFormData({
                    name: '',
                    description: '',
                    courseId: '',
                    price: '',
                    mrp: '',
                    sortBy: '0.00',
                    status: 'active',
                    image: null,
                    validity: '',
                    expiryMode: 'Validity',
                    duration: '180',
                    noOfQuestions: '0',
                });
                setImagePreview(null);
                setAdvSettings({
                    disableCoupons: false,
                    enableCombo: false,
                    includeTestMaker: false,
                    allowPayment: true,
                    metaTitle: '',
                    metaDescription: '',
                    enableRichSnippets: false,
                });
            }
            setActiveTab('basic');
            setShowCategoryOptions(false);

            if (!editingTest && defaultCourseId) {
                setFormData(prev => ({ ...prev, courseId: defaultCourseId }));
            }
        }
    }, [isOpen, editingTest, defaultCourseId]);

    const handleFileSelect = (file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            setImagePreview(base64);
            setFormData(prev => ({ ...prev, image: base64 }));
        };
        reader.readAsDataURL(file);
    };

    return (
        <RightSideDrawer isOpen={isOpen} onClose={onClose} width="850px">
            <div className="flex flex-col h-full bg-white font-sans overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center px-10 py-6 border-b border-gray-100 shrink-0">
                    <h2 className="text-[20px] font-bold text-[#1e1e1e]">Add Test</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-black transition-colors">
                        <span className="material-symbols-outlined text-[28px]">close</span>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex px-10 border-b border-gray-100 bg-white shrink-0">
                    <button
                        onClick={() => setActiveTab('basic')}
                        className={`flex-1 py-5 text-[15px] font-bold transition-all relative flex items-center justify-center ${activeTab === 'basic' ? 'text-black' : 'text-gray-400'}`}>
                        Basic Details
                        {activeTab === 'basic' && <div className="absolute bottom-0 left-12 right-12 h-[3px] bg-black rounded-t-full" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('advanced')}
                        className={`flex-1 py-5 text-[15px] font-bold transition-all relative flex items-center justify-center ${activeTab === 'advanced' ? 'text-black' : 'text-gray-400'}`}>
                        Advanced Settings
                        {activeTab === 'advanced' && <div className="absolute bottom-0 left-12 right-12 h-[3px] bg-black rounded-t-full" />}
                    </button>
                </div>

                <DrawerBody className="flex-1 overflow-y-auto hide-scrollbar bg-white">
                    <div className="px-5 py-8 space-y-12 pb-24">
                        {activeTab === 'basic' ? (
                            <>
                                {/* Upload Image */}
                                <div className="space-y-3">
                                    <label className="text-[14px] font-bold text-gray-700 block ml-1">Upload Image<span className="text-red-500">*</span></label>
                                    <div className="flex gap-8">
                                        <div className="w-[240px] aspect-[1.4] bg-[#eeeeee] rounded-[32px] flex flex-col items-center justify-center relative overflow-hidden shrink-0 border border-gray-100">
                                            {imagePreview ? (
                                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 text-gray-400">
                                                    <span className="material-symbols-outlined text-[48px] opacity-40">image</span>
                                                    <span className="text-[14px] font-bold">No Image</span>
                                                </div>
                                            )}
                                        </div>
                                        <div
                                            onClick={() => document.getElementById('file-upload-input')?.click()}
                                            className="flex-1 border-2 border-dashed border-gray-200 rounded-[32px] flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-gray-50 transition-all bg-white">
                                            <input
                                                type="file"
                                                id="file-upload-input"
                                                className="hidden"
                                                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                                                accept="image/*"
                                            />
                                            <p className="text-[24px] font-bold text-[#b5b5b5]">Upload Image</p>
                                            <p className="text-[14px] text-[#d4d4d4] font-medium">Click or Drag &amp; Drop your file here.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Title */}
                                <div className="space-y-2">
                                    <label className="text-[14px] font-bold text-gray-700 ml-1">Title<span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        placeholder="Enter Title"
                                        className="w-full h-[60px] px-6 bg-white border border-gray-200 rounded-2xl text-[16px] font-medium outline-none focus:border-gray-300 transition-all placeholder:text-gray-300 shadow-sm"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                {/* Description — New CKEditor-style Toolbar */}
                                <div className="space-y-3">
                                    <RichTextEditor
                                        label="Description"
                                        content={formData.description}
                                        onChange={(val) => setFormData(prev => ({ ...prev, description: val }))}
                                    />
                                </div>



                                {/* Category */}
                                <div className="">
                                    <div className="space-y-2">
                                        <label className="text-[13px] font-bold text-[#2d3748] ml-1 uppercase tracking-wider opacity-60">Category (Exam)<span className="text-red-500 ml-0.5">*</span></label>
                                        <CustomDropdown
                                            options={courses.map(c => ({ value: c.id, label: c.name || c.title || '' }))}
                                            value={formData.courseId}
                                            onChange={(val: any) => setFormData({ ...formData, courseId: val })}
                                            placeholder="Choose Course or Exam"
                                            searchPlaceholder="Type to filter..."
                                        />
                                    </div>
                                    {!showCategoryOptions ? (
                                        <div className="flex justify-start pl-1 mt-4">
                                            <button
                                                onClick={() => setShowCategoryOptions(true)}
                                                className="text-[#718096] text-[13px] font-bold flex items-center gap-1.5 hover:text-black transition-colors group">
                                                <span className="w-5 h-5 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-gray-100 pb-0.5 transition-colors">
                                                    <span className="material-symbols-outlined text-[16px]">add</span>
                                                </span>
                                                Show Advanced Metadata
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-8 animate-in slide-in-from-top-2 duration-300 mt-6 pt-6 border-t border-dashed border-gray-100">
                                            <div className="grid grid-cols-2 gap-8">
                                                <div className="space-y-2">
                                                    <label className="text-[13px] font-bold text-[#2d3748] ml-1 uppercase tracking-wider opacity-60">Status</label>
                                                    <div className="flex bg-[#f8f8f8] p-1 rounded-2xl h-[54px] border border-gray-100">
                                                        <button type="button"
                                                            onClick={() => setFormData({ ...formData, status: 'active' })}
                                                            className={`flex-1 rounded-xl font-bold text-[13px] transition-all ${formData.status === 'active' ? 'bg-white text-[#1a1a1a] shadow-sm' : 'text-gray-400'}`}>
                                                            Enabled
                                                        </button>
                                                        <button type="button"
                                                            onClick={() => setFormData({ ...formData, status: 'inactive' })}
                                                            className={`flex-1 rounded-xl font-bold text-[13px] transition-all ${formData.status === 'inactive' ? 'bg-white text-[#1a1a1a] shadow-sm' : 'text-gray-400'}`}>
                                                            Disabled
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex justify-start pl-1">
                                                <button
                                                    onClick={() => setShowCategoryOptions(false)}
                                                    className="text-[#718096] text-[13px] font-bold flex items-center gap-1.5 hover:text-black transition-colors group">
                                                    <span className="w-5 h-5 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-gray-100 pb-0.5 transition-colors">
                                                        <span className="material-symbols-outlined text-[16px]">remove</span>
                                                    </span>
                                                    Hide Advanced Metadata
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Pricing */}
                                <div className="space-y-6 pt-6 border-t border-gray-100">
                                    <h4 className="text-[18px] font-bold text-gray-800 tracking-tight">Pricing</h4>
                                    <div className="grid grid-cols-2 gap-10">
                                        <div className="space-y-2">
                                            <label className="text-[14px] font-bold text-gray-700 ml-1">Selling Price<span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                placeholder="Enter Selling Price"
                                                className="w-full h-[60px] px-6 bg-white border border-gray-200 rounded-2xl text-[16px] font-bold outline-none focus:border-gray-300 transition-all placeholder:text-gray-300 shadow-sm"
                                                value={formData.price}
                                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                            />
                                            <p className="text-[13px] text-gray-400 font-medium pt-1 pl-1">This is the final price users will pay.</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[14px] font-bold text-gray-700 ml-1">MRP</label>
                                            <input
                                                type="text"
                                                placeholder="-1"
                                                className="w-full h-[60px] px-6 bg-white border border-gray-200 rounded-2xl text-[16px] font-bold outline-none focus:border-gray-300 transition-all placeholder:text-gray-300 shadow-sm"
                                                value={formData.mrp}
                                                onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end pr-1">
                                        <button 
                                            type="button"
                                            onClick={() => setShowMorePricingOptions(!showMorePricingOptions)}
                                            className="text-[#4361EE] text-[15px] font-bold flex items-center gap-0.5 hover:underline">
                                            {showMorePricingOptions ? 'Hide Options' : 'More Options'} <span className={`material-symbols-outlined text-[22px] transition-transform ${showMorePricingOptions ? 'rotate-180' : ''}`}>expand_more</span>
                                        </button>
                                    </div>
                                    {showMorePricingOptions && (
                                        <div className="grid grid-cols-2 gap-10 pt-4 animate-in slide-in-from-top-2 duration-300">
                                            <div className="space-y-2">
                                                <label className="text-[14px] font-bold text-gray-700 ml-1">Sorting Order</label>
                                                <input
                                                    type="text"
                                                    placeholder="0.00"
                                                    className="w-full h-[60px] px-6 bg-white border border-gray-200 rounded-2xl text-[16px] font-bold outline-none focus:border-gray-300 transition-all placeholder:text-gray-300 shadow-sm"
                                                    value={formData.sortBy}
                                                    onChange={(e) => setFormData({ ...formData, sortBy: e.target.value })}
                                                />
                                                <p className="text-[13px] text-gray-400 font-medium pt-1 pl-1">Higher values will appear first in lists.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Validity */}
                                <div className="space-y-6 pt-6 border-t border-gray-100">
                                    <h4 className="text-[18px] font-bold text-gray-800 tracking-tight">Validity</h4>
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[14px] font-bold text-gray-700 ml-1">Expiry Mode<span className="text-red-500">*</span></label>
                                            <div className="flex border border-gray-100 rounded-[24px] p-1.5 bg-[#f8f8f8]">
                                                {(['Validity', 'End Date', 'Lifetime Access'] as const).map((mode) => (
                                                    <button
                                                        key={mode}
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, expiryMode: mode })}
                                                        className={`flex-1 h-[52px] text-[14px] font-bold rounded-[20px] transition-all ${formData.expiryMode === mode ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}>
                                                        {mode}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        {formData.expiryMode === 'Validity' && (
                                            <div className="bg-[#fbfcff] border border-blue-50/50 rounded-[24px] p-8 space-y-4 shadow-sm animate-in slide-in-from-top-2 duration-300">
                                                <label className="text-[14px] font-bold text-gray-700 ml-1">Set Validity</label>
                                                <input
                                                    type="number"
                                                    placeholder="Enter validity (in months)"
                                                    className="w-full h-[60px] px-6 bg-white border border-gray-200 rounded-2xl text-[16px] font-bold outline-none focus:border-gray-300 transition-all placeholder:text-gray-300 shadow-sm"
                                                    value={formData.validity}
                                                    onChange={(e) => setFormData({ ...formData, validity: e.target.value })}
                                                />
                                            </div>
                                        )}
                                        {formData.expiryMode === 'End Date' && (
                                            <div className="bg-[#fbfcff] border border-blue-50/50 rounded-[24px] p-8 space-y-4 shadow-sm animate-in slide-in-from-top-2 duration-300">
                                                <label className="text-[14px] font-bold text-gray-700 ml-1">End Date</label>
                                                <input
                                                    type="date"
                                                    className="w-full h-[60px] px-6 bg-white border border-gray-200 rounded-2xl text-[16px] font-bold outline-none focus:border-gray-300 transition-all placeholder:text-gray-300 shadow-sm"
                                                    value={formData.validity}
                                                    onChange={(e) => setFormData({ ...formData, validity: e.target.value })}
                                                />
                                            </div>
                                        )}
                                        {formData.expiryMode === 'Lifetime Access' && (
                                            <div className="bg-[#fbfcff] border border-blue-50/50 rounded-[24px] p-8 shadow-sm flex flex-col items-center justify-center gap-3 animate-in slide-in-from-top-2 duration-300">
                                                <div className="w-[60px] h-[60px] bg-blue-50 rounded-full flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-[32px] text-blue-500">all_inclusive</span>
                                                </div>
                                                <div className="text-center space-y-1">
                                                    <h5 className="text-[16px] font-bold text-gray-800">Lifetime Access</h5>
                                                    <p className="text-[14px] text-gray-500 font-medium px-4">Students will have unlimited access to this content without any expiration date.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-0">

                                {/* Disable Discount Coupons */}
                                <div className="flex items-start justify-between py-5 border-b border-gray-100">
                                    <div>
                                        <p className="text-[15px] font-bold text-gray-800">Disable Discount Coupons</p>
                                        <p className="text-[13px] text-gray-400 font-medium mt-0.5">Switch on if you want to disable coupons for this test series</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setAdvSettings(p => ({ ...p, disableCoupons: !p.disableCoupons }))}
                                        className={`relative inline-flex h-[26px] w-[48px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${advSettings.disableCoupons ? 'bg-[#4361EE]' : 'bg-gray-200'
                                            }`}>
                                        <span className={`pointer-events-none inline-block h-[22px] w-[22px] rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${advSettings.disableCoupons ? 'translate-x-[22px]' : 'translate-x-0'
                                            }`} />
                                    </button>
                                </div>

                                {/* Additional Settings */}
                                <div className="pt-6 space-y-0">
                                    <h4 className="text-[16px] font-bold text-gray-800 mb-2">Additional Settings</h4>

                                    {/* Enable Combo */}
                                    <div className="flex items-start justify-between py-4 border-b border-gray-100">
                                        <div>
                                            <p className="text-[14px] font-bold text-gray-800">Enable Combo</p>
                                            <p className="text-[13px] text-gray-400 font-medium mt-0.5">Switch ON to combine and sell multiple test series as a single package</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setAdvSettings(p => ({ ...p, enableCombo: !p.enableCombo }))}
                                            className={`relative inline-flex h-[26px] w-[48px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${advSettings.enableCombo ? 'bg-[#4361EE]' : 'bg-gray-200'
                                                }`}>
                                            <span className={`pointer-events-none inline-block h-[22px] w-[22px] rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${advSettings.enableCombo ? 'translate-x-[22px]' : 'translate-x-0'
                                                }`} />
                                        </button>
                                    </div>

                                    {/* Include in Test Maker */}
                                    <div className="flex items-start justify-between py-4 border-b border-gray-100">
                                        <div>
                                            <p className="text-[14px] font-bold text-gray-800">Include in Test Maker</p>
                                            <p className="text-[13px] text-gray-400 font-medium mt-0.5">Switch ON to make this test series available in Test Maker, allowing users to create custom practice tests</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setAdvSettings(p => ({ ...p, includeTestMaker: !p.includeTestMaker }))}
                                            className={`relative inline-flex h-[26px] w-[48px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${advSettings.includeTestMaker ? 'bg-[#4361EE]' : 'bg-gray-200'
                                                }`}>
                                            <span className={`pointer-events-none inline-block h-[22px] w-[22px] rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${advSettings.includeTestMaker ? 'translate-x-[22px]' : 'translate-x-0'
                                                }`} />
                                        </button>
                                    </div>

                                    {/* Allow Payment */}
                                    <div className="flex items-start justify-between py-4 border-b border-gray-100">
                                        <div>
                                            <p className="text-[14px] font-bold text-gray-800">Allow Payment</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setAdvSettings(p => ({ ...p, allowPayment: !p.allowPayment }))}
                                            className={`relative inline-flex h-[26px] w-[48px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${advSettings.allowPayment ? 'bg-[#4361EE]' : 'bg-gray-200'
                                                }`}>
                                            <span className={`pointer-events-none inline-block h-[22px] w-[22px] rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${advSettings.allowPayment ? 'translate-x-[22px]' : 'translate-x-0'
                                                }`} />
                                        </button>
                                    </div>
                                </div>

                                {/* SEO Settings */}
                                <div className="pt-6 space-y-5">
                                    <h4 className="text-[16px] font-bold text-gray-800">SEO Settings</h4>

                                    <div className="space-y-2">
                                        <label className="text-[14px] font-bold text-gray-700 ml-1">Meta Title</label>
                                        <input
                                            type="text"
                                            placeholder="Enter Meta Title"
                                            className="w-full h-[52px] px-5 bg-white border border-gray-200 rounded-2xl text-[15px] font-medium outline-none focus:border-gray-400 transition-all placeholder:text-gray-300 shadow-sm"
                                            value={advSettings.metaTitle}
                                            onChange={(e) => setAdvSettings(p => ({ ...p, metaTitle: e.target.value }))}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[14px] font-bold text-gray-700 ml-1">Meta Description</label>
                                        <input
                                            type="text"
                                            placeholder="Enter Meta Description"
                                            className="w-full h-[52px] px-5 bg-white border border-gray-200 rounded-2xl text-[15px] font-medium outline-none focus:border-gray-400 transition-all placeholder:text-gray-300 shadow-sm"
                                            value={advSettings.metaDescription}
                                            onChange={(e) => setAdvSettings(p => ({ ...p, metaDescription: e.target.value }))}
                                        />
                                    </div>

                                    {/* Enable Rich Snippets */}
                                    <div className="flex items-start gap-4 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setAdvSettings(p => ({ ...p, enableRichSnippets: !p.enableRichSnippets }))}
                                            className={`relative inline-flex h-[26px] w-[48px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none mt-0.5 ${advSettings.enableRichSnippets ? 'bg-[#4361EE]' : 'bg-gray-200'
                                                }`}>
                                            <span className={`pointer-events-none inline-block h-[22px] w-[22px] rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${advSettings.enableRichSnippets ? 'translate-x-[22px]' : 'translate-x-0'
                                                }`} />
                                        </button>
                                        <div>
                                            <p className="text-[14px] font-bold text-gray-800">Enable Rich Snippets</p>
                                            <p className="text-[13px] text-gray-400 font-medium mt-0.5">Enable to boost search result visibility with rich snippets</p>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        )}

                        <div className="flex gap-4 pt-10 pb-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 h-[60px] bg-gray-100 text-gray-700 rounded-[20px] font-bold text-[15px] hover:bg-gray-200 transition-all active:scale-[0.98]"
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={() => {
                                    if (!formData.name.trim()) return alert("Please enter a test title.");
                                    onSubmit({ ...formData, ...advSettings });
                                }}
                                className="flex-[2] h-[60px] rounded-[20px] bg-[#1a1c1e] hover:bg-black text-white text-[16px] font-bold uppercase tracking-[0.1em] transition-all active:scale-[0.99] shadow-lg shadow-black/5">
                                {editingTest ? 'Save Changes' : 'Submit Test'}
                            </button>
                        </div>
                    </div>
                </DrawerBody>
            </div>

            <style>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </RightSideDrawer>
    );
};

export default AddTestDrawer;
