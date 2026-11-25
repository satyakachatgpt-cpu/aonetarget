import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import mammoth from 'mammoth';
import DOMPurify from 'dompurify';
import { getPdfUrl, API_BASE } from '../lib/utils';

// Configure Mozilla PDF.js legacy worker
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  } catch (e) {
    console.warn('[PDF.js] Worker setup warning:', e);
  }
}

// ─────────────────────────────────────────────────────────────────
// High-Performance Streaming & Buffered PDF Fetcher with Progress
// ─────────────────────────────────────────────────────────────────
async function fetchPdfWithProgress(
  rawUrl: string,
  onProgress?: (loadedBytes: number, totalBytes: number) => void
): Promise<ArrayBuffer> {
  const targetUrl = getPdfUrl(rawUrl);

  const streamToBuffer = async (res: Response): Promise<ArrayBuffer> => {
    const contentLength = res.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    if (!res.body) {
      const buf = await res.arrayBuffer();
      if (buf.byteLength > 100) return buf;
      throw new Error('Empty response body');
    }

    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.length;
        if (onProgress) {
          onProgress(received, total);
        }
      }
    }

    const fullBuffer = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      fullBuffer.set(chunk, offset);
      offset += chunk.length;
    }
    return fullBuffer.buffer;
  };

  // Strategy 1: Direct fetch with progress
  try {
    const res = await fetch(targetUrl, { mode: 'cors' });
    if (res.ok) {
      const buf = await streamToBuffer(res);
      if (buf.byteLength > 100) return buf;
    }
  } catch (err) {
    console.warn('[PDF] Direct fetch error, trying proxy fallback:', err);
  }

  // Strategy 2: Backend Proxy fetch (for CORS restricted resources like Cloudinary raw files)
  try {
    const proxyUrl = `${API_BASE}/api/proxy-resource?url=${encodeURIComponent(targetUrl)}`;
    const studentToken = localStorage.getItem('accessToken') || localStorage.getItem('token');
    const adminToken = localStorage.getItem('adminToken');
    const headers: Record<string, string> = {};
    if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;
    else if (studentToken) headers['Authorization'] = `Bearer ${studentToken}`;

    const res = await fetch(proxyUrl, { headers });
    if (res.ok) {
      const buf = await streamToBuffer(res);
      if (buf.byteLength > 100) return buf;
    }
  } catch (err) {
    console.warn('[PDF] Proxy fetch error:', err);
  }

  // Strategy 3: Standard fallback fetch
  try {
    const fallbackRes = await fetch(targetUrl);
    if (fallbackRes.ok) {
      const buf = await fallbackRes.arrayBuffer();
      if (buf.byteLength > 100) return buf;
    }
  } catch (e) {}

  throw new Error('Unable to download document content. Please check internet connection.');
}

// ─────────────────────────────────────────────────────────────────
// Virtualized Individual Page Renderer
// (Only renders canvas when visible; cleans up canvas when scrolled away to prevent Android OOM)
// ─────────────────────────────────────────────────────────────────
interface PdfPageProps {
  pdf: any;
  pageNumber: number;
  scale: number;
  currentPage: number;
  onVisible?: (pageNumber: number) => void;
}

const PdfPage: React.FC<PdfPageProps> = ({ pdf, pageNumber, scale, currentPage, onVisible }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Pre-load condition: Active if in viewport OR within 3 pages ahead/behind the current page
  const isNearCurrentPage = Math.abs(pageNumber - currentPage) <= 3;
  const [isVisible, setIsVisible] = useState(pageNumber === 1 || isNearCurrentPage);
  const [isRendered, setIsRendered] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number>(0.707); // Default A4 ratio (1 / 1.414)
  const renderTaskRef = useRef<any>(null);

  // Intersection observer: Wide 2000px window pre-detects pages well before they enter screen
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            if (onVisible) onVisible(pageNumber);
          } else {
            // Only unload if far away from current reading position
            if (Math.abs(pageNumber - currentPage) > 3) {
              setIsVisible(false);
              setIsRendered(false);
            }
          }
        });
      },
      { rootMargin: '2000px 0px' } // Preload 2000px (~2.5 screens) ahead of time
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [pageNumber, currentPage, onVisible]);

  // Keep near pages visible for pre-rendering
  useEffect(() => {
    if (isNearCurrentPage && !isVisible) {
      setIsVisible(true);
    }
  }, [isNearCurrentPage, isVisible]);

  // Render canvas when visible or pre-loading
  useEffect(() => {
    const shouldMount = isVisible || isNearCurrentPage;
    if (!shouldMount || !pdf) {
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
      return;
    }

    let cancelled = false;
    let timerId: any = null;

    const renderPage = async () => {
      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
        }

        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;

        const unscaledViewport = page.getViewport({ scale: 1 });
        const ratio = unscaledViewport.width / unscaledViewport.height;
        setAspectRatio(ratio);

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        // Container width matching viewport
        const maxContainerWidth = Math.min(window.innerWidth - 16, 850);
        const basePageScale = maxContainerWidth / unscaledViewport.width;
        const effectiveScale = basePageScale * scale;

        // Cap DPR to 2.0 to prevent excessive texture memory on low-RAM phones
        const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
        const viewport = page.getViewport({ scale: effectiveScale * dpr });

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
        canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';

        const renderTask = page.render({
          canvasContext: ctx,
          viewport: viewport,
        });
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        if (!cancelled) {
          setIsRendered(true);
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error(`[PDF.js] Page ${pageNumber} render error:`, err);
        }
      }
    };

    // Stagger rendering: Current page renders immediately, upcoming pages (2, 3, 4) render sequentially in background
    const renderDelay = pageNumber === currentPage ? 0 : Math.min(Math.abs(pageNumber - currentPage), 3) * 60;
    timerId = setTimeout(renderPage, renderDelay);

    return () => {
      cancelled = true;
      if (timerId) clearTimeout(timerId);
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [isVisible, isNearCurrentPage, pdf, pageNumber, scale, currentPage]);

  const maxContainerWidth = Math.min(window.innerWidth - 16, 850);
  const placeholderHeight = Math.floor((maxContainerWidth * scale) / aspectRatio);
  const shouldMount = isVisible || isNearCurrentPage;

  return (
    <div
      ref={containerRef}
      id={`pdf-page-${pageNumber}`}
      className="relative mx-auto my-3 bg-white shadow-xl rounded-sm transition-all duration-150 overflow-hidden flex items-center justify-center select-none"
      style={{
        width: `${Math.floor(maxContainerWidth * scale)}px`,
        minHeight: `${placeholderHeight}px`,
        height: shouldMount ? 'auto' : `${placeholderHeight}px`,
      }}
    >
      {shouldMount ? (
        <>
          <canvas ref={canvasRef} className="block select-none" />
          {!isRendered && pageNumber === currentPage && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50/90 z-10">
              <div className="flex items-center gap-2.5 text-gray-500 text-xs font-bold uppercase tracking-wider">
                <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                Page {pageNumber}…
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center text-gray-400 gap-2 select-none py-12">
          <span className="material-symbols-rounded text-3xl opacity-30">description</span>
          <span className="text-xs font-bold uppercase tracking-wider opacity-50">Page {pageNumber}</span>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Main PDF Viewer Screen
// ─────────────────────────────────────────────────────────────────
const PDFViewerScreen: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadStage, setLoadStage] = useState<string>('Downloading Document…');
  const [loadProgress, setLoadProgress] = useState<{ percent: number; loadedMb: string; totalMb: string }>({
    percent: 0,
    loadedMb: '',
    totalMb: '',
  });
  const [loadError, setLoadError] = useState<string | null>(null);

  // Jump-to-page popup modal state
  const [showJumpModal, setShowJumpModal] = useState<boolean>(false);
  const [jumpPageInput, setJumpPageInput] = useState<string>('');

  const fullPdfUrl = getPdfUrl(pdfUrl);
  const fileExt = (pdfUrl || '').toLowerCase().split('?')[0].split('.').pop() || '';
  const isDocx =
    fileExt.startsWith('doc') ||
    (title || '').toLowerCase().endsWith('.docx') ||
    (title || '').toLowerCase().endsWith('.doc');

  const returnTo = location.state?.returnTo || queryParams.get('returnTo');

  const handleExit = useCallback(() => {
    if (window.opener && !window.opener.closed) {
      try {
        window.close();
        return;
      } catch (e) {}
    }

    if (returnTo) {
      navigate(returnTo, { replace: true });
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/courses', { replace: true });
    }
  }, [navigate, returnTo]);

  // Load Document
  const loadDocument = useCallback(async () => {
    if (!fullPdfUrl) {
      setLoadError('Document URL is missing.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);
      setLoadStage('Connecting to document server…');
      setLoadProgress({ percent: 0, loadedMb: '', totalMb: '' });

      // Handle Word DOCX files
      if (isDocx) {
        try {
          const arrayBuffer = await fetchPdfWithProgress(fullPdfUrl);
          const result = await mammoth.convertToHtml({ arrayBuffer });
          setDocxContent(result.value);
          setLoading(false);
        } catch (docxErr) {
          console.warn('Docx loading failed:', docxErr);
          setLoadError('Failed to display Word document.');
          setLoading(false);
        }
        return;
      }

      // Handle PDF files: Download with visible progress feedback
      setLoadStage('Downloading Document…');
      const arrayBuffer = await fetchPdfWithProgress(fullPdfUrl, (loaded, total) => {
        if (total > 0) {
          const pct = Math.min(99, Math.round((loaded / total) * 100));
          setLoadProgress({
            percent: pct,
            loadedMb: (loaded / (1024 * 1024)).toFixed(1),
            totalMb: (total / (1024 * 1024)).toFixed(1),
          });
        } else {
          setLoadProgress({
            percent: 0,
            loadedMb: (loaded / (1024 * 1024)).toFixed(1),
            totalMb: '',
          });
        }
      });

      setLoadStage('Parsing Pages…');
      setLoadProgress((p) => ({ ...p, percent: 100 }));

      // Load PDF into Mozilla PDF.js
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.7.284/cmaps/',
        cMapPacked: true,
        useWorkerFetch: false,
      });

      const loadedPdf = await loadingTask.promise;

      if (loadedPdf && loadedPdf.numPages > 0) {
        setPdfDoc(loadedPdf);
        setTotalPages(loadedPdf.numPages);
        setCurrentPage(1);
        setLoading(false);
      } else {
        throw new Error('Document contains no pages or could not be parsed.');
      }
    } catch (err: any) {
      console.error('[PDFViewer] Load failed:', err);
      setLoadError(err?.message || 'Failed to load document.');
      setLoading(false);
    }
  }, [fullPdfUrl, isDocx]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  // Zoom Handlers
  const handleZoomIn = () => {
    setScale((prev) => Math.min(Number((prev + 0.25).toFixed(2)), 3.0));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(Number((prev - 0.25).toFixed(2)), 0.6));
  };

  const handleResetZoom = () => {
    setScale(1.0);
  };

  // Page Jump Handlers
  const scrollToPage = (pageNum: number) => {
    const target = Math.max(1, Math.min(pageNum, totalPages));
    setCurrentPage(target);
    const el = document.getElementById(`pdf-page-${target}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(jumpPageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      scrollToPage(p);
      setShowJumpModal(false);
      setJumpPageInput('');
    }
  };

  // Hardware-accelerated smooth touch pinch-to-zoom
  const [touchPinchScale, setTouchPinchScale] = useState<number>(1.0);
  const [isPinching, setIsPinching] = useState<boolean>(false);
  const pinchStartDistRef = useRef<number>(0);
  const pinchStartScaleRef = useRef<number>(1.0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartDistRef.current = dist;
      pinchStartScaleRef.current = scale;
      setIsPinching(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && isPinching && pinchStartDistRef.current > 0) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / pinchStartDistRef.current;
      setTouchPinchScale(ratio);
    }
  };

  const handleTouchEnd = () => {
    if (isPinching) {
      setIsPinching(false);
      const newScale = Math.min(Math.max(pinchStartScaleRef.current * touchPinchScale, 0.6), 3.0);
      setScale(Number(newScale.toFixed(2)));
      setTouchPinchScale(1.0);
      pinchStartDistRef.current = 0;
    }
  };

  // Double tap to toggle zoom
  const lastTapRef = useRef<number>(0);
  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      setScale((prev) => (prev > 1.2 ? 1.0 : 1.75));
    }
    lastTapRef.current = now;
  };

  // Keyboard Navigation & Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement;
      const isTyping =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.isContentEditable;
      if (isTyping) return;

      const k = e.key.toLowerCase();
      // Block dev tools, print, and save shortcuts
      if (
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && !e.shiftKey && ['s', 'u', 'p'].includes(k)) ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(k))
      ) {
        e.preventDefault();
        return;
      }

      // Keyboard Zoom & Navigation
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        handleResetZoom();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        scrollToPage(currentPage + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        scrollToPage(currentPage - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, scale]);

  if (!pdfUrl && !location.state) {
    navigate(-1);
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-[#2b2e30] z-[99999] flex flex-col font-outfit h-[100dvh] w-full overflow-hidden select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* ── Top Header ── */}
      <div
        className="bg-zinc-900/95 backdrop-blur-md px-4 pb-2 md:py-3 flex items-center justify-between border-b border-white/10 shadow-lg z-[110] shrink-0 text-white"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 24px)' }}
      >
        <button
          onClick={handleExit}
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/10 text-white hover:bg-white/20 active:scale-95 transition-all z-[120]"
          title="Back"
        >
          <span className="material-symbols-rounded text-[20px]">arrow_back</span>
        </button>

        <div className="flex-1 px-3 text-center min-w-0">
          <h1 className="text-[12px] sm:text-sm font-black truncate text-white leading-tight uppercase tracking-tight">
            {title}
          </h1>
          <div className="flex items-center justify-center gap-2 mt-0.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isDocx ? 'bg-blue-400' : 'bg-green-400'}`} />
            <p className="text-[9px] sm:text-[10px] text-white/50 font-bold uppercase tracking-widest leading-none">
              {isDocx ? 'Word Document' : 'Verified Secure PDF'} • {subject}
            </p>
          </div>
        </div>

        <button
          onClick={handleExit}
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-500/20 text-red-400 hover:bg-red-500/30 active:scale-95 transition-all z-[120]"
          title="Close"
        >
          <span className="material-symbols-rounded text-[20px]">close</span>
        </button>
      </div>

      {/* ── Document Canvas Scroll Viewport ── */}
      <div
        ref={scrollContainerRef}
        className="flex-1 relative bg-[#2b2e30] overflow-y-auto overflow-x-auto min-h-0 custom-scrollbar p-2 sm:p-4"
        style={{
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x pan-y pinch-zoom',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleDoubleTap}
      >
        {/* Loading Spinner with Real Progress Counter */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#2b2e30] z-[101] px-6">
            <div className="relative w-14 h-14">
              <div className="absolute inset-0 border-4 border-white/10 rounded-full" />
              <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin" />
            </div>

            <div className="text-center max-w-xs">
              <p className="text-xs font-black text-white/90 uppercase tracking-[0.2em] mb-1">
                {loadStage}
              </p>
              {loadProgress.percent > 0 && (
                <div className="w-52 mx-auto mt-3">
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-150"
                      style={{ width: `${loadProgress.percent}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-white/50 font-bold mt-1.5">
                    {loadProgress.percent}% {loadProgress.loadedMb ? `(${loadProgress.loadedMb}MB / ${loadProgress.totalMb}MB)` : ''}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Load Error State with Retry & Direct Open */}
        {loadError && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-white h-full max-w-md mx-auto">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-4">
              <span className="material-symbols-rounded text-3xl text-red-400">error</span>
            </div>
            <h2 className="text-base font-bold text-white mb-2">Unable to Load Document</h2>
            <p className="text-xs text-white/60 mb-6 leading-relaxed">
              {loadError || 'Please check your internet connection and try reloading the document.'}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={loadDocument}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-600/30"
              >
                Retry
              </button>
              {fullPdfUrl && (
                <button
                  onClick={() => window.open(fullPdfUrl, '_system')}
                  className="px-5 py-2.5 bg-white/10 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-white/20 active:scale-95 transition-all"
                >
                  Open in Browser
                </button>
              )}
            </div>
          </div>
        )}

        {/* Word Document HTML View */}
        {isDocx && docxContent && (
          <div className="w-full max-w-4xl mx-auto bg-white shadow-2xl rounded-lg p-6 sm:p-16 mb-24 overflow-x-hidden text-gray-900">
            <div
              className="prose prose-slate max-w-none leading-relaxed font-outfit"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(docxContent) }}
            />
          </div>
        )}

        {/* Multi-Page Virtualized PDF Canvas View with GPU Pinch Transform */}
        {!isDocx && pdfDoc && totalPages > 0 && (
          <div
            className="flex flex-col items-center pb-28 pt-2"
            style={{
              transform: isPinching ? `scale(${touchPinchScale})` : 'none',
              transformOrigin: 'center top',
              transition: isPinching ? 'none' : 'transform 0.15s ease-out',
            }}
          >
            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
              <PdfPage
                key={pageNum}
                pdf={pdfDoc}
                pageNumber={pageNum}
                scale={scale}
                currentPage={currentPage}
                onVisible={(page) => setCurrentPage(page)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Quick Jump to Page Modal ── */}
      {showJumpModal && (
        <div
          className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowJumpModal(false)}
        >
          <div
            className="bg-zinc-900 border border-white/15 p-5 rounded-2xl w-full max-w-xs shadow-2xl text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold mb-1">Jump to Page</h3>
            <p className="text-[11px] text-white/50 mb-4">Enter page number (1 to {totalPages}):</p>
            <form onSubmit={handleJumpSubmit} className="flex gap-2">
              <input
                autoFocus
                type="number"
                min="1"
                max={totalPages}
                value={jumpPageInput}
                onChange={(e) => setJumpPageInput(e.target.value)}
                placeholder={`1 - ${totalPages}`}
                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-blue-500 text-center font-bold"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-blue-700 active:scale-95 transition-all"
              >
                Go
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Floating Bottom Navigation & Zoom Toolbar ── */}
      {!loading && !loadError && !isDocx && totalPages > 0 && (
        <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-[120] pointer-events-auto">
          <div className="bg-zinc-950/90 text-white backdrop-blur-xl border border-white/15 px-3 sm:px-4 py-2 rounded-full shadow-[0_10px_35px_rgba(0,0,0,0.6)] flex items-center gap-1.5 sm:gap-2.5 animate-slide-up">
            {/* Previous Page */}
            <button
              onClick={() => scrollToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 active:scale-90 disabled:opacity-30 disabled:pointer-events-none transition-all"
              title="Previous Page"
            >
              <span className="material-symbols-rounded text-lg">chevron_left</span>
            </button>

            {/* Clickable Page Counter for Quick Jump */}
            <button
              onClick={() => {
                setJumpPageInput(String(currentPage));
                setShowJumpModal(true);
              }}
              className="text-[11px] sm:text-xs font-bold text-white/90 px-1.5 py-0.5 rounded-md hover:bg-white/10 active:scale-95 transition-all whitespace-nowrap"
              title="Click to Jump to Page"
            >
              {currentPage} <span className="opacity-40 font-normal">/</span> {totalPages}
            </button>

            {/* Next Page */}
            <button
              onClick={() => scrollToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 active:scale-90 disabled:opacity-30 disabled:pointer-events-none transition-all"
              title="Next Page"
            >
              <span className="material-symbols-rounded text-lg">chevron_right</span>
            </button>

            <div className="w-[1px] h-4 bg-white/20 mx-1" />

            {/* Zoom Out */}
            <button
              onClick={handleZoomOut}
              disabled={scale <= 0.6}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 active:scale-90 disabled:opacity-30 disabled:pointer-events-none transition-all"
              title="Zoom Out"
            >
              <span className="material-symbols-rounded text-lg">remove</span>
            </button>

            {/* Zoom Percentage / Reset to Fit */}
            <button
              onClick={handleResetZoom}
              className="text-[11px] sm:text-xs font-bold text-blue-400 px-1.5 py-0.5 rounded-md hover:bg-white/10 active:scale-95 transition-all whitespace-nowrap"
              title="Reset Zoom (Fit to Screen)"
            >
              {Math.round(scale * 100)}%
            </button>

            {/* Zoom In */}
            <button
              onClick={handleZoomIn}
              disabled={scale >= 3.0}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 active:scale-90 disabled:opacity-30 disabled:pointer-events-none transition-all"
              title="Zoom In"
            >
              <span className="material-symbols-rounded text-lg">add</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFViewerScreen;
