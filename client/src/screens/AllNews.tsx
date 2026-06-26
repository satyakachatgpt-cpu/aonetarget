import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { blogAPI, newsAPI } from '../services/apiClient';
import { getImageUrl } from '../lib/utils';

const AllNews: React.FC = () => {
  const navigate = useNavigate();
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        let newsData = await blogAPI.getAll().catch(() => []);
        if (!Array.isArray(newsData) || newsData.length === 0) {
          newsData = await newsAPI.getAll().catch(() => []);
        }

        const activeNews = (Array.isArray(newsData) ? newsData : []).map((n: any) => ({
          ...n,
          thumbnail: getImageUrl(n.thumbnail || n.imageUrl || n.image)
        })).filter((n: any) =>
          (n.status === 'published' || n.status === 'active' || n.isActive !== false) && n.status !== 'draft'
        ).sort((a: any, b: any) => {
          const getTimestamp = (item: any) => {
            if (!item) return 0;
            if (item.id && typeof item.id === 'string') {
              const numStr = item.id.replace(/\D/g, '');
              if (numStr.length >= 13) {
                const parsed = parseInt(numStr.substring(0, 13));
                if (!isNaN(parsed)) return parsed;
              }
            }
            const d = new Date(item.createdAt || item.publishDate || item.createdDate || item.date || 0).getTime();
            return isNaN(d) ? 0 : d;
          };
          return getTimestamp(b) - getTimestamp(a);
        });

        setNews(activeNews);
      } catch (error) {
        console.error('Failed to fetch news:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  return (
    <div className="max-w-md mx-auto h-[100dvh] bg-surface-100 shadow-xl relative font-outfit flex flex-col w-full">
      <div className="pwa-status-bar bg-white shrink-0 w-full z-50" />
      <div className="flex-1 overflow-y-auto pb-20 relative">
        <header className="sticky top-0 z-40 shadow-sm bg-white border-b border-gray-100">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-700"
          >
            <span className="material-symbols-rounded">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold text-gray-900">All News</h1>
        </div>
      </header>
      
      <main className="px-4 py-5 animate-fade-in space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse h-28 bg-gray-100 rounded-[16px] w-full border border-gray-50"></div>
            ))}
          </div>
        ) : news.length > 0 ? (
          news.map((n: any, i: number) => (
            <div 
              key={n.id || n._id || i}
              onClick={() => navigate(`/news/${n.id || n._id || i}`)}
              className="bg-white rounded-[16px] p-3 border border-gray-100 flex items-center justify-between gap-4 cursor-pointer hover:shadow-md transition-all duration-300 group"
            >
              <div className="flex-1 min-w-0">
                {n.featured && (
                  <div className="flex items-center gap-1 mb-1.5">
                    <span className="bg-amber-100/80 text-amber-700 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1 border border-amber-200/50 shadow-sm transition-all group-hover:scale-105 origin-left">
                      <span className="material-icons text-[10px] text-amber-500">star</span>
                      Featured
                    </span>
                  </div>
                )}
                <h4 className="font-semibold text-[14px] text-gray-800 leading-snug line-clamp-2 mb-2 group-hover:text-blue-700 transition-colors">{n.title || n.message}</h4>
                <div className="flex items-center gap-1 text-blue-600 font-bold text-[11px] uppercase tracking-wider">
                  <span>Read Article</span>
                  <span className="material-symbols-rounded text-[14px]">arrow_forward</span>
                </div>
              </div>
              <div className="w-[100px] h-[70px] rounded-xl overflow-hidden shrink-0 shadow-sm border border-gray-50 bg-white flex items-center justify-center">
                {n.thumbnail ? (
                  <img 
                    src={n.thumbnail} 
                    alt="News" 
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <span className="material-symbols-rounded text-gray-400 text-2xl">newspaper</span>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
           <div className="text-center py-10 text-gray-500 font-medium">No news available</div>
        )}
      </main>
      </div>
    </div>
  );
};

export default AllNews;


