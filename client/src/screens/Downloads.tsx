import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentSidebar from '../components/StudentSidebar';
import FileViewer from '../components/FileViewer';

const Downloads: React.FC = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [student, setStudent] = useState<any>(null);
  const [downloads, setDownloads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (!msg.includes('Downloading')) {
      setTimeout(() => setToastMsg(''), 3000);
    }
  };

  useEffect(() => {
    const storedStudent = localStorage.getItem('studentData');
    if (storedStudent) {
      const studentData = JSON.parse(storedStudent);
      setStudent(studentData);
      fetchDownloads(studentData.id);
    } else {
      navigate('/student-login');
    }
  }, []);

  const fetchDownloads = async (studentId: string) => {
    try {
      const response = await fetch(`/api/students/${studentId}/downloads`);
      const data = await response.json();
      setDownloads(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching downloads:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'video': return 'play_circle';
      case 'pdf': return 'picture_as_pdf';
      case 'audio': return 'headphones';
      case 'image': return 'image';
      default: return 'description';
    }
  };

  const getFileColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'video': return 'bg-red-100 text-red-600';
      case 'pdf': return 'bg-orange-100 text-orange-600';
      case 'audio': return 'bg-purple-100 text-purple-600';
      case 'image': return 'bg-blue-100 text-blue-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const deleteDownload = async (downloadId: string) => {
    if (!confirm('Are you sure you want to delete this download?')) return;

    // Proactively remove from UI
    const originalDownloads = [...downloads];
    setDownloads(prev => prev.filter(d => {
      const dId = d.id?.toString() || d._id?.toString();
      return dId !== downloadId.toString();
    }));

    try {
      const response = await fetch(`/api/students/${student.id}/downloads/${downloadId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Deletion failed on server');
      }

      showToast('Deleted successfully');

      if (selectedFile) {
        const selId = selectedFile.id?.toString() || selectedFile._id?.toString();
        if (selId === downloadId.toString()) setSelectedFile(null);
      }

      // Background refresh to sync with server
      fetchDownloads(student.id || student._id);
    } catch (error) {
      console.error('Error deleting download:', error);
      showToast('Error deleting download');
      // Rollback on error
      setDownloads(originalDownloads);
    }
  };

  const filteredDownloads = downloads.filter(item => {
    const matchesType = filterType === 'all' || item.type?.toLowerCase() === filterType.toLowerCase();
    const matchesSearch = searchQuery === '' || item.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} student={student} />

      {/* Header */}
      <header className="bg-gradient-to-r from-brandBlue to-[#1A237E] text-white pt-8 pb-6 px-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-full hover:bg-white/20">
              <span className="material-symbols-rounded">menu</span>
            </button>
            <div>
              <h1 className="text-2xl font-black">Downloads</h1>
              <p className="text-white/70 text-xs mt-1">Access your saved study materials</p>
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        {downloads.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-[250px]">
              <input
                type="text"
                placeholder="Search downloads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/20 border border-white/30 rounded-lg px-4 py-2 text-white placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-white/20 border border-white/30 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <option value="all" className="text-gray-800">All Files</option>
              <option value="video" className="text-gray-800">Videos</option>
              <option value="pdf" className="text-gray-800">PDFs</option>
              <option value="audio" className="text-gray-800">Audio</option>
              <option value="image" className="text-gray-800">Images</option>
            </select>
          </div>
        )}
      </header>

      {/* Content */}
      <div className="p-4 max-w-4xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="text-center">
              <span className="material-symbols-rounded animate-spin text-5xl text-brandBlue mb-4 block">progress_activity</span>
              <p className="text-gray-500 font-medium">Loading downloads...</p>
            </div>
          </div>
        ) : filteredDownloads.length > 0 ? (
          <div className="space-y-3">
            {filteredDownloads.map((item) => (
              <div
                key={item.id || item._id || Math.random()}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-brandBlue transition-all flex items-center gap-4 group"
              >
                {/* File Icon */}
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${getFileColor(item.type)} group-hover:scale-110 transition-transform`}>
                  <span className="material-symbols-rounded text-2xl">{getFileIcon(item.type)}</span>
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-gray-800 truncate group-hover:text-brandBlue">{item.title}</h4>
                  <div className="flex gap-3 mt-2 text-[11px] text-gray-500">
                    <span className="bg-gray-100 px-2 py-1 rounded capitalize font-medium">{item.type || 'File'}</span>
                    {item.size && <span>{item.size}</span>}
                    {item.downloadedAt && <span>{new Date(item.downloadedAt).toLocaleDateString()}</span>}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setSelectedFile(item)}
                    className="p-2.5 bg-brandBlue text-white rounded-lg hover:opacity-90 transition-all"
                    title="Open in viewer"
                  >
                    <span className="material-symbols-rounded text-lg">play_circle</span>
                  </button>
                  <button
                    onClick={async () => {
                      if (!item.fileUrl) return;
                      setDownloadingId(item._id || item.id);
                      showToast('Downloading...');
                      try {
                        const cache = await caches.open('aone-downloads');
                        try {
                          const response = await fetch(item.fileUrl, { mode: 'cors' });
                          if (response.ok) await cache.put(item.fileUrl, response);
                          else {
                            const opaque = await fetch(item.fileUrl, { mode: 'no-cors' });
                            await cache.put(item.fileUrl, opaque);
                          }
                        } catch (e) {
                          const opaque = await fetch(item.fileUrl, { mode: 'no-cors' });
                          await cache.put(item.fileUrl, opaque);
                        }
                        showToast('File saved to app offline cache!');
                      } catch (e) {
                        console.error('Download error:', e);
                        showToast('Error saving file offline.');
                      } finally {
                        setDownloadingId(null);
                      }
                    }}
                    className="p-2.5 bg-blue-50 text-brandBlue rounded-lg hover:bg-blue-100 transition-all disabled:opacity-50"
                    title="Save to App Offline"
                    disabled={downloadingId === (item._id || item.id)}
                  >
                    {downloadingId === (item._id || item.id) ? (
                      <span className="material-symbols-rounded text-lg animate-spin text-brandBlue">progress_activity</span>
                    ) : (
                      <span className="material-symbols-rounded text-lg">download</span>
                    )}
                  </button>
                  <button
                    onClick={() => deleteDownload(item.id || item._id)}
                    className="p-2.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-all"
                    title="Delete"
                  >
                    <span className="material-symbols-rounded text-lg">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm border-2 border-dashed border-gray-200">
            <span className="material-symbols-rounded text-6xl text-gray-300 block mb-4">download</span>
            <p className="text-base font-bold text-gray-600 mb-2">
              {downloads.length === 0 ? 'No downloads yet' : 'No downloads matching your search'}
            </p>
            <p className="text-sm text-gray-400">
              {downloads.length === 0
                ? 'Downloaded videos, PDFs, and notes will appear here'
                : 'Try adjusting your search or filter'}
            </p>
          </div>
        )}
      </div>
      {/* File Viewer Modal */}
      <FileViewer file={selectedFile} onClose={() => setSelectedFile(null)} />

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#1E293B] text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-3 z-50 animate-fade-in-up">
          {toastMsg.includes('Error') || toastMsg.includes('Failed') ? (
            <span className="material-symbols-rounded text-red-400 text-lg border-2 border-red-400 rounded-full p-0.5">close</span>
          ) : toastMsg.includes('Downloading') ? (
            <span className="material-symbols-rounded text-brandBlue animate-spin text-xl">progress_activity</span>
          ) : (
            <span className="material-symbols-rounded text-green-400 text-xl">check_circle</span>
          )}
          <span className="text-sm font-bold tracking-wide">{toastMsg}</span>
        </div>
      )}
    </div>
  );
};

export default Downloads;
