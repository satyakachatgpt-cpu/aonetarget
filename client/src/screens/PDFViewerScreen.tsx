import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PDFViewerScreen: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { pdf, title } = location.state || {};

  if (!pdf) {
    navigate(-1);
    return null;
  }

  const pdfUrl = pdf.fileUrl || pdf.url || pdf.link || '';
  const isPlaceholder = pdfUrl.includes('placeholder.com');

  return (
    <div className="fixed inset-0 bg-[#F8F9FE] z-[9999] flex flex-col font-outfit">
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center justify-between border-b border-gray-100 shadow-sm">
        <button 
          onClick={() => navigate(-1)} 
          className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-50 text-gray-800 active:scale-95 transition-all"
        >
          <span className="material-symbols-rounded">arrow_back</span>
        </button>
        <div className="flex-1 px-4 text-center">
          <h1 className="text-sm font-black truncate text-gray-800">{title || pdf.title || 'Document'}</h1>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{pdf.subject || 'Material'}</p>
        </div>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Viewer */}
      <div className="flex-1 relative bg-gray-100">
        {isPlaceholder ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
              <span className="material-symbols-rounded text-red-500 text-4xl italic">error</span>
            </div>
            <h3 className="text-lg font-black text-gray-800 mb-2">Data Missing</h3>
            <p className="text-sm text-gray-500 max-w-xs">
              This document was uploaded with a placeholder. Please re-upload it from the Admin Panel.
            </p>
          </div>
        ) : (
          <iframe
            src={`${pdfUrl}#toolbar=0`}
            className="w-full h-full border-none"
            title={title || pdf.title}
          />
        )}
      </div>

      {/* Footer / Controls */}
      <div className="bg-white px-8 py-6 border-t border-gray-100">
        <button 
          onClick={() => navigate(-1)}
          className="w-full bg-navy text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-navy/20 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-rounded text-lg">close</span>
          Close Viewer
        </button>
      </div>
    </div>
  );
};

export default PDFViewerScreen;
