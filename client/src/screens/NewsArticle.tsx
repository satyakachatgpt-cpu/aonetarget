import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { blogAPI } from '../services/apiClient';
import { getImageUrl } from '../lib/utils';
import DOMPurify from 'dompurify';

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
    window.scrollTo(0, 0);
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
    <div className="min-h-screen bg-white pb-20 font-outfit">
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
        <div className="space-y-10">
          <div 
            className="text-[17px] leading-[1.8] text-gray-700 tracking-normal font-normal rich-text-content"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(news.content || '') }}
          />
        </div>

        {/* Share Section */}
        <div className="mt-12 pt-8 border-t border-gray-100 flex justify-center">
          <button
            onClick={async () => {
              const shareData = {
                title: news.title,
                text: news.title,
                url: window.location.href,
              };
              
              if (typeof navigator !== 'undefined' && navigator.share) {
                try {
                  await navigator.share(shareData);
                } catch (err) {
                  console.log('Share failed:', err);
                }
              } else {
                navigator.clipboard.writeText(window.location.href);
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
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="w-14 h-12 bg-[#f6ae2d] text-navy rounded-lg shadow-xl shadow-black/10 flex items-center justify-center active:scale-95 transition-all group"
          aria-label="Scroll to top"
        >
          <span className="material-symbols-rounded text-4xl font-black group-hover:-translate-y-1 transition-transform">keyboard_arrow_up</span>
        </button>
      </div>
    </div>
  );
};

export default NewsArticle;
