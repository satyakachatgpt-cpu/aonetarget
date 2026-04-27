import React, { useState, useEffect } from 'react';
import { purchasesAPI } from '../../../services/apiClient';
import { RightSideDrawer, DrawerHeader, DrawerBody } from '../DrawerSystem';

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
  // States for Transactions
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([]);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    let filtered = purchases;
    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.studentEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.productName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredPurchases(filtered);
    setCurrentPage(1);
  }, [purchases, searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);
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
    } catch (error) {
      console.error('Error loading data:', error);
      setPurchases([]);
    } finally {
      setLoading(false);
    }
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

  const currentData = filteredPurchases;
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
              className="px-6 py-2 text-[12px] font-bold rounded-lg bg-white text-black shadow-sm"
            >
              Buyers List
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto self-end md:self-center">
          <div className="relative flex-1 md:flex-none">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
            <input
              type="text"
              placeholder="Search buyers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-72 h-10 pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] font-medium outline-none focus:ring-1 focus:ring-navy transition-all placeholder:text-gray-400 shadow-sm"
            />
          </div>
          <button
            onClick={loadData}
            className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 text-gray-600 rounded-lg shadow-sm hover:bg-gray-50 transition-all active:scale-95 shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">refresh</span>
          </button>
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
                receipt_long
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
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">STUDENT</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">PRODUCT</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">AMOUNT</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">STATUS</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">DATE</th>
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
                            <button onClick={() => { handlePrintReceipt(item); setOpenMenuId(null); }} className="w-full px-4 py-2.5 text-left text-[12px] font-bold text-gray-700 hover:bg-indigo-50 flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm text-indigo-500">receipt_long</span> Receipt
                            </button>
                            <button onClick={() => { handleViewDetails(item); setOpenMenuId(null); }} className="w-full px-4 py-2.5 text-left text-[12px] font-bold text-gray-700 hover:bg-neutral-50 flex items-center gap-2 border-t border-gray-50">
                              <span className="material-symbols-outlined text-sm text-neutral-500">info</span> Details
                            </button>
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

      {/* Details Drawer */}
      <RightSideDrawer isOpen={showDetailsDrawer} onClose={() => setShowDetailsDrawer(false)} width="500px">
        <DrawerHeader title="PURCHASE DETAILS" onClose={() => setShowDetailsDrawer(false)} />
        <DrawerBody className="p-8 space-y-6">
          {selectedPurchase && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-2xl font-black text-indigo-600">
                  {selectedPurchase.avatar}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{selectedPurchase.studentName}</h3>
                  <p className="text-sm text-gray-500">{selectedPurchase.studentEmail}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Product</span>
                  <span className="text-[13px] font-bold text-gray-800">{selectedPurchase.productName}</span>
                </div>
                <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Type</span>
                  <span className="text-[13px] font-bold text-gray-800">{selectedPurchase.productType}</span>
                </div>
                <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Amount</span>
                  <span className="text-lg font-black text-blue-600">₹{selectedPurchase.amount}</span>
                </div>
                <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Status</span>
                  <span className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest ${selectedPurchase.status === 'Success' ? 'bg-green-50 text-green-500' : 'bg-amber-50 text-amber-500'}`}>
                    {selectedPurchase.status}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-400">Mobile</span>
                  <span className="text-sm font-bold text-gray-700">{selectedPurchase.studentMobile}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-400">Date</span>
                  <span className="text-sm font-bold text-gray-700">{formatDate(selectedPurchase.date)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-400">Payment Method</span>
                  <span className="text-sm font-bold text-gray-700 uppercase">{selectedPurchase.method}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-400">Coupon Used</span>
                  <span className="text-sm font-bold text-indigo-600">{selectedPurchase.coupon}</span>
                </div>
              </div>

              <button
                onClick={() => handlePrintReceipt(selectedPurchase)}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">print</span>
                Print Receipt
              </button>
            </div>
          )}
        </DrawerBody>
      </RightSideDrawer>
    </div>
  );
};

export default Buyers;
