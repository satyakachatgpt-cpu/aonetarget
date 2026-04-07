import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/apiClient';

interface Props {
  setAuth: (val: boolean) => void;
}

const AdminLogin: React.FC<Props> = ({ setAuth }) => {
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Trim inputs to avoid common errors
    const cleanAdminId = adminId.trim();
    const cleanPassword = password.trim();

    try {
      console.log('Login attempt for:', cleanAdminId);

      // Try to authenticate with MongoDB via API
      let response;
      try {
        response = await adminAPI.login(cleanAdminId, cleanPassword);
      } catch (apiError) {
        console.warn('Backend API login failed, checking fallback...', apiError);

        // Fallback: Simple authentication without backend
        // For local testing when backend isn't deployed
        const defaultAdminId = 'admin';
        const defaultPassword = 'aone@2026';

        if (cleanAdminId === defaultAdminId && cleanPassword === defaultPassword) {
          response = {
            success: true,
            adminId: defaultAdminId,
            name: 'Admin User'
          };
        } else {
          throw new Error('Invalid Admin ID or Password');
        }
      }

      console.log('Login response:', response);

      if (response && response.success) {
        localStorage.setItem('isAdminAuthenticated', 'true');
        localStorage.setItem('adminId', response.adminId);
        localStorage.setItem('adminName', response.name);
        if (response.token) {
          localStorage.setItem('adminToken', response.token);
        }
        localStorage.setItem('adminLoginTimestamp', Date.now().toString());
        setAuth(true);
        navigate('/admin');
      } else {
        throw new Error(response?.error || 'Login response invalid');
      }
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Invalid credentials. Please try again.';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 flex flex-col">
        {/* Header Section */}
        <div className="bg-navy p-10 text-white text-center relative">
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full"></div>
            <div className="absolute bottom-0 -left-10 w-32 h-32 bg-white rounded-full"></div>
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="w-20 h-20 bg-white p-3 rounded-2xl shadow-xl mb-6">
              <img src="https://picsum.photos/80/80" alt="Institute Logo" className="rounded-lg w-full h-full object-cover" />
            </div>
            <h1 className="text-2xl font-black tracking-tight leading-tight uppercase">
              Admin Portal
            </h1>
            <p className="text-xs font-bold text-blue-300 mt-2 tracking-[0.2em] uppercase opacity-70">
              Aone Target Institute
            </p>
          </div>
        </div>

        {/* Form Section */}
        <div className="p-8 pb-12">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Admin ID</label>
              <div className="relative">
                <span className="material-icons-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">person</span>
                <input
                  type="text"
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-navy/5 focus:border-navy transition-all outline-none"
                  placeholder="Enter your ID"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Password</label>
              <div className="relative">
                <span className="material-icons-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">lock</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-navy/5 focus:border-navy transition-all outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 p-3 rounded-xl flex items-center gap-2 animate-fade-in">
                <span className="material-icons-outlined text-red-500 text-sm">error</span>
                <p className="text-[11px] font-bold text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full bg-navy text-white py-4 rounded-2xl font-black shadow-xl hover:shadow-navy/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  LOGIN TO DASHBOARD
                  <span className="material-icons-outlined text-sm">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Authorized Access Only
            </p>
            <p className="text-[9px] text-gray-300 mt-2 italic">
              Please contact the system administrator if you've lost your credentials.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
