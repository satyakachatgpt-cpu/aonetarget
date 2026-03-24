import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const TermsOfService: React.FC = () => {
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
          <h1 className="text-xl font-bold text-white tracking-tight">Terms of Service</h1>
        </div>
      </header>

      <div className="p-5 animate-in slide-in-from-bottom duration-500 pb-32 bg-white min-h-screen">
        <div className="prose prose-sm text-gray-600">
          <p className="font-bold">Last Updated: February 2026</p>
          <p>These Terms of Service govern your use of the Aone Target Institute platform and services.</p>

          <h4 className="font-bold text-gray-800 mt-4">1. Acceptance of Terms</h4>
          <p>By accessing or using our application, you agree to be bound by these Terms. If you do not agree to all the terms, you may not access the services.</p>

          <h4 className="font-bold text-gray-800 mt-4">2. User Accounts</h4>
          <p>You are responsible for safeguarding the password that you use to access the service and for any activities or actions under your password.</p>

          <h4 className="font-bold text-gray-800 mt-4">3. Intellectual Property</h4>
          <p>The service and its original content, features, and functionality are and will remain the exclusive property of Aone Target Institute and its licensors. Course materials may not be distributed or shared without permission.</p>

          <h4 className="font-bold text-gray-800 mt-4">4. Code of Conduct</h4>
          <p>Users must maintain respectful behavior during live classes, in chat sections, and forums. Any form of harassment or disruption may result in account termination.</p>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
