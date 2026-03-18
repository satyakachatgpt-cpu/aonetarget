import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const PurchaseSuccess: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { course, purchase } = (location.state as any) || {};

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-rounded text-green-600 text-4xl">check_circle</span>
        </div>
        <h1 className="text-xl font-black text-gray-800 mb-2">Payment Successful!</h1>
        <p className="text-sm text-gray-500 mb-6">
          You have been enrolled in <span className="font-bold text-[#1A237E]">{course?.name || course?.title || 'the course'}</span>
        </p>

        {purchase && (
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Order ID</span>
              <span className="font-bold text-gray-600">{purchase.id}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Amount</span>
              <span className="font-bold text-green-600">
                {purchase.amount > 0 ? `₹${purchase.amount}` : 'FREE'}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Status</span>
              <span className="font-bold text-green-600 uppercase">{purchase.status}</span>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => navigate(`/course/${course?.id}`)}
            className="w-full bg-[#1A237E] text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <span className="material-symbols-rounded text-lg">play_circle</span>
            Start Learning
          </button>
          <button
            onClick={() => navigate('/student-dashboard')}
            className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default PurchaseSuccess;
