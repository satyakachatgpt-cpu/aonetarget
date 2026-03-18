
import React from 'react';

interface Props {
  // Fix: Added Props interface to handle showToast passed from AdminDashboard
  showToast: (m: string, type?: 'success' | 'error') => void;
}

const Shopping: React.FC<Props> = ({ showToast }) => (
  <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 animate-fade-in p-8">
    <div className="flex justify-between items-center mb-8">
      <h3 className="text-xl font-black text-navy uppercase tracking-widest">Transaction Records</h3>
      <div className="flex gap-2">
         <button className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-bold text-gray-400 uppercase">Coupons</button>
         <button onClick={() => showToast("Generating Reports...")} className="px-4 py-2 bg-navy text-white rounded-xl text-[10px] font-bold uppercase tracking-widest">Reports</button>
      </div>
    </div>
    <div className="h-64 flex flex-col items-center justify-center opacity-20">
       <span className="material-icons-outlined text-7xl">receipt_long</span>
       <p className="font-black mt-2 uppercase tracking-widest">No Recent Transactions</p>
    </div>
  </div>
);

export default Shopping;
