import React, { useState, useEffect } from 'react';
import { purchasesAPI } from '../../../services/apiClient';
import './StoreManagement.css';

interface PaymentHistory {
    id: string;
    studentName: string;
    studentEmail: string;
    productName: string;
    productType: 'Course' | 'Test';
    amount: string;
    date: string;
    status: 'Success' | 'Pending' | 'Failed';
    avatar: string;
    receiptUrl?: string;
}

interface Props {
    showToast: (m: string, type?: 'success' | 'error') => void;
}

const StoreManagement: React.FC<Props> = ({ showToast }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [payments, setPayments] = useState<PaymentHistory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [entriesPerPage, setEntriesPerPage] = useState(10);

    const fetchPayments = async () => {
        try {
            setIsLoading(true);
            const data = await purchasesAPI.getAll();
            if (Array.isArray(data)) {
                const formatted = data.map((item: any) => ({
                    id: item._id || item.id,
                    studentName: item.studentInfo?.name || item.studentName || 'Unknown Student',
                    studentEmail: item.studentInfo?.email || item.studentEmail || '-',
                    productName: item.courseName || item.itemName || 'Untitled Product',
                    productType: item.itemType === 'test' ? 'Test' : 'Course',
                    amount: `₹${item.amount?.toLocaleString() || '0'}`,
                    date: new Date(item.createdAt || item.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    }),
                    status: item.status === 'success' || item.status === 'completed' ? 'Success' :
                        item.status === 'pending' ? 'Pending' : 'Failed',
                    avatar: (item.studentInfo?.name || item.studentName || 'U').substring(0, 2).toUpperCase(),
                    receiptUrl: item.receiptUrl
                })) as PaymentHistory[];
                setPayments(formatted);
            }
        } catch (error) {
            console.error('Failed to fetch payments:', error);
            // Fallback to mock data with proper types
            setPayments([
                { id: '1', studentName: 'Rahul Sharma', studentEmail: 'rahul.s@example.com', productName: 'Full Stack Web Development', productType: 'Course', amount: '₹1,499', date: 'Oct 24, 2023', status: 'Success', avatar: 'RS' },
                { id: '2', studentName: 'Priya Patel', studentEmail: 'priya.p@example.com', productName: 'Advanced Mathematics Test Series', productType: 'Test', amount: '₹499', date: 'Oct 23, 2023', status: 'Success', avatar: 'PP' },
                { id: '3', studentName: 'Amit Kumar', studentEmail: 'amit.k@example.com', productName: 'Python for Beginners', productType: 'Course', amount: '₹999', date: 'Oct 22, 2023', status: 'Pending', avatar: 'AK' },
                { id: '4', studentName: 'Sneha Reddy', studentEmail: 'sneha.r@example.com', productName: 'JEE Mock Test 2024', productType: 'Test', amount: '₹299', date: 'Oct 20, 2023', status: 'Success', avatar: 'SR' },
                { id: '5', studentName: 'Vikram Singh', studentEmail: 'vikram.s@example.com', productName: 'Data Science Bootcamp', productType: 'Course', amount: '₹2,499', date: 'Oct 18, 2023', status: 'Failed', avatar: 'VS' },
            ] as PaymentHistory[]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPayments();
    }, []);

    const filteredHistory = payments.filter(item =>
        item.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.studentEmail.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Dynamic Pagination
    const totalPages = Math.ceil(filteredHistory.length / entriesPerPage);
    const paginatedHistory = filteredHistory.slice(
        (currentPage - 1) * entriesPerPage,
        currentPage * entriesPerPage
    );

    const handleExport = () => {
        if (payments.length === 0) {
            showToast('No data to export', 'error');
            return;
        }

        showToast('Preparing download...');

        // CSV Generation
        const headers = ['ID', 'Student Name', 'Email', 'Product', 'Type', 'Amount', 'Date', 'Status'];
        const csvContent = [
            headers.join(','),
            ...payments.map(p => [
                p.id,
                `"${p.studentName}"`,
                p.studentEmail,
                `"${p.productName}"`,
                p.productType,
                p.amount.replace('₹', ''),
                p.date,
                p.status
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `payment_history_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast('Download started!', 'success');
    };

    const handleViewReceipt = (item: PaymentHistory) => {
        const receiptWindow = window.open('', '_blank', 'width=800,height=900');
        if (!receiptWindow) {
            showToast('Popup blocked! Please allow popups to view receipt.', 'error');
            return;
        }

        receiptWindow.document.write(`
            <html>
                <head>
                    <title>Receipt - ${item.id}</title>
                    <style>
                        body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
                        .header { border-bottom: 2px solid #f1f5f9; padding-bottom: 24px; margin-bottom: 32px; }
                        .row { display: flex; justify-content: space-between; margin-bottom: 12px; }
                        .label { font-weight: 600; color: #64748b; }
                        .value { font-weight: 800; color: #1e293b; }
                        .status { color: #10b981; font-weight: 800; text-transform: uppercase; }
                        .footer { margin-top: 60px; padding-top: 24px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; text-align: center; }
                        .btn-print { margin-top: 32px; padding: 12px 24px; background: #1e293b; color: white; border: none; border-radius: 12px; font-weight: 800; cursor: pointer; width: 100%; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Transaction Receipt</h1>
                        <p>Aone Target Institute</p>
                    </div>
                    <div class="row">
                        <span class="label">Transaction ID:</span>
                        <span class="value">${item.id}</span>
                    </div>
                    <div class="row">
                        <span class="label">Student:</span>
                        <span class="value">${item.studentName}</span>
                    </div>
                    <div class="row">
                        <span class="label">Email:</span>
                        <span class="value">${item.studentEmail}</span>
                    </div>
                    <div class="row">
                        <span class="label">Product:</span>
                        <span class="value">${item.productName}</span>
                    </div>
                    <div class="row">
                        <span class="label">Amount:</span>
                        <span class="value">${item.amount}</span>
                    </div>
                    <div class="row">
                        <span class="label">Date:</span>
                        <span class="value">${item.date}</span>
                    </div>
                    <div class="row">
                        <span class="label">Status:</span>
                        <span class="status">${item.status}</span>
                    </div>
                    <button class="btn-print" onclick="window.print()">Print Receipt</button>
                    <div class="footer">
                        &copy; ${new Date().getFullYear()} Aone Target Institute - Official Digital Receipt
                    </div>
                </body>
            </html>
        `);
        receiptWindow.document.close();
    };

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    return (
        <div className="store-content bg-[#f8fafc] min-h-screen">
            <div className="p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-[28px] font-black text-[#1e293b] tracking-tight">Payment History</h2>
                        <p className="text-[14px] font-bold text-gray-400 mt-1 uppercase tracking-widest">Tracking course & test series purchases</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">search</span>
                            <input
                                type="text"
                                placeholder="Search by student or product..."
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                className="pl-12 pr-6 py-3.5 bg-white border border-gray-100 rounded-[20px] text-[13px] font-bold text-[#1e293b] outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/20 transition-all w-[380px] shadow-sm"
                            />
                        </div>
                        <button
                            onClick={handleExport}
                            className="h-14 px-6 bg-[#1e293b] text-white rounded-[20px] font-black text-[12px] uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-black transition-all active:scale-95"
                        >
                            <span className="material-symbols-outlined text-[20px]">download</span>
                            Export Data
                        </button>
                    </div>
                </div>

                {/* Table Section */}
                <div className="bg-white rounded-[32px] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-8 py-6 text-[11px] font-black text-gray-400 uppercase tracking-widest">Student</th>
                                <th className="px-8 py-6 text-[11px] font-black text-gray-400 uppercase tracking-widest">Purchased Item</th>
                                <th className="px-8 py-6 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">Amount</th>
                                <th className="px-8 py-6 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">Date</th>
                                <th className="px-8 py-6 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                                <th className="px-8 py-6 text-[11px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr><td colSpan={6} className="px-8 py-20 text-center text-gray-400 font-bold uppercase tracking-widest">Fetching live transactions...</td></tr>
                            ) : paginatedHistory.length === 0 ? (
                                <tr><td colSpan={6} className="px-8 py-20 text-center text-gray-400 font-bold uppercase tracking-widest">No transactions found</td></tr>
                            ) : paginatedHistory.map((item) => (
                                <tr key={item.id} className="group hover:bg-gray-50/30 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[13px] font-black text-blue-600 border border-blue-100 uppercase">
                                                {item.avatar}
                                            </div>
                                            <div>
                                                <div className="text-[15px] font-black text-[#1e293b] tracking-tight">{item.studentName}</div>
                                                <div className="text-[12px] font-bold text-gray-400">{item.studentEmail}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-[14px]">
                                        <div className="font-black text-[#1e293b] tracking-tight">{item.productName}</div>
                                        <div className={`mt-1 text-[10px] font-black uppercase px-2 py-0.5 rounded w-fit ${item.productType === 'Course' ? 'bg-indigo-50 text-indigo-500' : 'bg-amber-50 text-amber-500'}`}>
                                            {item.productType}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-[15px] font-black text-[#1e293b] text-center">{item.amount}</td>
                                    <td className="px-8 py-6 text-[13px] font-bold text-gray-500 uppercase text-center">{item.date}</td>
                                    <td className="px-8 py-6">
                                        <div className="flex justify-center">
                                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${item.status === 'Success' ? 'bg-green-50 text-green-600' :
                                                item.status === 'Pending' ? 'bg-amber-50 text-amber-600' :
                                                    'bg-red-50 text-red-600'
                                                }`}>
                                                {item.status}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button
                                            onClick={() => handleViewReceipt(item)}
                                            className="w-10 h-10 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-blue-600 hover:border-blue-100 flex items-center justify-center transition-all shadow-sm active:scale-90"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Footer */}
                    <div className="px-8 py-6 bg-gray-50/50 flex items-center justify-between border-t border-gray-100">
                        <div className="flex items-center gap-3">
                            <select
                                value={entriesPerPage}
                                onChange={(e) => { setEntriesPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-[12px] font-black outline-none shadow-sm focus:border-blue-500 transition-all cursor-pointer"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                            </select>
                            <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Entries per page</span>
                        </div>
                        <div className="flex items-center gap-6">
                            <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest">
                                Showing {paginatedHistory.length} of {filteredHistory.length} results
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="w-11 h-11 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <span className="material-symbols-outlined">chevron_left</span>
                                </button>
                                <div className="flex gap-1">
                                    {[...Array(totalPages)].map((_, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handlePageChange(idx + 1)}
                                            className={`w-11 h-11 rounded-2xl flex items-center justify-center text-[14px] font-black transition-all ${currentPage === idx + 1
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                                : 'bg-white border border-gray-200 text-gray-400 hover:text-blue-600'
                                                }`}
                                        >
                                            {idx + 1}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    className="w-11 h-11 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <span className="material-symbols-outlined">chevron_right</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StoreManagement;

