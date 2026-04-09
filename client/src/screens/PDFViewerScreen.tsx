import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { getPdfUrl } from '../lib/utils';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const PDFViewerScreen: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const pdfUrl = location.state?.pdf?.fileUrl || location.state?.pdf?.url || location.state?.pdf?.link || queryParams.get('url') || '';
  const title = location.state?.title || location.state?.pdf?.title || queryParams.get('title') || 'Document';
  const subject = location.state?.pdf?.subject || 'Study Material';

  const [docxContent, setDocxContent] = useState<string | null>(null);
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const fullPdfUrl = getPdfUrl(pdfUrl);
  const isDocx = (pdfUrl || '').toLowerCase().split('?')[0].split('.').pop()?.startsWith('doc') || false;

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
        
        const response = await fetch(fullPdfUrl, { mode: 'cors' });
        if (!response.ok) throw new Error('Document mapping failed or file not found.');
        
        const blob = await response.blob();
        setProgress(30);
        
        if (isDocx) {
          const arrayBuffer = await blob.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          setDocxContent(result.value);
        } else {
          // ULTRA-HIGH FIDELITY PDF RENDER
          const arrayBuffer = await blob.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const pageImages: string[] = [];
          
          // Progressive rendering - show first page quickly
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            // Increase scale to 2.5 for Ultra-HD text (fix for pixelation)
            const viewport = page.getViewport({ scale: 2.2 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            // Respect device pixel ratio for crispness
            const dpr = window.devicePixelRatio || 1;
            canvas.height = viewport.height * dpr;
            canvas.width = viewport.width * dpr;
            canvas.style.width = `${viewport.width}px`;
            canvas.style.height = `${viewport.height}px`;
            
            if (context) {
              context.scale(dpr, dpr);
              await page.render({ canvasContext: context, viewport, canvas }).promise;
              pageImages.push(canvas.toDataURL('image/png'));
              
              if (i === 1) {
                setPdfPages([...pageImages]);
                setLoading(false); // Show first page immediately for perceived speed
              }
              setProgress(30 + Math.round((i / pdf.numPages) * 70));
            }
          }
          setPdfPages(pageImages);
        }
      } catch (err) {
        console.error('Fetch Error:', err);
        setError('Connection refused or failed to reach document. Please verify the file path.');
      } finally {
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
    <div className="fixed inset-0 bg-[#f4f7f6] z-[99999] flex flex-col font-outfit select-none overflow-hidden h-[100dvh] w-full">
      {/* Absolute High-Level Header */}
      <div className="bg-white/95 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-gray-200 shadow-sm z-[110] shrink-0">
        <button 
          onClick={handleExit} 
          className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-100 text-gray-800 hover:bg-gray-200 transition-all group scale-100 active:scale-95 z-[120]"
          id="btn-viewer-back-hd"
        >
          <span className="material-symbols-rounded text-[22px] pointer-events-none">arrow_back</span>
        </button>
        
        <div className="flex-1 px-8 text-center min-w-0">
          <h1 className="text-[14px] font-black truncate text-gray-900 leading-tight uppercase tracking-tight">{title}</h1>
          <div className="flex items-center justify-center gap-2 mt-0.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isDocx ? 'bg-blue-600' : 'bg-green-600'}`}></span>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{isDocx ? 'Word Document' : 'Vector-Optimized PDF'} • {subject}</p>
          </div>
        </div>

        <button 
          onClick={handleExit}
          className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 transition-all scale-100 active:scale-95 z-[120]"
          id="btn-viewer-close-hd"
        >
          <span className="material-symbols-rounded text-[22px] pointer-events-none">close</span>
        </button>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 relative overflow-y-auto custom-scrollbar p-6 lg:p-10 flex flex-col items-center bg-[#f4f7f6]" ref={containerRef}>
        {loading && pdfPages.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-6 mt-40 animate-in fade-in duration-500">
             <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-blue-50 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
             </div>
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest tracking-[0.2em] animate-pulse">Initializing Secure Viewport...</p>
          </div>
        ) : error ? (
          <div className="max-w-md w-full bg-white rounded-3xl p-10 text-center shadow-2xl border border-red-50 mt-20">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-rounded text-red-500 text-4xl">warning_amber</span>
            </div>
            <h3 className="text-md font-black text-gray-900 mb-2 uppercase italic tracking-tighter">Connection Failed</h3>
            <p className="text-gray-500 text-xs leading-relaxed mb-8">{error}</p>
            <button onClick={handleExit} className="w-full py-4 bg-navy text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all">Retry via Exit</button>
          </div>
        ) : isDocx ? (
          <div className="max-w-4xl w-full bg-white shadow-[0_20px_50px_rgba(0,0,0,0.06)] rounded-sm p-12 md:p-20 mb-24 h-fit animate-in slide-in-from-bottom-5 duration-700">
            <div 
              className="prose prose-slate max-w-none text-gray-800 leading-relaxed font-outfit docx-content-area"
              dangerouslySetInnerHTML={{ __html: docxContent || '' }} 
            />
            <style dangerouslySetInnerHTML={{ __html: `
              .docx-content-area h1 { font-size: 2.2rem; font-weight: 900; color: #111; margin-bottom: 2rem; border-bottom: 2px solid #eee; padding-bottom: 1rem; }
              .docx-content-area h2 { font-size: 1.6rem; font-weight: 800; color: #222; margin-top: 2rem; }
              .docx-content-area p { margin-bottom: 1.25rem; font-size: 1.05rem; line-height: 1.85; }
              .docx-content-area table { width: 100%; border-collapse: collapse; margin: 2rem 0; border: 1px solid #ddd; }
              .docx-content-area td, .docx-content-area th { border: 1px solid #ddd; padding: 14px; font-size: 0.95rem; }
              .docx-content-area img { max-width: 100%; height: auto; border-radius: 8px; margin: 2.5rem 0; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
            `}} />
          </div>
        ) : (
          <div className="flex flex-col gap-10 max-w-5xl w-full mb-24 animate-in zoom-in-95 duration-700">
             {/* Progress bar for background rendering */}
             {progress < 100 && (
               <div className="fixed top-[73px] left-0 right-0 z-[105] h-1 bg-gray-100">
                  <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
               </div>
             )}
            {pdfPages.map((pageData, index) => (
              <div key={index} className="bg-white shadow-[0_15px_60px_rgba(0,0,0,0.08)] rounded-sm overflow-hidden flex justify-center border border-gray-100 p-0 transform-gpu transition-all duration-500 hover:shadow-[0_20px_70px_rgba(0,0,0,0.12)]">
                <img src={pageData} alt={`Page ${index + 1}`} className="w-full h-auto select-none pointer-events-none" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div className="bg-white px-8 py-5 border-t border-gray-100 flex items-center justify-between shrink-0 shadow-sm z-[110]">
        <div className="flex items-center gap-3">
           <div className="bg-navy px-3 py-1.5 rounded flex items-center justify-center shadow-lg gap-2">
              <span className="material-symbols-rounded text-[14px] text-white">verified_user</span>
              <span className="text-white text-[9px] font-black italic tracking-widest uppercase">High Dynamic Range</span>
           </div>
           <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] opacity-80 italic">Protected High-Fidelity Rendering</p>
        </div>
        <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.4em]">AUTHENTIC • SECURE • AONE TARGET</p>
      </div>
    </div>
  );
};

export default PDFViewerScreen;
