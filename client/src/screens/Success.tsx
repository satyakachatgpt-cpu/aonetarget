
import React from 'react';
import { useNavigate } from 'react-router-dom';

const Success: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-[#F3F4F6] min-h-screen animate-fade-in flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Confetti Mock */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <div className="absolute top-1/4 left-1/4 w-3 h-3 bg-red-400 rotate-12"></div>
        <div className="absolute top-1/3 right-1/4 w-2 h-4 bg-blue-400 -rotate-45"></div>
        <div className="absolute bottom-1/4 left-1/2 w-4 h-2 bg-yellow-400 rotate-90"></div>
        <div className="absolute top-10 right-10 w-2 h-2 bg-green-400 rounded-full"></div>
      </div>

      <div className="bg-white p-8 rounded-[2rem] shadow-2xl w-full text-center border border-white relative z-10">
        <div className="mb-6 relative inline-block">
          <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto border-4 border-green-100">
             <span className="material-icons-outlined text-6xl text-green-500">check_circle</span>
          </div>
          <div className="absolute -right-1 -top-1 bg-yellow-100 p-1 rounded-full shadow-sm">
            <span className="material-icons-outlined text-yellow-500 text-base">auto_awesome</span>
          </div>
        </div>

        <h1 className="text-2xl font-black text-navy mb-2 leading-tight">
          भुगतान सफल<br/>
          <span className="text-lg font-bold text-gray-500">(Payment Successful!)</span>
        </h1>
        <p className="text-gray-400 text-sm mb-8 mt-2 px-4">
          Thank you for your purchase. Your course has been activated successfully.
        </p>

        <div className="bg-gray-50 rounded-2xl p-5 mb-8 text-left border border-gray-100">
          <div className="flex justify-between items-start mb-4 pb-3 border-b border-gray-200">
             <div>
               <span className="text-[10px] text-gray-400 block uppercase font-bold tracking-widest">Order ID</span>
               <span className="text-xs font-mono font-bold">#ORD-2026-8942</span>
             </div>
             <div className="text-right">
               <span className="text-[10px] text-gray-400 block uppercase font-bold tracking-widest">Amount</span>
               <span className="text-xs font-black text-green-600">₹4,999</span>
             </div>
          </div>
          <div>
             <span className="text-[10px] text-gray-400 block uppercase font-bold tracking-widest mb-1">Course</span>
             <h3 className="text-xs font-bold leading-tight">NEET (UG) 2026: Physics, Chemistry & Biology Foundation</h3>
          </div>
        </div>

        <div className="space-y-3">
          <button onClick={() => navigate('/study/neet-2025-physics')} className="w-full bg-navy text-white py-4 rounded-xl font-bold shadow-lg flex flex-col items-center justify-center leading-tight">
            <span>Start Learning</span>
            <span className="text-[10px] font-normal opacity-80">पढ़ना शुरू करें</span>
          </button>
          <button onClick={() => navigate('/')} className="w-full bg-white text-gray-400 border border-gray-200 py-3 rounded-xl font-bold">
            View Receipt
          </button>
        </div>
      </div>
    </div>
  );
};

export default Success;
