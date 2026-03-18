import React, { useState } from 'react';

interface FileViewerProps {
  file: {
    id?: string;
    title: string;
    type: string;
    fileUrl: string;
    size?: string;
    downloadedAt?: string;
  } | null;
  onClose: () => void;
}

const FileViewer: React.FC<FileViewerProps> = ({ file, onClose }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!file) return null;

  const getFileTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'video':
        return 'play_circle';
      case 'pdf':
        return 'picture_as_pdf';
      case 'audio':
        return 'headphones';
      case 'image':
        return 'image';
      default:
        return 'description';
    }
  };

  const getFileTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'video':
        return 'bg-red-100 text-red-600';
      case 'pdf':
        return 'bg-orange-100 text-orange-600';
      case 'audio':
        return 'bg-purple-100 text-purple-600';
      case 'image':
        return 'bg-blue-100 text-blue-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const renderFileContent = () => {
    const type = file.type?.toLowerCase();

    if (type === 'video') {
      return (
        <div className={`w-full bg-black relative group flex items-center justify-center ${isFullscreen ? 'h-full' : 'aspect-video rounded-xl overflow-hidden'}`}>
          <video
            controls
            autoPlay
            className="w-full h-full max-h-full object-contain"
            src={file.fileUrl}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    if (type === 'pdf') {
      return (
        <div className={`w-full bg-white relative group ${isFullscreen ? 'h-full' : 'h-[600px] rounded-xl overflow-hidden'}`}>
          <iframe
            src={`${file.fileUrl}#toolbar=1&navpanes=0`}
            className="w-full h-full border-none"
            title={file.title}
          />
        </div>
      );
    }

    if (type === 'audio') {
      return (
        <div className="w-full h-full flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-2xl bg-gradient-to-br from-[#1A237E] to-[#303F9F] rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/10 rounded-full -ml-12 -mb-12 blur-xl"></div>

            <div className="relative z-10">
              <div className="flex items-center justify-center mb-8">
                <div className="w-28 h-28 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 animate-pulse-slow shadow-2xl">
                  <span className="material-symbols-rounded text-6xl text-white">headphones</span>
                </div>
              </div>
              <h3 className="text-xl font-bold text-center mb-6 tracking-tight">{file.title}</h3>
              <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
                <audio controls className="w-full custom-audio" src={file.fileUrl}>
                  Your browser does not support the audio element.
                </audio>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (type === 'image') {
      return (
        <div className={`w-full flex items-center justify-center bg-gray-50 relative group ${isFullscreen ? 'h-full' : 'max-h-[70vh]'}`}>
          <img
            src={file.fileUrl}
            alt={file.title}
            className="max-w-full max-h-full object-contain transition-all duration-300"
          />
        </div>
      );
    }

    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-100 shadow-inner max-w-md">
          <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-rounded text-5xl text-gray-300">description</span>
          </div>
          <h3 className="font-bold text-xl text-gray-800 mb-2">{file.title}</h3>
          <p className="text-gray-400 text-sm mb-8">This file format is not supported for direct preview.</p>
          <a
            href={file.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-[#1A237E] text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:shadow-xl active:scale-95 transition-all shadow-lg"
          >
            <span className="material-symbols-rounded text-lg">open_in_new</span>
            Open in Browser
          </a>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`fixed inset-0 bg-[#1A237E]/40 backdrop-blur-2xl z-[100] flex items-center justify-center transition-all duration-500 animate-fade-in ${isFullscreen ? 'p-0' : 'p-2 sm:p-6'}`}
      onClick={onClose}
    >
      <div
        className={`bg-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden transition-all duration-500 animate-scale-in ${isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-5xl h-[90vh] rounded-[2.5rem]'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modern Minimal Header */}
        <div className="bg-white px-8 py-5 flex items-center justify-between shrink-0 border-b border-gray-100">
          <div className="flex items-center gap-4 min-w-0">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${getFileTypeColor(file.type)}`}>
              <span className="material-symbols-rounded text-2xl">{getFileTypeIcon(file.type)}</span>
            </div>
            <div className="min-w-0">
              <h2 className="font-black text-gray-800 text-sm truncate uppercase tracking-tight">{file.title}</h2>
              <div className="flex items-center gap-2 mt-0.5 opacity-60">
                <span className="text-[10px] font-bold uppercase tracking-widest">{file.type} • {file.size || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="w-11 h-11 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center hover:bg-brandBlue hover:text-white transition-all shadow-sm hidden sm:flex"
            >
              <span className="material-symbols-rounded text-[20px]">{isFullscreen ? 'fullscreen_exit' : 'fullscreen'}</span>
            </button>
            <div className="w-px h-8 bg-gray-100 mx-1 hidden sm:block"></div>
            <button
              onClick={onClose}
              className="px-8 py-3.5 bg-brandBlue text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] shadow-lg shadow-brandBlue/20 hover:shadow-xl active:scale-95 transition-all"
            >
              Close
            </button>
          </div>
        </div>

        {/* Content Area - Immersive Full Bleed */}
        <div className="flex-1 overflow-hidden bg-gray-50/50">
          <div className="h-full w-full">
            {renderFileContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileViewer;
