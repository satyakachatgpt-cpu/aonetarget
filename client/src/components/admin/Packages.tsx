import React, { useState, useEffect, useRef } from 'react';
import parse from 'html-react-parser';
import { packagesAPI, coursesAPI, testSeriesAPI, liveVideosAPI, subjectsAPI, uploadAPI } from '../../services/apiClient';
import AddCourse from './AddCourse';
import LiveSessions from './LiveSessions';
import ForumManager from './ForumManager';
import ContentManager from './ContentManager';
import {
  RightSideDrawer,
  DrawerBody,
  DrawerHeader,
  DrawerFooter
} from './DrawerSystem';
import {
  OMRTestDrawer,
  TestDrawer,
  QuizDrawer,
  UploadDrawer,
  LinkDrawer,
  VideoDrawer,
  LiveStreamDrawer,
  WebinarDrawer
} from './FeatureDrawers';
import AddFolderDrawer from './AddFolderDrawer';
import RichTextEditor from '../shared/RichTextEditor';
import BatchMultiSelect from './course-content/BatchMultiSelect';
import { toYouTubeEmbed } from '../../lib/utils';
import { getAdminHeaders, API_BASE_URL, apiRequest, invalidateCache } from '../../services/apiClient';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Package {
  id: string;
  _id?: string;
  name: string;
  description: string;
  courses: string[];
  price: number;
  status: 'active' | 'inactive';
}

interface CourseItem {
  id: string;
  _id?: string;
  name?: string;
  title?: string;
  category?: string;
}

interface Props {
  showToast: (m: string, type?: 'success' | 'error') => void;
  onCourseSelect: (course: any, tab?: string) => void;
}

/**
 * --- PREMIUM UI COMPONENTS FOR BULK ACTIONS ---
 */

const TableViewSwitcher: React.FC<{ viewMode: 'list' | 'grid'; onViewChange: (mode: 'list' | 'grid') => void }> = ({ viewMode, onViewChange }) => {
  return (
    <div className="px-6 mb-6">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 opacity-70">Table View</p>
      <div className="flex items-center gap-4">
        <button
          onClick={() => onViewChange('list')}
          className={`w-[44px] h-[44px] transition-all duration-300 flex items-center justify-center rounded-xl border ${viewMode === 'list'
            ? 'bg-gray-100 text-gray-900 border-gray-200 shadow-sm'
            : 'bg-white text-gray-300 border-gray-100 hover:text-gray-500 hover:border-gray-200'}`}
        >
          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: viewMode === 'list' ? "'FILL' 1" : "''" }}>list</span>
        </button>
        <button
          onClick={() => onViewChange('grid')}
          className={`w-[44px] h-[44px] transition-all duration-300 flex items-center justify-center rounded-xl border ${viewMode === 'grid'
            ? 'bg-gray-100 text-gray-900 border-gray-200 shadow-sm'
            : 'bg-white text-gray-300 border-gray-100 hover:text-gray-500 hover:border-gray-200'}`}
        >
          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: viewMode === 'grid' ? "'FILL' 1" : "''" }}>grid_view</span>
        </button>
      </div>
    </div>
  );
};

const BulkActionItem: React.FC<{ icon: string; label: string; onClick: () => void }> = ({ icon, label, onClick }) => {
  return (
    <button
      className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50/80 transition-all border-l-4 border-transparent hover:border-blue-500 group text-left"
      onClick={onClick}
    >
      <div className="w-[38px] h-[38px] bg-blue-50/40 rounded-xl flex items-center justify-center group-hover:bg-blue-100/60 transition-colors shrink-0">
        <span className="material-symbols-outlined text-[20px] text-blue-500/80 group-hover:text-blue-600 transition-colors">
          {icon}
        </span>
      </div>
      <span className="text-[14px] font-bold text-gray-600 group-hover:text-gray-900 tracking-tight transition-colors">
        {label}
      </span>
    </button>
  );
};

const SortablePackageRow = ({ 
  pkg, 
  idx, 
  startIndex, 
  selectedIds, 
  toggleSelectOne, 
  onCourseSelect, 
  openActionMenuId, 
  setOpenActionMenuId, 
  handleToggleStatus, 
  openEditDrawer, 
  handleDuplicate, 
  loadData,
  handleDelete,
  paginatedItems,
  disabled
}: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: pkg.id,
    disabled: disabled
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    opacity: isDragging ? 0.8 : 1,
    position: 'relative' as any,
    backgroundColor: isDragging ? '#f8fafc' : undefined,
    boxShadow: isDragging ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)' : undefined,
  };

  return (
    <tr 
      ref={setNodeRef}
      style={style}
      onClick={() => onCourseSelect(pkg)} 
      className={`hover:bg-gray-50/50 transition-colors group cursor-pointer ${selectedIds.includes(pkg.id) ? 'bg-blue-50/40' : ''} ${isDragging ? 'z-[1000]' : ''}`}
    >
      <td className="pl-8 py-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-4">
          {!disabled && (
            <div 
              {...attributes} 
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-600 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="material-symbols-outlined text-[20px]">drag_indicator</span>
            </div>
          )}
          <div
            onClick={(e) => toggleSelectOne(e, pkg.id)}
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer ${selectedIds.includes(pkg.id)
              ? 'bg-[#1a237e] border-[#1a237e] text-white shadow-sm'
              : 'border-gray-200 bg-white hover:border-gray-400'
              }`}
          >
            {selectedIds.includes(pkg.id) && (
              <span className="material-symbols-outlined text-[14px] font-bold">check</span>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-6 text-[13px] font-black text-gray-300">{startIndex + idx + 1}</td>
      <td className="px-4 py-6 text-[13px] font-black text-navy">{pkg.settings?.sortingOrder || startIndex + idx + 1}</td>
      <td className="px-6 py-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-50 rounded-xl flex-shrink-0 flex items-center justify-center border border-gray-100 group-hover:bg-white transition-colors">
            {pkg.imageUrl || pkg.thumbnail ? (
              <img src={pkg.imageUrl || pkg.thumbnail} alt="" className="w-full h-full object-cover rounded-xl" />
            ) : (
              <span className="material-symbols-outlined text-gray-200">inventory_2</span>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[14px] font-bold text-gray-900 group-hover:text-black transition-colors truncate">{pkg.name}</span>
            <span className="text-[11px] font-medium text-gray-400 mt-0.5 truncate uppercase tracking-tight">{pkg.categoryId || 'General'}</span>
          </div>
        </div>
      </td>
      <td className="px-6 py-6 overflow-hidden">
        <div className="flex flex-col max-w-xs">
          <div className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
            {pkg.description ? parse(pkg.description) : '-'}
          </div>
        </div>
      </td>
      <td className="px-6 py-6 font-mono">
        <span className={`text-[14px] font-bold ${!pkg.price ? 'text-gray-300' : 'text-gray-900'}`}>
          {!pkg.price ? 'Free' : `₹${pkg.price}`}
        </span>
      </td>
      <td className="px-6 py-6">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tight ${pkg.status === 'active' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${pkg.status === 'active' ? 'bg-green-600' : 'bg-amber-600'}`}></span>
          {pkg.status === 'active' ? 'Active' : 'Draft'}
        </span>
      </td>
      <td className="px-6 py-6 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-center gap-3">
          <div className="relative row-action-menu-container">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenActionMenuId(openActionMenuId === pkg.id ? null : pkg.id);
              }}
              className={`px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all border flex items-center gap-2 shadow-sm ${openActionMenuId === pkg.id ? 'bg-gray-100 border-gray-300 text-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
            >
              Actions
              <span className={`material-symbols-outlined text-[18px] transition-transform duration-300 ${openActionMenuId === pkg.id ? 'rotate-180 text-gray-900' : 'text-gray-400'}`}>expand_more</span>
            </button>

            {openActionMenuId === pkg.id && (
              <div
                className={`absolute right-0 ${idx >= paginatedItems.length - 2 && paginatedItems.length > 3 ? 'bottom-full mb-2' : 'top-full mt-2'} w-64 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-gray-100 py-2.5 z-[250] animate-in fade-in zoom-in-95 duration-200 origin-top-right`}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => { onCourseSelect(pkg, 'Overview'); setOpenActionMenuId(null); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-colors text-left group"
                >
                  <span className="material-symbols-outlined text-[20px] text-blue-400">explore</span>
                  <span className="text-[14px] font-medium">Batch Overview</span>
                </button>

                <button
                  onClick={() => { onCourseSelect(pkg, 'Content'); setOpenActionMenuId(null); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-colors text-left group"
                >
                  <span className="material-symbols-outlined text-[20px] text-blue-500/70">add_circle</span>
                  <span className="text-[14px] font-medium">Add/View Content</span>
                </button>

                <div className="px-4 py-2.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-3 text-gray-600">
                    <span className="material-symbols-outlined text-[20px] text-blue-400/80">info</span>
                    <span className="text-[14px] font-medium">Enabled</span>
                  </div>
                  <button
                    onClick={() => handleToggleStatus(pkg)}
                    className={`w-[42px] h-[22px] rounded-full relative transition-all duration-300 ${pkg.status === 'active' ? 'bg-[#1a1c1e]' : 'bg-gray-200'}`}
                  >
                    <div className={`absolute top-[3px] w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${pkg.status === 'active' ? 'right-[3px]' : 'left-[3px]'}`}></div>
                  </button>
                </div>

                <button
                  onClick={() => { openEditDrawer(pkg); setOpenActionMenuId(null); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-colors text-left group"
                >
                  <span className="material-symbols-outlined text-[20px] text-blue-400/70">edit</span>
                  <span className="text-[14px] font-medium">Edit</span>
                </button>

                <button
                  onClick={() => { handleDuplicate(pkg); setOpenActionMenuId(null); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-colors text-left group"
                >
                  <span className="material-symbols-outlined text-[20px] text-blue-500/60">content_copy</span>
                  <span className="text-[14px] font-medium">Duplicate</span>
                </button>

                <button
                  onClick={() => { loadData(); setOpenActionMenuId(null); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-all text-left group"
                >
                  <span className="material-symbols-outlined text-[20px] text-blue-400 group-hover:rotate-180 transition-transform duration-500">sync</span>
                  <span className="text-[14px] font-medium">Refresh</span>
                </button>

                <div className="h-px bg-gray-50 my-1.5 mx-2"></div>

                <button
                  onClick={() => { handleDelete(pkg.id); setOpenActionMenuId(null); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 text-red-500 transition-colors text-left group"
                >
                  <span className="material-symbols-outlined text-[20px] text-red-400 group-hover:text-red-500">delete</span>
                  <span className="text-[14px] font-medium">Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
};

const BigActionTile: React.FC<{ icon: string; label: string; desc: string; onClick: () => void; color?: string }> = ({ icon, label, desc, onClick, color = 'bg-blue-50 text-blue-500' }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center text-center p-6 rounded-[2.5rem] bg-white border border-gray-100 hover:border-blue-100 hover:bg-blue-50/10 hover:shadow-2xl hover:shadow-blue-100/20 transition-all group active:scale-95 h-full"
  >
    <div className={`w-16 h-16 ${color} rounded-3xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-sm`}>
      <span className="material-symbols-outlined text-[32px]">{icon}</span>
    </div>
    <h4 className="text-[14px] font-black text-gray-900 uppercase tracking-tight mb-2 leading-none">{label}</h4>
    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] leading-relaxed max-w-[120px]">{desc}</p>
  </button>
);

const Packages: React.FC<Props> = ({ showToast, onCourseSelect }) => {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', courses: '', price: '', status: 'active' });
  const [availableCourses, setAvailableCourses] = useState<CourseItem[]>([]);
  const [activeTab, setActiveTab] = useState('Featured Batches');
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const moreDropdownRef = React.useRef<HTMLDivElement>(null);

  // Drawer States
  const [showOverviewDrawer, setShowOverviewDrawer] = useState(false);
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [showFolderDrawer, setShowFolderDrawer] = useState(false);
  const [showLinkDrawer, setShowLinkDrawer] = useState(false);
  const [showUploadDrawer, setShowUploadDrawer] = useState(false);
  const [uploadType, setUploadType] = useState<any>({ title: '', subtitle: '', accept: '*' });
  const [showTestDrawer, setShowTestDrawer] = useState(false);
  const [showOMRDrawer, setShowOMRDrawer] = useState(false);
  const [showQuizDrawer, setShowQuizDrawer] = useState(false);
  const [showWebinarDrawer, setShowWebinarDrawer] = useState(false);
  const [showVideoDrawer, setShowVideoDrawer] = useState(false);
  const [showLiveStreamDrawer, setShowLiveStreamDrawer] = useState(false);
  const [isBulkDropdownOpen, setIsBulkDropdownOpen] = useState(false);
  const [showProductActionDrawer, setShowProductActionDrawer] = useState(false);
  const [selectedPkgForAction, setSelectedPkgForAction] = useState<Package | null>(null);
  const [showConfirmDrawer, setShowConfirmDrawer] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ title: string; desc: string; onConfirm: () => void } | null>(null);

  // Context State
  const [selectedProductContext, setSelectedProductContext] = useState<any>(null);
  const [testSeriesList, setTestSeriesList] = useState<any[]>([]);
  const [standardTests, setStandardTests] = useState<any[]>([]);
  const [omrTests, setOMRTests] = useState<any[]>([]);
  const [isSeriesLoading, setIsSeriesLoading] = useState(false);
  const [isTestsLoading, setIsTestsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterDropdownRef = React.useRef<HTMLDivElement>(null);
  const bulkDropdownRef = useRef<HTMLDivElement>(null);
  const [subjects, setSubjects] = useState<any[]>([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [globalCreateMode, setGlobalCreateMode] = useState(false);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [isReordering, setIsReordering] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadData();
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
      if (bulkDropdownRef.current && !bulkDropdownRef.current.contains(event.target as Node)) {
        setIsBulkDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchTestSeriesList = async () => {
    setIsSeriesLoading(true);
    try {
      const data = await testSeriesAPI.getAll();
      const list = Array.isArray(data) ? data : [];
      setTestSeriesList(list.length > 0 ? list : [
        { id: '1', seriesName: 'Concepts Test Series' },
        { id: '2', seriesName: 'Full Length Mock Tests' }
      ]);
    } catch (error) {
      console.error('Failed to load test series:', error);
      setTestSeriesList([
        { id: '1', seriesName: 'Concepts Test Series' },
        { id: '2', seriesName: 'Full Length Mock Tests' }
      ]);
    } finally {
      setIsSeriesLoading(false);
    }
  };

  const fetchTestsBySeries = async (seriesId: string, type: 'standard' | 'omr' = 'standard') => {
    setIsTestsLoading(true);
    try {
      const res = await fetch(`/api/tests?seriesId=${seriesId}&testType=${type}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      if (type === 'omr') {
        setOMRTests(list.length > 0 ? list : [
          { _id: `omr1_${seriesId}`, name: 'Mock OMR Test 1' },
          { _id: `omr2_${seriesId}`, name: 'Mock OMR Test 2' }
        ]);
      } else {
        setStandardTests(list.length > 0 ? list : [
          { _id: `std1_${seriesId}`, name: 'Mock Regular Test 1' },
          { _id: `std2_${seriesId}`, name: 'Mock Regular Test 2' }
        ]);
      }
    } catch (error) {
      const mock = [
        { _id: `mock1_${seriesId}`, name: `Mock ${type} Test 1` },
        { _id: `mock2_${seriesId}`, name: `Mock ${type} Test 2` }
      ];
      if (type === 'omr') setOMRTests(mock);
      else setStandardTests(mock);
    } finally {
      setIsTestsLoading(false);
    }
  };

  useEffect(() => {
    if (showTestDrawer || showOMRDrawer) {
      fetchTestSeriesList();
    }
  }, [showTestDrawer, showOMRDrawer]);

  const normalizeData = (data: any[]) => {
    return data.map(item => ({
      ...item,
      id: item.id || item._id,
      _id: item._id || item.id,
      name: item.name || item.title || 'Untitled'
    }));
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [pkgs, courses] = await Promise.all([
        packagesAPI.getAll().catch(() => []),
        coursesAPI.getAll().catch(() => [])
      ]);

      const normalizedPkgs = Array.isArray(pkgs) ? normalizeData(pkgs) : [];
      const normalizedCourses = Array.isArray(courses) ? normalizeData(courses) : [];

      // Combine both types into the main packages state for display and sort them
      const combined = [...normalizedPkgs, ...normalizedCourses];
      combined.sort((a, b) => {
        const getOrder = (item: any) => {
          const val = item.settings?.sortingOrder ?? item.sortingOrder ?? 1000;
          return val === 0 ? 1000 : val;
        };
        const orderA = getOrder(a);
        const orderB = getOrder(b);
        if (orderA !== orderB) return orderA - orderB;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
      setPackages(combined);
      setAvailableCourses(normalizedCourses);

      const subs = await subjectsAPI.getAll();
      setSubjects(Array.isArray(subs) ? subs : (subs?.data || []));
    } catch (error) {
      console.error('Data loading error:', error);
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredPackages = React.useMemo(() => {
    return packages.filter(pkg => {
      const nameStr = String(pkg?.name || pkg?.title || '');
      const descStr = String(pkg?.description || '');
      const matchesSearch = nameStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (descStr || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (pkg.title || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || pkg.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [packages, searchQuery, statusFilter]);

  const totalItems = filteredPackages.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const paginatedItems = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = Math.min(start + pageSize, filteredPackages.length);
    return filteredPackages.slice(start, end);
  }, [filteredPackages, currentPage, pageSize]);

  const startIndex = (currentPage - 1) * pageSize;
  const showingStart = totalItems === 0 ? 0 : startIndex + 1;
  const showingEnd = Math.min(startIndex + pageSize, totalItems);

  // Reset page when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Guard: Disable reordering during search or filtering
    if (searchQuery.trim() !== '' || statusFilter !== 'all') {
      showToast('Reordering is disabled while search or filters are active', 'error');
      return;
    }

    const oldIndex = packages.findIndex((pkg) => pkg.id === active.id);
    const newIndex = packages.findIndex((pkg) => pkg.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const previousOrder = [...packages];
    
    // Calculate new order and update settings.sortingOrder optimistically
    const newOrder = arrayMove(packages, oldIndex, newIndex).map((item, index) => ({
      ...item,
      settings: {
        ...(item.settings || {}),
        sortingOrder: index + 1
      }
    }));
    
    setPackages(newOrder);
    setIsReordering(true);

    try {
      // Use MongoDB _id for stable reordering persistence
      const orderedIds = newOrder.map(pkg => pkg._id || pkg.id);
      await packagesAPI.reorder(orderedIds);
      showToast('Order updated successfully', 'success');
    } catch (error) {
      console.error('Failed to reorder:', error);
      showToast('Failed to save order. Rolling back...', 'error');
      setPackages(previousOrder);
    } finally {
      setIsReordering(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const packageData = {
        id: editingPackage?.id || `pkg_${Date.now()}`,
        name: formData.name,
        description: formData.description,
        courses: formData.courses.split(',').map(c => c.trim()).filter(c => c),
        price: parseFloat(formData.price) || 0,
        status: formData.status as 'active' | 'inactive'
      };

      if (editingPackage) {
        await packagesAPI.update(editingPackage.id, packageData);
        showToast('Package updated successfully!');
      } else {
        await packagesAPI.create(packageData);
        showToast('Package created successfully!');
      }

      setShowEditDrawer(false);
      setEditingPackage(null);
      setFormData({ name: '', description: '', courses: '', price: '', status: 'active' });
      loadData();
    } catch (error) {
      showToast('Failed to save package', 'error');
    }
  };

  const handleAddLiveStream = async (data: any) => {
    try {
      await liveVideosAPI.create({
        ...data,
        status: 'upcoming',
        courseId: data.courseId || '',
        subjectId: data.subjectId || ''
      });
      showToast('Live stream scheduled successfully!', 'success');
      setShowLiveStreamDrawer(false);
      // If we are on the Live tab, we might need a way to refresh it.
      // Since LiveSessions fetches its own data, switching to it will refresh it.
    } catch (error) {
      console.error(error);
      showToast('Failed to schedule live stream', 'error');
    }
  };

  const handleGlobalFolderSubmit = async (data: any) => {
    if (selectedBatchIds.length === 0) {
      showToast('Please select at least one batch', 'error');
      return;
    }
    
    let successCount = 0;
    for (const batchId of selectedBatchIds) {
      try {
        const folderData = {
          title: data.name,
          description: data.description || '',
          thumbnail: data.thumbnail || '',
          isFree: data.status === 'Free',
          status: 'active',
          sortingOrder: data.sortingOrder || '0.00',
          parentId: null,
          courseId: batchId
        };
        await apiRequest(`${API_BASE_URL}/courses/${batchId}/folders`, {
          method: 'POST',
          headers: { ...getAdminHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify(folderData)
        });
        successCount++;
      } catch (err) {
        console.error(`Failed for batch ${batchId}`, err);
      }
    }
    showToast(`Added folder to ${successCount} batches`, 'success');
    setShowFolderDrawer(false);
    setGlobalCreateMode(false);
    setSelectedBatchIds([]);
  };

  const handleGlobalVideoSubmit = async (data: any) => {
    if (selectedBatchIds.length === 0) {
      showToast('Please select at least one batch', 'error');
      return;
    }

    let successCount = 0;
    for (const batchId of selectedBatchIds) {
      try {
        if (data.youtubeLinks) {
          // Multiple links
          for (const link of data.youtubeLinks) {
            const videoData = {
              title: link.title || data.title || 'Video',
              description: data.description || '',
              youtubeUrl: toYouTubeEmbed(link.url),
              videoUrl: toYouTubeEmbed(link.url),
              url: toYouTubeEmbed(link.url),
              platform: 'YouTube',
              status: 'active',
              isFree: data.status === 'Free' || data.isFree === true,
              order: 1,
              courseId: batchId,
              folderId: null
            };
            await apiRequest(`${API_BASE_URL}/courses/${batchId}/videos`, {
              method: 'POST',
              headers: { ...getAdminHeaders(), 'Content-Type': 'application/json' },
              body: JSON.stringify(videoData)
            });
          }
        } else {
          // Single link
          const videoData = {
            title: data.title,
            description: data.description || '',
            youtubeUrl: toYouTubeEmbed(data.link || data.youtubeUrl || ''),
            videoUrl: toYouTubeEmbed(data.link || data.youtubeUrl || ''),
            url: toYouTubeEmbed(data.link || data.youtubeUrl || ''),
            platform: 'YouTube',
            status: 'active',
            isFree: data.status === 'Free' || data.isFree === true,
            order: 1,
            courseId: batchId,
            folderId: null
          };
          await apiRequest(`${API_BASE_URL}/courses/${batchId}/videos`, {
            method: 'POST',
            headers: { ...getAdminHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify(videoData)
          });
        }
        successCount++;
      } catch (err) {
        console.error(`Failed for batch ${batchId}`, err);
      }
    }
    showToast(`Added video to ${successCount} batches`, 'success');
    setShowVideoDrawer(false);
    setGlobalCreateMode(false);
    setSelectedBatchIds([]);
    invalidateCache('course-content');
  };

  const handleGlobalUploadSubmit = async (files: File[]) => {
    if (selectedBatchIds.length === 0) {
      showToast('Please select at least one batch', 'error');
      return;
    }

    try {
      let successBatchCount = 0;
      for (const file of files) {
        const res = await uploadAPI.uploadDocument(file);
        const fileUrl = res.url || res.data?.url;

        if (!fileUrl) continue;

        for (const batchId of selectedBatchIds) {
          try {
            const noteData = {
              title: file.name,
              description: '',
              fileUrl: fileUrl,
              fileSize: (file.size / 1024).toFixed(2) + ' KB',
              isFree: false,
              status: 'active',
              order: 1,
              courseId: batchId,
              folderId: null,
              type: 'note'
            };
            await apiRequest(`${API_BASE_URL}/courses/${batchId}/notes`, {
              method: 'POST',
              headers: { ...getAdminHeaders(), 'Content-Type': 'application/json' },
              body: JSON.stringify(noteData)
            });
          } catch (err) {
            console.error(`Failed for batch ${batchId}`, err);
          }
        }
        successBatchCount++;
      }
      showToast(`Added ${files.length} file(s) to ${selectedBatchIds.length} batches`, 'success');
      setShowUploadDrawer(false);
      setGlobalCreateMode(false);
      setSelectedBatchIds([]);
      invalidateCache('course-content');
    } catch (error) {
      console.error(error);
      showToast('Failed to upload files', 'error');
    }
  };

  const handleGlobalTestSubmit = async (tests: any[]) => {
    if (selectedBatchIds.length === 0) {
      showToast('Please select at least one batch', 'error');
      return;
    }

    let successCount = 0;
    for (const test of tests) {
      for (const batchId of selectedBatchIds) {
        try {
          const testData = {
            ...test,
            id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            courseId: batchId,
            folderId: null,
            questions: test.questions || []
          };
          delete testData._id;
          
          await apiRequest(`${API_BASE_URL}/courses/${batchId}/tests`, {
            method: 'POST',
            headers: { ...getAdminHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify(testData)
          });
          successCount++;
        } catch (err) {
          console.error(`Failed for batch ${batchId}`, err);
        }
      }
    }
    showToast(`Added ${tests.length} test(s) to ${selectedBatchIds.length} batches`, 'success');
    setShowOMRDrawer(false);
    setShowTestDrawer(false);
    setGlobalCreateMode(false);
    setSelectedBatchIds([]);
    invalidateCache('course-content');
  };

  const handleGlobalLiveStreamSubmit = async (data: any) => {
    if (selectedBatchIds.length === 0) {
      showToast('Please select at least one batch', 'error');
      return;
    }

    let successCount = 0;
    for (const batchId of selectedBatchIds) {
      try {
        await apiRequest(`${API_BASE_URL}/live-videos`, {
          method: 'POST',
          headers: { ...getAdminHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            status: 'upcoming',
            courseId: batchId,
            subjectId: data.subjectId || ''
          })
        });
        successCount++;
      } catch (err) {
        console.error(`Failed for batch ${batchId}`, err);
      }
    }
    showToast(`Scheduled live stream for ${successCount} batches`, 'success');
    setShowLiveStreamDrawer(false);
    setGlobalCreateMode(false);
    setSelectedBatchIds([]);
    invalidateCache('course-content');
  };

  const handleGlobalWebinarSubmit = async (data: any) => {
    if (selectedBatchIds.length === 0) {
      showToast('Please select at least one batch', 'error');
      return;
    }
    
    let successCount = 0;
    for (const batchId of selectedBatchIds) {
      try {
        await apiRequest(`${API_BASE_URL}/live-videos`, {
          method: 'POST',
          headers: { ...getAdminHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            type: 'webinar',
            status: 'active',
            courseId: batchId
          })
        });
        successCount++;
      } catch (err) {
        console.error(`Failed for batch ${batchId}`, err);
      }
    }
    showToast(`Connected webinar to ${successCount} batches`, 'success');
    setShowWebinarDrawer(false);
    setGlobalCreateMode(false);
    setSelectedBatchIds([]);
    invalidateCache('course-content');
  };

  const handleSendBatchNotification = async (batchId: string) => {
    const message = prompt("Enter Notification Message:");
    if (!message) return;

    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}` // Assuming admin token is stored here
        },
        body: JSON.stringify({ batchId, message })
      });

      const data = await response.json();
      if (response.ok) {
        showToast(data.message || 'Notification sent successfully!', 'success');
      } else {
        showToast(data.error || 'Failed to send notification', 'error');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      showToast('Error sending notification', 'error');
    }
  };

  const handleDelete = (id: string) => {
    setConfirmAction({
      title: 'Delete Batch',
      desc: 'Are you sure you want to delete this batch? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await coursesAPI.delete(id);
          showToast('Batch deleted successfully!');
          loadData();
        } catch (error) {
          showToast('Failed to delete batch', 'error');
        }
        setShowConfirmDrawer(false);
      }
    });
    setShowConfirmDrawer(true);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
      const target = event.target as HTMLElement;
      if (!target.closest('.row-action-menu-container')) {
        setOpenActionMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openEditDrawer = (pkg: Package) => {
    setEditingPackage(pkg);
    setIsAddingCourse(true);
    setOpenActionMenuId(null);
  };

  const handleToggleStatus = async (pkg: any) => {
    try {
      const newStatus = pkg.status === 'active' ? 'inactive' : 'active';
      await coursesAPI.update(pkg.id || pkg._id, { ...pkg, status: newStatus });
      showToast(`Batch ${newStatus === 'active' ? 'enabled' : 'disabled'} successfully`, 'success');
      loadData();
    } catch (error) {
      showToast('Failed to toggle status', 'error');
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setConfirmAction({
      title: 'Bulk Delete Batches',
      desc: `Are you sure you want to delete ${selectedIds.length} selected batches? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await Promise.all(selectedIds.map(id => coursesAPI.delete(id)));
          showToast(`${selectedIds.length} batches deleted successfully!`, 'success');
          setSelectedIds([]);
          loadData();
        } catch (error) {
          showToast('Failed to delete some batches', 'error');
          loadData();
        }
        setShowConfirmDrawer(false);
      }
    });
    setShowConfirmDrawer(true);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredPackages.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPackages.map(p => p.id || p._id));
    }
  };

  const toggleSelectOne = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDuplicate = (pkg: Package) => {
    const duplicateData = {
      ...pkg,
      name: `${pkg.name} (Copy)`,
      isDuplicate: true
    };
    // Remove IDs to ensure the editor treats it as a new entry
    delete (duplicateData as any).id;
    delete (duplicateData as any)._id;

    setEditingPackage(duplicateData as any);
    setIsAddingCourse(true);
    setOpenActionMenuId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy"></div>
      </div>
    );
  }

  if (isAddingCourse) {
    return <AddCourse onClose={() => { setIsAddingCourse(false); setEditingPackage(null); loadData(); }} courseData={editingPackage} />;
  }

  return (
    <div className="space-y-4 animate-fade-in pb-10">
      {/* Navigation Tabs Container */}
      <div className="bg-white px-8 py-1 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-10 overflow-x-auto scrollbar-hide">
        {['Featured Batches', 'Live & Upcoming', 'Forum', 'Content'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-4 text-[13px] font-bold transition-all relative shrink-0 ${activeTab === tab
              ? 'text-gray-900 border-b-2 border-gray-900'
              : 'text-gray-400 hover:text-gray-600'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Live & Upcoming' ? (
        <LiveSessions showHeader={false} />
      ) : activeTab === 'Forum' ? (
        <ForumManager />
      ) : activeTab === 'Content' ? (
        <ContentManager />
      ) : (
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-visible">
          {/* Header Section */}
          <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-50 bg-white rounded-t-[2rem]">
            <div className="flex flex-col gap-1">
              <h3 className="text-[20px] font-bold text-gray-900 tracking-tight">Featured Batches</h3>
              {(searchQuery || statusFilter !== 'all') ? (
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2">
                  <span className="material-symbols-outlined text-[14px]">info</span>
                  Clear search and filters to reorder batches
                </p>
              ) : (
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">drag_indicator</span>
                  Drag rows to reorder featured batches
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="relative group flex-1 md:flex-none">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[20px] group-focus-within:text-navy transition-colors">search</span>
                <input
                  type="text"
                  placeholder="Search featured batches..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full md:w-[320px] pl-12 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:border-navy focus:ring-4 focus:ring-navy/5 transition-all shadow-sm placeholder:text-gray-400"
                />
              </div>

              <div className="relative" ref={filterDropdownRef}>
                <button
                  onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                  className={`flex items-center gap-2 px-6 py-3 border rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all shadow-sm ${isFilterDropdownOpen || statusFilter !== 'all' ? 'bg-navy text-white border-navy shadow-lg shadow-navy/20' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                >
                  <span className="material-symbols-outlined text-[18px]">tune</span>
                  {statusFilter === 'all' ? 'Advanced Filters' : statusFilter === 'active' ? 'Published' : 'Draft'}
                  {statusFilter !== 'all' && (
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                  )}
                </button>

                {isFilterDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-100 rounded-2xl shadow-2xl z-[200] p-5 animate-in fade-in zoom-in duration-200 origin-top-right">
                    <div className="flex justify-between items-center mb-5">
                      <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Filter Featured Batches</h4>
                      <button
                        onClick={() => { setStatusFilter('all'); setIsFilterDropdownOpen(false); }}
                        className="text-[10px] font-bold text-blue-600 hover:underline"
                      >
                        Reset
                      </button>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Publish Status</label>
                      <div className="flex flex-col gap-1">
                        {[
                          { id: 'all', label: 'All Featured Batches', icon: 'inventory_2' },
                          { id: 'active', label: 'Published', icon: 'check_circle', color: 'text-green-500' },
                          { id: 'inactive', label: 'Drafts', icon: 'pending', color: 'text-amber-500' }
                        ].map((item) => (
                          <button
                            key={item.id}
                            onClick={() => { setStatusFilter(item.id); setIsFilterDropdownOpen(false); }}
                            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-[12px] font-bold transition-all ${statusFilter === item.id ? 'bg-navy text-white shadow-md' : 'hover:bg-gray-50 text-gray-600'}`}
                          >
                            <span className={`material-symbols-outlined text-[18px] ${statusFilter === item.id ? 'text-white' : item.color || 'text-gray-400'}`}>{item.icon}</span>
                            {item.label}
                            {statusFilter === item.id && <span className="material-symbols-outlined text-[16px] ml-auto">check</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {selectedIds.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 border border-red-100 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all shadow-sm hover:bg-red-500 hover:text-white hover:border-red-500 animate-in fade-in slide-in-from-right-4 group"
                >
                  <span className="material-symbols-outlined text-[18px] group-hover:scale-110 transition-transform">delete_sweep</span>
                  Bulk Delete ({selectedIds.length})
                </button>
              )}

              <button
                onClick={() => setIsAddingCourse(true)}
                className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-all shadow-md active:scale-95 shrink-0"
              >
                <span className="material-symbols-outlined text-[24px]">add</span>
              </button>
              <div className="relative" ref={bulkDropdownRef}>
                <button
                  onClick={() => setIsBulkDropdownOpen(!isBulkDropdownOpen)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 border border-transparent hover:border-gray-200 transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-[20px]">more_vert</span>
                </button>

                {isBulkDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-[280px] bg-white border border-gray-100 rounded-2xl shadow-xl z-[200] p-2 animate-in fade-in zoom-in duration-200 origin-top-right max-h-[520px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-100 scrollbar-track-transparent">
                    <div className="mb-4 pt-1">
                      <h4 className="text-[11px] font-bold tracking-[0.16em] text-gray-400 uppercase px-3 mb-2">Table View</h4>
                      <div className="flex gap-2 px-2">
                        <button
                          onClick={() => { setViewMode('list'); setIsBulkDropdownOpen(false); }}
                          className={`flex-1 h-11 flex items-center justify-center rounded-xl transition-all ${viewMode === 'list' ? 'bg-[#263091] text-white shadow-sm' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                        >
                          <span className="material-symbols-outlined text-[20px]">list</span>
                        </button>
                        <button
                          onClick={() => { setViewMode('grid'); setIsBulkDropdownOpen(false); }}
                          className={`flex-1 h-11 flex items-center justify-center rounded-xl transition-all ${viewMode === 'grid' ? 'bg-[#263091] text-white shadow-sm' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                        >
                          <span className="material-symbols-outlined text-[20px]">grid_view</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[11px] font-bold tracking-[0.16em] text-gray-400 uppercase px-3 mb-2 mt-4">Bulk Actions</h4>
                      <div className="flex flex-col gap-0.5">
                        {[
                          { id: 'folder', icon: 'create_new_folder', label: 'Add Folder' },
                          { id: 'video', icon: 'videocam', label: 'Add Video' },
                          { id: 'pdf', icon: 'picture_as_pdf', label: 'Add PDF' },
                          { id: 'test', icon: 'quiz', label: 'Add Test' },
                          { id: 'live_stream', icon: 'sensors', label: 'Add Live Stream' },
                          { id: 'document', icon: 'description', label: 'Add Document' }
                        ].map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              setIsBulkDropdownOpen(false);
                              setGlobalCreateMode(true);
                              setSelectedBatchIds([]);
                              switch (item.id) {
                                case 'folder': setShowFolderDrawer(true); break;
                                case 'video': setShowVideoDrawer(true); break;
                                case 'pdf':
                                  setUploadType({ title: 'Add PDF File(s)', subtitle: 'Upload PDF', accept: '.pdf,application/pdf' });
                                  setShowUploadDrawer(true);
                                  break;
                                case 'test': setShowTestDrawer(true); break;
                                case 'live_stream': setShowLiveStreamDrawer(true); break;
                                case 'document':
                                  setUploadType({ title: 'Add Documents', subtitle: 'Upload Doc/PDF', accept: '.pdf,.doc,.docx,.xls,.xlsx,.txt' });
                                  setShowUploadDrawer(true);
                                  break;
                              }
                            }}
                            className="flex items-center gap-3 w-full h-11 px-3 rounded-xl text-[14px] font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                              <span className="material-symbols-outlined text-[20px] text-blue-500">{item.icon}</span>
                            </div>
                            <span className="text-left leading-tight">{item.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {viewMode === 'list' ? (
            <div className="overflow-visible min-w-full">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="bg-gray-50/10 border-b border-gray-100">
                    <th className="w-[60px] pl-8 py-5">
                      <div
                        onClick={toggleSelectAll}
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer ${selectedIds.length === filteredPackages.length && filteredPackages.length > 0
                          ? 'bg-navy border-navy text-white'
                          : 'border-gray-200 bg-white hover:border-gray-400'
                          }`}
                      >
                        {selectedIds.length === filteredPackages.length && filteredPackages.length > 0 && (
                          <span className="material-symbols-outlined text-[14px]">check</span>
                        )}
                        {selectedIds.length > 0 && selectedIds.length < filteredPackages.length && (
                          <span className="w-2 h-0.5 bg-gray-400 rounded-full"></span>
                        )}
                      </div>
                    </th>
                    <th className="w-[80px] px-4 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] whitespace-nowrap">
                      S. No.
                    </th>
                    <th className="w-[80px] px-4 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] whitespace-nowrap">
                      Order
                    </th>
                    <th className="w-1/3 px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] whitespace-nowrap">
                      Batch Details
                    </th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] whitespace-nowrap">
                      Content Description
                    </th>
                    <th className="w-24 px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] whitespace-nowrap">Price</th>
                    <th className="w-32 px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] whitespace-nowrap">
                      Visibility
                    </th>
                    <th className="w-32 px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] whitespace-nowrap text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-gray-300 text-[32px]">inventory_2</span>
                          </div>
                          <p className="text-gray-400 text-[14px] font-bold tracking-tight uppercase">No batches found matching your criteria</p>
                        </div>
                      </td>
                    </tr>
                    ) : (
                    <DndContext 
                      sensors={sensors} 
                      collisionDetection={closestCenter} 
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext 
                        items={paginatedItems.map(p => p.id)} 
                        strategy={verticalListSortingStrategy}
                      >
                        {paginatedItems.map((pkg, idx) => (
                          <SortablePackageRow
                            key={pkg.id}
                            pkg={pkg}
                            idx={idx}
                            startIndex={startIndex}
                            selectedIds={selectedIds}
                            toggleSelectOne={toggleSelectOne}
                            onCourseSelect={onCourseSelect}
                            openActionMenuId={openActionMenuId}
                            setOpenActionMenuId={setOpenActionMenuId}
                            handleToggleStatus={handleToggleStatus}
                            openEditDrawer={openEditDrawer}
                            handleDuplicate={handleDuplicate}
                            handleDelete={handleDelete}
                            loadData={loadData}
                            paginatedItems={paginatedItems}
                            disabled={searchQuery !== '' || statusFilter !== 'all' || isReordering}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-gray-50/30">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8">
                {paginatedItems.length === 0 ? (
                  <div className="col-span-full py-20 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <span className="material-icons-outlined text-3xl text-slate-200">inventory_2</span>
                    </div>
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No batches found matching your criteria</p>
                  </div>
                ) : (
                    paginatedItems.map((pkg) => (
                      <div
                        key={pkg.id}
                        onClick={() => onCourseSelect(pkg)}
                        className={`bg-white rounded-[1.5rem] border transition-all p-6 cursor-pointer group flex flex-col relative ${selectedIds.includes(pkg.id) ? 'border-blue-500 shadow-md ring-1 ring-blue-500/20' : 'border-gray-100 shadow-sm hover:shadow-md'}`}
                      >
                        {/* Checkbox Overlay for Grid */}
                        <div
                          onClick={(e) => toggleSelectOne(e, pkg.id)}
                          className={`absolute top-4 right-4 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all z-10 ${selectedIds.includes(pkg.id)
                            ? 'bg-[#1a237e] border-[#1a237e] text-white shadow-lg scale-110'
                            : 'bg-white/80 backdrop-blur-sm border-gray-200 opacity-0 group-hover:opacity-100 hover:border-gray-400'
                            }`}
                        >
                          {selectedIds.includes(pkg.id) && (
                            <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                          )}
                        </div>

                        <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                          <span className="material-symbols-outlined text-blue-500">inventory_2</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${pkg.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                            {pkg.status === 'active' ? 'Published' : 'Draft'}
                          </span>
                        </div>
                      </div>
                      <h4 className="text-[16px] font-bold text-gray-900 mb-2 uppercase tracking-tight">{pkg.name}</h4>
                      <div className="text-sm text-gray-600 line-clamp-2 mb-4 leading-relaxed">
                        {pkg.description ? parse(pkg.description) : '-'}
                      </div>
                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                        <span className="text-[15px] font-black text-gray-900">₹{pkg.price}</span>
                        <div className="relative row-action-menu-container">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenActionMenuId(openActionMenuId === pkg.id ? null : pkg.id);
                            }}
                            className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border flex items-center gap-2 ${openActionMenuId === pkg.id ? 'bg-gray-100 border-gray-300 text-gray-900' : 'bg-gray-50 text-gray-400 border-transparent hover:border-gray-200 hover:bg-gray-100 hover:text-gray-900'}`}
                          >
                            Action
                            <span className={`material-symbols-outlined text-[16px] transition-transform duration-300 ${openActionMenuId === pkg.id ? 'rotate-180' : ''}`}>expand_more</span>
                          </button>

                          {openActionMenuId === pkg.id && (
                            <div
                              className="absolute right-0 bottom-full mb-2 w-64 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-gray-100 py-2.5 z-[250] animate-in fade-in slide-in-from-bottom-2 duration-200 origin-bottom-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => { onCourseSelect(pkg, 'Overview'); setOpenActionMenuId(null); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-colors text-left group"
                              >
                                <span className="material-symbols-outlined text-[20px] text-blue-400">explore</span>
                                <span className="text-[14px] font-medium">Batch Overview</span>
                              </button>

                              <button
                                onClick={() => { onCourseSelect(pkg, 'Content'); setOpenActionMenuId(null); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-colors text-left group"
                              >
                                <span className="material-symbols-outlined text-[20px] text-blue-500/70">add_circle</span>
                                <span className="text-[14px] font-medium">Add/View Content</span>
                              </button>

                              <div className="px-4 py-2.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                                <div className="flex items-center gap-3 text-gray-600">
                                  <span className="material-symbols-outlined text-[20px] text-blue-400/80">info</span>
                                  <span className="text-[14px] font-medium">Enabled</span>
                                </div>
                                <button
                                  onClick={() => handleToggleStatus(pkg)}
                                  className={`w-[42px] h-[22px] rounded-full relative transition-all duration-300 ${pkg.status === 'active' ? 'bg-black' : 'bg-gray-200'}`}
                                >
                                  <div className={`absolute top-[3px] w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${pkg.status === 'active' ? 'right-[3px]' : 'left-[3px]'}`}></div>
                                </button>
                              </div>

                              <button
                                onClick={() => { openEditDrawer(pkg); setOpenActionMenuId(null); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-colors text-left group"
                              >
                                <span className="material-symbols-outlined text-[20px] text-blue-400/70">edit</span>
                                <span className="text-[14px] font-medium">Edit</span>
                              </button>

                              <button
                                onClick={() => { handleDuplicate(pkg); setOpenActionMenuId(null); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-colors text-left group"
                              >
                                <span className="material-symbols-outlined text-[20px] text-blue-500/60">content_copy</span>
                                <span className="text-[14px] font-medium">Duplicate</span>
                              </button>

                              <button
                                onClick={() => { loadData(); setOpenActionMenuId(null); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-all text-left group"
                              >
                                <span className="material-symbols-outlined text-[20px] text-blue-400 group-hover:rotate-180 transition-transform duration-500">sync</span>
                                <span className="text-[14px] font-medium">Refresh</span>
                              </button>

                              <div className="h-px bg-gray-50 my-1.5 mx-2"></div>

                              <button
                                onClick={() => { handleDelete(pkg.id); setOpenActionMenuId(null); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 text-red-500 transition-colors text-left group"
                              >
                                <span className="material-symbols-outlined text-[20px] text-red-400 group-hover:text-red-500">delete</span>
                                <span className="text-[14px] font-medium">Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Standardized Pagination Footer */}
          {!loading && filteredPackages.length > 0 && (
            <div className="p-6 border-t border-gray-50 flex items-center justify-between bg-white rounded-b-2xl">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center group">
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2 pr-10 text-[13px] font-bold text-gray-700 outline-none focus:border-gray-500 transition-all cursor-pointer shadow-sm hover:bg-gray-50"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 pointer-events-none text-[20px] text-gray-400 flex items-center justify-center h-full top-0 group-focus-within:text-black">expand_more</span>
                </div>
                <span className="text-[13px] font-medium text-gray-400 italic">
                  Showing {showingStart} to {showingEnd} of {totalItems} entries
                </span>
              </div>

              <div className="flex items-center p-1.5 bg-white border border-gray-200 rounded-2xl shadow-sm">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="h-9 px-4 flex items-center justify-center text-[13px] font-bold text-gray-400 hover:text-black hover:bg-gray-50 rounded-xl transition-all disabled:opacity-50"
                >
                  Previous
                </button>
                <div className="w-[1px] h-4 bg-gray-100 mx-1"></div>
                <button className="h-9 w-9 flex items-center justify-center text-[13px] font-black bg-black text-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
                  {currentPage}
                </button>
                <div className="w-[1px] h-4 bg-gray-100 mx-1"></div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="h-9 px-4 flex items-center justify-center text-[13px] font-bold text-gray-400 hover:text-black hover:bg-gray-50 rounded-xl transition-all disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- EDIT PRODUCT DRAWER --- */}
      <RightSideDrawer isOpen={showEditDrawer} onClose={() => { setShowEditDrawer(false); setEditingPackage(null); }}>
        <DrawerHeader
          title={editingPackage ? 'Refine Batch' : 'Create New Batch'}
          onClose={() => { setShowEditDrawer(false); setEditingPackage(null); }}
        />
        <DrawerBody className="pb-10">
          <div className="space-y-6 pt-2">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Batch Title</label>
              <input
                type="text"
                placeholder="Enter course name..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-200 focus:ring-4 focus:ring-gray-50 transition-all placeholder:text-gray-300 shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Batch Description</label>
              <RichTextEditor
                content={formData.description}
                onChange={(content: string) => setFormData({ ...formData, description: content })}
                height="300px"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Connect Existing Featured Batches</label>
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-2 max-h-52 overflow-y-auto custom-scrollbar shadow-inner">
                {availableCourses.length === 0 ? (
                  <p className="text-[10px] text-gray-400 p-4 italic text-center">No batches found in database</p>
                ) : (
                  <div className="grid grid-cols-1 gap-1">
                    {availableCourses.map((course) => {
                      const courseName = (course.name || course.title || '') as string;
                      const isSelected = formData.courses.split(',').map(c => c.trim()).includes(courseName);
                      return (
                        <button
                          key={course.id || course._id}
                          onClick={() => {
                            const current = formData.courses.split(',').map(c => c.trim()).filter(c => c);
                            const next = isSelected
                              ? current.filter(c => c !== courseName)
                              : [...current, courseName];
                            setFormData({ ...formData, courses: next.join(', ') });
                          }}
                          className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all ${isSelected ? 'bg-white text-black ring-1 ring-gray-100 shadow-sm' : 'hover:bg-white text-gray-500'}`}
                        >
                          <span className={`material-symbols-outlined text-[20px] ${isSelected ? 'text-blue-500' : 'text-gray-300'}`}>
                            {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                          </span>
                          <div className="flex flex-col">
                            <span className="text-[13px] font-bold leading-none">{courseName}</span>
                            <span className="text-[10px] opacity-60 mt-1 uppercase tracking-tight">{course.category || 'General'}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Market Price (₹)</label>
                <input
                  type="number"
                  placeholder="999"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-gray-200 focus:ring-4 focus:ring-gray-50 transition-all placeholder:text-gray-300 shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Visibility</label>
                <div className="grid grid-cols-2 gap-2 bg-gray-50 p-1 rounded-xl border border-gray-100">
                  {['active', 'inactive'].map((s) => (
                    <button
                      key={s}
                      onClick={() => setFormData({ ...formData, status: s as any })}
                      className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${formData.status === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      {s === 'active' ? 'Public' : 'Draft'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-8 flex gap-4">
              <button
                onClick={() => { setShowEditDrawer(false); setEditingPackage(null); }}
                className="flex-1 py-4 bg-white border border-gray-100 text-gray-400 font-black rounded-full uppercase tracking-[0.2em] text-[10px] hover:bg-gray-50 transition-all active:scale-95"
              >
                Discard
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-4 bg-gray-900 text-white font-black rounded-full uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-gray-200/50 hover:bg-black transition-all active:scale-95"
              >
                {editingPackage ? 'Save Changes' : 'Create Product'}
              </button>
            </div>
          </div>
        </DrawerBody>
      </RightSideDrawer>

      {/* --- COURSE OVERVIEW MODAL --- */}
      {/* --- COURSE OVERVIEW DRAWER --- */}
      <RightSideDrawer isOpen={showOverviewDrawer} onClose={() => { setShowOverviewDrawer(false); setEditingPackage(null); }}>
        {editingPackage && (
          <>
            <DrawerHeader title="Product Overview" onClose={() => { setShowOverviewDrawer(false); setEditingPackage(null); }} />
            <DrawerBody className="pb-10">
              <div className="space-y-8 py-2">
                {/* Product Banner Style */}
                <div className="bg-gradient-to-br from-[#1e293b] to-[#334155] p-8 rounded-[2rem] text-white relative overflow-hidden shadow-xl shadow-slate-200/50">
                  <div className="relative z-10">
                    <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md border border-white/20">
                      <span className="material-symbols-outlined text-white text-[28px]">inventory_2</span>
                    </div>
                    <h2 className="text-[22px] font-black text-white uppercase tracking-tight leading-tight">{editingPackage.name}</h2>
                    <span className={`mt-3 inline-block text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border ${editingPackage.status === 'active' ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>
                      {editingPackage.status === 'active' ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50/80 border border-gray-100 rounded-[1.5rem] p-6 transition-all hover:bg-white hover:border-blue-100 hover:shadow-md group">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 group-hover:text-blue-500 transition-colors">Current Price</p>
                    <p className="text-[22px] font-black text-gray-900">{editingPackage.price ? `₹${editingPackage.price}` : 'Free'}</p>
                  </div>
                  <div className="bg-gray-50/80 border border-gray-100 rounded-[1.5rem] p-6 transition-all hover:bg-white hover:border-amber-100 hover:shadow-md group">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 group-hover:text-amber-500 transition-colors">Courses Linked</p>
                    <p className="text-[22px] font-black text-gray-900">{editingPackage.courses?.length || 0}</p>
                  </div>
                </div>

                {/* Description */}
                <div className="bg-gray-50/50 border border-gray-100 rounded-[1.5rem] p-6">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Product Description</p>
                  <p className="text-[14px] text-gray-600 font-medium leading-relaxed italic line-clamp-6">
                    "{editingPackage.description || 'No description provided for this digital product.'}"
                  </p>
                </div>

                {/* Linked Courses */}
                {editingPackage.courses?.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Included Courses</p>
                    <div className="flex flex-wrap gap-2">
                      {editingPackage.courses.map((c, i) => (
                        <div key={i} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-100 text-gray-700 text-[12px] font-bold rounded-xl shadow-sm hover:border-indigo-200 hover:bg-indigo-50 transition-all cursor-default">
                          <span className="material-symbols-outlined text-[18px] text-indigo-400">check_circle</span>
                          {c}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons Integrated in Body (Not Sticky) */}
                <div className="flex gap-4 w-full pt-8">
                  <button
                    onClick={() => { setShowOverviewDrawer(false); openEditDrawer(editingPackage); }}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-gray-900 text-white rounded-full font-black text-[10px] uppercase tracking-[0.2em] hover:bg-black shadow-xl shadow-gray-200/50 transition-all active:scale-95 group"
                  >
                    <span className="material-symbols-outlined text-[16px] group-hover:rotate-12 transition-transform">edit</span>
                    Edit Product
                  </button>
                  <button
                    onClick={() => { setShowOverviewDrawer(false); setEditingPackage(null); onCourseSelect(editingPackage); }}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-gray-900 text-white rounded-full font-black text-[10px] uppercase tracking-[0.2em] hover:bg-black shadow-xl shadow-gray-200/50 transition-all active:scale-95 group"
                  >
                    <span className="material-symbols-outlined text-[16px] group-hover:scale-110 transition-transform">add_circle</span>
                    Manage Content
                  </button>
                </div>
              </div>
            </DrawerBody>
          </>
        )}
      </RightSideDrawer>

      {/* --- DRAWERS INTEGRATION --- */}

      <AddFolderDrawer
        isOpen={showFolderDrawer}
        onClose={() => { setShowFolderDrawer(false); setGlobalCreateMode(false); }}
        onUploadImage={async (file: File) => {
          const res = await uploadAPI.uploadImage(file);
          return res.url || res.data?.url;
        }}
        onSubmit={(data: any) => {
          if (globalCreateMode) {
            handleGlobalFolderSubmit(data);
          } else {
            showToast('Folder created successfully', 'success');
            setShowFolderDrawer(false);
          }
        }}
        globalCreateMode={globalCreateMode}
        selectedBatchIds={selectedBatchIds}
        setSelectedBatchIds={setSelectedBatchIds}
        availableCourses={availableCourses}
        showToast={showToast}
      />

      <LinkDrawer
        isOpen={showLinkDrawer}
        onClose={() => setShowLinkDrawer(false)}
        onSubmit={() => {
          showToast('Link added successfully', 'success');
          setShowLinkDrawer(false);
        }}
      />

      <UploadDrawer
        isOpen={showUploadDrawer}
        onClose={() => { setShowUploadDrawer(false); setGlobalCreateMode(false); }}
        title={uploadType.title}
        subtitle={uploadType.subtitle}
        accept={uploadType.accept}
        onSubmit={(files) => {
          if (globalCreateMode) {
            handleGlobalUploadSubmit(files);
          } else {
            showToast('File uploaded successfully', 'success');
            setShowUploadDrawer(false);
          }
        }}
        globalCreateMode={globalCreateMode}
        selectedBatchIds={selectedBatchIds}
        setSelectedBatchIds={setSelectedBatchIds}
        availableCourses={availableCourses}
        showToast={showToast}
      />

      <OMRTestDrawer
        isOpen={showOMRDrawer}
        onClose={() => { setShowOMRDrawer(false); setGlobalCreateMode(false); }}
        testSeriesList={testSeriesList}
        isSeriesLoading={isSeriesLoading}
        onSeriesChange={(id: string) => fetchTestsBySeries(id, 'omr')}
        availableTests={omrTests}
        isTestsLoading={isTestsLoading}
        onSubmit={(tests) => {
          if (globalCreateMode) {
            handleGlobalTestSubmit(tests);
          } else {
            showToast('OMR Tests added successfully', 'success');
            setShowOMRDrawer(false);
          }
        }}
        globalCreateMode={globalCreateMode}
        selectedBatchIds={selectedBatchIds}
        setSelectedBatchIds={setSelectedBatchIds}
        availableCourses={availableCourses}
        showToast={showToast}
      />

      <TestDrawer
        isOpen={showTestDrawer}
        onClose={() => { setShowTestDrawer(false); setGlobalCreateMode(false); }}
        testSeriesList={testSeriesList}
        isSeriesLoading={isSeriesLoading}
        onSeriesChange={(id: string) => fetchTestsBySeries(id, 'standard')}
        availableTests={standardTests}
        isTestsLoading={isTestsLoading}
        onSubmit={(tests) => {
          if (globalCreateMode) {
            handleGlobalTestSubmit(tests);
          } else {
            showToast('Tests added successfully', 'success');
            setShowTestDrawer(false);
          }
        }}
        globalCreateMode={globalCreateMode}
        selectedBatchIds={selectedBatchIds}
        setSelectedBatchIds={setSelectedBatchIds}
        availableCourses={availableCourses}
        showToast={showToast}
      />

      <QuizDrawer
        isOpen={showQuizDrawer}
        onClose={() => setShowQuizDrawer(false)}
        onSubmit={() => {
          showToast('Quiz added successfully', 'success');
          setShowQuizDrawer(false);
        }}
      />

      <VideoDrawer
        isOpen={showVideoDrawer}
        onClose={() => { setShowVideoDrawer(false); setGlobalCreateMode(false); }}
        onSubmit={(data: any) => {
          if (globalCreateMode) {
            handleGlobalVideoSubmit(data);
          } else {
            showToast('Video added successfully', 'success');
            setShowVideoDrawer(false);
          }
        }}
        globalCreateMode={globalCreateMode}
        selectedBatchIds={selectedBatchIds}
        setSelectedBatchIds={setSelectedBatchIds}
        availableCourses={availableCourses}
        showToast={showToast}
      />

      <LiveStreamDrawer
        isOpen={showLiveStreamDrawer}
        onClose={() => { setShowLiveStreamDrawer(false); setGlobalCreateMode(false); }}
        onSubmit={(data) => {
          if (globalCreateMode) {
            handleGlobalLiveStreamSubmit(data);
          } else {
            handleAddLiveStream(data);
          }
        }}
        courses={availableCourses}
        subjects={subjects}
        globalCreateMode={globalCreateMode}
        selectedBatchIds={selectedBatchIds}
        setSelectedBatchIds={setSelectedBatchIds}
        availableCourses={availableCourses}
        showToast={showToast}
      />

      <WebinarDrawer
        isOpen={showWebinarDrawer}
        onClose={() => { setShowWebinarDrawer(false); setGlobalCreateMode(false); }}
        onSubmit={(data) => {
          if (globalCreateMode) {
            handleGlobalWebinarSubmit(data);
          } else {
            showToast('Webinar connected successfully', 'success');
            setShowWebinarDrawer(false);
          }
        }}
        globalCreateMode={globalCreateMode}
        selectedBatchIds={selectedBatchIds}
        setSelectedBatchIds={setSelectedBatchIds}
        availableCourses={availableCourses}
        showToast={showToast}
      />

      <RightSideDrawer isOpen={showConfirmDrawer} onClose={() => setShowConfirmDrawer(false)}>
        {confirmAction && (
          <div className="h-full flex flex-col">
            <DrawerHeader title={confirmAction.title} onClose={() => setShowConfirmDrawer(false)} />
            <DrawerBody>
              <div className="py-10 text-center">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <span className="material-symbols-outlined text-red-500 text-[40px]">
                    {confirmAction.title.includes('Delete') ? 'delete_forever' : 'content_copy'}
                  </span>
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-3 tracking-tight">{confirmAction.title}</h3>
                <p className="text-gray-500 leading-relaxed font-medium px-4">{confirmAction.desc}</p>

                {/* Confirm Buttons Integrated in Body */}
                <div className="flex gap-4 w-full mt-10">
                  <button
                    onClick={() => setShowConfirmDrawer(false)}
                    className="flex-1 py-4 bg-white border border-gray-100 text-gray-400 font-black rounded-full uppercase tracking-[0.2em] text-[10px] hover:bg-gray-50 transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmAction.onConfirm}
                    className={`flex-1 py-4 text-white font-black rounded-full uppercase tracking-[0.2em] text-[10px] shadow-xl transition-all active:scale-95 ${confirmAction.title.includes('Delete') ? 'bg-red-500 hover:bg-red-600 shadow-red-200/50' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200/50'}`}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </DrawerBody>
          </div>
        )}
      </RightSideDrawer>

      {/* --- BULK ACTION REMOVED - REPLACED WITH DROPDOWN --- */}

      {/* --- PRODUCT ACTION DRAWER --- */}
      <RightSideDrawer isOpen={showProductActionDrawer} onClose={() => setShowProductActionDrawer(false)}>
        {selectedPkgForAction && (
          <>
            <DrawerHeader title="Product Actions" onClose={() => setShowProductActionDrawer(false)} />
            <DrawerBody className="pb-10">
              <div className="space-y-8 py-2">
                {/* Mini Profile */}
                <div className="bg-gray-50 border border-gray-100 rounded-[2rem] p-6 flex items-center gap-5">
                  <div className="w-16 h-16 bg-white border border-gray-100 rounded-[1.5rem] flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-[32px] text-gray-400 uppercase tracking-tight">inventory_2</span>
                  </div>
                  <div>
                    <h3 className="text-[16px] font-black text-gray-900 uppercase tracking-tight">{selectedPkgForAction.name}</h3>
                    <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">₹{selectedPkgForAction.price}</p>
                  </div>
                </div>

                {/* Actions Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <BigActionTile
                    icon="visibility"
                    label="Overview"
                    desc="Digital Preview"
                    color="bg-slate-100 text-slate-600"
                    onClick={() => { setShowProductActionDrawer(false); onCourseSelect(selectedPkgForAction, 'Overview'); }}
                  />
                  <BigActionTile
                    icon="edit"
                    label="Edit"
                    desc="Update Details"
                    color="bg-blue-50 text-blue-500"
                    onClick={() => { setShowProductActionDrawer(false); openEditDrawer(selectedPkgForAction); }}
                  />
                  <BigActionTile
                    icon="add_circle"
                    label="Content"
                    desc="Manage Media"
                    color="bg-indigo-50 text-indigo-500"
                    onClick={() => { setShowProductActionDrawer(false); onCourseSelect(selectedPkgForAction, 'Content'); }}
                  />
                  <BigActionTile
                    icon="content_copy"
                    label="Duplicate"
                    desc="Clone Product"
                    color="bg-amber-50 text-amber-500"
                    onClick={() => { setShowProductActionDrawer(false); handleDuplicate(selectedPkgForAction); }}
                  />
                  <BigActionTile
                    icon="delete_forever"
                    label="Delete"
                    desc="Remove Items"
                    color="bg-red-50 text-red-500"
                    onClick={() => { setShowProductActionDrawer(false); handleDelete(selectedPkgForAction.id); }}
                  />
                </div>

                <div className="pt-8">
                  <button
                    onClick={() => setShowProductActionDrawer(false)}
                    className="w-full py-4 bg-gray-50 text-gray-400 font-black rounded-full uppercase tracking-[0.2em] text-[10px] hover:bg-gray-100 transition-all active:scale-95"
                  >
                    Close Menu
                  </button>
                </div>
              </div>
            </DrawerBody>
          </>
        )}
      </RightSideDrawer>

    </div >
  );
};

export default Packages;
