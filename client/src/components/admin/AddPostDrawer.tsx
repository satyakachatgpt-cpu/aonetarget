import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import RichTextEditor from '../shared/RichTextEditor';
import { coursesAPI, testSeriesAPI, pdfsAPI, testsAPI, uploadAPI } from '../../services/apiClient';

interface AddPostDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    courseId: string;
    onSuccess: () => void;
}

const AddPostDrawer: React.FC<AddPostDrawerProps> = ({ isOpen, onClose, courseId, onSuccess }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [publishDate, setPublishDate] = useState('2026-03-02 04:44:42');
    const [productType, setProductType] = useState('Select');
    const [sortingOrder, setSortingOrder] = useState(0);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [videoPreview, setVideoPreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [isUploadingVideo, setIsUploadingVideo] = useState(false);
    const [fetchedCourses, setFetchedCourses] = useState<any[]>([]);
    const [fetchedTests, setFetchedTests] = useState<any[]>([]); // This holds all test series
    const [fetchedPdfs, setFetchedPdfs] = useState<any[]>([]);
    const [fetchedCourseTests, setFetchedCourseTests] = useState<any[]>([]);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen) {
            const fetchData = async () => {
                try {
                    const [coursesData, testSeriesData, allPdfs, allTests] = await Promise.all([
                        coursesAPI.getAll(),
                        testSeriesAPI.getAll(),
                        pdfsAPI.getAll(),
                        testsAPI.getAll()
                    ]);

                    // Filter out any items that don't have a title to prevent empty rows
                    const validCourses = (coursesData || []).filter((c: any) => (c.title || c.name) && (c.title || c.name).trim() !== "");
                    const validTestSeries = (testSeriesData || []).filter((t: any) => (t.title || t.name) && (t.title || t.name).trim() !== "");

                    // Robust ID comparison helper
                    const isRelatedToCourse = (item: any) => {
                        if (!item || !courseId) return false;
                        const itemCid = item.courseId?._id || item.courseId?.id || item.courseId;
                        return String(itemCid) === String(courseId);
                    };

                    // Filter PDFs and Tests specifically for CURRENT courseId
                    const coursePdfs = (allPdfs || []).filter((p: any) => isRelatedToCourse(p) && (p.title || p.name));
                    const courseTests = (allTests || []).filter((t: any) => isRelatedToCourse(t) && (t.title || t.name));

                    setFetchedCourses(validCourses);
                    setFetchedTests(validTestSeries);
                    setFetchedPdfs(coursePdfs);
                    setFetchedCourseTests(courseTests);
                } catch (error) {
                    console.error('Failed to fetch data for dropdowns:', error);
                }
            };
            fetchData();
        }
    }, [isOpen]);

    // Close on ESC
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    // Handle Body Scroll
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }, [isOpen]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsUploadingImage(true);
            try {
                const data = await uploadAPI.uploadImage(file);
                if (data && data.url) {
                    setImagePreview(data.url);
                }
            } catch (error: any) {
                console.error('Image upload failed:', error);
                alert(error.message || 'Image upload failed');
            } finally {
                setIsUploadingImage(false);
            }
        }
    };

    const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsUploadingVideo(true);
            try {
                const data = await uploadAPI.uploadVideo(file);
                if (data && data.url) {
                    setVideoPreview(data.url);
                }
            } catch (error: any) {
                console.error('Video upload failed:', error);
                alert(error.message || 'Video upload failed');
            } finally {
                setIsUploadingVideo(false);
            }
        }
    };

    const handleSubmit = async () => {
        if (!title.trim()) return;
        setIsSubmitting(true);
        try {
            const response = await fetch(`/api/courses/${courseId}/posts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    content,
                    image: imagePreview,
                    video: videoPreview,
                    publishDate,
                    productType,
                    productId: selectedProductId,
                    sortingOrder,
                    author: 'Admin'
                })
            });

            if (response.ok) {
                onSuccess();
                onClose();
            }
        } catch (error) {
            console.error('Failed to create post:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex justify-end overflow-hidden">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-[1px] animate-fade-in"
                onClick={onClose}
            ></div>

            {/* Drawer - Reduced Width to 850px as per request */}
            <div className={`relative w-[850px] h-full bg-white shadow-[-25px_0_80px_rgba(0,0,0,0.12)] flex flex-col transition-transform duration-300 ease-out transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                {/* Header */}
                <div className="flex items-center justify-between px-10 py-5 bg-white sticky top-0 z-[100] border-b border-gray-50">
                    <h2 className="text-[22px] font-black text-[#111827] tracking-tight">Add News</h2>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 rounded-full transition-all text-gray-300 hover:text-gray-900 group"
                    >
                        <span className="material-symbols-outlined text-[24px] group-hover:rotate-90 transition-transform duration-200">close</span>
                    </button>
                </div>

                {/* Content Container - Scrollable */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-10 pb-10">

                    {/* Title Field */}
                    <div className="mt-2 space-y-3">
                        <label className="text-[15px] font-extrabold text-[#374151] tracking-wide uppercase">Title *</label>
                        <input
                            type="text"
                            placeholder="Enter news title..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-6 py-4 border border-[#e5e7eb] rounded-[12px] text-[16px] font-semibold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-gray-300 bg-[#f9fafb]"
                        />
                    </div>

                    {/* Media Section */}
                    <div className="grid grid-cols-2 gap-12 mt-8">
                        {/* Image Column */}
                        <div className="space-y-4">
                            <label className="text-[17px] font-extrabold text-[#3b4b5e] tracking-tight">Image *</label>
                            <div className="flex gap-4">
                                {/* Preview Box */}
                                <div className="w-[145px] h-[145px] bg-[#f7f8fa] border border-[#eef0f2] rounded-[18px] flex flex-col items-center justify-center text-[#9ca7b6] shrink-0">
                                    {isUploadingImage ? (
                                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                    ) : imagePreview ? (
                                        <img src={imagePreview} className="w-full h-full object-cover rounded-[18px]" alt="Preview" />
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-[32px] opacity-40">image</span>
                                            <span className="text-[15px] font-bold mt-2 opacity-50">No Image</span>
                                        </>
                                    )}
                                </div>
                                {/* Upload Box */}
                                <label className="w-[145px] h-[145px] border-2 border-dashed border-[#e2e8f0] rounded-[18px] flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-all text-center px-4">
                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                    <span className="text-[16px] font-black text-[#5e6d82] mt-1">Upload Image</span>
                                    <p className="text-[12.5px] text-[#9ca7b6] mt-2 font-medium leading-[1.3]">Click or Drag &<br />Drop your file<br />here.</p>
                                </label>
                            </div>
                        </div>

                        {/* Video Column */}
                        <div className="space-y-4">
                            <label className="text-[17px] font-extrabold text-[#3b4b5e] tracking-tight">Video</label>
                            <div className="flex gap-4">
                                {/* Preview Box */}
                                <div className="w-[145px] h-[145px] bg-[#f7f8fa] border border-[#eef0f2] rounded-[18px] flex flex-col items-center justify-center text-[#9ca7b6] shrink-0">
                                    {isUploadingVideo ? (
                                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                    ) : videoPreview ? (
                                        <div className="p-3 text-center">
                                            <span className="material-symbols-outlined text-[32px] text-indigo-400">smart_display</span>
                                            <p className="text-[11px] truncate font-bold mt-2 text-gray-500">{videoPreview.split('/').pop()}</p>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-[32px] opacity-40">videocam</span>
                                            <span className="text-[15px] font-bold mt-2 opacity-50">No Video</span>
                                        </>
                                    )}
                                </div>
                                {/* Upload Box */}
                                <label className="w-[145px] h-[145px] border-2 border-dashed border-[#e2e8f0] rounded-[18px] flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-all text-center px-4">
                                    <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
                                    <span className="text-[16px] font-black text-[#5e6d82] mt-1">Upload Video</span>
                                    <p className="text-[12.5px] text-[#9ca7b6] mt-2 font-medium leading-[1.3]">Click or Drag &<br />Drop your file<br />here.</p>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Description Editor — Using new shared RichTextEditor */}
                    <div className="mt-14 space-y-4">
                        <label className="text-[17px] font-extrabold text-[#3b4b5e] tracking-tight">Description</label>
                        <RichTextEditor
                            content={content}
                            onChange={(html) => setContent(html)}
                            height="500px"
                        />
                    </div>

                    {/* Additional Settings Section - Visual match for screenshot */}
                    <div className="mt-12 pt-8 border-t border-gray-100">
                        <h3 className="text-[18px] font-bold text-[#111827] mb-6">Additional Settings</h3>

                        <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                            {/* Row 1: Publish Date */}
                            <div className="space-y-2">
                                <label className="text-[14px] font-semibold text-gray-600">Publish Date</label>
                                <input
                                    type="text"
                                    value={publishDate}
                                    onChange={(e) => setPublishDate(e.target.value)}
                                    className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-xl font-medium text-gray-600 outline-none focus:border-indigo-500 transition-all shadow-sm"
                                />
                            </div>

                            {/* Row 1: Product Type */}
                            <div className="space-y-2">
                                <label className="text-[14px] font-semibold text-gray-600">Product Type :</label>
                                <div className="relative">
                                    <select
                                        value={productType}
                                        onChange={(e) => {
                                            setProductType(e.target.value);
                                            setSelectedProductId(""); // Reset selection when type changes
                                        }}
                                        className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-xl font-medium text-gray-600 outline-none appearance-none cursor-pointer focus:border-indigo-500 transition-all shadow-sm"
                                    >
                                        <option value="">Select</option>
                                        <option value="digital">Courses</option>
                                        <option value="study">Study Material</option>
                                        <option value="test">Test Series</option>
                                        <option value="website">Website</option>
                                    </select>
                                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[20px]">expand_more</span>
                                </div>
                            </div>

                            {/* Row 2: Sorting Order */}
                            <div className="space-y-2">
                                <label className="text-[14px] font-semibold text-gray-600">Sorting Order</label>
                                <input
                                    type="number"
                                    value={sortingOrder}
                                    onChange={(e) => setSortingOrder(parseInt(e.target.value))}
                                    className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-xl font-medium text-gray-600 outline-none focus:border-indigo-500 transition-all shadow-sm"
                                />
                            </div>

                            {/* Row 2: Category Dropdown (Custom Premium Dropdown) */}
                            <div className="space-y-2">
                                <label className="text-[14px] font-bold text-gray-500 uppercase tracking-wider">
                                    {productType === 'digital' ? 'Select Course' :
                                        productType === 'study' ? 'Select Study Material' :
                                            productType === 'test' ? 'Select Test Series' :
                                                productType === 'website' ? 'Select Website Page' : 'Select Product'}
                                </label>
                                <div className="relative" ref={dropdownRef}>
                                    <div
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                        className={`w-full px-5 py-4 bg-[#f8fafc] border ${isDropdownOpen ? 'border-indigo-500 bg-white ring-4 ring-indigo-500/10' : 'border-gray-200'} rounded-xl font-bold text-gray-700 flex items-center justify-between cursor-pointer hover:border-indigo-500 transition-all shadow-sm`}
                                    >
                                        <span className="truncate pr-4">
                                            {selectedProductId ? (
                                                fetchedCourses.find(c => (c._id || c.id) === selectedProductId)?.title ||
                                                fetchedTests.find(t => (t._id || t.id) === selectedProductId)?.title ||
                                                (fetchedPdfs.find(p => (p._id || p.id) === selectedProductId)?.title || fetchedPdfs.find(p => (p._id || p.id) === selectedProductId)?.name) ||
                                                (fetchedCourseTests.find(ct => (ct._id || ct.id) === selectedProductId)?.title || fetchedCourseTests.find(ct => (ct._id || ct.id) === selectedProductId)?.name) ||
                                                "Select Option"
                                            ) : "Select Option"}
                                        </span>
                                        <span className={`material-symbols-outlined text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-indigo-500' : ''}`}>expand_more</span>
                                    </div>

                                    {/* Custom Dropdown List - Now opens UPWARDS to avoid being cut off */}
                                    {isDropdownOpen && (
                                        <div className="absolute bottom-[calc(100%+12px)] left-0 right-0 bg-white border border-gray-100 rounded-2xl shadow-[0_-20px_50px_rgba(0,0,0,0.15)] z-[1000] py-2 max-h-[350px] overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-bottom-2 zoom-in-95 duration-200">
                                            {productType === 'digital' && fetchedCourses.length > 0 ? (
                                                fetchedCourses.map((item) => (
                                                    <div
                                                        key={item._id || item.id}
                                                        onClick={() => {
                                                            setSelectedProductId(item._id || item.id);
                                                            setIsDropdownOpen(false);
                                                        }}
                                                        className={`px-5 py-3.5 mx-2 my-0.5 rounded-xl cursor-pointer font-bold text-[15px] transition-all flex items-center gap-3 ${selectedProductId === (item._id || item.id) ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'}`}
                                                    >
                                                        <span className="material-symbols-outlined text-[18px] opacity-60">school</span>
                                                        <span className="truncate">{item.title}</span>
                                                    </div>
                                                ))
                                            ) : productType === 'test' && (fetchedCourseTests.length > 0 || fetchedTests.length > 0) ? (
                                                <>
                                                    {fetchedCourseTests.map((item) => (
                                                        <div
                                                            key={item._id || item.id}
                                                            onClick={() => {
                                                                setSelectedProductId(item._id || item.id);
                                                                setIsDropdownOpen(false);
                                                            }}
                                                            className={`px-5 py-3.5 mx-2 my-0.5 rounded-xl cursor-pointer font-bold text-[15px] transition-all flex items-center gap-3 ${selectedProductId === (item._id || item.id) ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'}`}
                                                        >
                                                            <span className="material-symbols-outlined text-[18px] opacity-60">quiz</span>
                                                            <span className="truncate">{(item.title || item.name)} (Course Test)</span>
                                                        </div>
                                                    ))}
                                                    {fetchedTests.map((item) => (
                                                        <div
                                                            key={item._id || item.id}
                                                            onClick={() => {
                                                                setSelectedProductId(item._id || item.id);
                                                                setIsDropdownOpen(false);
                                                            }}
                                                            className={`px-5 py-3.5 mx-2 my-0.5 rounded-xl cursor-pointer font-bold text-[15px] transition-all flex items-center gap-3 ${selectedProductId === (item._id || item.id) ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'}`}
                                                        >
                                                            <span className="material-symbols-outlined text-[18px] opacity-60">military_tech</span>
                                                            <span className="truncate">{(item.title || item.name)} (Test Series)</span>
                                                        </div>
                                                    ))}
                                                </>
                                            ) : productType === 'study' && fetchedPdfs.length > 0 ? (
                                                fetchedPdfs.map((item) => (
                                                    <div
                                                        key={item._id || item.id}
                                                        onClick={() => {
                                                            setSelectedProductId(item._id || item.id);
                                                            setIsDropdownOpen(false);
                                                        }}
                                                        className={`px-5 py-3.5 mx-2 my-0.5 rounded-xl cursor-pointer font-bold text-[15px] transition-all flex items-center gap-3 ${selectedProductId === (item._id || item.id) ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'}`}
                                                    >
                                                        <span className="material-symbols-outlined text-[18px] opacity-60">description</span>
                                                        <span className="truncate">{(item.title || item.name)}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="px-5 py-8 text-center text-gray-400 font-medium">
                                                    <span className="material-symbols-outlined text-[40px] block mb-2 opacity-20">inventory_2</span>
                                                    No items found
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Action - Full Width Submit Button as per screenshot */}
                    <div className="mt-12 bg-[#1b1c1e] p-5 flex items-center justify-center cursor-pointer hover:bg-black transition-colors rounded-xl shadow-xl hover:shadow-2xl hover:-translate-y-0.5" onClick={handleSubmit}>
                        <button
                            className="text-white font-bold text-[16px] tracking-wide"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Processing...' : 'Submit News'}
                        </button>
                    </div>

                </div>
            </div>
        </div>,
        document.body
    );
};

export default AddPostDrawer;

