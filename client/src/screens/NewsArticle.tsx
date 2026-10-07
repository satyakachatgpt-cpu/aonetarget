import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { blogAPI } from '../services/apiClient';
import { getImageUrl, openPlayStoreForNews } from '../lib/utils';
import DOMPurify from 'dompurify';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

const NewsArticle: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [news, setNews] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Removed local getImageUrl implementation in favour of global utility

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
        {/* Breadcrumbs - Ensuring it's exactly at the top */}
      <div className="bg-[#f8f9fa] border-b border-gray-100 px-4 py-2.5 text-[11px] text-gray-500 font-medium">
        <div className="max-w-4xl mx-auto flex items-center gap-2 overflow-x-auto whitespace-nowrap hide-scrollbar uppercase tracking-wider">
          <span className="cursor-pointer hover:text-[#204a8e] transition-colors" onClick={() => navigate('/')}>AONE TARGET INSTITUTE</span>
          <span className="text-gray-300 font-light">&gt;</span>
          <span className="cursor-pointer hover:text-[#204a8e] transition-colors">{news.category || 'Current Affairs'}</span>
          <span className="text-gray-300 font-light">&gt;</span>
          <span className="truncate text-gray-400 font-normal lowercase first-letter:uppercase italic">{news.title}</span>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-5 pt-8 animate-fade-in">
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-1 text-gray-500 hover:text-[#204a8e] transition-colors mb-4 font-medium text-[15px]"
        >
          <span className="material-symbols-rounded text-[20px]">arrow_back</span>
          Back
        </button>

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
        {Capacitor.isNativePlatform() ? (
          /* Native App View: Full news content without any restriction */
          <div className="space-y-10">
            <div 
              className="text-[17px] leading-[1.8] text-gray-700 tracking-normal font-normal rich-text-content"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(news.content || '') }}
            />
          </div>
        ) : (
          /* Website View: Half preview with fade overlay and Play Store download prompt */
          <div className="space-y-6">
            <div className="relative max-h-[240px] sm:max-h-[300px] overflow-hidden select-none">
              <div 
                className="text-[17px] leading-[1.8] text-gray-700 tracking-normal font-normal rich-text-content"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(news.content || '') }}
              />
              {/* Fade out gradient overlay */}
              <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-white via-white/85 to-transparent pointer-events-none" />
            </div>

            {/* App Download Paywall Card */}
            <div className="bg-gradient-to-b from-blue-50/80 via-white to-indigo-50/60 border border-blue-200/80 rounded-3xl p-6 sm:p-8 text-center shadow-xl shadow-blue-900/5 relative overflow-hidden">
              <div className="w-14 h-14 bg-gradient-to-br from-[#204a8e] to-[#142e5c] text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md shadow-blue-900/20">
                <span className="material-symbols-rounded text-3xl">auto_stories</span>
              </div>

              <span className="inline-block px-3 py-1 bg-blue-100/90 text-[#204a8e] text-[11px] font-bold uppercase tracking-wider rounded-full mb-2">
                Continue Reading in App
              </span>

              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 tracking-tight">
                Read the Full Article on AONE Target App
              </h3>

              <p className="text-[13px] sm:text-sm text-gray-600 max-w-md mx-auto mb-6 leading-relaxed">
                Download the official AONE Target app to read complete articles, access study notes, watch classes and attempt test series.
              </p>

              <button
                onClick={() => openPlayStoreForNews(news.id || news._id || id)}
                className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-[#204a8e] to-[#1a3c75] text-white rounded-2xl font-bold text-sm hover:shadow-lg hover:shadow-blue-900/25 transition-all active:scale-95 inline-flex items-center justify-center gap-2.5 mx-auto"
              >
                <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M3.609 1.814L13.793 12 3.61 22.186a1.996 1.996 0 0 1-.61-1.428V3.242c0-.55.226-1.047.609-1.428zm11.603 11.604l2.56 2.56-11.83 6.815 9.27-9.375zm0-2.836l-9.27-9.375 11.83 6.815-2.56 2.56zm1.415 1.418l3.774 2.176c.725.418.725 1.1 0 1.518l-3.774 2.176-2.029-2.03 2.029-2.03z"/>
                </svg>
                <span>Read More</span>
              </button>
            </div>
          </div>
        )}

        {/* Share Section */}
        <div className="mt-12 pt-8 border-t border-gray-100 flex justify-center">
          <button
            onClick={async () => {
              const newsId = news.id || news._id;
              // Adding ?v=Date to bypass WhatsApp's cache
              const shareUrl = `https://aonetarget.in/api/share/news/${newsId}?v=${Date.now()}`;
              
              const shareData = {
                title: news.title,
                text: news.title,
                url: shareUrl,
              };
              
              if (Capacitor.isNativePlatform()) {
                try {
                  await Share.share({
                    title: shareData.title,
                    text: `${shareData.text}\n\n📱 Download App:\nhttps://play.google.com/store/apps/details?id=com.aonetarget.education\n\n🌐 Read on web:\n${shareUrl}`,
                    dialogTitle: 'Share Post'
                  });
                } catch (err) {
                  console.log('Capacitor share failed:', err);
                }
              } else if (typeof navigator !== 'undefined' && navigator.share) {
                try {
                  await navigator.share(shareData);
                } catch (err) {
                  console.log('Share failed:', err);
                }
              } else {
                navigator.clipboard.writeText(shareUrl);
                alert('Link copied to clipboard! You can now paste and share it anywhere.');
              }
            }}
            className="flex items-center gap-2 px-8 py-3 bg-[#204a8e] text-white rounded-xl font-semibold shadow-md hover:bg-[#1a3c75] transition-all active:scale-95"
          >
            <span className="material-symbols-rounded text-[22px]">share</span>
            Share Post
          </button>
        </div>
      </main>

      {/* Floating Scroll to Top button exactly like screenshot */}
      <div className="fixed bottom-8 right-6 z-50">
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
    </div>
  );
};

export default NewsArticle;
