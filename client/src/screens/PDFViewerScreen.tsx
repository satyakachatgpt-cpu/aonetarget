import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import mammoth from 'mammoth';
import DOMPurify from 'dompurify';
import { getPdfUrl, getViewerUrl } from '../lib/utils';

// Detect Mobile (iOS and Android) — Both have issues with native iframes for PDFs
const isMobile = (): boolean =>
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// ─────────────────────────────────────────
// Mobile PDF.js canvas viewer (stays in-app)
// ─────────────────────────────────────────
const MobilePdfViewer: React.FC<{ url: string; onReady: () => void; onError: () => void }> = ({
  url,
  onReady,
  onError,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<HTMLCanvasElement[]>([]);
  const [loadedPages, setLoadedPages] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        
        // iOS Safari strictly blocks Cross-Origin Web Workers. 
        // Workaround: Fetch the script as text and create a local Blob URL.
        const workerUrl = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          try {
            const workerRes = await fetch(workerUrl);
            const workerCode = await workerRes.text();
            const blob = new Blob([workerCode], { type: 'text/javascript' });
            pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
          } catch (workerErr) {
            console.warn("Failed to create worker blob, falling back to CDN URL", workerErr);
            pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
          }
        }

        // DIRECT CLOUDFLARE R2 FETCH (Fastest) — works because you enabled CORS!
        const loadingTask = pdfjsLib.getDocument({ url, withCredentials: false });
        const pdf = await loadingTask.promise;
        if (cancelled) return;

        setTotalPages(pdf.numPages);

        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) break;

          const page = await pdf.getPage(i);
          const nativeViewport = page.getViewport({ scale: 1 });
          const screenScale = (window.innerWidth / nativeViewport.width) * (window.devicePixelRatio || 2);
          const viewport = page.getViewport({ scale: Math.min(screenScale, 4) });

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = '100%';
          canvas.style.display = 'block';
          canvas.style.marginBottom = '8px';
          canvas.style.background = '#fff';

          const ctx = canvas.getContext('2d')!;
          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
          if (cancelled) break;

          // Show page 1 immediately — don't wait for rest of pages
          if (i === 1) {
            setPages([canvas]);
            onReady();
          } else {
            setPages(prev => [...prev, canvas]);
          }
          setLoadedPages(i);
        }
      } catch (e) {
        console.error('[PDF.js] render error', e);
        if (!cancelled) onError();
      }
    };

    render();
    return () => { cancelled = true; };
  }, [url]);

  // Mount canvases into DOM imperatively
  useEffect(() => {
    const el = containerRef.current;
    if (!el || pages.length === 0) return;
    el.innerHTML = '';
    pages.forEach(c => el.appendChild(c));
  }, [pages]);

  return (
    <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', height: '100%', background: '#525659' }}>
      {loadedPages < totalPages && totalPages > 0 && (
        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#1e40af', height: 3 }}>
          <div
            style={{
              height: '100%',
              background: '#60a5fa',
              width: `${(loadedPages / totalPages) * 100}%`,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      )}
      <div ref={containerRef} style={{ padding: '8px' }} />
    </div>
  );
};

// ─────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────
const PDFViewerScreen: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const containerRef = useRef<HTMLDivElement>(null);

  const pdfUrl =
    location.state?.pdf?.fileUrl ||
    location.state?.pdf?.url ||
    location.state?.pdf?.link ||
    location.state?.fileUrl ||
    location.state?.url ||
    queryParams.get('url') ||
    '';
  const title =
    location.state?.title || location.state?.pdf?.title || queryParams.get('title') || 'Document';
  const subject = location.state?.pdf?.subject || 'Study Material';

  const [docxContent, setDocxContent] = useState<string | null>(null);
  const [useMobileViewer, setUseMobileViewer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [useFallback, setUseFallback] = useState(false);

  const fullPdfUrl = getPdfUrl(pdfUrl);

  const fileExt = (pdfUrl || '').toLowerCase().split('?')[0].split('.').pop() || '';
  const isDocx =
    fileExt.startsWith('doc') ||
    (title || '').toLowerCase().endsWith('.docx') ||
    (title || '').toLowerCase().endsWith('.doc');

  const handleExit = useCallback(() => {
    if (window.opener) window.close();
    else navigate(-1);
  }, [navigate]);

  // Enable pinch-to-zoom for PDF viewer only
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    const originalContent = meta?.getAttribute('content');
    
    if (meta) {
      // Allow zooming up to 5x while on this screen
      meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover');
    }

    return () => {
      // Revert to non-scalable when leaving
      if (meta && originalContent) {
        meta.setAttribute('content', originalContent);
      }
    };
  }, []);

  useEffect(() => {
    if (!fullPdfUrl) { setLoading(false); return; }

    const load = async () => {
      try {
        setLoading(true);

        if (isDocx) {
          try {
            const proxyUrl = `/api/proxy-resource?url=${encodeURIComponent(fullPdfUrl)}`;
            const res = await fetch(proxyUrl, { mode: 'cors' });
            if (!res.ok) throw new Error('Proxy fetch failed');
            const arrayBuffer = await res.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });
            setDocxContent(result.value);
            setLoading(false);
          } catch (e) {
            console.warn('Docx loading failed', e);
            setUseFallback(true);
            setLoading(false);
          }
          return;
        }

        // Mobile (iOS + Android): use PDF.js canvas viewer (stays in app, uses DIRECT CDN URL now)
        if (isMobile()) {
          setUseMobileViewer(true);
          return; // Loader is removed by MobilePdfViewer onReady
        }

        // Desktop: fast native iframe directly to CDN URL (no 25MB limit)
        // Set a slight delay just to ensure state updates, loading spinner removed by iframe onLoad
      } catch (err) {
        console.error('Document Load Error:', err);
        setUseFallback(true);
        setLoading(false);
      }
    };

    load();
  }, [fullPdfUrl, isDocx]);

  // Block dev-tools shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement;
      const isTyping =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.isContentEditable;
      if (isTyping) return;
      const k = e.key.toLowerCase();
      if (
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && !e.shiftKey && ['s', 'u', 'p'].includes(k)) ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(k))
      ) {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!pdfUrl && !location.state) { navigate(-1); return null; }

  return (
    <div
      className="fixed inset-0 bg-[#f4f7f6] z-[99999] flex flex-col font-outfit h-[100dvh] w-full overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="bg-white/95 backdrop-blur-md px-4 pt-[max(env(safe-area-inset-top),8px)] pb-2 md:py-3 flex items-center justify-between border-b border-gray-200 shadow-sm z-[110] shrink-0">
        <button
          onClick={handleExit}
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 text-gray-800 hover:bg-gray-200 transition-all scale-100 active:scale-95 z-[120]"
        >
          <span className="material-symbols-rounded text-[20px] pointer-events-none">arrow_back</span>
        </button>

        <div className="flex-1 px-4 text-center min-w-0">
          <h1 className="text-[12px] font-black truncate text-gray-900 leading-tight uppercase tracking-tight">
            {title}
          </h1>
          <div className="flex items-center justify-center gap-2 mt-0.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isDocx ? 'bg-blue-600' : 'bg-green-600'}`} />
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none">
              {isDocx ? 'Word Document' : 'Vector-Optimized PDF'} • {subject}
            </p>
          </div>
        </div>

        <button
          onClick={handleExit}
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 transition-all scale-100 active:scale-95 z-[120]"
        >
          <span className="material-symbols-rounded text-[20px] pointer-events-none">close</span>
        </button>
      </div>

      <div className="flex-1 relative bg-white overflow-auto min-h-0" ref={containerRef}>
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 animate-fade-in bg-[#f4f7f6] z-[101]">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-blue-50 rounded-full" />
              <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] animate-pulse">
              {useMobileViewer ? 'Rendering PDF…' : 'Initializing Secure Viewport…'}
            </p>
          </div>
        )}

        {useFallback ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50 w-full h-full max-w-2xl mx-auto">
            <div className="w-full p-10 bg-white rounded-3xl shadow-xl border border-gray-100 animate-slide-up">
              <div className="w-24 h-24 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-8">
                <span className="material-symbols-rounded text-5xl text-primary-600">
                  {isDocx ? 'description' : 'picture_as_pdf'}
                </span>
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-3 uppercase tracking-tight">
                Secure Document Preview
              </h2>
              <p className="text-sm text-gray-500 mb-10 leading-relaxed font-medium">
                For security reasons, this {isDocx ? 'document' : 'PDF'} needs to be opened in our
                secure internal viewer. This protects the content from unauthorized access.
              </p>
              <div className="p-5 bg-orange-50 rounded-2xl border border-orange-100 flex items-start gap-4 max-w-sm mx-auto">
                <span className="material-symbols-rounded text-orange-500 mt-0.5">info</span>
                <p className="text-[11px] text-orange-700 text-left leading-normal font-bold uppercase tracking-tight">
                  If the document doesn't load correctly, please try refreshing the page.
                </p>
              </div>
            </div>
          </div>

        ) : isDocx && docxContent ? (
          <div className="w-full max-w-4xl mx-auto bg-white shadow-xl rounded-sm p-4 md:p-20 mb-24 h-fit animate-slide-up overflow-x-hidden">
            <div
              className="prose prose-slate max-w-none text-gray-800 leading-relaxed font-outfit docx-content-area break-words"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(docxContent) }}
            />
          </div>
        ) : useMobileViewer && fullPdfUrl ? (
          <MobilePdfViewer
            url={fullPdfUrl}
            onReady={() => setLoading(false)}
            onError={() => { setUseFallback(true); setLoading(false); }}
          />
        ) : fullPdfUrl && !isMobile() ? (
          <div className="w-full h-full bg-[#525659] overflow-hidden">
            <iframe
              src={fullPdfUrl + '#toolbar=0&navpanes=0'}
              className="w-full h-full border-none block m-0 p-0"
              title={title}
              onLoad={() => setLoading(false)}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default PDFViewerScreen;
