import React, { useState, useEffect } from 'react';
import { couponsAPI } from '../../../services/apiClient';
import { coursesAPI } from '../../../services/courseService';
import { RightSideDrawer, DrawerHeader, DrawerBody, DrawerFooter } from '../DrawerSystem';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Course {
  _id: string;
  title: string;
  id: string;
  discountCodes?: string[];
}

interface Coupon {
  _id?: string;
  id: string;
  code: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  maxDiscount: number;
  minPurchase: number;
  usedCount: number;
  usageLimit: number | null;
  validFrom: string;
  validUpto: string;
  description: string;
  status: 'active' | 'expired' | 'inactive';
  createdDate: string;
  applicableToAllBatches?: boolean;
  batchIds?: string[];
  order?: number;
}

interface Props {
  showToast: (m: string, type?: 'success' | 'error') => void;
}

const SortableRow = ({ 
  coupon, 
  index, 
  startIndex, 
  activeMenuId, 
  setActiveMenuId, 
  handleEditClick, 
  handleDeleteCoupon,
  disabled,
  batches
}: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: String(coupon._id || ''), disabled: disabled || !coupon._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
  };

  const isLastFew = index > 2 && index >= (index + 1); // This is tricky due to pagination, will simplify

  return (
    <tr 
      ref={setNodeRef} 
      style={style} 
      className={`hover:bg-gray-50/30 transition-colors group ${isDragging ? 'bg-white shadow-xl ring-1 ring-black/5' : ''}`}
    >
      <td className="px-6 py-5 text-[13px] font-medium text-gray-600">
        <div className="flex items-center gap-3">
          {!disabled && coupon._id && (
            <span 
              {...attributes} 
              {...listeners}
              className="material-symbols-outlined text-[18px] text-gray-300 cursor-grab active:cursor-grabbing hover:text-black transition-colors"
            >
              drag_indicator
            </span>
          )}
          {startIndex + index + 1}
        </div>
      </td>
      <td className="px-6 py-5 text-[13px] font-bold text-gray-800">
        {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `₹${coupon.discountValue}/-`}
      </td>
      <td className="px-6 py-5">
        <span className="text-[13px] font-medium text-gray-800 line-clamp-1">
          {(() => {
            const linkedCount = batches.filter((b: any) => 
              (coupon.batchIds || []).includes(b._id || b.id) || 
              (Array.isArray(b.discountCodes) && b.discountCodes.some((code: any) => 
                (code || "").toString().trim().toUpperCase() === (coupon.code || "").toString().trim().toUpperCase()
              ))
            ).length;
            
            if (coupon.applicableToAllBatches) return 'All Batches';
            if (linkedCount === 0 && (!coupon.batchIds || coupon.batchIds.length === 0)) return 'All Batches';
            return `${linkedCount} Selected Batches`;
          })()}
        </span>
      </td>
      <td className="px-6 py-5">
        <div className="flex flex-col items-start gap-1">
          <span className="text-[14px] font-bold text-gray-800 tracking-wider uppercase">{coupon.code}</span>
          {coupon.status === 'expired' && (
            <span className="px-2 py-0.5 bg-red-50 text-red-500 text-[10px] font-bold uppercase rounded border border-red-100">
              Expired
            </span>
          )}
          {coupon.status === 'active' && (
            <span className="px-2 py-0.5 bg-green-50 text-green-500 text-[10px] font-bold uppercase rounded border border-green-100">
              Active
            </span>
          )}
          {coupon.status === 'inactive' && (
            <span className="px-2 py-0.5 bg-gray-50 text-gray-500 text-[10px] font-bold uppercase rounded border border-gray-100">
              Inactive
            </span>
          )}
        </div>
      </td>
      <td className="px-6 py-5 text-[13px] font-medium text-gray-600">
        {coupon.validUpto ? new Date(coupon.validUpto).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/') + ' 23:59:00' : '-'}
      </td>
      <td className="px-6 py-5 text-right overflow-visible">
        <div className="relative inline-block text-left">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setActiveMenuId(activeMenuId === coupon.id ? null : coupon.id);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-[12px] font-bold transition-all ${activeMenuId === coupon.id ? 'bg-navy text-white border-navy' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            Actions
            <span className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${activeMenuId === coupon.id ? 'rotate-180' : ''}`}>expand_more</span>
          </button>

          <div className={`absolute right-0 top-full mt-1 origin-top-right w-36 bg-white border border-gray-100 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] z-[100] py-1 transition-all duration-200 ${activeMenuId === coupon.id ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}>
            <button
              onClick={() => handleEditClick(coupon)}
              className="w-full px-4 py-2.5 text-left text-[12px] font-bold text-gray-700 hover:bg-indigo-50 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm text-indigo-500">edit</span> Edit
            </button>
            <button
              onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
              className="w-full px-4 py-2.5 text-left text-[12px] font-bold text-gray-700 hover:bg-red-50 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm text-red-500">delete</span> Delete
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
};

const Coupons: React.FC<Props> = ({ showToast }) => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [filteredCoupons, setFilteredCoupons] = useState<Coupon[]>([]);
  const [batches, setBatches] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedCoupons, setSelectedCoupons] = useState<string[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    discountType: 'percentage' as 'percentage' | 'flat',
    discountValue: '',
    maxDiscount: '',
    minPurchase: '',
    usageLimit: '',
    validFrom: '',
    validUpto: '',
    description: '',
    status: 'active' as 'active' | 'expired' | 'inactive',
    batchSelectionType: 'all' as 'all' | 'specific',
    batchIds: [] as string[]
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const isReorderingDisabled = loading || searchQuery.trim() !== '' || statusFilter !== 'all' || currentPage !== 1;

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    if (isReorderingDisabled) {
      showToast('Reordering is disabled during search or filtering', 'error');
      return;
    }

    const oldIndex = coupons.findIndex((c) => String(c._id || '') === String(active.id));
    const newIndex = coupons.findIndex((c) => String(c._id || '') === String(over.id));

    if (oldIndex === -1 || newIndex === -1) return;

    const previousCoupons = [...coupons];
    const newOrder = arrayMove(coupons, oldIndex, newIndex);
    
    const orderedIds = newOrder.map(c => String(c._id || ''));
    
    setCoupons(newOrder);

    try {
      await couponsAPI.reorder(orderedIds);
      showToast('Order updated successfully', 'success');
    } catch (error) {
      console.error('Failed to reorder coupons:', error);
      showToast('Failed to save order. Rolling back...', 'error');
      setCoupons(previousCoupons);
    }
  };

  useEffect(() => {
    loadCoupons();
    loadBatches();

    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    let filtered = coupons;

    if (searchQuery) {
      filtered = filtered.filter(c =>
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    // Auto-update status to EXPIRED for table display if current date > validUpto
    const now = new Date();
    filtered = filtered.map(c => {
      if (c.validUpto && new Date(c.validUpto) < now && c.status === 'active') {
        return { ...c, status: 'expired' as const };
      }
      return c;
    });

    setFilteredCoupons(filtered);
    setCurrentPage(1);
  }, [coupons, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredCoupons.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCoupons = filteredCoupons.slice(startIndex, endIndex);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const data = await couponsAPI.getAll();
      setCoupons(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log('Starting with empty state - MongoDB may not have data yet');
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  const loadBatches = async () => {
    try {
      const data = await coursesAPI.getAll();
      setBatches(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load batches:', error);
    }
  };

  const validateForm = () => {
    const codeRegex = /^[A-Z0-9]{3,15}$/;

    if (!codeRegex.test(formData.code.trim().toUpperCase())) {
      showToast('Coupon code must be 3-15 alphanumeric characters (no spaces)', 'error');
      return false;
    }

    // Check for duplicate code in current local state (proactive check)
    const isDuplicate = coupons.some(c => 
      c.code.toUpperCase() === formData.code.trim().toUpperCase() && 
      (!selectedCoupon || c.id !== selectedCoupon.id)
    );
    if (isDuplicate) {
      showToast('Coupon code already exists', 'error');
      return false;
    }

    const dValue = parseFloat(formData.discountValue);
    if (isNaN(dValue) || dValue <= 0) {
      showToast('Discount value must be a positive number', 'error');
      return false;
    }

    if (formData.discountType === 'percentage' && dValue > 100) {
      showToast('Percentage discount cannot exceed 100%', 'error');
      return false;
    }

    const uLimit = formData.usageLimit.trim() === '' ? null : parseInt(formData.usageLimit);
    if (uLimit !== null && (isNaN(uLimit) || uLimit < 0)) {
      showToast('Usage limit must be a positive number', 'error');
      return false;
    }

    if (!formData.validUpto) {
      showToast('Please select an expiry date', 'error');
      return false;
    }

    if (formData.validFrom && formData.validUpto && new Date(formData.validUpto) < new Date(formData.validFrom)) {
      showToast('Expiry date cannot be before start date', 'error');
      return false;
    }

    if (formData.batchSelectionType === 'specific' && formData.batchIds.length === 0) {
      showToast('Please select at least one batch', 'error');
      return false;
    }

    return true;
  };

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const newCoupon: Coupon = {
        id: `CPN-${String(Date.now()).slice(-6)}`,
        code: formData.code.trim().toUpperCase(),
        discountType: formData.discountType,
        discountValue: parseFloat(formData.discountValue),
        maxDiscount: parseFloat(formData.maxDiscount) || 0,
        minPurchase: parseFloat(formData.minPurchase) || 0,
        usageLimit: formData.usageLimit.trim() === '' ? null : parseInt(formData.usageLimit),
        usedCount: 0,
        validFrom: formData.validFrom || new Date().toISOString().split('T')[0],
        validUpto: formData.validUpto,
        description: formData.description,
        status: formData.status,
        createdDate: new Date().toISOString().split('T')[0],
        applicableToAllBatches: formData.batchSelectionType === 'all',
        batchIds: formData.batchSelectionType === 'specific' ? formData.batchIds : []
      };

      console.log('Adding new coupon:', newCoupon);
      await couponsAPI.create(newCoupon);
      setCoupons([...coupons, newCoupon]);
      resetForm();
      setShowAddModal(false);
      showToast(`Coupon ${newCoupon.code} created successfully!`, 'success');
    } catch (error: any) {
      console.error('Error adding coupon:', error);
      showToast(error.message || 'Failed to add coupon', 'error');
    }
  };

  const handleEditCoupon = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCoupon || !validateForm()) return;

    try {
      const updatedCoupon: Coupon = {
        ...selectedCoupon,
        code: formData.code.trim().toUpperCase(),
        discountType: formData.discountType,
        discountValue: parseFloat(formData.discountValue),
        maxDiscount: parseFloat(formData.maxDiscount) || 0,
        minPurchase: parseFloat(formData.minPurchase) || 0,
        usageLimit: formData.usageLimit.trim() === '' ? null : parseInt(formData.usageLimit),
        validFrom: formData.validFrom,
        validUpto: formData.validUpto,
        description: formData.description,
        status: formData.status,
        applicableToAllBatches: formData.batchSelectionType === 'all',
        batchIds: formData.batchSelectionType === 'specific' ? formData.batchIds : []
      };

      console.log('Updating coupon:', updatedCoupon);
      await couponsAPI.update(selectedCoupon.id, updatedCoupon);
      setCoupons(coupons.map(c => c.id === selectedCoupon.id ? updatedCoupon : c));
      resetForm();
      setShowEditModal(false);
      setSelectedCoupon(null);
      showToast('Coupon updated successfully!', 'success');
    } catch (error: any) {
      console.error('Error updating coupon:', error);
      showToast(error.message || 'Failed to update coupon', 'error');
    }
  };

  const handleDeleteCoupon = async (couponId: string, code: string) => {
    if (!confirm(`Are you sure you want to delete ${code}?`)) {
      return;
    }

    try {
      console.log('Deleting coupon:', couponId);
      await couponsAPI.delete(couponId);
      setCoupons(coupons.filter(c => c.id !== couponId));
      showToast(`${code} has been deleted successfully!`, 'success');
    } catch (error) {
      console.error('Error deleting coupon:', error);
      showToast('Failed to delete coupon', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCoupons.length === 0) return;
    if (!confirm(`Delete ${selectedCoupons.length} selected coupon(s)?`)) return;

    try {
      await Promise.all(selectedCoupons.map(id => couponsAPI.delete(id)));
      setCoupons(coupons.filter(c => !selectedCoupons.includes(c.id)));
      setSelectedCoupons([]);
      showToast(`${selectedCoupons.length} coupon(s) deleted successfully!`, 'success');
    } catch (error) {
      console.error('Error deleting coupons:', error);
      showToast('Failed to delete coupons', 'error');
    }
  };

  const handleEditClick = (coupon: Coupon) => {
    loadBatches();
    setSelectedCoupon(coupon);

    // Bi-directional sync: Include batches that have this coupon whitelisted in their discountCodes
    const batchesWithThisCoupon = batches.filter(b => {
      if (!Array.isArray(b.discountCodes)) return false;
      return b.discountCodes.some(code =>
        (code || "").toString().trim().toUpperCase() === (coupon.code || "").toString().trim().toUpperCase()
      );
    }).map(b => b._id || b.id);

    const combinedBatchIds = Array.from(new Set([...(coupon.batchIds || []), ...batchesWithThisCoupon]));

    setFormData({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue.toString(),
      maxDiscount: coupon.maxDiscount.toString(),
      minPurchase: coupon.minPurchase.toString(),
      usageLimit: coupon.usageLimit !== null && coupon.usageLimit !== undefined ? coupon.usageLimit.toString() : '',
      validFrom: coupon.validFrom,
      validUpto: coupon.validUpto,
      description: coupon.description,
      status: coupon.status,
      batchSelectionType: combinedBatchIds.length > 0 ? 'specific' : 'all',
      batchIds: combinedBatchIds
    });
    setShowEditModal(true);
  };

  const toggleSelectAll = () => {
    if (selectedCoupons.length === paginatedCoupons.length) {
      setSelectedCoupons([]);
    } else {
      setSelectedCoupons(paginatedCoupons.map(c => c.id));
    }
  };

  const toggleSelectCoupon = (id: string) => {
    setSelectedCoupons(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const resetForm = () => {
    setFormData({
      code: '',
      discountType: 'percentage',
      discountValue: '',
      maxDiscount: '',
      minPurchase: '',
      usageLimit: '',
      validFrom: '',
      validUpto: '',
      description: '',
      status: 'active',
      batchSelectionType: 'all',
      batchIds: []
    });
  };

  const handleExportCSV = () => {
    try {
      const headers = ['ID', 'Code', 'Type', 'Value', 'Max Discount', 'Min Purchase', 'Used/Limit', 'Valid From', 'Valid Upto', 'Description', 'Status'];
      const rows = filteredCoupons.map(c => [
        c.id,
        c.code,
        c.discountType,
        c.discountValue,
        c.maxDiscount,
        c.minPurchase,
        `${c.usedCount}/${c.usageLimit}`,
        c.validFrom,
        c.validUpto,
        c.description,
        c.status
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `coupons-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast(`Exported ${filteredCoupons.length} coupon(s) to CSV`, 'success');
    } catch (error) {
      console.error('Export error:', error);
      showToast('Failed to export CSV', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-[20px] font-bold text-gray-800 tracking-tight">Coupons</h2>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-64 h-10 pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] font-medium outline-none focus:border-navy transition-all placeholder:text-gray-400 shadow-sm"
            />
          </div>
          <button className="flex items-center gap-2 h-10 px-4 border border-gray-200 rounded-lg text-[13px] font-medium text-gray-600 hover:bg-gray-50 transition-all shadow-sm">
            <span className="material-symbols-outlined text-[18px]">tune</span>
            Filters
          </button>
          <button
            onClick={() => { loadBatches(); resetForm(); setShowAddModal(true); }}
            className="w-10 h-10 flex items-center justify-center bg-[#1a237e] text-white rounded-full shadow-lg shadow-navy/20 hover:bg-navy/90 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
          </button>

        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-visible">
        <div className="">
          {loading ? (
            <div className="p-20 text-center text-gray-400">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-navy mx-auto mb-4"></div>
              <p className="font-bold uppercase tracking-widest text-[12px]">Loading coupons...</p>
            </div>
          ) : filteredCoupons.length === 0 ? (
            <div className="p-20 text-center">
              <span className="material-symbols-outlined text-[64px] text-gray-200 mb-4 block">local_offer</span>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[12px]">No coupons found</p>
            </div>
          ) : (
              <DndContext 
                sensors={sensors} 
                collisionDetection={closestCenter} 
                onDragEnd={handleDragEnd}
              >
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700">
                          S. NO.
                          <span className="material-symbols-outlined text-sm">unfold_more</span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700">
                          DISCOUNT
                        </div>
                      </th>
                      <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                        BATCHES
                      </th>
                      <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700">
                          COUPON CODE
                          <span className="material-symbols-outlined text-sm">unfold_more</span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700">
                          EXPIRES ON
                          <span className="material-symbols-outlined text-sm">unfold_more</span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <SortableContext 
                    items={paginatedCoupons.map(c => String(c._id || ''))} 
                    strategy={verticalListSortingStrategy}
                  >
                    <tbody className="divide-y divide-gray-50">
                      {paginatedCoupons.map((coupon, index) => (
                        <SortableRow
                          key={String(coupon._id || coupon.id)}
                          coupon={coupon}
                          index={index}
                          startIndex={startIndex}
                          activeMenuId={activeMenuId}
                          setActiveMenuId={setActiveMenuId}
                          handleEditClick={handleEditClick}
                          handleDeleteCoupon={handleDeleteCoupon}
                          disabled={isReorderingDisabled}
                          batches={batches}
                        />
                      ))}
                    </tbody>
                  </SortableContext>
                </table>
              </DndContext>

          )}
        </div>

        {/* Standardized Pagination Footer */}
        {!loading && filteredCoupons.length > 0 && (
          <div className="p-6 border-t border-gray-50 flex items-center justify-between bg-white rounded-b-2xl">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center group">
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2 pr-10 text-[13px] font-bold text-gray-700 outline-none focus:border-gray-500 transition-all cursor-pointer shadow-sm hover:bg-gray-50"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 pointer-events-none text-[20px] text-gray-400 flex items-center justify-center h-full top-0 group-focus-within:text-black">
                  expand_more
                </span>
              </div>
              <span className="text-[13px] font-medium text-gray-400 italic">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredCoupons.length)} of {filteredCoupons.length} entries
              </span>
            </div>

            <div className="flex items-center p-1.5 bg-white border border-gray-200 rounded-2xl shadow-sm">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="h-9 px-4 flex items-center justify-center text-[13px] font-bold text-gray-400 hover:text-black hover:bg-gray-50 rounded-xl transition-all disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Coupon Drawer */}
      <RightSideDrawer isOpen={showAddModal} onClose={() => setShowAddModal(false)} width="600px">
        <div className="flex flex-col h-full bg-white font-sans overflow-hidden">
          <DrawerHeader title="CREATE NEW COUPON" onClose={() => setShowAddModal(false)} />

          <DrawerBody className="space-y-6 px-8 py-8 hide-scrollbar">
            <div className="grid grid-cols-2 gap-x-6 gap-y-6">
              {/* Coupon Code */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Coupon Code *</label>
                <input
                  type="text"
                  placeholder="E.g., SAVE20"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full h-12 px-4 border border-gray-200 rounded-xl text-[14px] font-medium placeholder:text-gray-300 outline-none focus:border-navy transition-all"
                />
              </div>

              {/* Discount Type */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Discount Type *</label>
                <div className="relative">
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value as any })}
                    className="w-full h-12 px-4 border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-navy bg-white appearance-none pr-10"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
                </div>
              </div>

              {/* Discount Value */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Discount Value *</label>
                <input
                  type="text"
                  placeholder="Enter discount value"
                  value={formData.discountValue}
                  onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                  className="w-full h-12 px-4 border border-gray-200 rounded-xl text-[14px] font-medium placeholder:text-gray-300 outline-none focus:border-navy transition-all"
                />
              </div>

              {/* Max Discount */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Max Discount (₹)</label>
                <input
                  type="text"
                  placeholder="Maximum discount amount"
                  value={formData.maxDiscount}
                  onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                  className="w-full h-12 px-4 border border-gray-200 rounded-xl text-[14px] font-medium placeholder:text-gray-300 outline-none focus:border-navy transition-all"
                />
              </div>

              {/* Min Purchase */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Min Purchase (₹)</label>
                <input
                  type="text"
                  placeholder="Minimum purchase required"
                  value={formData.minPurchase}
                  onChange={(e) => setFormData({ ...formData, minPurchase: e.target.value })}
                  className="w-full h-12 px-4 border border-gray-200 rounded-xl text-[14px] font-medium placeholder:text-gray-300 outline-none focus:border-navy transition-all"
                />
              </div>

              {/* Usage Limit */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Usage Limit</label>
                <input
                  type="number"
                  placeholder="Unlimited if empty"
                  value={formData.usageLimit}
                  onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                  className="w-full h-12 px-4 border border-gray-200 rounded-xl text-[14px] font-medium placeholder:text-gray-300 outline-none focus:border-navy transition-all"
                />
              </div>

              {/* Valid From */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Valid From</label>
                <div className="relative">
                  <input
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    className="w-full h-12 px-4 border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-navy appearance-none"
                  />
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">calendar_today</span>
                </div>
              </div>

              {/* Valid Upto */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Valid Upto *</label>
                <div className="relative">
                  <input
                    type="date"
                    value={formData.validUpto}
                    onChange={(e) => setFormData({ ...formData, validUpto: e.target.value })}
                    className="w-full h-12 px-4 border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-navy appearance-none"
                  />
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">calendar_today</span>
                </div>
              </div>

              {/* Batch Selection Type */}
              <div className="space-y-1.5 col-span-2">
                <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Batch Selection Type *</label>
                <div className="flex gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      name="batchSelectionType"
                      checked={formData.batchSelectionType === 'all'}
                      onChange={() => setFormData({ ...formData, batchSelectionType: 'all', batchIds: [] })}
                      className="w-4 h-4 text-navy border-gray-300 focus:ring-navy cursor-pointer"
                    />
                    <span className="text-[14px] font-medium text-gray-700 group-hover:text-navy transition-colors">All Batches</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      name="batchSelectionType"
                      checked={formData.batchSelectionType === 'specific'}
                      onChange={() => setFormData({ ...formData, batchSelectionType: 'specific' })}
                      className="w-4 h-4 text-navy border-gray-300 focus:ring-navy cursor-pointer"
                    />
                    <span className="text-[14px] font-medium text-gray-700 group-hover:text-navy transition-colors">Specific Batches</span>
                  </label>
                </div>
              </div>

              {/* Specific Batches Selection */}
              {formData.batchSelectionType === 'specific' && (
                <div className="space-y-1.5 col-span-2">
                  <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Select Batches *</label>
                  <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto p-4 border border-gray-100 rounded-xl bg-gray-50/50 custom-scrollbar">
                    {batches.map(batch => (
                      <label key={batch._id} className="flex items-start gap-2.5 cursor-pointer group p-1.5 hover:bg-white rounded-lg transition-all">
                        <input
                          type="checkbox"
                          checked={formData.batchIds.includes(batch._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, batchIds: [...formData.batchIds, batch._id] });
                            } else {
                              setFormData({ ...formData, batchIds: formData.batchIds.filter(id => id !== batch._id) });
                            }
                          }}
                          className="mt-0.5 w-4 h-4 rounded border-gray-300 text-navy focus:ring-navy cursor-pointer"
                        />
                        <span className="text-[13px] font-semibold text-gray-600 group-hover:text-navy transition-colors leading-tight">{batch.title}</span>
                      </label>
                    ))}
                    {batches.length === 0 && (
                      <p className="col-span-2 text-[12px] text-gray-400 italic py-2 text-center">No batches found. Create some courses first.</p>
                    )}
                  </div>
                  {formData.batchIds.length > 0 && (
                    <p className="text-[11px] font-bold text-navy pt-1 uppercase tracking-tight italic">
                      {formData.batchIds.length} batch(es) selected
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Description</label>
              <textarea
                placeholder="Coupon description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[14px] font-medium placeholder:text-gray-300 outline-none focus:border-navy transition-all resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 h-12 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCoupon}
                className="flex-1 h-12 bg-navy text-white font-bold rounded-xl hover:bg-navy/90 transition-all shadow-lg shadow-navy/20 active:scale-[0.98]"
              >
                Create Coupon
              </button>
            </div>
          </DrawerBody>
        </div>
      </RightSideDrawer>

      {/* Edit Coupon Drawer */}
      <RightSideDrawer isOpen={showEditModal && !!selectedCoupon} onClose={() => setShowEditModal(false)} width="600px">
        {selectedCoupon && (
          <div className="flex flex-col h-full bg-white font-sans overflow-hidden">
            <DrawerHeader title="EDIT COUPON" onClose={() => setShowEditModal(false)} />

            <DrawerBody className="space-y-6 px-8 py-8 hide-scrollbar">
              <div className="grid grid-cols-2 gap-x-6 gap-y-6">
                {/* Coupon Code */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Coupon Code *</label>
                  <input
                    type="text"
                    placeholder="E.g., SAVE20"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full h-12 px-4 border border-gray-200 rounded-xl text-[14px] font-medium placeholder:text-gray-300 outline-none focus:border-navy transition-all"
                  />
                </div>

                {/* Discount Type */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Discount Type *</label>
                  <div className="relative">
                    <select
                      value={formData.discountType}
                      onChange={(e) => setFormData({ ...formData, discountType: e.target.value as any })}
                      className="w-full h-12 px-4 border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-navy bg-white appearance-none pr-10"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="flat">Flat Amount (₹)</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
                  </div>
                </div>

                {/* Discount Value */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Discount Value *</label>
                  <input
                    type="text"
                    placeholder="Enter discount value"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    className="w-full h-12 px-4 border border-gray-200 rounded-xl text-[14px] font-medium placeholder:text-gray-300 outline-none focus:border-navy transition-all"
                  />
                </div>

                {/* Max Discount */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Max Discount (₹)</label>
                  <input
                    type="text"
                    placeholder="Maximum discount amount"
                    value={formData.maxDiscount}
                    onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                    className="w-full h-12 px-4 border border-gray-200 rounded-xl text-[14px] font-medium placeholder:text-gray-300 outline-none focus:border-navy transition-all"
                  />
                </div>

                {/* Min Purchase */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Min Purchase (₹)</label>
                  <input
                    type="text"
                    placeholder="Minimum purchase required"
                    value={formData.minPurchase}
                    onChange={(e) => setFormData({ ...formData, minPurchase: e.target.value })}
                    className="w-full h-12 px-4 border border-gray-200 rounded-xl text-[14px] font-medium placeholder:text-gray-300 outline-none focus:border-navy transition-all"
                  />
                </div>

                {/* Usage Limit */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Usage Limit</label>
                  <input
                    type="number"
                    placeholder="Unlimited if empty"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                    className="w-full h-12 px-4 border border-gray-200 rounded-xl text-[14px] font-medium placeholder:text-gray-300 outline-none focus:border-navy transition-all"
                  />
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Status</label>
                  <div className="relative">
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full h-12 px-4 border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-navy bg-white appearance-none pr-10"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="expired">Expired</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
                  </div>
                </div>

                {/* Valid Upto */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Valid Upto *</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={formData.validUpto}
                      onChange={(e) => setFormData({ ...formData, validUpto: e.target.value })}
                      className="w-full h-12 px-4 border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-navy appearance-none"
                    />
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">calendar_today</span>
                  </div>
                </div>

                {/* Batch Selection Type */}
                <div className="space-y-1.5 col-span-2">
                  <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Batch Selection Type *</label>
                  <div className="flex gap-4 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name="batchSelectionTypeEdit"
                        checked={formData.batchSelectionType === 'all'}
                        onChange={() => setFormData({ ...formData, batchSelectionType: 'all', batchIds: [] })}
                        className="w-4 h-4 text-navy border-gray-300 focus:ring-navy cursor-pointer"
                      />
                      <span className="text-[14px] font-medium text-gray-700 group-hover:text-navy transition-colors">All Batches</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name="batchSelectionTypeEdit"
                        checked={formData.batchSelectionType === 'specific'}
                        onChange={() => setFormData({ ...formData, batchSelectionType: 'specific' })}
                        className="w-4 h-4 text-navy border-gray-300 focus:ring-navy cursor-pointer"
                      />
                      <span className="text-[14px] font-medium text-gray-700 group-hover:text-navy transition-colors">Specific Batches</span>
                    </label>
                  </div>
                </div>

                {/* Specific Batches Selection */}
                {formData.batchSelectionType === 'specific' && (
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Select Batches *</label>
                    <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto p-4 border border-gray-100 rounded-xl bg-gray-50/50 custom-scrollbar">
                      {batches.map(batch => (
                        <label key={batch._id} className="flex items-start gap-2.5 cursor-pointer group p-1.5 hover:bg-white rounded-lg transition-all">
                          <input
                            type="checkbox"
                            checked={formData.batchIds.includes(batch._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ ...formData, batchIds: [...formData.batchIds, batch._id] });
                              } else {
                                setFormData({ ...formData, batchIds: formData.batchIds.filter(id => id !== batch._id) });
                              }
                            }}
                            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-navy focus:ring-navy cursor-pointer"
                          />
                          <span className="text-[13px] font-semibold text-gray-600 group-hover:text-navy transition-colors leading-tight">{batch.title}</span>
                        </label>
                      ))}
                      {batches.length === 0 && (
                        <p className="col-span-2 text-[12px] text-gray-400 italic py-2 text-center">No batches found.</p>
                      )}
                    </div>
                    {formData.batchIds.length > 0 && (
                      <p className="text-[11px] font-bold text-navy pt-1 uppercase tracking-tight italic">
                        {formData.batchIds.length} batch(es) selected
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Description</label>
                <textarea
                  placeholder="Coupon description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[14px] font-medium placeholder:text-gray-300 outline-none focus:border-navy transition-all resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 h-12 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditCoupon}
                  className="flex-1 h-12 bg-navy text-white font-bold rounded-xl hover:bg-navy/90 transition-all shadow-lg shadow-navy/20 active:scale-[0.98]"
                >
                  Save Changes
                </button>
              </div>
            </DrawerBody>
          </div>
        )}
      </RightSideDrawer>
    </div >
  );
};

export default Coupons;

