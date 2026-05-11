import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker using the same CDN as existing testParser.ts
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || "5.5.207"}/build/pdf.worker.min.mjs`;

interface PdfRendererProps {
  url: string;
  title?: string;
  onLoadSuccess?: (numPages: number) => void;
  onLoadError?: (error: Error) => void;
}

const PdfRenderer: React.FC<PdfRendererProps> = ({ url, title, onLoadSuccess, onLoadError }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1.5);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load PDF Document
  useEffect(() => {
    let isCancelled = false;
    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch the PDF (proxy URL is expected)
        const loadingTask = pdfjsLib.getDocument({
          url,
          withCredentials: true, // Important for proxy auth cookies
        });
        
        const doc = await loadingTask.promise;
        if (isCancelled) return;
        
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setLoading(false);
        if (onLoadSuccess) onLoadSuccess(doc.numPages);
      } catch (err: any) {
        if (isCancelled) return;
        console.error('PDF Loading Error:', err);
        setError(err.message || 'Failed to load PDF');
        setLoading(false);
        if (onLoadError) onLoadError(err);
      }
    };

    loadPdf();
    return () => {
      isCancelled = true;
    };
  }, [url]);

  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 bg-gray-50/50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Loading Document Pages...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-red-50">
        <span className="material-symbols-rounded text-4xl text-red-600 mb-4">error</span>
        <h3 className="text-lg font-bold text-red-900 mb-2">Failed to load PDF</h3>
        <p className="text-sm text-red-600 max-w-md">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2 bg-red-600 text-white rounded-xl font-bold text-sm uppercase tracking-wider"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#525659] overflow-hidden relative">
      {/* Floating Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 bg-black/80 backdrop-blur-xl p-2 rounded-2xl border border-white/10 shadow-2xl transition-all hover:scale-105">
        <button onClick={zoomOut} className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-xl">
          <span className="material-symbols-rounded">zoom_out</span>
        </button>
        <div className="px-3 border-x border-white/10">
          <p className="text-[10px] font-black text-white uppercase tracking-widest">{Math.round(scale * 100)}%</p>
        </div>
        <button onClick={zoomIn} className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-xl">
          <span className="material-symbols-rounded">zoom_in</span>
        </button>
      </div>

      {/* Pages Container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center gap-4 scroll-smooth"
      >
        {Array.from({ length: numPages }, (_, i) => (
          <PdfPage 
            key={i + 1}
            pageNumber={i + 1}
            pdfDoc={pdfDoc!}
            scale={scale}
          />
        ))}
      </div>
    </div>
  );
};

interface PdfPageProps {
  pageNumber: number;
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  scale: number;
}

const PdfPage: React.FC<PdfPageProps> = ({ pageNumber, pdfDoc, scale }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [rendered, setRendered] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

  // Intersection Observer to only render visible pages
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    if (pageRef.current) {
      observer.observe(pageRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Render Page to Canvas
  useEffect(() => {
    if (!isVisible || !canvasRef.current || !pdfDoc || rendered) return;

    let renderTask: pdfjsLib.RenderTask | null = null;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d')!;

        // Adjust for high-DPI displays
        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = Math.floor(viewport.width) + "px";
        canvas.style.height = Math.floor(viewport.height) + "px";

        const transform = outputScale !== 1 
          ? [outputScale, 0, 0, outputScale, 0, 0] 
          : undefined;

        renderTask = page.render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas,
          transform
        });


        await renderTask.promise;
        setRendered(true);
      } catch (err: any) {
        if (err.name === 'RenderingCancelledException') return;
        console.error(`Error rendering page ${pageNumber}:`, err);
      }
    };

    renderPage();

    return () => {
      if (renderTask) renderTask.cancel();
    };
  }, [isVisible, pdfDoc, pageNumber, scale]);

  // Reset rendered state if scale changes
  useEffect(() => {
    setRendered(false);
  }, [scale]);

  return (
    <div 
      ref={pageRef}
      className="bg-white shadow-[0_10px_30px_rgba(0,0,0,0.2)] rounded-sm overflow-hidden transition-all duration-500"
      style={{ 
        minHeight: !rendered ? '500px' : 'auto',
        width: 'fit-content'
      }}
    >
      <canvas ref={canvasRef} className="block" />
      {!rendered && isVisible && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

export default PdfRenderer;
