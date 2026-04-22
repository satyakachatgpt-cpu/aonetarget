import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import mammoth from 'mammoth';
import DOMPurify from 'dompurify';
import { getPdfUrl, getViewerUrl } from '../lib/utils';

const PDFViewerScreen: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const pdfUrl = location.state?.pdf?.fileUrl || 
                 location.state?.pdf?.url || 
                 location.state?.pdf?.link || 
                 location.state?.fileUrl ||
                 location.state?.url ||
                 queryParams.get('url') || '';
  const title = location.state?.title || location.state?.pdf?.title || queryParams.get('title') || 'Document';
  const subject = location.state?.pdf?.subject || 'Study Material';

  const [docxContent, setDocxContent] = useState<string | null>(null);
  const [pdfIframeUrl, setPdfIframeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [useFallback, setUseFallback] = useState(false);

  const fullPdfUrl = getPdfUrl(pdfUrl);
  
  // Extension detection: URL + Title
  const fileExt = (pdfUrl || '').toLowerCase().split('?')[0].split('.').pop() || '';
  const isDocx = fileExt.startsWith('doc') || 
                 (title || '').toLowerCase().endsWith('.docx') || 
                 (title || '').toLowerCase().endsWith('.doc');

  const handleExit = useCallback(() => {
    if (window.opener) {
      window.close();
    } else {
      navigate(-1);
    }
  }, [navigate]);

  useEffect(() => {
    if (!fullPdfUrl) {
       setLoading(false);
       return;
    }
    
    const loadDocument = async () => {
      try {
        setLoading(true);
        setError(null);
        setProgress(10);
        
        if (isDocx) {
          try {
            // Docs need to be fetched via proxy for Mammoth to work (CORS)
            const proxyUrl = `/api/proxy-resource?url=${encodeURIComponent(fullPdfUrl)}`;
            const res = await fetch(proxyUrl, { mode: 'cors' });
            if (!res.ok) throw new Error('Proxy fetch failed');
            const arrayBuffer = await res.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });
            setDocxContent(result.value);
            setLoading(false);
          } catch (e) {
            console.warn('Docx loading failed, showing fallback', e);
            setUseFallback(true);
            setLoading(false);
          }
          return;
        }

        // Native PDF Iframe View with security flags
        // Use the centralized viewer URL logic which adds proxy/signing if needed
        const viewerUrl = getViewerUrl(fullPdfUrl);
        setPdfIframeUrl(`${viewerUrl}#toolbar=0&navpanes=0&view=FitH`);
        setProgress(100);
        setLoading(false);
      } catch (err) {
        console.error('Document Load Error:', err);
        setUseFallback(true);
        setLoading(false);
      }
    };

    loadDocument();
  }, [fullPdfUrl, isDocx]);


  if (!pdfUrl && !location.state) {
    navigate(-1);
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-[#f4f7f6] z-[99999] flex flex-col font-outfit h-[100dvh] w-full overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-md px-4 py-2 md:py-3 flex items-center justify-between border-b border-gray-200 shadow-sm z-[110] shrink-0">
        <button 
          onClick={handleExit} 
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 text-gray-800 hover:bg-gray-200 transition-all group scale-100 active:scale-95 z-[120]"
        >
          <span className="material-symbols-rounded text-[20px] pointer-events-none">arrow_back</span>
        </button>
        
        <div className="flex-1 px-4 text-center min-w-0">
          <h1 className="text-[12px] font-black truncate text-gray-900 leading-tight uppercase tracking-tight">{title}</h1>
          <div className="flex items-center justify-center gap-2 mt-0.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isDocx ? 'bg-blue-600' : 'bg-green-600'}`}></span>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none">{isDocx ? 'Word Document' : 'Vector-Optimized PDF'} • {subject}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleExit}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 transition-all scale-100 active:scale-95 z-[120]"
          >
            <span className="material-symbols-rounded text-[20px] pointer-events-none">close</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 relative bg-white overflow-auto min-h-0" ref={containerRef}>
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 animate-fade-in bg-[#f4f7f6] z-[101]">
             <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-blue-50 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
             </div>
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest tracking-[0.2em] animate-pulse">Initializing Secure Viewport...</p>
          </div>
        ) : null}

        {useFallback ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50 w-full h-full max-w-2xl mx-auto">
            <div className="w-full p-10 bg-white rounded-3xl shadow-xl border border-gray-100 animate-slide-up">
              <div className="w-24 h-24 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-8">
                <span className="material-symbols-rounded text-5xl text-primary-600">
                  {isDocx ? 'description' : 'picture_as_pdf'}
                </span>
              </div>
              
              <h2 className="text-2xl font-black text-gray-900 mb-3 uppercase tracking-tight">Secure Document Preview</h2>
              <p className="text-sm text-gray-500 mb-10 leading-relaxed font-medium">
                For security reasons, this {isDocx ? 'document' : 'PDF'} needs to be opened in our secure internal viewer. This protects the content from unauthorized access.
              </p>

              <div className="space-y-4 max-w-sm mx-auto">
                <div className="p-5 bg-orange-50 rounded-2xl border border-orange-100 flex items-start gap-4">
                  <span className="material-symbols-rounded text-orange-500 mt-0.5">info</span>
                  <p className="text-[11px] text-orange-700 text-left leading-normal font-bold uppercase tracking-tight">
                    Note: If the document doesn't load correctly, please try refreshing the page. For security reasons, direct downloads are disabled.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : isDocx ? (
          <div className="w-full max-w-4xl mx-auto bg-white shadow-xl lg:shadow-[0_20px_50px_rgba(0,0,0,0.06)] rounded-sm p-4 md:p-20 mb-24 h-fit animate-slide-up overflow-x-hidden">
            <div 
              className="prose prose-slate max-w-none text-gray-800 leading-relaxed font-outfit docx-content-area break-words"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(docxContent || '') }} 
            />
            <style dangerouslySetInnerHTML={{ __html: `
              .docx-content-area { width: 100%; word-break: break-word; }
              .docx-content-area h1 { font-size: 1.4rem; md:font-size: 1.8rem; font-weight: 900; color: #111; margin-bottom: 1.5rem; border-bottom: 2px solid #eee; padding-bottom: 0.5rem; }
              .docx-content-area h2 { font-size: 1.2rem; md:font-size: 1.4rem; font-weight: 800; color: #222; margin-top: 1.5rem; }
              .docx-content-area p { margin-bottom: 1rem; font-size: 0.9rem; md:font-size: 0.95rem; line-height: 1.6; }
              .docx-content-area table { width: 100% !important; border-collapse: collapse; margin: 1.5rem 0; border: 1px solid #ddd; table-layout: auto; display: block; overflow-x: auto; }
              .docx-content-area td, .docx-content-area th { border: 1px solid #ddd; padding: 8px; font-size: 0.8rem; }
              .docx-content-area img { max-width: 100%; height: auto; border-radius: 6px; margin: 1.5rem 0; box-shadow: 0 5px 20px rgba(0,0,0,0.05); }
            `}} />
          </div>
        ) : pdfIframeUrl ? (
          <iframe 
            src={pdfIframeUrl} 
            className="w-full h-full border-none block m-0 p-0"
            title={title}
          />
        ) : null}
      </div>

    </div>
  );
};

export default PDFViewerScreen;
