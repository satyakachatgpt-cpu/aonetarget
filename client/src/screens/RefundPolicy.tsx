import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const RefundPolicy: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-surface-100">
      <header className="sticky top-0 z-40 shadow-lg overflow-hidden" style={{ background: 'linear-gradient(135deg, #1A237E 0%, #283593 40%, #303F9F 100%)' }}>
        <div className="px-4 pt-6 pb-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-white/10 transition-all duration-200 active:scale-[0.97]">
            <span className="material-symbols-rounded text-white">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold text-white tracking-tight">Refund & Return Policy</h1>
        </div>
      </header>

      <div className="p-5 animate-in slide-in-from-bottom duration-500 pb-32 bg-white min-h-screen">
        <div className="prose prose-sm text-gray-600">
          <p className="font-bold">Last Updated: February 2026</p>
          <p>Welcome to Aone Target Institute's Refund and Return Policy. Please read this carefully before purchasing any of our courses or digital materials.</p>

          <h4 className="font-bold text-gray-800 mt-4">1. Digital Products and Services</h4>
          <p>All our products, including course enrollments, test series, and e-books, are digital in nature. Once access is granted to these resources, they are considered "used" or "consumed."</p>

          <h4 className="font-bold text-gray-800 mt-4">2. Non-Refundable Purchases</h4>
          <p>Due to the digital nature of our educational content, all sales are final. We do not offer refunds, returns, or exchanges for any courses, test series, or PDF materials once the purchase is complete and access has been provided.</p>

          <h4 className="font-bold text-gray-800 mt-4">3. Exceptional Circumstances</h4>
          <p>Refunds may only be considered under exceptional circumstances, such as duplicate payments for the exact same course/product due to a technical error on our platform. In such cases, you must contact our support team within 48 hours of the transaction.</p>

          <h4 className="font-bold text-gray-800 mt-4">4. Course Cancellation by Institute</h4>
          <p>If Aone Target Institute cancels a live batch or course before its scheduled start date, enrolled students will be eligible for a full refund or can opt to transfer the amount to another available course.</p>

          <h4 className="font-bold text-gray-800 mt-4">5. Contact Support</h4>
          <p>If you experience any technical issues accessing your purchased content, please contact our support team immediately so we can assist you in resolving the issue.</p>
        </div>
      </div>
    </div>
  );
};

export default RefundPolicy;


