import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy: React.FC = () => {
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
          <h1 className="text-xl font-bold text-white tracking-tight">Privacy Policy</h1>
        </div>
      </header>

      <div className="p-5 animate-in slide-in-from-bottom duration-500 pb-32 bg-white min-h-screen">
        <div className="prose prose-sm text-gray-600">
          <p className="font-bold">Last Updated: February 2026</p>
          <p>Welcome to Aone Target Institute. Your privacy and trust are our most important assets.</p>

          <h4 className="font-bold text-gray-800 mt-4">1. Information Collection</h4>
          <p>We collect information that you provide directly to us when you create an account, such as your name, email, and phone number.</p>

          <h4 className="font-bold text-gray-800 mt-4">2. Usage</h4>
          <p>The information we collect is used to provide, maintain, and improve our educational services, process transactions, and send related information.</p>

          <h4 className="font-bold text-gray-800 mt-4">3. Data Security</h4>
          <p>We implement a variety of security measures to maintain the safety of your personal information when you access our platform.</p>

          <h4 className="font-bold text-gray-800 mt-4">4. Cookie Policy</h4>
          <p>We use cookies to enhance your experience, analyze site usage, and assist in our marketing efforts.</p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
