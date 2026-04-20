import React, { useState, useRef, useEffect, useContext } from 'react';
import { couponsAPI, coursesAPI, categoriesAPI, testSeriesAPI, pdfsAPI, packagesAPI, uploadAPI, subcategoriesAPI, subjectsAPI } from '../../services/apiClient';
import RichTextEditor from '../shared/RichTextEditor';
import { AdminUIContext } from '../../context/AdminUIContext';
import { getImageUrl, getVideoUrl, extractYouTubeId, toYouTubeEmbed } from '../../lib/utils';

interface Props {
    onClose: () => void;
    courseData?: any;
}

const AddCourse: React.FC<Props> = ({ onClose, courseData }) => {
    const isEditMode = !!courseData && !courseData.isDuplicate;
    const [activeStep, setActiveStep] = useState(1);
    const { setSidebarHidden } = useContext(AdminUIContext);
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        // Hide sidebar on mount
        setSidebarHidden(true);

        // Show sidebar on unmount
        return () => {
            setSidebarHidden(false);
        };
    }, [setSidebarHidden]);

    const [validityTab, setValidityTab] = useState<'set' | 'end' | 'lifetime'>('set');
    const [isFeatured, setIsFeatured] = useState(!!courseData?.isFeatured);
    const [showCategories, setShowCategories] = useState(false);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [validityUnit, setValidityUnit] = useState('Months');
    const [validityValue, setValidityValue] = useState('6');
    const [showValidityUnit, setShowValidityUnit] = useState(false);
    const [endDay, setEndDay] = useState('');
    const [endMonth, setEndMonth] = useState('');
    const [endYear, setEndYear] = useState('');
    const [coverImage, setCoverImage] = useState<string | null>(courseData?.thumbnail || courseData?.imageUrl || null);
    const [demoVideoUrl, setDemoVideoUrl] = useState(courseData?.demoVideo || '');
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [title, setTitle] = useState(courseData?.name || courseData?.title || '');
    const [price, setPrice] = useState(courseData?.price?.toString() || '');
    const [originalPrice, setOriginalPrice] = useState(courseData?.originalPrice?.toString() || '');
    const [gstIncluded, setGstIncluded] = useState(courseData?.gstIncluded || false);
    const [gstPercentage, setGstPercentage] = useState(courseData?.gstPercentage?.toString() || '');
    const [description, setDescription] = useState(courseData?.description || '');
    const [showAdditionalSettings, setShowAdditionalSettings] = useState(false);
    const [coupons, setCoupons] = useState<any[]>([]);
    const [loadingCoupons, setLoadingCoupons] = useState(false);
    const [selectedCoupons, setSelectedCoupons] = useState<string[]>([]);
    const [showCouponList, setShowCouponList] = useState(false);
    const [couponSearch, setCouponSearch] = useState('');
    const [categories, setCategories] = useState<any[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(false);
    const [selectedSubCategoryId, setSelectedSubCategoryId] = useState(courseData?.subcategoryId || '');
    const [showSubCategories, setShowSubCategories] = useState(false);
    const [allSubCategories, setAllSubCategories] = useState<any[]>([]);
    const [loadingSubCategories, setLoadingSubCategories] = useState(false);
    const [allSubjects, setAllSubjects] = useState<any[]>([]);
    const [level1Branch, setLevel1Branch] = useState(courseData?.level1Branch || '');
    const [level2Branch, setLevel2Branch] = useState(courseData?.level2Branch || '');
    const [selectedSubjectId, setSelectedSubjectId] = useState(courseData?.subjectId || '');
    const [selectedCategoryId, setSelectedCategoryId] = useState(courseData?.categoryId || '');
    const [showLevel1Branch, setShowLevel1Branch] = useState(false);
    const [showLevel2Branch, setShowLevel2Branch] = useState(false);
    const [showSubjects, setShowSubjects] = useState(false);


    // Advanced Settings States
    const [easyEmi, setEasyEmi] = useState(false);
    const [isCombo, setIsCombo] = useState(false);
    const [intlUptick, setIntlUptick] = useState(false);
    const [allowUpgrade, setAllowUpgrade] = useState(false);

    // Step 3: Content States
    const [selectedTestSeries, setSelectedTestSeries] = useState<string[]>([]);
    const [showTestSeriesList, setShowTestSeriesList] = useState(false);
    const [testSeriesSearch, setTestSeriesSearch] = useState('');
    const [selectedBook, setSelectedBook] = useState('');
    const [showBookList, setShowBookList] = useState(false);
    const [upsellCourses, setUpsellCourses] = useState(false);
    const [selectedUpsellCourses, setSelectedUpsellCourses] = useState<string[]>([]);
    const [showUpsellList, setShowUpsellList] = useState(false);
    const [upsellSearch, setUpsellSearch] = useState('');
    const [allCourses, setAllCourses] = useState<any[]>([]);
    const [loadingCourses, setLoadingCourses] = useState(true);

    // Step 4: Additional Settings States
    const [sortingOrder, setSortingOrder] = useState('');
    const [customBadge, setCustomBadge] = useState('');
    const [showTabs, setShowTabs] = useState(false);
    const [markNewBatch, setMarkNewBatch] = useState(false);
    const [enableDownloads, setEnableDownloads] = useState(false);
    const [disableCoupon, setDisableCoupon] = useState(false);
    const [disableInvoice, setDisableInvoice] = useState(false);
    const [enableTelegram, setEnableTelegram] = useState(false);
    const [metaTitle, setMetaTitle] = useState('');
    const [metaDescription, setMetaDescription] = useState('');
    const [enableRichSnippets, setEnableRichSnippets] = useState(false);
    const [courseLanguage, setCourseLanguage] = useState('English');
    const [showMoreOptions, setShowMoreOptions] = useState(false);
    const [uploadedPdf, setUploadedPdf] = useState<File | null>(null);
    const [isPublishing, setIsPublishing] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Initialize with courseData if editing
    useEffect(() => {
        if (courseData) {
            setTitle(courseData.name || courseData.title || '');
            setDescription(courseData.description || '');
            setPrice(courseData.price?.toString() || '');
            setOriginalPrice(courseData.originalPrice?.toString() || '');
            setCoverImage(courseData.thumbnail || courseData.imageUrl || null);
            setIsFeatured(!!courseData.isFeatured);

            if (courseData.categories) {
                setSelectedCategories(Array.isArray(courseData.categories) ? courseData.categories : [courseData.categories]);
            }

            if (courseData.subcategoryId) {
                setSelectedSubCategoryId(courseData.subcategoryId);
            }

            if (courseData.categoryId) {
                setSelectedCategoryId(courseData.categoryId);
            }

            if (courseData.level1Branch) {
                setLevel1Branch(courseData.level1Branch);
            }

            if (courseData.level2Branch) {
                setLevel2Branch(courseData.level2Branch);
            }

            if (courseData.subjectId) {
                setSelectedSubjectId(courseData.subjectId);
            }

            if (courseData.validity) {
                setValidityTab(courseData.validity.tab || 'set');
                setValidityUnit(courseData.validity.unit || 'Months');
                setValidityValue(courseData.validity.value?.toString() || '6');
                if (courseData.validity.endDate) {
                    const parts = courseData.validity.endDate.split('-');
                    if (parts.length === 3) {
                        setEndDay(parts[0]);
                        setEndMonth(parts[1]);
                        setEndYear(parts[2]);
                    }
                }
            }

                // Additional Settings from courseData.settings
                if (courseData.settings) {
                    setGstIncluded(!!courseData.settings.gstIncluded);
                    if (courseData.settings.gstPercentage) setGstPercentage(courseData.settings.gstPercentage.toString());
                    setEasyEmi(!!courseData.settings.easyEmi);
                    setIsCombo(!!courseData.settings.isCombo);
                    setIntlUptick(!!courseData.settings.intlUptick);
                    setAllowUpgrade(!!courseData.settings.allowUpgrade);
                    setSortingOrder(courseData.settings.sortingOrder?.toString() || '0.00');
                    setCustomBadge(courseData.settings.customBadge || '');
                    setMarkNewBatch(!!courseData.settings.markNewBatch);
                    setEnableDownloads(!!courseData.settings.enableDownloads);
                    setDisableCoupon(!!courseData.settings.disableCoupon);
                    setDisableInvoice(!!courseData.settings.disableInvoice);
                    setEnableTelegram(!!courseData.settings.enableTelegram);
                    setShowTabs(!!courseData.settings.showTabs);
                }

            if (courseData.content) {
                setSelectedTestSeries(courseData.content.testSeries || []);
                setSelectedBook(courseData.content.book || '');
                if (courseData.content.upsell) {
                    setUpsellCourses(!!courseData.content.upsell.enabled);
                    setSelectedUpsellCourses(courseData.content.upsell.courses || []);
                }
            }
        }
    }, [courseData]);

    // Legacy Subject Hydration fallback
    useEffect(() => {
        if (courseData && !courseData.subjectId && courseData.subject && allSubjects.length > 0 && !selectedSubjectId) {
            const found = allSubjects.find(s => s.name === courseData.subject);
            if (found) {
                setSelectedSubjectId(String(found.id || found._id));
            }
        }
    }, [allSubjects, courseData]);

    const [testSeriesList, setTestSeriesList] = useState<any[]>([]);
    const [booksList, setBooksList] = useState<any[]>([]);

    const editorRef = useRef<any>(null);

    const handleUploadProgress = (progressEvent: any) => {
        if (!progressEvent.total) return;
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(percent);
    };

    useEffect(() => {
        if (validityTab === 'set' && validityValue) {
            const now = new Date();
            const value = parseInt(validityValue);
            if (isNaN(value)) return;

            const futureDate = new Date(now);
            if (validityUnit === 'Days') futureDate.setDate(now.getDate() + value);
            else if (validityUnit === 'Weeks') futureDate.setDate(now.getDate() + (value * 7));
            else if (validityUnit === 'Months') futureDate.setMonth(now.getMonth() + value);
            else if (validityUnit === 'Years') futureDate.setFullYear(now.getFullYear() + value);

            setEndDay(futureDate.getDate().toString().padStart(2, '0'));
            setEndMonth((futureDate.getMonth() + 1).toString().padStart(2, '0'));
            setEndYear(futureDate.getFullYear().toString());
        }
    }, [validityValue, validityUnit, validityTab]);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Show a local object URL immediately as preview
            const localUrl = URL.createObjectURL(file);
            setCoverImage(localUrl);
            setIsUploadingImage(true);
            setUploadProgress(0);
            try {
                const data = await uploadAPI.uploadImage(file, { onUploadProgress: handleUploadProgress });
                setCoverImage(data.url); // Replace local URL with server URL
            } catch (error: any) {
                console.error('Image upload failed:', error);
                alert(`Image upload failed: ${error.message || 'Check that the server is running.'}`);
                setCoverImage(null); // Reset on failure
            } finally {
                setIsUploadingImage(false);
                setUploadProgress(0);
                // Reset file input so same file can be re-selected
                if (imageInputRef.current) imageInputRef.current.value = '';
            }
        }
    };


    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoadingCoupons(true);
                setLoadingCourses(true);
                setLoadingCategories(true);

                // Fetch coupons, courses, and categories in parallel
                const [couponsData, coursesData, categoriesData, testSeriesData, pdfsData, subcategoriesData, subjectsData] = await Promise.all([
                    couponsAPI.getAll().catch(() => []),
                    coursesAPI.getAll().catch(() => []),
                    categoriesAPI.getAll().catch(() => []),
                    testSeriesAPI.getAll().catch(() => []),
                    pdfsAPI.getAll().catch(() => []),
                    subcategoriesAPI.getAll().catch(() => []),
                    subjectsAPI.getAll().catch(() => [])
                ]);

                if (Array.isArray(couponsData)) {
                    setCoupons(couponsData.filter((c: any) => c.status === 'active'));
                }

                if (Array.isArray(coursesData)) {
                    // Filter out current course (if editing) or just set all
                    setAllCourses(coursesData);
                }

                if (Array.isArray(categoriesData)) {
                    setCategories(categoriesData);
                }

                if (Array.isArray(testSeriesData)) {
                    setTestSeriesList(testSeriesData);
                }

                if (Array.isArray(pdfsData)) {
                    setBooksList(pdfsData);
                }

                if (Array.isArray(subcategoriesData)) {
                    setAllSubCategories(subcategoriesData);
                }

                if (subjectsData) {
                    setAllSubjects(Array.isArray(subjectsData) ? subjectsData : (subjectsData?.data || []));
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
                // Demo fallbacks
                setCoupons([
                    { code: 'SAVE30', type: 'percentage', value: 30, status: 'active' },
                    { code: 'SAVE50', type: 'percentage', value: 50, status: 'active' },
                    { code: 'WELCOME10', type: 'percentage', value: 10, status: 'active' }
                ]);
                setAllCourses([
                    { title: 'Complete Web Development' },
                    { title: 'Advanced React Patterns' },
                    { title: 'Backend Engineering with Node.js' }
                ]);
            } finally {
                setLoadingCoupons(false);
                setLoadingCourses(false);
                setLoadingCategories(false);
            }
        };
        fetchData();
    }, []);

    const validateForm = () => {
        if (title.trim().length < 3) {
            alert("Batch title must be at least 3 characters long.");
            return false;
        }

        const p = parseFloat(price);
        if (price && (isNaN(p) || p < 0)) {
            alert("Selling price must be a valid positive number.");
            return false;
        }

        const op = parseFloat(originalPrice);
        if (originalPrice && (isNaN(op) || op < 0)) {
            alert("MRP must be a valid positive number.");
            return false;
        }

        return true;
    };

    const normalizeSubcategoryToContentType = (subId: string) => {
        if (!subId) return '';
        const id = subId.toLowerCase();
        
        // Explicit mappings for known buckets
        if (id.includes('recorded_batch') || id.includes('recorded-batch')) return 'recorded_batch';
        if (id.includes('live_classroom') || id.includes('live_class')) return 'live_classroom';
        if (id.includes('crash_course') || id.includes('crash-course')) return 'crash_course';
        if (id.includes('mock_test') || id.includes('mock-test')) return 'mock_test';
        
        // Generic singularization and cleanup fallback
        let normalized = id
            .replace(/neet_|iit_jee_|iit-jee_|nursing_cet_|foundation_/g, "")
            .replace(/batches/g, "batch")
            .replace(/-/g, "_");
            
        return normalized;
    };

    const handlePublish = async () => {
        if (!validateForm()) return;

        setIsPublishing(true);

        try {
            const selectedSubjectObj = allSubjects.find(s => String(s.id || s._id) === String(selectedSubjectId));
            
            // Auto-detect subcategory if empty but subject provides it
            const finalSubcategoryId = selectedSubCategoryId || selectedSubjectObj?.subcategoryId || '';

            const coursePayload = {
                name: title,
                title,
                description,
                price: price ? parseFloat(price) : 0,
                originalPrice: originalPrice ? parseFloat(originalPrice) : 0,
                categories: selectedCategories,
                categoryId: selectedCategoryId,
                subcategoryId: finalSubcategoryId,
                contentType: normalizeSubcategoryToContentType(finalSubcategoryId),
                level1Branch: level1Branch,
                level2Branch: level2Branch,
                subjectId: selectedSubjectId,
                subject: selectedSubjectObj?.name || '',
                validity: {
                    tab: validityTab,
                    unit: validityUnit,
                    value: validityValue,
                    endDate: validityTab === 'end' ? `${endDay}-${endMonth}-${endYear}` : null
                },
                thumbnail: coverImage,
                imageUrl: coverImage,
                demoVideo: toYouTubeEmbed(demoVideoUrl),
                settings: {
                    isFeatured,
                    gstIncluded,
                    gstPercentage: gstPercentage ? parseFloat(gstPercentage) : 0,
                    finalPrice: parseFloat(price) + (parseFloat(price) * (parseFloat(gstPercentage) || 0) / 100),
                    easyEmi,
                    isCombo,
                    intlUptick,
                    allowUpgrade,
                    sortingOrder: parseFloat(sortingOrder) || 0,
                    customBadge,
                    markNewBatch,
                    enableDownloads,
                    disableCoupon,
                    disableInvoice,
                    enableTelegram,
                    showTabs,
                    metaTitle,
                    metaDescription,
                    courseLanguage
                },
                content: {
                    testSeries: selectedTestSeries,
                    book: selectedBook,
                    upsell: {
                        enabled: upsellCourses,
                        courses: selectedUpsellCourses
                    }
                },
                status: courseData?.status || 'active'
            };

            const courseId = courseData?._id || courseData?.id;
            const isPackage = courseId?.toString().startsWith('pkg_');

            if (isEditMode) {
                console.log("Updating Course Data:", coursePayload);
                if (isPackage) {
                    await packagesAPI.update(courseId, coursePayload);
                } else {
                    await coursesAPI.update(courseId, coursePayload);
                }
                alert("Batch Updated Successfully!");
            } else {
                console.log("Publishing New Batch Data:", coursePayload);
                await coursesAPI.create(coursePayload);
                alert("Batch Published Successfully!");
            }

            onClose();
        } catch (error) {
            console.error("Publish Error:", error);
            alert("Failed to save batch. Please try again.");
        } finally {
            setIsPublishing(false);
        }
    };

    const steps = [
        { id: 1, label: 'Basic Batch Information' },
        { id: 2, label: 'Pricing' },
        { id: 3, label: 'Content' },
        { id: 4, label: 'Additional Settings' },
    ];

    const basePriceVal = parseFloat(price) || 0;
    const gstVal = parseFloat(gstPercentage) || 0;
    const finalPrice = gstIncluded && gstVal ? basePriceVal + (basePriceVal * gstVal / 100) : basePriceVal;

    return (
        <div className="min-h-screen bg-white animate-in fade-in duration-300 font-sans">
            {/* Top Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div>
                    <h2 className="text-[19px] font-bold text-gray-900 tracking-tight">
                        {isEditMode ? `Edit: ${courseData.name || courseData.title}` : 'Add New Batch'}
                    </h2>
                    <p className="text-[11px] text-gray-400 font-medium">Create and manage your batches from here</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-white border border-gray-200 rounded-sm text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
                    >
                        Discard
                    </button>
                    <button
                        onClick={handlePublish}
                        disabled={isPublishing || isUploadingImage}
                        className={`px-6 py-2 rounded-sm text-[13px] font-bold transition-all shadow-sm flex items-center gap-2 ${(isPublishing || isUploadingImage) ? 'bg-gray-400 cursor-not-allowed' : 'bg-black text-white hover:bg-gray-800'}`}
                    >
                        {(isPublishing || isUploadingImage) ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : 'Save & Publish'}
                        {!(isPublishing || isUploadingImage) && <span className="material-symbols-outlined text-[18px]">rocket_launch</span>}
                    </button>
                </div>
            </div>

            <div className="max-w-[1240px] mx-auto px-6 py-8">
                {/* Stepper */}
                <div className="flex items-center justify-center mb-12">
                    <div className="flex items-center w-full max-w-[840px]">
                        {steps.map((step, idx) => (
                            <React.Fragment key={step.id}>
                                <div className="flex flex-col items-center gap-2 group cursor-default">
                                    <div className={`w-9 h-9 rounded-sm flex items-center justify-center text-[13px] font-black transition-all duration-300 ${activeStep === step.id ? 'bg-black text-white shadow-lg shadow-black/20' : activeStep > step.id ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-300'}`}>
                                        {step.id}
                                    </div>
                                    <span className={`text-[11px] font-black uppercase tracking-widest transition-colors duration-300 ${activeStep === step.id ? 'text-black' : 'text-gray-400'}`}>
                                        {step.label.split(' ')[0]}
                                    </span>
                                </div>
                                {idx < steps.length - 1 && (
                                    <div className={`h-[2px] flex-1 mx-4 -mt-6 transition-all duration-500 ${activeStep > step.id ? 'bg-black' : 'bg-gray-100'}`} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                <div className="flex gap-10">
                    {/* Left Form Card */}
                    <div className="flex-1">
                        {/* Step 1: Basic Course Information */}
                        {activeStep === 1 && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500 overflow-visible">
                                {/* Title Row */}
                                <div className="grid grid-cols-1 gap-6 mb-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-semibold text-gray-700">Title*</label>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">description</span>
                                            <input
                                                type="text"
                                                placeholder="Batch Name"
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                className="w-full border border-gray-200 pl-10 pr-4 py-2.5 rounded-sm text-[14px] outline-none focus:border-gray-900 transition-all placeholder:text-gray-400"
                                            />
                                        </div>
                                        <div className="flex items-center gap-3 mt-4">
                                            <button onClick={() => setIsFeatured(!isFeatured)} className={`w-10 h-5 rounded-full relative transition-all duration-300 ${isFeatured ? 'bg-black' : 'bg-gray-200'}`}>
                                                <div className={`absolute top-[2px] transition-all duration-300 w-4 h-4 bg-white rounded-full ${isFeatured ? 'left-[22px]' : 'left-[2px]'}`} />
                                            </button>
                                            <span className="text-[13px] font-medium text-gray-700">Featured Batch</span>
                                        </div>
                                    </div>
                                </div>

                                 {/* Batch Description */}
                                 <div className="space-y-1.5 mb-8">
                                     <RichTextEditor
                                         key={courseData?._id || courseData?.id || 'new'}
                                         label="Batch Description"
                                         content={description}
                                         onChange={(content) => setDescription(content)}
                                         height="400px"
                                     />
                                 </div>

                                {/* Media Row */}
                                <div className="grid grid-cols-2 gap-6 mb-8">
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-semibold text-gray-700">Cover Image</label>
                                        <input type="file" ref={imageInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                                        <div onClick={() => !isUploadingImage && !coverImage && imageInputRef.current?.click()} className={`border border-dashed border-gray-300 rounded-sm p-6 flex flex-col items-center justify-center bg-white transition-all min-h-[140px] relative overflow-hidden shadow-sm ${coverImage ? '' : 'hover:bg-gray-50 cursor-pointer'}`}>
                                            {isUploadingImage ? (
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
                                                    <p className="text-[11px] text-gray-400 font-medium">Uploading...</p>
                                                </div>
                                            ) : coverImage ? (
                                                <>
                                                    <img
                                                        src={getImageUrl(coverImage)}
                                                        className="absolute inset-0 w-full h-full object-cover"
                                                        alt="Preview"
                                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                    />
                                                    <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); imageInputRef.current?.click(); }}
                                                            className="bg-white text-gray-800 text-[11px] font-bold px-3 py-1.5 rounded-sm shadow hover:bg-gray-100 transition-all"
                                                        >Change</button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); setCoverImage(null); }}
                                                            className="bg-red-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-sm shadow hover:bg-red-600 transition-all"
                                                        >Remove</button>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined text-gray-300 text-[32px] mb-2">image</span>
                                                    <p className="text-[13px] font-medium text-gray-500">Upload Image</p>
                                                    <p className="text-[11px] text-gray-400 text-center">Click or Drag & Drop your<br/>file here.</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-semibold text-gray-700">Demo Video (YouTube Link)</label>
                                        <input
                                            type="text"
                                            placeholder="Paste YouTube link: https://youtube.com/watch?v=..."
                                            value={demoVideoUrl}
                                            onChange={(e) => setDemoVideoUrl(e.target.value)}
                                            className="w-full border border-gray-200 px-4 py-2.5 rounded-sm text-[14px] outline-none focus:border-gray-900 transition-all placeholder:text-gray-400"
                                        />
                                        
                                        {/* Live preview when valid YouTube URL pasted */}
                                        {extractYouTubeId(demoVideoUrl) && (
                                            <div className="mt-2">
                                                <p className="text-[11px] text-green-600 font-bold uppercase tracking-wider flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                                    Valid YouTube link
                                                </p>
                                                <iframe
                                                    src={toYouTubeEmbed(demoVideoUrl)}
                                                    width="100%"
                                                    height="200"
                                                    allowFullScreen
                                                    title="Demo Video Preview"
                                                    className="rounded-sm mt-1 border border-gray-100 shadow-sm"
                                                />
                                            </div>
                                        )}
                                        
                                        {demoVideoUrl && !extractYouTubeId(demoVideoUrl) && (
                                            <p className="text-[11px] text-red-500 font-bold uppercase tracking-wider flex items-center gap-1 mt-1">
                                                <span className="material-symbols-outlined text-[14px]">error</span>
                                                Invalid YouTube link
                                            </p>
                                        )}
                                    </div>
                                </div>

                                 {/* Compact Selection Path */}
                                 <div className="mb-6 bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center gap-2 flex-wrap min-h-[44px]">
                                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2 flex items-center gap-1">
                                         <span className="material-symbols-outlined text-[14px]">account_tree</span>
                                         Path:
                                     </span>
                                     
                                     {/* Category Chip */}
                                     {selectedCategories[0] ? (
                                         <div className="flex items-center gap-2">
                                             <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[11px] font-bold rounded-sm border border-blue-200/50">
                                                 {selectedCategories[0]}
                                             </span>
                                             <span className="material-symbols-outlined text-slate-300 text-[14px]">chevron_right</span>
                                         </div>
                                     ) : (
                                         <span className="text-[11px] text-slate-300 italic">Select Category...</span>
                                     )}

                                     {/* Level 1 Chip */}
                                     {(() => {
                                         const cat = categories.find(c => String(c.id || c._id) === String(selectedCategoryId));
                                         if (cat && cat.branchesL1 && cat.branchesL1.length > 0) {
                                             const branch = cat.branchesL1.find((b: any) => b.slug === level1Branch);
                                             return (
                                                 <div className="flex items-center gap-2 animate-in fade-in transition-all">
                                                     <span className={`px-2 py-0.5 text-[11px] font-bold rounded-sm border ${level1Branch ? 'bg-indigo-100 text-indigo-800 border-indigo-200/50' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                                                         {branch?.label || (cat.level1Label || 'Branch')}
                                                     </span>
                                                     <span className="material-symbols-outlined text-slate-300 text-[14px]">chevron_right</span>
                                                 </div>
                                             );
                                         }
                                         return null;
                                     })()}

                                     {/* Level 2 Chip */}
                                     {(() => {
                                         const cat = categories.find(c => String(c.id || c._id) === String(selectedCategoryId));
                                         if (cat && cat.hierarchyMode === 'board-class' && cat.branchesL2 && cat.branchesL2.length > 0) {
                                             const branch = cat.branchesL2.find((b: any) => b.slug === level2Branch);
                                             return (
                                                 <div className="flex items-center gap-2 animate-in fade-in transition-all">
                                                     <span className={`px-2 py-0.5 text-[11px] font-bold rounded-sm border ${level2Branch ? 'bg-purple-100 text-purple-800 border-purple-200/50' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                                                         {branch?.label || (cat.level2Label || 'Class')}
                                                     </span>
                                                     <span className="material-symbols-outlined text-slate-300 text-[14px]">chevron_right</span>
                                                 </div>
                                             );
                                         }
                                         return null;
                                     })()}

                                     {/* Subcategory Chip */}
                                     {(() => {
                                         const cat = categories.find(c => String(c.id || c._id) === String(selectedCategoryId));
                                         if (!cat) return null;

                                         const hasL1 = cat.branchesL1 && cat.branchesL1.length > 0;
                                         const hasL2 = cat.hierarchyMode === 'board-class' && cat.branchesL2 && cat.branchesL2.length > 0;

                                         // Strict Path-Aware Filtering for Subcategories
                                         const filteredSubCategories = allSubCategories.filter(sub => 
                                             String(sub.categoryId) === String(selectedCategoryId) &&
                                             (hasL1 ? sub.level1Branch === level1Branch : true) &&
                                             (hasL2 ? sub.level2Branch === level2Branch : true)
                                         );

                                         const showSubCategoryStep = filteredSubCategories.length > 0 || (isEditMode && selectedSubCategoryId);

                                         if (showSubCategoryStep) {
                                             return (
                                                 <div className="flex items-center gap-2">
                                                     <div className={`flex items-center gap-2 animate-in fade-in transition-all ${selectedSubCategoryId ? 'opacity-100' : 'opacity-40'}`}>
                                                        <span className={`px-2 py-0.5 text-[11px] font-bold rounded-sm border ${selectedSubCategoryId ? 'bg-emerald-100 text-emerald-800 border-emerald-200/50' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                                                            {allSubCategories.find(s => String(s.id || s._id) === String(selectedSubCategoryId))?.title || 'Subcategory'}
                                                        </span>
                                                     </div>
                                                     <span className="material-symbols-outlined text-slate-300 text-[14px]">chevron_right</span>
                                                 </div>
                                             );
                                         }
                                         return null;
                                     })()}

                                     {/* Subject Chip */}
                                     {(() => {
                                         const subObj = allSubCategories.find(s => String(s.id || s._id) === String(selectedSubCategoryId));
                                         const cat = categories.find(c => String(c.id || c._id) === String(selectedCategoryId));
                                         if (!cat) return null;

                                         const hasL1 = cat?.branchesL1 && cat?.branchesL1.length > 0;
                                         const hasL2 = cat?.hierarchyMode === 'board-class' && cat?.branchesL2 && cat?.branchesL2.length > 0;
                                         
                                         // Strict Path-Aware Filtering for Subcategories
                                         const filteredSubCategories = allSubCategories.filter(sub => 
                                             String(sub.categoryId) === String(selectedCategoryId) &&
                                             (hasL1 ? sub.level1Branch === level1Branch : true) &&
                                             (hasL2 ? sub.level2Branch === level2Branch : true)
                                         );

                                         const showSubCategoryStep = filteredSubCategories.length > 0 || (isEditMode && selectedSubCategoryId);

                                         // Path is valid if branches are selected (if they exist)
                                         const isBranchPathSelected = (!hasL1 || level1Branch) && (!hasL2 || level2Branch);
                                         if (!isBranchPathSelected) return null;

                                         const filteredSubjects = allSubjects.filter(subj => 
                                             String(subj.categoryId) === String(selectedCategoryId) &&
                                             (hasL1 ? subj.level1Branch === level1Branch : true) &&
                                             (hasL2 ? subj.level2Branch === level2Branch : true) &&
                                             (showSubCategoryStep ? (selectedSubCategoryId ? (String(subj.subcategoryId) === String(selectedSubCategoryId) || subj.course === subObj?.title) : true) : true)
                                         );

                                         if (filteredSubjects.length > 0) {
                                             return (
                                                 <div className={`flex items-center gap-2 animate-in fade-in transition-all ${selectedSubjectId ? 'opacity-100' : 'opacity-40'}`}>
                                                     <span className={`px-2 py-0.5 text-[11px] font-bold rounded-sm border ${selectedSubjectId ? 'bg-amber-100 text-amber-800 border-amber-200/50' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                                                         {allSubjects.find(s => String(s.id || s._id) === String(selectedSubjectId))?.name || 'Subject'}
                                                     </span>
                                                 </div>
                                             );
                                         }
                                         return null;
                                     })()}
                                 </div>

                                 {/* Tighter Section Stack */}
                                 <div className="space-y-4">
                                     {/* STEP 1: Category */}
                                     <div className={`flex items-start gap-4 p-4 rounded-lg bg-white border border-slate-100 hover:border-slate-200 transition-all shadow-sm relative ${showCategories ? 'z-[9999]' : 'z-auto'}`}>
                                         <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[11px] font-black flex-shrink-0">01</div>
                                         <div className="flex-1 space-y-2">
                                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Primary Category*</label>
                                             <div className="relative">
                                                 <div onMouseDown={(e) => { e.preventDefault(); setShowCategories(!showCategories); setShowSubCategories(false); setShowLevel1Branch(false); setShowLevel2Branch(false); setShowSubjects(false); }} className="w-full border border-slate-200 px-3 py-2 rounded text-[13px] transition-all cursor-pointer flex items-center justify-between hover:border-blue-400 bg-white font-medium">
                                                     <span className={selectedCategories.length ? 'text-slate-900' : 'text-slate-400'}>{selectedCategories.length ? selectedCategories.join(', ') : 'Choose Category'}</span>
                                                     <span className={`material-symbols-outlined text-slate-400 transition-transform ${showCategories ? 'rotate-180' : ''} text-[18px]`}>expand_more</span>
                                                 </div>
                                                  {showCategories && (
                                                     <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded shadow-xl z-[10000] py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                                                         <div className="max-h-[250px] overflow-y-auto">
                                                             {categories.map((catObj: any) => {
                                                                 const catName = catObj.title || catObj.name;
                                                                 const catId = catObj.id || catObj._id;
                                                                 return (
                                                                     <div key={String(catId)} onMouseDown={(e) => {
                                                                         e.preventDefault();
                                                                         setSelectedCategories([catName]);
                                                                         setSelectedCategoryId(String(catId));
                                                                         // Cascading Reset
                                                                         setLevel1Branch('');
                                                                         setLevel2Branch('');
                                                                         setSelectedSubCategoryId('');
                                                                         setSelectedSubjectId('');
                                                                         setShowCategories(false);
                                                                     }} className={`px-4 py-2 text-[13px] cursor-pointer hover:bg-slate-50 flex items-center justify-between ${String(selectedCategoryId) === String(catId) ? 'text-blue-600 bg-blue-50 font-bold' : 'text-slate-600'}`}>
                                                                         {catName} {String(selectedCategoryId) === String(catId) && <span className="material-symbols-outlined text-[16px]">check_circle</span>}
                                                                     </div>
                                                                 );
                                                             })}
                                                         </div>
                                                     </div>
                                                 )}
                                             </div>
                                         </div>
                                     </div>

                                     {/* Dynamic Steps Block */}
                                     {selectedCategoryId && (() => {
                                         const selectedCatObj = categories.find(c => String(c.id || c._id) === String(selectedCategoryId));
                                         if (!selectedCatObj) return null;

                                         const mode = selectedCatObj.hierarchyMode || 'simple';
                                         const hasL1 = selectedCatObj.branchesL1 && selectedCatObj.branchesL1.length > 0;
                                         const hasL2 = mode === 'board-class' && selectedCatObj.branchesL2 && selectedCatObj.branchesL2.length > 0;

                                         // Strict Path-Aware Filtering for Subcategories
                                         const filteredSubCategories = allSubCategories.filter(sub => 
                                             String(sub.categoryId) === String(selectedCategoryId) &&
                                             (hasL1 ? sub.level1Branch === level1Branch : true) &&
                                             (hasL2 ? sub.level2Branch === level2Branch : true)
                                         );

                                         // Determine if subcategory step should be shown
                                         const showSubCategoryStep = filteredSubCategories.length > 0 || (isEditMode && selectedSubCategoryId);

                                         return (
                                             <div className="space-y-4 animate-in fade-in duration-500 overflow-visible">
                                                 {/* STEP 2: Level 1 (Branch/Board) */}
                                                 {hasL1 && (
                                                     <div className={`flex items-start gap-4 p-4 rounded-lg bg-white border border-slate-100 hover:border-slate-200 transition-all shadow-sm relative ${showLevel1Branch ? 'z-[9999]' : 'z-auto'}`}>
                                                         <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[11px] font-black flex-shrink-0">02</div>
                                                         <div className="flex-1 space-y-2">
                                                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{selectedCatObj.level1Label || 'Branch'}*</label>
                                                             <div className="relative">
                                                                 <div onMouseDown={(e) => { e.preventDefault(); setShowLevel1Branch(!showLevel1Branch); setShowLevel2Branch(false); setShowSubCategories(false); setShowSubjects(false); }} className="w-full border border-slate-200 px-3 py-2 rounded text-[13px] transition-all cursor-pointer flex items-center justify-between hover:border-blue-400 bg-white font-medium">
                                                                     <span className={level1Branch ? 'text-slate-900 font-bold' : 'text-slate-400'}>
                                                                         {selectedCatObj.branchesL1.find((b: any) => b.slug === level1Branch)?.label || `Select ${selectedCatObj.level1Label || 'Branch'}`}
                                                                     </span>
                                                                     <span className={`material-symbols-outlined text-slate-400 transition-transform ${showLevel1Branch ? 'rotate-180' : ''} text-[18px]`}>expand_more</span>
                                                                 </div>
                                                                 {showLevel1Branch && (
                                                                     <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded shadow-xl z-[101] py-1">
                                                                         {selectedCatObj.branchesL1.map((branch: any) => (
                                                                             <div key={branch.slug} onMouseDown={(e) => {
                                                                                 e.preventDefault();
                                                                                 setLevel1Branch(branch.slug);
                                                                                 setLevel2Branch('');
                                                                                 setSelectedSubCategoryId('');
                                                                                 setSelectedSubjectId('');
                                                                                 setShowLevel1Branch(false);
                                                                             }} className={`px-4 py-2 text-[13px] cursor-pointer hover:bg-slate-50 flex items-center justify-between ${level1Branch === branch.slug ? 'text-blue-600 bg-blue-50 font-bold' : 'text-slate-600'}`}>
                                                                                 {branch.label} {level1Branch === branch.slug && <span className="material-symbols-outlined text-[16px]">check_circle</span>}
                                                                             </div>
                                                                         ))}
                                                                     </div>
                                                                 )}
                                                             </div>
                                                         </div>
                                                     </div>
                                                 )}

                                                 {/* STEP 3: Level 2 (Class) */}
                                                 {hasL2 && (
                                                     <div className={`flex items-start gap-4 p-4 rounded-lg bg-white border border-slate-100 hover:border-slate-200 transition-all shadow-sm relative ${showLevel2Branch ? 'z-[9999]' : 'z-auto'}`}>
                                                         <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[11px] font-black flex-shrink-0">03</div>
                                                         <div className="flex-1 space-y-2">
                                                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{selectedCatObj.level2Label || 'Class'}*</label>
                                                             <div className="relative">
                                                                 <div onMouseDown={(e) => { e.preventDefault(); setShowLevel2Branch(!showLevel2Branch); setShowLevel1Branch(false); setShowSubCategories(false); setShowSubjects(false); }} className="w-full border border-slate-200 px-3 py-2 rounded text-[13px] transition-all cursor-pointer flex items-center justify-between hover:border-blue-400 bg-white font-medium">
                                                                     <span className={level2Branch ? 'text-slate-900 font-bold' : 'text-slate-400'}>
                                                                         {selectedCatObj.branchesL2.find((b: any) => b.slug === level2Branch)?.label || `Select ${selectedCatObj.level2Label || 'Class'}`}
                                                                     </span>
                                                                     <span className={`material-symbols-outlined text-slate-400 transition-transform ${showLevel2Branch ? 'rotate-180' : ''} text-[18px]`}>expand_more</span>
                                                                 </div>
                                                                 {showLevel2Branch && (
                                                                     <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded shadow-xl z-[101] py-1">
                                                                         {selectedCatObj.branchesL2.map((branch: any) => (
                                                                             <div key={branch.slug} onMouseDown={(e) => {
                                                                                 e.preventDefault();
                                                                                 setLevel2Branch(branch.slug);
                                                                                 setSelectedSubCategoryId('');
                                                                                 setSelectedSubjectId('');
                                                                                 setShowLevel2Branch(false);
                                                                             }} className={`px-4 py-2 text-[13px] cursor-pointer hover:bg-slate-50 flex items-center justify-between ${level2Branch === branch.slug ? 'text-blue-600 bg-blue-50 font-bold' : 'text-slate-600'}`}>
                                                                                 {branch.label} {level2Branch === branch.slug && <span className="material-symbols-outlined text-[16px]">check_circle</span>}
                                                                             </div>
                                                                         ))}
                                                                     </div>
                                                                 )}
                                                             </div>
                                                         </div>
                                                     </div>
                                                 )}

                                                 {/* STEP 4: Subcategory (Content Type) */}
                                                 {(() => {
                                                     const isPathValid = (!hasL1 || level1Branch) && (!hasL2 || (hasL2 && level2Branch));
                                                     if (!isPathValid || !showSubCategoryStep) return null;

                                                     let subStepCount = 1; if (hasL1) subStepCount++; if (hasL2) subStepCount++; subStepCount++;
                                                     const stepNum = String(subStepCount).padStart(2, "0");

                                                     return (
                                                         <div className={`flex items-start gap-4 p-4 rounded-lg bg-white border border-slate-100 hover:border-slate-200 transition-all shadow-sm relative ${showSubCategories ? 'z-[9999]' : 'z-auto'}`}>
                                                             <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[11px] font-black flex-shrink-0">{stepNum}</div>
                                                             <div className="flex-1 space-y-2">
                                                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Batch Type (Subcategory)*</label>
                                                                 <div className="relative">
                                                                     <div onMouseDown={(e) => { e.preventDefault(); setShowSubCategories(!showSubCategories); setShowLevel1Branch(false); setShowLevel2Branch(false); setShowSubjects(false); }} className="w-full border border-slate-200 px-3 py-2 rounded text-[13px] transition-all cursor-pointer flex items-center justify-between hover:border-blue-400 bg-white font-medium">
                                                                         <span className={selectedSubCategoryId ? 'text-slate-900 font-bold' : 'text-slate-400'}>
                                                                             {allSubCategories.find(s => String(s.id || s._id) === String(selectedSubCategoryId))?.title || 'Choose Subcategory'}
                                                                         </span>
                                                                         <span className={`material-symbols-outlined text-slate-400 transition-transform ${showSubCategories ? 'rotate-180' : ''} text-[18px]`}>expand_more</span>
                                                                     </div>
                                                                     {showSubCategories && (
                                                                         <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded shadow-xl z-[101] py-1">
                                                                             <div className="max-h-[200px] overflow-y-auto">
                                                                                 {filteredSubCategories.map((sub: any) => {
                                                                                     const subId = sub.id || sub._id;
                                                                                     return (
                                                                                         <div key={String(subId)} onMouseDown={(e) => {
                                                                                             e.preventDefault();
                                                                                             setSelectedSubCategoryId(String(subId));
                                                                                             setSelectedSubjectId('');
                                                                                             setShowSubCategories(false);
                                                                                         }} className={`px-4 py-2 text-[13px] cursor-pointer hover:bg-slate-50 flex items-center justify-between ${String(selectedSubCategoryId) === String(subId) ? 'text-blue-600 bg-blue-50 font-bold' : 'text-slate-600'}`}>
                                                                                             {sub.title} {String(selectedSubCategoryId) === String(subId) && <span className="material-symbols-outlined text-[16px]">check_circle</span>}
                                                                                         </div>
                                                                                     );
                                                                                 })}
                                                                             </div>
                                                                         </div>
                                                                     )}
                                                                 </div>
                                                             </div>
                                                         </div>
                                                     );
                                                 })()}

                                                  {/* STEP 5: Subjects */}
                                                  {(() => {
                                                       const isPathValid = (!hasL1 || level1Branch) && (!hasL2 || (hasL2 && level2Branch));
                                                       if (!isPathValid) return null;
                                                      const subObj = allSubCategories.find(s => String(s.id || s._id) === String(selectedSubCategoryId));
                                                      const filteredSubjects = allSubjects.filter(subj => 
                                                          String(subj.categoryId) === String(selectedCategoryId) &&
                                                          (hasL1 ? subj.level1Branch === level1Branch : true) &&
                                                          (hasL2 ? subj.level2Branch === level2Branch : true) &&
                                                          (showSubCategoryStep ? (selectedSubCategoryId ? (String(subj.subcategoryId) === String(selectedSubCategoryId) || subj.course === subObj?.title) : true) : true)
                                                      );

                                                      if (filteredSubjects.length === 0) return null;
                                                      
                                                      // Dynamic step mapping based on visibility
                                                      let subjectStepCount = 1; 
                                                      if (hasL1) subjectStepCount++; 
                                                      if (hasL2) subjectStepCount++; 
                                                      if (showSubCategoryStep) subjectStepCount++; 
                                                      subjectStepCount++; 
                                                      const stepNum = String(subjectStepCount).padStart(2, "0");

                                                      return (
                                                          <div className={`flex items-start gap-4 p-4 rounded-lg bg-white border border-slate-100 hover:border-slate-200 transition-all shadow-sm relative ${showSubjects ? 'z-[9999]' : 'z-auto'}`}>
                                                              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[11px] font-black flex-shrink-0">{stepNum}</div>
                                                              <div className="flex-1 space-y-2">
                                                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Subject*</label>
                                                                  <div className="relative">
                                                                      <div onMouseDown={(e) => { e.preventDefault(); setShowSubjects(!showSubjects); setShowLevel1Branch(false); setShowLevel2Branch(false); setShowSubCategories(false); }} className="w-full border border-slate-200 px-3 py-2 rounded text-[13px] transition-all cursor-pointer flex items-center justify-between hover:border-blue-400 bg-white font-medium">
                                                                          <span className={selectedSubjectId ? 'text-slate-900 font-bold' : 'text-slate-400'}>
                                                                              {allSubjects.find(s => String(s.id || s._id) === String(selectedSubjectId))?.name || 'Choose Subject'}
                                                                          </span>
                                                                          <span className={`material-symbols-outlined text-slate-400 transition-transform ${showSubjects ? 'rotate-180' : ''} text-[18px]`}>expand_more</span>
                                                                      </div>
                                                                      {showSubjects && (
                                                                          <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded shadow-xl z-[101] py-1">
                                                                              <div className="max-h-[200px] overflow-y-auto">
                                                                                  <div onMouseDown={(e) => { e.preventDefault(); setSelectedSubjectId(''); setShowSubjects(false); }} className="px-4 py-2 text-[13px] cursor-pointer hover:bg-slate-50 text-slate-400 italic">General / No Subject</div>
                                                                                  {filteredSubjects.map((subj) => {
                                                                                      const subjId = subj.id || subj._id;
                                                                                      return (
                                                                                          <div key={String(subjId)} onMouseDown={(e) => {
                                                                                              e.preventDefault();
                                                                                              setSelectedSubjectId(String(subjId));
                                                                                              setShowSubjects(false);
                                                                                          }} className={`px-4 py-2 text-[13px] cursor-pointer hover:bg-slate-50 flex items-center justify-between ${String(selectedSubjectId) === String(subjId) ? 'text-blue-600 bg-blue-50 font-bold' : 'text-slate-600'}`}>
                                                                                              {subj.name} {String(selectedSubjectId) === String(subjId) && <span className="material-symbols-outlined text-[16px]">check_circle</span>}
                                                                                          </div>
                                                                                      );
                                                                                  })}
                                                                              </div>
                                                                          </div>
                                                                      )}
                                                                  </div>
                                                              </div>
                                                          </div>
                                                      );
                                                  })()}
                                             </div>
                                         );
                                     })()}
                                 </div>

                                 {/* Validity Row */}
                                 <div className="pt-8 border-t border-gray-100 mb-8 space-y-6">
                                     <div className="flex items-center justify-between">
                                         <div>
                                             <h3 className="text-[15px] font-bold text-gray-900 tracking-tight">Batch Validity*</h3>
                                             <p className="text-[11px] text-gray-400 font-medium">When will this batch expire for students?</p>
                                         </div>
                                         <div className="bg-gray-100/80 p-1 rounded-sm flex gap-1 transform scale-90 origin-right">
                                             <button
                                                 onClick={() => setValidityTab('set')}
                                                 className={`px-4 py-1.5 rounded-sm text-[11px] font-black uppercase tracking-widest transition-all ${validityTab === 'set' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                             >Set Duration</button>
                                             <button
                                                 onClick={() => setValidityTab('end')}
                                                 className={`px-4 py-1.5 rounded-sm text-[11px] font-black uppercase tracking-widest transition-all ${validityTab === 'end' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                             >Fixed Date</button>
                                             <button
                                                 onClick={() => setValidityTab('lifetime')}
                                                 className={`px-4 py-1.5 rounded-sm text-[11px] font-black uppercase tracking-widest transition-all ${validityTab === 'lifetime' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                             >Lifetime</button>
                                         </div>
                                     </div>

                                     {validityTab === 'set' && (
                                         <div className="grid grid-cols-2 gap-6 animate-in slide-in-from-top-2 duration-300">
                                             <div className="space-y-1.5">
                                                 <label className="text-[13px] font-semibold text-gray-700">Duration Count</label>
                                                 <div className="relative">
                                                     <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">timer</span>
                                                     <input
                                                         type="number"
                                                         placeholder="Ex. 6"
                                                         value={validityValue}
                                                         onChange={(e) => setValidityValue(e.target.value)}
                                                         className="w-full border border-gray-200 pl-10 pr-4 py-2.5 rounded-sm text-[14px] outline-none focus:border-gray-900 transition-all placeholder:text-gray-400"
                                                     />
                                                 </div>
                                             </div>
                                             <div className="space-y-1.5">
                                                 <label className="text-[13px] font-semibold text-gray-700">Unit</label>
                                                 <div className="relative">
                                                    <div
                                                         onClick={() => setShowValidityUnit(!showValidityUnit)}
                                                         className="w-full border border-gray-200 px-4 py-2.5 rounded-sm text-[14px] cursor-pointer flex items-center justify-between hover:border-gray-300 bg-white font-medium"
                                                     >
                                                         {validityUnit}
                                                         <span className={`material-symbols-outlined text-gray-400 transition-transform ${showValidityUnit ? 'rotate-180' : ''}`}>expand_more</span>
                                                     </div>
                                                     {showValidityUnit && (
                                                         <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded shadow-lg z-[100] animate-in fade-in duration-200">
                                                             {['Days', 'Weeks', 'Months', 'Years'].map((unit) => (
                                                                 <div
                                                                     key={unit}
                                                                     onClick={() => { setValidityUnit(unit); setShowValidityUnit(false); }}
                                                                     className="px-4 py-2 text-[13px] text-gray-600 hover:bg-gray-50 cursor-pointer"
                                                                 >
                                                                     {unit}
                                                                 </div>
                                                             ))}
                                                         </div>
                                                     )}
                                                 </div>
                                             </div>
                                         </div>
                                     )}

                                     {validityTab === 'end' && (
                                         <div className="animate-in slide-in-from-top-2 duration-300 space-y-4">
                                             <div className="grid grid-cols-3 gap-3">
                                                 <div className="space-y-1">
                                                     <input
                                                         type="text"
                                                         placeholder="DD"
                                                         maxLength={2}
                                                         value={endDay}
                                                         onChange={(e) => {
                                                             const val = e.target.value.replace(/\D/g, '');
                                                             if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 31)) {
                                                                 setEndDay(val);
                                                             }
                                                         }}
                                                         className="w-full border border-gray-200 px-4 py-2.5 rounded-sm text-[14px] text-center outline-none focus:border-gray-900 bg-white font-medium shadow-sm transition-all focus:ring-2 focus:ring-black/5"
                                                     />
                                                     <p className="text-[9px] text-center text-gray-400 font-bold uppercase tracking-widest">Day</p>
                                                 </div>
                                                 <div className="space-y-1">
                                                     <input
                                                         type="text"
                                                         placeholder="MM"
                                                         maxLength={2}
                                                         value={endMonth}
                                                         onChange={(e) => {
                                                             const val = e.target.value.replace(/\D/g, '');
                                                             if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 12)) {
                                                                 setEndMonth(val);
                                                             }
                                                         }}
                                                         className="w-full border border-gray-200 px-4 py-2.5 rounded-sm text-[14px] text-center outline-none focus:border-gray-900 bg-white font-medium shadow-sm transition-all focus:ring-2 focus:ring-black/5"
                                                     />
                                                     <p className="text-[9px] text-center text-gray-400 font-bold uppercase tracking-widest">Month</p>
                                                 </div>
                                                 <div className="space-y-1">
                                                     <input
                                                         type="text"
                                                         placeholder="YYYY"
                                                         maxLength={4}
                                                         value={endYear}
                                                         onChange={(e) => {
                                                             const val = e.target.value.replace(/\D/g, '');
                                                             setEndYear(val);
                                                         }}
                                                         className="w-full border border-gray-200 px-4 py-2.5 rounded-sm text-[14px] text-center outline-none focus:border-gray-900 bg-white font-medium shadow-sm transition-all focus:ring-2 focus:ring-black/5"
                                                     />
                                                     <p className="text-[9px] text-center text-gray-400 font-bold uppercase tracking-widest">Year</p>
                                                 </div>
                                             </div>
                                             <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-sm border border-amber-100">
                                                 <span className="material-symbols-outlined text-amber-500 text-[18px]">info</span>
                                                 <p className="text-[11px] text-amber-700 font-medium">The course will automatically expire for all users on this date.</p>
                                             </div>
                                         </div>
                                     )}

                                     {validityTab === 'lifetime' && (
                                         <div className="mt-4 p-5 bg-black rounded-sm border border-gray-800 animate-in zoom-in-95 duration-300 shadow-xl">
                                             <div className="flex items-center gap-4">
                                                 <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center shrink-0">
                                                     <span className="material-symbols-outlined text-white text-[24px]">all_inclusive</span>
                                                 </div>
                                                 <div>
                                                     <p className="text-[14px] font-black text-white uppercase tracking-wider">Lifetime Access</p>
                                                     <p className="text-[11px] text-gray-400 font-medium">This course will never expire for enrolled students. They will have access as long as the platform exists.</p>
                                                 </div>
                                             </div>
                                         </div>
                                     )}
                                 </div>
                             </div>
                         )}

                         {/* Step 2: Pricing */}
                         {activeStep === 2 && (
                             <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
                                 <div className="grid grid-cols-2 gap-6 mb-6">
                                      {/* Price Field */}
                                      <div className="space-y-1.5">
                                         <label className="text-[13px] font-semibold text-gray-700">Price*</label>
                                         <div className="relative">
                                             <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">currency_rupee</span>
                                             <input
                                                 type="text"
                                                 placeholder="Enter Price"
                                                 value={price}
                                                 onChange={(e) => setPrice(e.target.value)}
                                                 className="w-full border border-gray-200 pl-10 pr-4 py-2.5 rounded-sm text-[14px] outline-none focus:border-gray-900 transition-all placeholder:text-gray-400"
                                             />
                                         </div>
                                         <p className="text-[11px] text-gray-400 mt-1">
                                              {gstIncluded && gstVal ? (
                                                  <span className="text-gray-600 font-medium">Base Price: ₹{basePriceVal} + {gstVal}% GST = <span className="text-black font-bold">Final Price: ₹{finalPrice.toFixed(2)}</span></span>
                                              ) : 'This is the final price student will pay'}
                                         </p>
                                     </div>

                                      {/* MRP Field */}
                                      <div className="space-y-1.5">
                                         <label className="text-[13px] font-semibold text-gray-700">Market Price (MRP)</label>
                                         <div className="relative">
                                             <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">currency_rupee</span>
                                             <input
                                                 type="text"
                                                 placeholder="999"
                                                 value={originalPrice}
                                                 onChange={(e) => setOriginalPrice(e.target.value)}
                                                 className="w-full border border-gray-200 pl-10 pr-4 py-2.5 rounded-sm text-[14px] outline-none focus:border-gray-900 transition-all placeholder:text-gray-400"
                                             />
                                         </div>
                                         <p className="text-[11px] text-gray-400 mt-1">Display the maximum price to show internal discount percentages.</p>
                                     </div>
                                 </div>

                                 <div className="grid grid-cols-2 gap-6 pb-2">
                                      {/* GST Include Switch */}
                                      <div className="space-y-1.5 flex flex-col justify-center">
                                          <label className="text-[13px] font-semibold text-gray-700">Include GST</label>
                                          <div className="flex items-center gap-3 mt-1">
                                             <button onClick={() => setGstIncluded(!gstIncluded)} className={`w-10 h-6 rounded-full relative transition-all duration-300 ${gstIncluded ? 'bg-black' : 'bg-gray-200'}`}>
                                                 <div className={`absolute top-[2px] transition-all duration-300 w-5 h-5 bg-white rounded-full shadow-sm border border-gray-200/50 ${gstIncluded ? 'left-[18px]' : 'left-[2px]'}`} />
                                             </button>
                                             <span className="text-[13px] font-medium text-gray-700">{gstIncluded ? 'Yes' : 'No'}</span>
                                         </div>
                                      </div>

                                      {/* GST Percentage */}
                                      {gstIncluded && (
                                      <div className="space-y-1.5 animate-in fade-in zoom-in duration-300">
                                          <label className="text-[13px] font-semibold text-gray-700">GST Percentage (%)</label>
                                          <div className="relative">
                                              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">percent</span>
                                              <input
                                                  type="number"
                                                  placeholder="18"
                                                  value={gstPercentage}
                                                  onChange={(e) => setGstPercentage(e.target.value)}
                                                  className="w-full border border-gray-200 pl-10 pr-4 py-2.5 rounded-sm text-[14px] outline-none focus:border-gray-900 transition-all placeholder:text-gray-400"
                                              />
                                          </div>
                                      </div>
                                      )}
                                 </div>

                                 <div className="grid grid-cols-1 gap-6">
                                      {/* Discount Codes Field */}
                                     <div className="space-y-1.5">
                                         <label className="text-[13px] font-semibold text-gray-700">Select Discount Codes</label>
                                         <div className="relative bg-white border border-gray-200 rounded-sm min-h-[44px] cursor-pointer hover:border-gray-300 transition-all" onClick={() => setShowCouponList(!showCouponList)}>
                                             <div className="flex flex-wrap gap-1.5 p-2">
                                                 {selectedCoupons.map(code => (
                                                     <div key={code} className="bg-gray-100 text-gray-800 pl-2 pr-1 py-1 rounded flex items-center gap-1 border border-gray-200">
                                                         <span className="text-[12px] font-medium">{code}</span>
                                                         <button
                                                             onClick={(e) => { e.stopPropagation(); setSelectedCoupons(selectedCoupons.filter(c => c !== code)); }}
                                                             className="hover:text-red-500 transition-colors"
                                                         >
                                                             <span className="material-symbols-outlined text-[16px]">close</span>
                                                         </button>
                                                     </div>
                                                 ))}
                                                 <input
                                                     type="text"
                                                     placeholder={selectedCoupons.length === 0 ? "Search or select coupons" : ""}
                                                     onFocus={(e) => { e.stopPropagation(); setShowCouponList(true); }}
                                                     value={couponSearch}
                                                     onChange={(e) => setCouponSearch(e.target.value)}
                                                     className="flex-1 min-w-[120px] bg-transparent border-none outline-none py-1 text-[14px] text-gray-800 placeholder:text-gray-400"
                                                 />
                                             </div>

                                             <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                 <span className={`material-symbols-outlined text-gray-400 transition-transform ${showCouponList ? 'rotate-180' : ''}`}>expand_more</span>
                                             </div>

                                             {showCouponList && (
                                                 <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[100] animate-in fade-in duration-200">
                                                     <div className="max-h-[200px] overflow-y-auto">
                                                         {loadingCoupons ? (
                                                             <div className="p-4 text-center text-[12px] text-gray-400">Loading coupons...</div>
                                                         ) : coupons.filter(c => c.code.toLowerCase().includes(couponSearch.toLowerCase())).map(coupon => (
                                                             <div
                                                                 key={coupon.code}
                                                                 onClick={(e) => {
                                                                     e.stopPropagation();
                                                                     const newSelected = selectedCoupons.includes(coupon.code)
                                                                         ? selectedCoupons.filter(c => c !== coupon.code)
                                                                         : [...selectedCoupons, coupon.code];
                                                                     setSelectedCoupons(newSelected);
                                                                     setShowCouponList(false);
                                                                 }}
                                                                 className={`px-4 py-2 cursor-pointer flex items-center justify-between text-[13px] hover:bg-gray-50 ${selectedCoupons.includes(coupon.code) ? 'bg-gray-50 font-semibold' : 'text-gray-600'}`}
                                                             >
                                                                 <span>{coupon.code}</span>
                                                                 {selectedCoupons.includes(coupon.code) && <span className="material-symbols-outlined text-[16px]">check</span>}
                                                             </div>
                                                         ))}
                                                     </div>
                                                 </div>
                                             )}
                                         </div>
                                         <p className="text-[12px] text-gray-400 font-medium ml-1 mt-1 flex items-center gap-1.5">
                                             <span className="material-symbols-outlined text-[16px] text-gray-300">info</span>
                                             Selected codes will be available for checkout discount.
                                         </p>
                                     </div>
                                 </div>
                             </div>
                         )}

                         {/* Step 3: Content */}
                         {activeStep === 3 && (
                             <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
                                 {/* Attach Test Series */}
                                 <div className="space-y-1.5">
                                     <label className="text-[13px] font-semibold text-gray-700">Attach Test Series</label>
                                     <div className="relative">
                                         <div
                                              onClick={() => setShowTestSeriesList(!showTestSeriesList)}
                                              className="w-full border border-gray-200 px-4 py-2.5 rounded-sm text-[14px] cursor-pointer flex items-center justify-between hover:border-gray-300 bg-white"
                                          >
                                              <span className={selectedTestSeries.length ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                                                  {selectedTestSeries.length ? `${selectedTestSeries.length} Selected` : 'Select Test Series'}
                                              </span>
                                              <span className={`material-symbols-outlined text-gray-400 transition-transform ${showTestSeriesList ? 'rotate-180' : ''}`}>expand_more</span>
                                          </div>

                                         {showTestSeriesList && (
                                             <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[100] animate-in fade-in duration-200">
                                                 <div className="p-2 border-b border-gray-100 flex gap-2">
                                                     <input
                                                         type="text"
                                                         placeholder="Search"
                                                         value={testSeriesSearch}
                                                         onChange={(e) => setTestSeriesSearch(e.target.value)}
                                                         className="flex-1 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded text-[12px] outline-none"
                                                     />
                                                 </div>
                                                 <div className="max-h-[200px] overflow-y-auto">
                                                     {testSeriesList.filter(tsObj => (tsObj.name || tsObj.title || '').toLowerCase().includes(testSeriesSearch.toLowerCase())).map((tsObj) => {
                                                         const ts = tsObj.name || tsObj.title || '';
                                                         return (
                                                         <div
                                                             key={tsObj._id || ts}
                                                             onClick={() => {
                                                                 const newSelected = selectedTestSeries.includes(ts)
                                                                     ? selectedTestSeries.filter(t => t !== ts)
                                                                     : [...selectedTestSeries, ts];
                                                                 setSelectedTestSeries(newSelected);
                                                                 setShowTestSeriesList(false);
                                                             }}
                                                             className={`px-4 py-2 cursor-pointer flex items-center justify-between text-[13px] hover:bg-gray-50 ${selectedTestSeries.includes(ts) ? 'bg-gray-50 font-semibold' : 'text-gray-600'}`}
                                                         >
                                                             <span>{ts}</span>
                                                             {selectedTestSeries.includes(ts) && <span className="material-symbols-outlined text-[16px]">check</span>}
                                                         </div>
                                                     )})}
                                                 </div>
                                             </div>
                                         )}
                                     </div>
                                     <p className="text-[11px] text-gray-400 mt-1">Students can access attached tests for free</p>
                                 </div>

                                 {/* Attach Book */}
                                 <div className="space-y-1.5">
                                     <label className="text-[13px] font-semibold text-gray-700">Attach Book</label>
                                     <div className="relative">
                                         <div
                                              onClick={() => setShowBookList(!showBookList)}
                                              className="w-full border border-gray-200 px-4 py-2.5 rounded-sm text-[14px] cursor-pointer flex items-center justify-between hover:border-gray-300 bg-white"
                                          >
                                              <span className={selectedBook ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                                                  {selectedBook || 'Select Book'}
                                              </span>
                                              <span className={`material-symbols-outlined text-gray-400 transition-transform ${showBookList ? 'rotate-180' : ''}`}>expand_more</span>
                                          </div>

                                         {showBookList && (
                                             <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[100] animate-in fade-in duration-200">
                                                 <div className="max-h-[200px] overflow-y-auto">
                                                     <div onClick={() => { setSelectedBook(''); setShowBookList(false); }} className="px-4 py-2 text-[13px] text-gray-400 hover:bg-gray-50 cursor-pointer">None</div>
                                                     {booksList.map((bookObj) => {
                                                         const book = bookObj.title || bookObj.name || '';
                                                         return (
                                                         <div key={bookObj._id || book} onClick={() => { setSelectedBook(book); setShowBookList(false); }} className={`px-4 py-2 text-[13px] cursor-pointer hover:bg-gray-50 ${selectedBook === book ? 'bg-gray-50 font-semibold' : 'text-gray-600'}`}>
                                                             {book}
                                                         </div>
                                                     )})}
                                                 </div>
                                             </div>
                                         )}
                                     </div>
                                 </div>

                                 {/* Upsell Courses */}
                                 <div className="pt-4 space-y-4">
                                     <div className="flex items-center justify-between">
                                         <div>
                                             <h4 className="text-[14px] font-semibold text-gray-900">Upsell Courses</h4>
                                             <p className="text-[11px] text-gray-400">Recommend other courses at purchase</p>
                                         </div>
                                         <button onClick={() => setUpsellCourses(!upsellCourses)} className={`w-10 h-5 rounded-full relative transition-all duration-300 ${upsellCourses ? 'bg-green-500' : 'bg-gray-200'}`}>
                                             <div className={`absolute top-[2px] transition-all duration-300 w-4 h-4 bg-white rounded-full ${upsellCourses ? 'left-[22px]' : 'left-[2px]'}`} />
                                         </button>
                                     </div>

                                      {upsellCourses && (
                                         <div className="relative border border-gray-200 rounded-sm p-2 min-h-[44px] animate-in fade-in slide-in-from-top-2 duration-300 bg-white hover:border-gray-300 transition-all cursor-pointer" onClick={() => setShowUpsellList(!showUpsellList)}>
                                             <div className="flex flex-wrap gap-1.5">
                                                 {selectedUpsellCourses.map(courseTitle => (
                                                     <div key={courseTitle} className="bg-gray-100 text-gray-800 pl-2 pr-1 py-1 rounded flex items-center gap-1 border border-gray-200">
                                                         <span className="text-[12px] font-medium">{courseTitle}</span>
                                                         <button onClick={(e) => { e.stopPropagation(); setSelectedUpsellCourses(selectedUpsellCourses.filter(c => c !== courseTitle)); }}>
                                                             <span className="material-symbols-outlined text-[16px]">close</span>
                                                         </button>
                                                     </div>
                                                 ))}
                                                 <input
                                                     type="text"
                                                     placeholder={selectedUpsellCourses.length === 0 ? "Search courses..." : ""}
                                                     value={upsellSearch}
                                                     onChange={(e) => setUpsellSearch(e.target.value)}
                                                     className="flex-1 bg-transparent border-none outline-none py-1 text-[14px] text-gray-800"
                                                 />
                                             </div>
                                             {showUpsellList && (
                                                 <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[100]">
                                                     <div className="max-h-[200px] overflow-y-auto">
                                                         {allCourses.filter(c => (c.title || c.name || "").toLowerCase().includes(upsellSearch.toLowerCase())).map(course => {
                                                             const title = course.title || course.name;
                                                             return (
                                                                 <div key={title} onClick={(e) => {
                                                                     e.stopPropagation();
                                                                     const newSelected = selectedUpsellCourses.includes(title) ? selectedUpsellCourses.filter(c => c !== title) : [...selectedUpsellCourses, title];
                                                                     setSelectedUpsellCourses(newSelected);
                                                                     setShowUpsellList(false);
                                                                 }} className={`px-4 py-2 cursor-pointer flex items-center justify-between text-[13px] hover:bg-gray-50 ${selectedUpsellCourses.includes(title) ? 'bg-gray-50 font-semibold' : 'text-gray-600'}`}>
                                                                     <span>{title}</span>
                                                                     {selectedUpsellCourses.includes(title) && <span className="material-symbols-outlined text-[16px]">check</span>}
                                                                 </div>
                                                             );
                                                         })}
                                                     </div>
                                                 </div>
                                             )}
                                         </div>
                                     )}
                                 </div>
                             </div>
                         )}

                         {/* Step 4: Additional Settings */}
                         {activeStep === 4 && (
                             <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
                                 {/* Top Inputs: Sorting & Badge */}
                                 <div className="grid grid-cols-2 gap-6">
                                     <div className="space-y-1.5">
                                         <label className="text-[13px] font-semibold text-gray-700">Sorting Order</label>
                                         <input
                                             type="number"
                                             placeholder="0"
                                             value={sortingOrder}
                                             onChange={(e) => setSortingOrder(e.target.value)}
                                             className="w-full border border-gray-200 px-4 py-2.5 rounded-sm text-[14px] outline-none focus:border-gray-900 transition-all bg-white"
                                         />
                                     </div>
                                     <div className="space-y-1.5">
                                         <label className="text-[13px] font-semibold text-gray-700">Display Custom Badge</label>
                                         <input
                                             type="text"
                                             placeholder="Enter Custom Badge"
                                             value={customBadge}
                                             onChange={(e) => setCustomBadge(e.target.value)}
                                             className="w-full border border-gray-200 px-4 py-2.5 rounded-sm text-[14px] outline-none focus:border-gray-900 transition-all bg-white"
                                         />
                                     </div>
                                 </div>

                                 {/* Toggle Sections */}
                                 <div className="space-y-4">
                                     {[
                                         { title: 'Choose Tabs to Show on Course Page', state: showTabs, setState: setShowTabs },
                                         { title: 'Mark As New Batch', state: markNewBatch, setState: setMarkNewBatch },
                                     ].map((row, i) => (
                                         <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                             <span className="text-[13px] font-medium text-gray-700">{row.title}</span>
                                             <button onClick={() => row.setState(!row.state)} className={`w-10 h-5 rounded-full relative transition-all duration-300 ${row.state ? 'bg-green-500' : 'bg-gray-200'}`}>
                                                 <div className={`absolute top-[2px] transition-all duration-300 w-4 h-4 bg-white rounded-full ${row.state ? 'left-[22px]' : 'left-[2px]'}`} />
                                             </button>
                                         </div>
                                     ))}
                                 </div>

                                 {/* SEO Settings */}
                                 <div className="space-y-4 pt-4">
                                     <h3 className="text-[14px] font-semibold text-gray-900">SEO Settings</h3>
                                     <div className="space-y-4">
                                         <div className="space-y-1.5">
                                             <label className="text-[13px] font-semibold text-gray-700">Meta Title</label>
                                             <input
                                                 type="text"
                                                 value={metaTitle}
                                                 onChange={(e) => setMetaTitle(e.target.value)}
                                                 className="w-full border border-gray-200 px-4 py-2.5 rounded-sm text-[14px] outline-none focus:border-gray-900 transition-all bg-white"
                                             />
                                         </div>
                                         <div className="space-y-1.5">
                                             <label className="text-[13px] font-semibold text-gray-700">Meta Description</label>
                                             <textarea
                                                 placeholder="Enter Meta Description"
                                                 value={metaDescription}
                                                 onChange={(e) => setMetaDescription(e.target.value)}
                                                 rows={2}
                                                 className="w-full border border-gray-200 px-4 py-2.5 rounded-sm text-[14px] outline-none focus:border-gray-900 transition-all resize-none bg-white"
                                             />
                                         </div>
                                     </div>
                                 </div>

                                 {/* Language and Terms */}
                                 <div className="grid grid-cols-2 gap-6 pt-4">
                                     <div className="space-y-1.5">
                                         <label className="text-[13px] font-semibold text-gray-700">Language</label>
                                         <div className="relative">
                                             <select
                                                 value={courseLanguage}
                                                 onChange={(e) => setCourseLanguage(e.target.value)}
                                                 className="w-full border border-gray-200 px-4 py-2.5 rounded-sm text-[14px] outline-none focus:border-gray-900 appearance-none bg-white font-medium"
                                             >
                                                 <option value="English">English</option>
                                                 <option value="Hindi">Hindi</option>
                                             </select>
                                             <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
                                         </div>
                                     </div>
                                     <div className="space-y-1.5">
                                         <label className="text-[13px] font-semibold text-gray-700">Terms & Conditions (PDF)</label>
                                         <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={(e) => setUploadedPdf(e.target.files?.[0] || null)} />
                                         <div onClick={() => fileInputRef.current?.click()} className="border border-dashed border-gray-300 rounded-sm p-2 flex items-center justify-center cursor-pointer hover:bg-gray-50 text-[12px] font-bold text-gray-500 h-[42px] bg-white transition-all shadow-sm">
                                             {uploadedPdf ? uploadedPdf.name : 'Upload PDF'}
                                         </div>
                                     </div>
                                 </div>
                             </div>
                         )}

                        {/* Navigation Buttons */}
                        <div className="flex items-center justify-between pt-8">
                            {activeStep > 1 ? (
                                <button
                                    onClick={() => setActiveStep(prev => prev - 1)}
                                    className="flex items-center gap-2 px-8 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-sm font-bold text-[14px] hover:bg-gray-50 transition-all group shadow-sm"
                                >
                                    <span className="material-symbols-outlined text-[20px] group-hover:-translate-x-1 transition-transform">arrow_left_alt</span>
                                    Back
                                </button>
                            ) : (
                                <div />
                            )}
                            <button
                                onClick={() => {
                                    if (activeStep === 1) {
                                        if (!title.trim()) { alert('Please enter a course title.'); return; }
                                        if (selectedCategories.length === 0) { alert('Please select at least one category.'); return; }
                                    }
                                    if (activeStep < 4) setActiveStep(prev => prev + 1);
                                    else handlePublish();
                                }}
                                className="flex items-center gap-2 px-10 py-2.5 bg-black text-white rounded-sm font-bold text-[14px] hover:bg-gray-800 transition-all group shadow-md"
                            >
                                {activeStep === 4 ? 'Save & Publish' : 'Continue to Next'}
                                <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">arrow_right_alt</span>
                            </button>
                        </div>
                    </div>

                    <div className="w-[360px] h-fit sticky top-8">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="w-1.5 h-1.5 bg-black rounded-full" />
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">LIVE PREVIEW</p>
                        </div>
                        <div className="border border-gray-200 rounded-sm overflow-hidden bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-gray-900/[0.02]">
                            <div className="aspect-[16/10] bg-gray-50 flex items-center justify-center relative overflow-hidden group">
                                {coverImage ? (
                                    <img src={getImageUrl(coverImage)} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Preview" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <div className="w-20 h-20 rounded-full border border-dashed border-gray-200 flex items-center justify-center mb-3 bg-white/50">
                                            <span className="material-symbols-outlined text-gray-300 text-[32px]">image</span>
                                        </div>
                                        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Preview Image</p>
                                    </div>
                                )}
                                {isFeatured && (
                                    <div className="absolute top-4 left-4 bg-black text-white text-[9px] font-black px-2.5 py-1.5 rounded-sm shadow-xl backdrop-blur-md bg-black/90 tracking-tighter">
                                        FEATURED
                                    </div>
                                )}
                            </div>

                            <div className="p-5 space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">COURSE</span>
                                        <div className="h-[1px] flex-1 bg-gray-100" />
                                    </div>
                                    <h3 className="text-[16px] font-bold text-gray-900 leading-snug min-h-[44px] line-clamp-2">
                                        {title || 'Ex. Complete Web Development Bootcamp 2024'}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        {selectedCategories.slice(0, 2).map(cat => (
                                            <span key={cat} className="text-[10px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{cat}</span>
                                        ))}
                                    </div>
                                    
                                    {description && (
                                        <div className="mt-3 overflow-hidden border-l-2 border-gray-100 pl-3">
                                            <div 
                                                className="text-[12px] text-gray-500 max-h-[80px] overflow-y-auto prose prose-sm max-w-none [&_p]:m-0 custom-scrollbar"
                                                dangerouslySetInnerHTML={{ __html: description }}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="pt-5 border-t border-gray-100 flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Seling Price</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[26px] font-black text-gray-900 flex items-center -ml-1">
                                                <span className="material-symbols-outlined text-[20px]">currency_rupee</span>
                                                {price ? (finalPrice % 1 === 0 ? finalPrice : finalPrice.toFixed(2)) : '0'}
                                            </span>
                                            {originalPrice && (
                                                <span className="text-[14px] text-gray-400 line-through font-bold opacity-60">
                                                    ₹{originalPrice}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="w-11 h-11 bg-black text-white rounded-sm flex items-center justify-center shadow-xl transform transition-all hover:scale-105 active:scale-95 cursor-pointer">
                                        <span className="material-symbols-outlined text-[22px]">shopping_cart</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 space-y-3">
                             <div className="flex items-center gap-3 text-gray-500">
                                <span className="material-symbols-outlined text-[18px]">verified</span>
                                <span className="text-[12px] font-medium">
                                    {validityTab === 'end' ? (
                                        <>Valid until {endDay || 'DD'}-{endMonth || 'MM'}-{endYear || 'YYYY'}</>
                                    ) : validityTab === 'lifetime' ? (
                                        <>Lifetime Access</>
                                    ) : (
                                        <>Valid for {validityValue} {validityUnit}</>
                                    )}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-500">
                                <span className="material-symbols-outlined text-[18px]">language</span>
                                <span className="text-[12px] font-medium">Taught in {courseLanguage}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddCourse;
