import React, { useState, useEffect } from 'react';
import { buyersAPI, purchasesAPI, coursesAPI } from '../../../services/apiClient';
import { RightSideDrawer, DrawerHeader, DrawerBody } from '../DrawerSystem';

interface PaymentPage {
  id: string;
  title: string;
  discountedAmount: number;
  details: string;
  code: string;
  link: string;
  createdOn: string;
}

interface Purchase {
  id: string;
  studentName: string;
  studentEmail: string;
  studentMobile: string;
  productName: string;
  productType: string;
  amount: number;
  payoutAmount: number;
  coupon: string;
  method: string;
  date: string;
  status: string;
  avatar: string;
}

interface Props {
  showToast: (m: string, type?: 'success' | 'error') => void;
}

const Buyers: React.FC<Props> = ({ showToast }) => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'pages'>('transactions');

  // States for Transactions/Payments (formerly Payment Pages)
  const [pages, setPages] = useState<Purchase[]>([]);
  const [filteredPages, setFilteredPages] = useState<Purchase[]>([]);

  // States for Transactions
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([]);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [selectedPage, setSelectedPage] = useState<PaymentPage | null>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [courses, setCourses] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    studentName: '',
    studentEmail: '',
    studentMobile: '',
    amount: '',
    payoutAmount: '',
    coupon: '',
    paymentMethod: '',
    method: 'offline',
    status: 'successful',
    courseId: '',
    productName: ''
  });

  useEffect(() => {
    loadData();
    fetchCourses();
  }, [activeTab]);

  const fetchCourses = async () => {
    try {
      const data = await coursesAPI.getAll();
      setCourses(Array.isArray(data) ? data.filter((c: any) => c.name && c.name.trim() !== '') : []);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (activeTab === 'pages') {
      let filtered = pages;
      if (searchQuery) {
        filtered = filtered.filter(p =>
          p.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.studentEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.studentMobile.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      setFilteredPages(filtered);
    } else {
      let filtered = purchases;
      if (searchQuery) {
        filtered = filtered.filter(p =>
          p.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.studentEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.productName.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      setFilteredPurchases(filtered);
    }
    setCurrentPage(1);
  }, [pages, purchases, searchQuery, activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'pages') {
        // Fetch only entries created via buyersAPI (admin-added)
        const data = await buyersAPI.getAll();
        if (Array.isArray(data)) {
          const formatted = data.map((item: any) => ({
            id: (item._id || item.id)?.toString(),
            studentName: item.studentName || 'Unknown Student',
            studentEmail: item.studentEmail || '-',
            studentMobile: item.studentMobile || '-',
            productName: item.productName || '-',
            productType: item.productType || '-',
            amount: item.amount || 0,
            payoutAmount: item.payoutAmount || 0,
            coupon: item.coupon || '-',
            method: item.method || 'offline',
            date: item.date || item.createdAt || new Date().toISOString(),
            status: item.status || 'successful',
            avatar: (item.studentName || 'U').substring(0, 1).toUpperCase()
          }));
          setPages(formatted as any);
        }
      } else {
        const data = await purchasesAPI.getAll();
        if (Array.isArray(data)) {
          const formatted = data.map((item: any) => ({
            id: (item._id || item.id)?.toString(),
            studentName: item.studentInfo?.name || item.studentName || 'Unknown Student',
            studentEmail: item.studentInfo?.email || item.studentEmail || '-',
            studentMobile: item.studentInfo?.mobile || item.mobile || '-',
            productName: item.courseName || item.itemName || 'Untitled Product',
            productType: item.itemType === 'test' ? 'Test' : 'Course',
            amount: item.amount || 0,
            payoutAmount: item.payoutAmount || 0,
            coupon: item.couponCode || item.coupon || '-',
            method: item.paymentMethod || item.method || 'online',
            date: item.createdAt || item.date || new Date().toISOString(),
            status: item.status === 'success' || item.status === 'completed' ? 'Success' :
              item.status === 'pending' ? 'Pending' : 'Failed',
            avatar: (item.studentInfo?.name || item.studentName || 'U').substring(0, 1).toUpperCase()
          }));
          setPurchases(formatted);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      if (activeTab === 'pages') setPages([]);
      else setPurchases([]);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const nameRegex = /^[A-Za-z\s.]{2,50}$/;
    const mobileRegex = /^[0-9]{10}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.courseId && !selectedPage) {
      showToast('Please select a course', 'error');
      return false;
    }
    if (!nameRegex.test(formData.studentName)) {
      showToast('Student Name should be 2-50 characters (letters and spaces only)', 'error');
      return false;
    }
    if (!mobileRegex.test(formData.studentMobile)) {
      showToast('Mobile number must be exactly 10 digits', 'error');
      return false;
    }
    if (!emailRegex.test(formData.studentEmail)) {
      showToast('Please enter a valid email address', 'error');
      return false;
    }
    const amt = parseFloat(formData.amount);
    if (isNaN(amt) || amt <= 0) {
      showToast('Amount must be a positive number', 'error');
      return false;
    }
    const pAmt = parseFloat(formData.payoutAmount || '0');
    if (isNaN(pAmt) || pAmt < 0) {
      showToast('Payout Amount cannot be negative', 'error');
      return false;
    }
    return true;
  };

  const handleAddPage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      const newPage: any = {
        studentName: formData.studentName,
        studentEmail: formData.studentEmail,
        studentMobile: formData.studentMobile,
        amount: parseFloat(formData.amount),
        payoutAmount: parseFloat(formData.payoutAmount || '0'),
        coupon: formData.coupon,
        paymentMethod: formData.paymentMethod,
        method: formData.method,
        status: formData.status,
        productName: courses.find(c => (c.id === formData.courseId || c._id === formData.courseId))?.name || formData.productName || '-',
        date: new Date().toISOString(),
      };
      const result = await buyersAPI.create(newPage);
      const formattedResult = {
        ...result,
        id: (result._id || result.id)?.toString(),
        avatar: (result.studentName || 'U').substring(0, 1).toUpperCase()
      };
      setPages([...pages, formattedResult]);
      resetForm();
      setShowAddDrawer(false);
      showToast('Payment record added successfully!', 'success');
    } catch (error) {
      showToast('Failed to add payment record', 'error');
    }
  };

  const handleEditPage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPage) return;
    if (!validateForm()) return;
    try {
      const updatedData: any = {
        studentName: formData.studentName,
        studentEmail: formData.studentEmail,
        studentMobile: formData.studentMobile,
        amount: parseFloat(formData.amount),
        payoutAmount: parseFloat(formData.payoutAmount || '0'),
        coupon: formData.coupon,
        paymentMethod: formData.paymentMethod,
        method: formData.method,
        status: formData.status,
        productName: courses.find(c => (c.id === formData.courseId || c._id === formData.courseId))?.name || formData.productName
      };
      const result = await buyersAPI.update(selectedPage.id, updatedData);
      const formattedResult = {
        ...result,
        id: (result._id || result.id)?.toString(),
        avatar: (result.studentName || 'U').substring(0, 1).toUpperCase()
      };
      setPages(pages.map(p => p.id === selectedPage.id ? formattedResult : p));
      resetForm();
      setShowEditDrawer(false);
      setSelectedPage(null);
      showToast('Payment record updated successfully!', 'success');
    } catch (error) {
      showToast('Failed to update payment record', 'error');
    }
  };

  const handleDeletePage = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete ${title}?`)) return;
    try {
      await buyersAPI.delete(id);
      setPages(pages.filter(p => p.id !== id));
      showToast('Payment page deleted successfully!', 'success');
    } catch (error) {
      showToast('Failed to delete payment page', 'error');
    }
  };

  const handleEditClick = (page: Purchase) => {
    setSelectedPage(page as any);
    const matchedCourse = courses.find(c => c.name === page.productName);
    setFormData({
      studentName: page.studentName,
      studentEmail: page.studentEmail,
      studentMobile: page.studentMobile,
      amount: page.amount.toString(),
      payoutAmount: (page.payoutAmount || 0).toString(),
      coupon: page.coupon || '',
      paymentMethod: (page as any).paymentMethod || '',
      method: page.method || 'offline',
      status: page.status || 'successful',
      courseId: matchedCourse?.id || matchedCourse?._id || '',
      productName: page.productName || ''
    });
    setShowEditDrawer(true);
  };

  const resetForm = () => {
    setFormData({
      studentName: '',
      studentEmail: '',
      studentMobile: '',
      amount: '',
      payoutAmount: '',
      coupon: '',
      paymentMethod: '',
      method: 'offline',
      status: 'successful',
      courseId: '',
      productName: ''
    });
  };

  const handleViewDetails = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setShowDetailsDrawer(true);
  };

  const handlePrintReceipt = (item: Purchase) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const receiptHtml = `
      <html>
        <head>
          <title>Receipt - ${item.id}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #333; }
            .receipt-card { max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 40px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
            .header { text-align: center; border-bottom: 2px solid #f8f9fa; padding-bottom: 30px; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: 900; color: #1A237E; margin-bottom: 5px; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 40px; font-size: 13px; color: #666; }
            .row { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 15px; }
            .label { font-weight: 600; color: #999; }
            .value { font-weight: 700; color: #1A237E; }
            .total-row { margin-top: 30px; padding-top: 20px; border-top: 2px dashed #eee; display: flex; justify-content: space-between; align-items: center; }
            .total-label { font-size: 18px; font-weight: 900; }
            .total-value { font-size: 24px; font-weight: 900; color: #1A237E; }
            .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #aaa; }
            @media print { .no-print { display: none; } body { padding: 0; } .receipt-card { border: none; box-shadow: none; } }
          </style>
        </head>
        <body>
          <div class="receipt-card">
            <div class="header">
              <div class="logo font-black">AONETARGET</div>
              <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #999;">Payment Receipt</div>
            </div>
            <div class="meta">
              <div>Invoice #${item.id.slice(-6).toUpperCase()}</div>
              <div>Date: ${new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            </div>
            <div class="row">
              <div class="label">Student Name</div>
              <div class="value">${item.studentName}</div>
            </div>
            <div class="row">
              <div class="label">Email Address</div>
              <div class="value">${item.studentEmail}</div>
            </div>
            <div class="row">
              <div class="label">Product</div>
              <div class="value">${item.productName}</div>
            </div>
             <div class="row">
              <div class="label">Type</div>
              <div class="value">${item.productType}</div>
            </div>
            <div class="row">
              <div class="label">Payment Method</div>
              <div class="value" style="text-transform: uppercase;">${item.method}</div>
            </div>
            <div class="total-row">
              <div class="total-label">Total Amount Paid</div>
              <div class="total-value">₹${item.amount}</div>
            </div>
            <div class="footer">
              This is a computer generated receipt. Thank you for choosing AONE TARGET.
            </div>
            <div class="no-print" style="margin-top: 30px; text-align: center;">
              <button onclick="window.print()" style="padding: 12px 30px; background: #1A237E; color: white; border: none; border-radius: 12px; font-weight: 700; cursor: pointer;">Print Receipt</button>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return 'N/A'; }
  };

  const currentData = activeTab === 'pages' ? filteredPages : filteredPurchases;
  const totalPages = Math.ceil(currentData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = currentData.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex flex-col gap-4 w-full md:w-auto">
          <h2 className="text-[22px] font-bold text-gray-800 tracking-tight">Buyers & Transactions</h2>

          <div className="flex items-center p-1 bg-gray-100/80 rounded-xl w-fit border border-gray-200/50 shadow-inner">
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-6 py-2 text-[12px] font-bold rounded-lg transition-all ${activeTab === 'transactions'
                ? 'bg-white text-black shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              Buyers List
            </button>
            <button
              onClick={() => setActiveTab('pages')}
              className={`px-6 py-2 text-[12px] font-bold rounded-lg transition-all ${activeTab === 'pages'
                ? 'bg-white text-black shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              Payment Pages
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto self-end md:self-center">
          <div className="relative flex-1 md:flex-none">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
            <input
              type="text"
              placeholder={activeTab === 'pages' ? "Search pages..." : "Search buyers..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-72 h-10 pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] font-medium outline-none focus:ring-1 focus:ring-navy transition-all placeholder:text-gray-400 shadow-sm"
            />
          </div>
          {activeTab === 'pages' && (
            <button
              onClick={() => { resetForm(); setShowAddDrawer(true); }}
              className="w-10 h-10 flex items-center justify-center bg-black text-white rounded-full shadow-lg hover:bg-black/90 transition-all active:scale-95 shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
            </button>
          )}
          {activeTab === 'transactions' && (
            <button
              onClick={loadData}
              className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 text-gray-600 rounded-lg shadow-sm hover:bg-gray-50 transition-all active:scale-95 shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-visible transition-all">
        <div className="overflow-x-auto min-w-full pb-32 -mb-32">
          {loading ? (
            <div className="p-20 text-center text-gray-400">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="font-bold uppercase tracking-widest text-[11px]">Loading data...</p>
            </div>
          ) : currentData.length === 0 ? (
            <div className="p-20 text-center">
              <span className="material-symbols-outlined text-[64px] text-gray-100 mb-4 block">
                {activeTab === 'pages' ? 'payments' : 'receipt_long'}
              </span>
              <p className="text-gray-300 font-bold uppercase tracking-widest text-[11px]">No data available in table</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/20">
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider h-14 w-10">
                    <input type="checkbox" className="rounded border-gray-300" />
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider h-14 w-20">#</th>
                  {activeTab === 'pages' ? (
                    <>
                      <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">DATE</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">STUDENT NAME</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">PRODUCT/COURSE</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">AMOUNT</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">PAYOUT</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">STATUS</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">STUDENT</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">PRODUCT</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">AMOUNT</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">STATUS</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">DATE</th>
                    </>
                  )}
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedData.map((item: any, index) => {
                  const isLastFew = index > 2 && index >= paginatedData.length - 2;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/10 transition-colors group">
                      <td className="px-6 py-5 text-[14px] font-medium text-gray-400">
                        <input type="checkbox" className="rounded border-gray-300" />
                      </td>
                      <td className="px-6 py-5 text-[14px] font-medium text-gray-400">
                        {startIndex + index + 1}
                      </td>
                      {activeTab === 'pages' ? (
                        <>
                          <td className="px-6 py-5 text-[12px] font-bold text-gray-800 whitespace-nowrap">{new Date(item.date).toLocaleDateString()}</td>
                          <td className="px-6 py-5">
                            <div className="flex flex-col">
                              <span className="text-[13px] font-bold text-gray-800">{item.studentName}</span>
                              <span className="text-[11px] font-medium text-gray-400">{item.studentMobile}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className="text-[13px] font-bold text-indigo-600 line-clamp-1 max-w-[150px]">{item.productName || '-'}</span>
                          </td>
                          <td className="px-6 py-5 text-[14px] font-bold text-blue-600">₹{item.amount}</td>
                          <td className="px-6 py-5 text-[14px] font-bold text-green-600">₹{item.payoutAmount}</td>
                          <td className="px-6 py-5 text-center">
                            <span className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest ${item.status === 'success' || item.status === 'successful' ? 'bg-green-50 text-green-500' : 'bg-amber-50 text-amber-500'}`}>
                              {item.status}
                            </span>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-[12px] font-black text-indigo-600 border border-indigo-100 uppercase">
                                {item.avatar}
                              </div>
                              <div>
                                <div className="text-[14px] font-bold text-gray-800">{item.studentName}</div>
                                <div className="text-[11px] font-medium text-gray-400">{item.studentEmail}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex flex-col gap-1">
                              <span className="text-[13px] font-bold text-gray-800 line-clamp-1 max-w-[200px]">{item.productName}</span>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full w-fit ${item.productType === 'Course' ? 'bg-blue-50 text-blue-500' : 'bg-amber-50 text-amber-500'}`}>
                                {item.productType}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-center font-bold text-gray-800">₹{item.amount}</td>
                          <td className="px-6 py-5 text-center">
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${item.status === 'Success' ? 'bg-green-50 text-green-600' :
                              item.status === 'Pending' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                              }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-[13px] font-medium text-gray-400">{formatDate(item.date)}</td>
                        </>
                      )}

                      <td className="px-6 py-5 text-right overflow-visible">
                        <div className="relative inline-block text-left">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === item.id ? null : item.id);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-[12px] font-bold transition-all shadow-sm ${openMenuId === item.id ? 'bg-gray-100 border-gray-300 text-black' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                          >
                            Actions
                            <span className={`material-symbols-outlined text-[16px] transition-transform ${openMenuId === item.id ? 'rotate-180' : ''}`}>expand_more</span>
                          </button>

                          <div className={`absolute right-0 ${isLastFew ? 'bottom-full mb-1 origin-bottom-right' : 'top-full mt-1 origin-top-right'} w-36 bg-white border border-gray-100 rounded-xl shadow-2xl z-[150] py-1 transition-all duration-200 ${openMenuId === item.id ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}>
                            {activeTab === 'pages' ? (
                              <>
                                <button onClick={() => { handlePrintReceipt(item); setOpenMenuId(null); }} className="w-full px-4 py-2.5 text-left text-[12px] font-bold text-gray-700 hover:bg-indigo-50 flex items-center gap-2">
                                  <span className="material-symbols-outlined text-sm text-indigo-500">receipt_long</span> Receipt
                                </button>
                                <button onClick={() => { handleEditClick(item); setOpenMenuId(null); }} className="w-full px-4 py-2.5 text-left text-[12px] font-bold text-gray-700 hover:bg-blue-50 flex items-center gap-2 border-t border-gray-50">
                                  <span className="material-symbols-outlined text-sm text-blue-500">edit</span> Edit
                                </button>
                                <button onClick={() => { handleDeletePage(item.id, item.studentName); setOpenMenuId(null); }} className="w-full px-4 py-2.5 text-left text-[12px] font-bold text-gray-700 hover:bg-red-50 flex items-center gap-2 border-t border-gray-50">
                                  <span className="material-symbols-outlined text-sm text-red-500">delete</span> Delete
                                </button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => { handlePrintReceipt(item); setOpenMenuId(null); }} className="w-full px-4 py-2.5 text-left text-[12px] font-bold text-gray-700 hover:bg-indigo-50 flex items-center gap-2">
                                  <span className="material-symbols-outlined text-sm text-indigo-500">receipt_long</span> Receipt
                                </button>
                                <button onClick={() => { handleViewDetails(item); setOpenMenuId(null); }} className="w-full px-4 py-2.5 text-left text-[12px] font-bold text-gray-700 hover:bg-neutral-50 flex items-center gap-2 border-t border-gray-50">
                                  <span className="material-symbols-outlined text-sm text-neutral-500">info</span> Details
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Section */}
        {currentData.length > 0 && (
          <div className="px-8 py-6 flex items-center justify-between border-t border-gray-100">
            <div className="flex items-center gap-4">
              <span className="text-[12px] font-medium text-gray-400">Show</span>
              <select
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-[12px] font-bold outline-none cursor-pointer hover:bg-white transition-all shadow-inner"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex-1 text-center">
              <span className="text-[12px] font-medium text-gray-400">
                Showing {startIndex + 1} to {Math.min(endIndex, currentData.length)} of {currentData.length} entries
              </span>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-gray-50 border border-gray-100 rounded-lg text-[11px] font-bold text-gray-400 hover:text-black transition-all disabled:opacity-30"
              >
                First
              </button>

              <div className="flex gap-1.5">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-bold transition-all ${currentPage === pageNum
                        ? 'bg-[#1A237E] text-white shadow-lg'
                        : 'text-gray-400 hover:text-black hover:bg-gray-50'
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-gray-50 border border-gray-100 rounded-lg text-[11px] font-bold text-gray-400 hover:text-black transition-all disabled:opacity-30"
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Drawers for Payment Pages */}
      <RightSideDrawer isOpen={showAddDrawer} onClose={() => setShowAddDrawer(false)} width="500px">
        <DrawerHeader title="ADD PAYMENT RECORD" onClose={() => setShowAddDrawer(false)} />
        <DrawerBody className="p-8 space-y-6">
          <div className="space-y-6">
            <div className="space-y-1">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Select Course *</label>
              <select
                value={formData.courseId} onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl text-[14px] font-bold outline-none focus:bg-white focus:border-navy transition-all"
              >
                <option value="">Choose a course</option>
                {courses.map(course => (
                  <option key={course.id || course._id} value={course.id || course._id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Student Name *</label>
                <input
                  type="text" value={formData.studentName} onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                  className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl text-[14px] font-bold outline-none focus:bg-white focus:border-navy transition-all"
                  placeholder="Enter student name"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Mobile *</label>
                <input
                  type="text" value={formData.studentMobile}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setFormData({ ...formData, studentMobile: val });
                  }}
                  className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl text-[14px] font-bold outline-none focus:bg-white focus:border-navy transition-all"
                  placeholder="Enter 10-digit mobile number"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Email *</label>
                <input
                  type="email" value={formData.studentEmail} onChange={(e) => setFormData({ ...formData, studentEmail: e.target.value })}
                  className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl text-[14px] font-bold outline-none focus:bg-white focus:border-navy transition-all"
                  placeholder="Enter email address"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Payment Method</label>
                <select
                  value={formData.paymentMethod} onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl text-[14px] font-bold outline-none focus:bg-white focus:border-navy transition-all"
                >
                  <option value="">Select Method</option>
                  <option value="UPI">UPI</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Net Banking">Net Banking</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Amount *</label>
                <input
                  type="number" value={formData.amount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (parseFloat(val) < 0) return;
                    setFormData({ ...formData, amount: val });
                  }}
                  className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl text-[14px] font-bold outline-none focus:bg-white focus:border-navy transition-all"
                  placeholder="Enter positive amount"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Payout Amount</label>
                <input
                  type="number" value={formData.payoutAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (parseFloat(val) < 0) return;
                    setFormData({ ...formData, payoutAmount: val });
                  }}
                  className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl text-[14px] font-bold outline-none focus:bg-white focus:border-navy transition-all"
                  placeholder="Enter payout amount"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Coupon Code</label>
                <input
                  type="text" value={formData.coupon} onChange={(e) => setFormData({ ...formData, coupon: e.target.value })}
                  className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl text-[14px] font-bold outline-none focus:bg-white focus:border-navy transition-all"
                  placeholder="Enter coupon code"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Method</label>
                <select
                  value={formData.method} onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                  className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl text-[14px] font-bold outline-none focus:bg-white focus:border-navy transition-all"
                >
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Status</label>
              <select
                value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl text-[14px] font-bold outline-none focus:bg-white focus:border-navy transition-all"
              >
                <option value="successful">Successful</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
          <button onClick={handleAddPage} className="w-full h-12 bg-black text-white rounded-xl font-bold hover:shadow-xl transition-all active:scale-95">
            Create Record
          </button>
        </DrawerBody>
      </RightSideDrawer>

      <RightSideDrawer isOpen={showEditDrawer && !!selectedPage} onClose={() => setShowEditDrawer(false)} width="500px">
        <DrawerHeader title="EDIT PAYMENT RECORD" onClose={() => setShowEditDrawer(false)} />
        <DrawerBody className="p-8 space-y-6">
          <div className="space-y-6">
            <div className="space-y-1">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Select Course *</label>
              <select
                value={formData.courseId} onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl text-[14px] font-bold outline-none focus:bg-white focus:border-navy transition-all"
              >
                <option value="">Choose a course</option>
                {courses.map(course => (
                  <option key={course.id || course._id} value={course.id || course._id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Student Name *</label>
                <input
                  type="text" value={formData.studentName} onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                  className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl text-[14px] font-bold outline-none focus:bg-white focus:border-navy transition-all"
                  placeholder="Enter student name"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Mobile *</label>
                <input
                  type="text" value={formData.studentMobile}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setFormData({ ...formData, studentMobile: val });
                  }}
                  className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl text-[14px] font-bold outline-none focus:bg-white focus:border-navy transition-all"
                  placeholder="Enter 10-digit mobile number"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Email *</label>
                <input
                  type="email" value={formData.studentEmail} onChange={(e) => setFormData({ ...formData, studentEmail: e.target.value })}
                  className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl text-[14px] font-bold outline-none focus:bg-white focus:border-navy transition-all"
                  placeholder="Enter email address"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Payment Method</label>
                <select
                  value={formData.paymentMethod} onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl text-[14px] font-bold outline-none focus:bg-white focus:border-navy transition-all"
                >
                  <option value="">Select Method</option>
                  <option value="UPI">UPI</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Net Banking">Net Banking</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Amount *</label>
                <input
                  type="number" value={formData.amount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (parseFloat(val) < 0) return;
                    setFormData({ ...formData, amount: val });
                  }}
                  className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl text-[14px] font-bold outline-none focus:bg-white focus:border-navy transition-all"
                  placeholder="Enter positive amount"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Payout Amount</label>
                <input
                  type="number" value={formData.payoutAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (parseFloat(val) < 0) return;
                    setFormData({ ...formData, payoutAmount: val });
                  }}
                  className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl text-[14px] font-bold outline-none focus:bg-white focus:border-navy transition-all"
                  placeholder="Enter payout amount"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Coupon Code</label>
                <input
                  type="text" value={formData.coupon} onChange={(e) => setFormData({ ...formData, coupon: e.target.value })}
                  className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl text-[14px] font-bold outline-none focus:bg-white focus:border-navy transition-all"
                  placeholder="Enter coupon code"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Method</label>
                <select
                  value={formData.method} onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                  className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl text-[14px] font-bold outline-none focus:bg-white focus:border-navy transition-all"
                >
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Status</label>
              <select
                value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl text-[14px] font-bold outline-none focus:bg-white focus:border-navy transition-all"
              >
                <option value="successful">Successful</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
          <button onClick={handleEditPage} className="w-full h-12 bg-black text-white rounded-xl font-bold hover:shadow-xl transition-all active:scale-95">
            Save Changes
          </button>
        </DrawerBody>
      </RightSideDrawer>

      {/* Details Drawer */}
      <RightSideDrawer isOpen={showDetailsDrawer && !!selectedPurchase} onClose={() => setShowDetailsDrawer(false)} width="440px">
        <DrawerHeader title="TRANSACTION DETAILS" onClose={() => setShowDetailsDrawer(false)} />
        <DrawerBody className="p-8 space-y-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center text-[28px] font-black text-indigo-600 border-4 border-white shadow-xl uppercase mb-4">
              {selectedPurchase?.avatar}
            </div>
            <h4 className="text-[20px] font-bold text-gray-800">{selectedPurchase?.studentName}</h4>
            <p className="text-[14px] font-medium text-gray-400">{selectedPurchase?.studentEmail}</p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Product Details</p>
              <h5 className="text-[15px] font-bold text-[#1A237E] leading-snug">{selectedPurchase?.productName}</h5>
              <span className="inline-block mt-2 px-3 py-1 bg-white border border-gray-200 rounded-full text-[10px] font-black text-gray-500 uppercase">
                {selectedPurchase?.productType}
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-[12px] font-bold text-gray-400 uppercase">Amount Paid</span>
                <span className="text-[16px] font-black text-blue-600">₹{selectedPurchase?.amount}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-[12px] font-bold text-gray-400 uppercase">Method</span>
                <span className="text-[13px] font-extrabold text-blue-500 uppercase px-3 py-1 bg-blue-50 rounded-lg">{selectedPurchase?.method}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-[12px] font-bold text-gray-400 uppercase">Status</span>
                <span className={`text-[10px] font-black uppercase px-4 py-1.5 rounded-full ${selectedPurchase?.status === 'Success' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                  {selectedPurchase?.status}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-[12px] font-bold text-gray-400 uppercase">Purchase Date</span>
                <span className="text-[13px] font-bold text-gray-700">{selectedPurchase && formatDate(selectedPurchase.date)}</span>
              </div>
              {selectedPurchase?.coupon && selectedPurchase.coupon !== '-' && (
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-[12px] font-bold text-gray-400 uppercase">Coupon Used</span>
                  <span className="text-[13px] font-bold text-indigo-500 uppercase">{selectedPurchase.coupon}</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => selectedPurchase && handlePrintReceipt(selectedPurchase)}
            className="w-full h-14 bg-[#1A237E] text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:shadow-2xl hover:shadow-indigo-200 transition-all active:scale-95 group"
          >
            <span className="material-symbols-outlined group-hover:rotate-12 transition-transform">receipt_long</span>
            Print Receipt
          </button>
        </DrawerBody>
      </RightSideDrawer>
    </div>
  );
};

export default Buyers;

