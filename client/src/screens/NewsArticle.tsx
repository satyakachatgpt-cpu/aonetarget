import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { blogAPI } from '../services/apiClient';
import { counsellingAPI } from '../services/communicationService';
import { useAuthStore } from '../store/authStore';
import { getImageUrl, openPlayStoreForNews } from '../lib/utils';
import DOMPurify from 'dompurify';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

const NewsArticle: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, student } = useAuthStore();
  
  const [news, setNews] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Lead Gate & Form State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [formData, setFormData] = useState({
    name: student?.name || '',
    phone: student?.phone || '',
    email: student?.email || ''
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const hasSubmitted = typeof window !== 'undefined' && localStorage.getItem('aone_news_lead_submitted') === 'true';
    if (isAuthenticated || hasSubmitted) {
      setIsUnlocked(true);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const fetchNewsArticle = async () => {
      try {
        const data = await blogAPI.getAll();
        const article = (Array.isArray(data) ? data : []).find((n: any) => n.id === id || n._id === id);
        
        if (article) {
          setNews({
            ...article,
            imageUrl: getImageUrl(article.thumbnail || article.imageUrl),
            date: article.publishDate || new Date(article.createdAt).toLocaleDateString('en-IN')
          });
        }
      } catch (error) {
        console.error('Failed to fetch article details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNewsArticle();
  }, [id]);

  useEffect(() => {
    const container = document.getElementById('news-scroll-container');
    if (container) container.scrollTo(0, 0);
  }, [id]);

  const handleBack = () => {
    if (window.history.state && typeof window.history.state.idx === 'number' && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/', { replace: true });
    }
  };

  // Triggered when user clicks "Read More"
  const handleReadMoreClick = () => {
    const newsId = news?.id || news?._id || id;
    const hasSubmitted = typeof window !== 'undefined' && localStorage.getItem('aone_news_lead_submitted') === 'true';
    
    // If user has already filled the form previously or is an authenticated student:
    // Go directly to the App / Play Store
    if (isAuthenticated || hasSubmitted) {
      openPlayStoreForNews(newsId);
      return;
    }

    // Otherwise, show the Lead Capture Modal
    setFormError('');
    setShowLeadModal(true);
  };

  // Submit Lead & Redirect directly to App
  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const name = formData.name.trim();
    if (!name || name.length < 2) {
      setFormError('Please enter your full name (minimum 2 characters)');
      return;
    }

    

    const rawPhone = formData.phone.replace(/[^0-9]/g, '');
    let cleanPhone = rawPhone;
    if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
      cleanPhone = cleanPhone.substring(2);
    } else if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
      cleanPhone = cleanPhone.substring(1);
    }

    if (!/^[6-9][0-9]{9}$/.test(cleanPhone) || /^(\d)\1{9}$/.test(cleanPhone) || cleanPhone === '1234567890') {
      setFormError('Please enter a valid 10-digit mobile number');
      return;
    }

    const email = formData.email.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError('Please enter a valid email address');
      return;
    }

    setSubmitting(true);
    const newsId = news?.id || news?._id || id;

    try {
      await counsellingAPI.submitNewsLead({
        name,
        phone: cleanPhone,
        email: email || undefined,
        newsId: String(newsId),
        newsTitle: news?.title || 'News Reader',
        source: 'news_read_more'
      });
    } catch (err: any) {
      console.error('Failed to submit news lead to server:', err);
    } finally {
      // Mark as submitted locally so future clicks go directly to app
      if (typeof window !== 'undefined') {
        localStorage.setItem('aone_news_lead_submitted', 'true');
        localStorage.setItem('aone_lead_name', name);
        localStorage.setItem('aone_lead_phone', cleanPhone);
      }
      setIsUnlocked(true);
      setSubmitting(false);
      setShowLeadModal(false);

      // Direct to App / Play Store
      openPlayStoreForNews(newsId);
    }
  };

  // Single clean share format - No duplicate links, no "read on web" bottom link
  const handleShare = async () => {
    const newsId = news?.id || news?._id || id;
    const shareUrl = `https://aonetarget.in/api/share/news/${newsId}`;
    const shareText = `📰 *${news.title}*\n\n👉 *Read More on App / ऐप पर पढ़ें:*\n${shareUrl}`;

    if (Capacitor.isNativePlatform()) {
      try {
        await Share.share({
          title: news.title,
          text: shareText,
          dialogTitle: 'Share News'
        });
      } catch (err) {
        console.log('Capacitor share failed:', err);
      }
    } else if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: news.title,
          text: shareText
        });
      } catch (err) {
        // User dismissed share dialog
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        alert('News link copied to clipboard! You can now paste and share it anywhere.');
      } catch {
        alert(`Share link:\n${shareText}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-10 h-10 border-4 border-[#204a8e] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!news) return null;

  return (
    <div className="h-[100dvh] bg-white font-outfit flex flex-col w-full">
      <div id="news-scroll-container" className="flex-1 overflow-y-auto pb-20 relative">
        {/* Breadcrumbs */}
        <div className="bg-[#f8f9fa] border-b border-gray-100 px-4 py-2.5 text-[11px] text-gray-500 font-medium">
          <div className="max-w-4xl mx-auto flex items-center gap-2 overflow-x-auto whitespace-nowrap hide-scrollbar uppercase tracking-wider">
            <span className="cursor-pointer hover:text-[#204a8e] transition-colors" onClick={() => navigate('/')}>AONE TARGET INSTITUTE</span>
            <span className="text-gray-300 font-light">&gt;</span>
            <span className="cursor-pointer hover:text-[#204a8e] transition-colors" onClick={() => navigate('/news')}>{news.category || 'Current Affairs'}</span>
            <span className="text-gray-300 font-light">&gt;</span>
            <span className="truncate text-gray-400 font-normal lowercase first-letter:uppercase italic">{news.title}</span>
          </div>
        </div>

        <main className="max-w-4xl mx-auto px-5 pt-6 animate-fade-in">
          {/* Back Button & Navigation Controls */}
          <div className="flex items-center justify-between gap-3 mb-5">
            <button 
              type="button"
              onClick={handleBack} 
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-[#204a8e] transition-all font-semibold text-[14px] active:scale-95 shadow-sm"
            >
              <span className="material-symbols-rounded text-[18px]">arrow_back</span>
              Back
            </button>
            
            <button 
              type="button"
              onClick={() => navigate('/')} 
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-gray-500 hover:text-[#204a8e] hover:bg-blue-50/60 transition-all text-xs font-semibold"
            >
              <span className="material-symbols-rounded text-base">home</span>
              Home
            </button>
          </div>

          {/* Title */}
          <h1 className="text-[26px] font-bold text-[#204a8e] leading-[1.3] mb-5 tracking-tight">
            {news.title}
          </h1>

          {/* Date */}
          <div className="flex items-center gap-2.5 text-gray-500 mb-8 font-medium italic">
            <span className="material-symbols-rounded text-xl opacity-75">calendar_month</span>
            <span className="text-[15px]">{news.date || '14/03/2026'}</span>
          </div>

          {/* Hero Image */}
          {news.imageUrl && (
            <div className="mb-10 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-gray-100 bg-gray-50 flex items-center justify-center min-h-[200px]">
              <img 
                src={news.imageUrl} 
                alt={news.title} 
                className="w-full h-auto object-cover max-h-[500px]"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80';
                }}
              />
            </div>
          )}

          {/* Content Section */}
          {Capacitor.isNativePlatform() || isUnlocked ? (
            /* Full news view (In Native App or when unlocked) */
            <div className="space-y-8">
              <div 
                className="text-[17px] leading-[1.8] text-gray-700 tracking-normal font-normal rich-text-content"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(news.content || '') }}
              />

              {/* App Promotion Banner */}
              {!Capacitor.isNativePlatform() && (
                <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#204a8e] text-white rounded-xl flex items-center justify-center shrink-0 shadow-md">
                      <span className="material-symbols-rounded text-2xl">smartphone</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">Experience on AONE Target App</h4>
                      <p className="text-xs text-gray-600">Access full study material, test series & daily quizzes.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => openPlayStoreForNews(news.id || news._id || id)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-[#204a8e] hover:bg-[#1a3c75] text-white rounded-xl font-bold text-xs shadow transition-all active:scale-95 inline-flex items-center justify-center gap-2 shrink-0"
                  >
                    <span>Open in App</span>
                    <span className="material-symbols-rounded text-base">arrow_forward</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Teaser Preview with App Gate & Read More Button */
            <div className="space-y-6">
              <div className="relative max-h-[220px] sm:max-h-[260px] overflow-hidden select-none">
                <div 
                  className="text-[17px] leading-[1.8] text-gray-700 tracking-normal font-normal rich-text-content"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(news.content || '') }}
                />
                {/* Fade out gradient overlay */}
                <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none" />
              </div>

              {/* App Redirect Card */}
              <div className="bg-gradient-to-b from-blue-50/90 via-white to-indigo-50/70 border border-blue-200 rounded-3xl p-6 sm:p-8 text-center shadow-xl shadow-blue-900/5 relative overflow-hidden">
                <div className="w-14 h-14 bg-gradient-to-br from-[#204a8e] to-[#142e5c] text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md shadow-blue-900/20">
                  <span className="material-symbols-rounded text-3xl">auto_stories</span>
                </div>

                <span className="inline-block px-3 py-1 bg-blue-100/90 text-[#204a8e] text-[11px] font-bold uppercase tracking-wider rounded-full mb-2">
                  AONE Target Official App
                </span>

                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 tracking-tight">
                  Read the Full Article on AONE Target App
                </h3>

                <p className="text-[13px] sm:text-sm text-gray-600 max-w-md mx-auto mb-6 leading-relaxed">
                  Click Read More to open the article in our official App. Enjoy complete study material, classes and online tests!
                </p>

                <button
                  type="button"
                  onClick={handleReadMoreClick}
                  className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-[#204a8e] to-[#1a3c75] text-white rounded-2xl font-bold text-sm hover:shadow-lg hover:shadow-blue-900/25 transition-all active:scale-95 inline-flex items-center justify-center gap-2.5 mx-auto"
                >
                  <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M3.609 1.814L13.793 12 3.61 22.186a1.996 1.996 0 0 1-.61-1.428V3.242c0-.55.226-1.047.609-1.428zm11.603 11.604l2.56 2.56-11.83 6.815 9.27-9.375zm0-2.836l-9.27-9.375 11.83 6.815-2.56 2.56zm1.415 1.418l3.774 2.176c.725.418.725 1.1 0 1.518l-3.774 2.176-2.029-2.03 2.029-2.03z"/>
                  </svg>
                  <span>Read More</span>
                </button>
              </div>
            </div>
          )}

          {/* Share Section (Single Clean Link, No Bottom Web Clutter) */}
          <div className="mt-12 pt-8 border-t border-gray-100 flex justify-center">
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-8 py-3 bg-[#204a8e] text-white rounded-xl font-semibold shadow-md hover:bg-[#1a3c75] transition-all active:scale-95"
            >
              <span className="material-symbols-rounded text-[22px]">share</span>
              Share Post
            </button>
          </div>
        </main>

        {/* Floating Scroll to Top button */}
        <div className="fixed bottom-8 right-6 z-40">
          <button 
            onClick={() => {
              const container = document.getElementById('news-scroll-container');
              if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="w-14 h-12 bg-[#f6ae2d] text-navy rounded-lg shadow-xl shadow-black/10 flex items-center justify-center active:scale-95 transition-all group"
            aria-label="Scroll to top"
          >
            <span className="material-symbols-rounded text-4xl font-black group-hover:-translate-y-1 transition-transform">keyboard_arrow_up</span>
          </button>
        </div>
      </div>

      {/* LEAD CAPTURE MODAL - Opens on "Read More" click before redirecting to App */}
      {showLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-gray-100 overflow-hidden relative animate-scale-up">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#204a8e] to-[#142e5c] text-white p-6 relative">
              <button 
                type="button"
                onClick={() => setShowLeadModal(false)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all active:scale-95"
                aria-label="Close"
              >
                <span className="material-symbols-rounded text-xl">close</span>
              </button>

              <span className="inline-block px-2.5 py-0.5 bg-white/20 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2">
                AONE Target App
              </span>
              <h3 className="text-xl font-bold tracking-tight">Read Full News on App</h3>
              <p className="text-xs text-blue-100/90 mt-1">
                Enter your details once to open this article and access daily free study material in our official App.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLeadSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <span className="material-symbols-rounded text-base shrink-0">error</span>
                  <span>{formError}</span>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-rounded absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg">person</span>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter your full name"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#204a8e] focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="relative flex">
                  <div className="flex items-center gap-1 px-3 bg-gray-100 border border-r-0 border-gray-200 rounded-l-xl text-xs font-bold text-gray-600 select-none">
                    <span>🇮🇳 +91</span>
                  </div>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                    placeholder="10-digit mobile number"
                    className="w-full pl-3 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-r-xl text-sm focus:outline-none focus:border-[#204a8e] focus:bg-white transition-all font-medium tracking-wide"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Email ID <span className="text-gray-400 font-normal lowercase">(optional)</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-rounded absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg">mail</span>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#204a8e] focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-gradient-to-r from-[#204a8e] to-[#1a3c75] text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-900/20 hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Connecting to App...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                        <path d="M3.609 1.814L13.793 12 3.61 22.186a1.996 1.996 0 0 1-.61-1.428V3.242c0-.55.226-1.047.609-1.428zm11.603 11.604l2.56 2.56-11.83 6.815 9.27-9.375zm0-2.836l-9.27-9.375 11.83 6.815-2.56 2.56zm1.415 1.418l3.774 2.176c.725.418.725 1.1 0 1.518l-3.774 2.176-2.029-2.03 2.029-2.03z"/>
                      </svg>
                      <span>Continue to App</span>
                    </>
                  )}
                </button>

                {/* Back / Cancel Button */}
                <button
                  type="button"
                  onClick={() => setShowLeadModal(false)}
                  className="w-full py-2.5 text-gray-500 hover:text-gray-800 text-xs font-semibold rounded-xl hover:bg-gray-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-rounded text-[16px]">arrow_back</span>
                  Back to Preview
                </button>

                {/* Direct Bypass Shortcut for existing app users */}
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowLeadModal(false);
                      openPlayStoreForNews(news?.id || news?._id || id);
                    }}
                    className="text-[11px] text-[#204a8e] hover:underline font-medium"
                  >
                    Already have the app? Open directly &rarr;
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsArticle;
