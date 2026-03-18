import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentSidebar from '../components/StudentSidebar';

const EbookNotes: React.FC = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [student, setStudent] = useState<any>(null);
  const [ebooks, setEbooks] = useState<any[]>([]);
  const [examDocs, setExamDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
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
      loadData();
    } else {
      navigate('/student-login');
    }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ebooksRes, docsRes] = await Promise.all([
        fetch('/api/ebooks').then(r => r.json()),
        fetch('/api/exam-documents').then(r => r.json())
      ]);
      setEbooks(Array.isArray(ebooksRes) ? ebooksRes.filter((e: any) => !e.isFree) : []);
      setExamDocs(Array.isArray(docsRes) ? docsRes.filter((d: any) => d.status === 'active' && !d.isFree) : []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const allItems = [
    ...ebooks.map(e => ({ ...e, type: 'ebook' })),
    ...examDocs.map(d => ({ ...d, type: 'examdoc', subject: 'exam' }))
  ];

  const filteredItems = allItems.filter(item => {
    if (activeTab === 'all') return true;
    if (activeTab === 'exam') return item.type === 'examdoc';
    return item.subject?.toLowerCase() === activeTab;
  });

  const getSubjectIcon = (subject: string) => {
    switch (subject?.toLowerCase()) {
      case 'physics': return 'bolt';
      case 'chemistry': return 'science';
      case 'biology': return 'biotech';
      case 'exam': return 'assignment';
      default: return 'menu_book';
    }
  };

  const getSubjectColor = (subject: string) => {
    switch (subject?.toLowerCase()) {
      case 'physics': return 'from-blue-500 to-blue-700';
      case 'chemistry': return 'from-green-500 to-green-700';
      case 'biology': return 'from-orange-500 to-orange-700';
      case 'exam': return 'from-teal-600 to-teal-800';
      default: return 'from-purple-500 to-purple-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} student={student} />

      <header className="bg-gradient-to-r from-teal-600 to-[#00695C] text-white pt-8 pb-6 px-4">
        <div className="flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-full hover:bg-white/20">
            <span className="material-symbols-rounded">menu</span>
          </button>
          <h1 className="text-lg font-bold">Study Materials</h1>
        </div>
      </header>

      <div className="p-4">
        <div className="flex bg-gray-100 rounded-xl p-1 mb-6 overflow-x-auto">
          {['all', 'physics', 'chemistry', 'biology', 'exam'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs whitespace-nowrap transition-all ${activeTab === tab ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500'
                }`}
            >
              {tab === 'exam' ? 'Exam Docs' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <span className="material-symbols-rounded animate-spin text-4xl text-teal-600">progress_activity</span>
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {filteredItems.map((item, idx) => (
              <div key={idx} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className={`h-24 bg-gradient-to-br ${getSubjectColor(item.subject)} flex items-center justify-center`}>
                  <span className="material-symbols-rounded text-white text-4xl">{getSubjectIcon(item.subject)}</span>
                </div>
                <div className="p-3">
                  <div className="flex justify-between items-start gap-1">
                    <h4 className="font-bold text-xs line-clamp-2 flex-1">{item.title}</h4>
                    {item.type === 'examdoc' && <span className="text-[8px] bg-teal-100 text-teal-700 px-1 rounded font-black uppercase">DOC</span>}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">{item.type === 'ebook' ? `${item.pages || 0} pages` : (item.exam || 'General')}</p>
                  <div className="flex gap-2 mt-3">
                    <button
                      className="flex-1 bg-teal-600 text-white py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1"
                      onClick={() => item.fileUrl && window.open(item.fileUrl, '_blank')}
                    >
                      <span className="material-symbols-rounded text-sm">visibility</span>
                      View
                    </button>
                    {item.allowDownload && (
                      <button
                        onClick={async () => {
                          if (!student?.id) {
                            showToast('Please login to download');
                            return;
                          }
                          if (!item.fileUrl) {
                            showToast('Error: No file URL available to download');
                            return;
                          }

                          setDownloadingId(item._id || item.id);
                          showToast('Downloading...');

                          try {
                            // 1. App Cache
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

                            // 2. DB Metadata
                            const downloadData = {
                              id: `download_${Date.now()}`,
                              title: item.title,
                              type: item.type === 'ebook' ? 'pdf' : 'pdf',
                              fileUrl: item.fileUrl,
                              size: item.pages ? `${item.pages} pages` : 'N/A',
                              courseId: 'ebook-general',
                              courseName: 'Study Materials',
                              downloadedAt: new Date().toISOString()
                            };

                            const dbRes = await fetch(`/api/students/${student.id}/downloads`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(downloadData)
                            });

                            if (dbRes.ok) {
                              showToast('Successfully downloaded to app library!');
                            } else {
                              showToast('Error: Failed to sync metadata.');
                            }
                          } catch (e) {
                            console.error('Download error:', e);
                            showToast('Error saving file offline.');
                          } finally {
                            setDownloadingId(null);
                          }
                        }}
                        className="px-3 bg-gray-100 text-gray-600 py-1.5 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-50"
                        title="Save to Offline App Downloads"
                        disabled={downloadingId === (item._id || item.id)}
                      >
                        {downloadingId === (item._id || item.id) ? (
                          <span className="material-symbols-rounded text-sm animate-spin text-teal-600">progress_activity</span>
                        ) : (
                          <span className="material-symbols-rounded text-sm">download</span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm">
            <span className="material-symbols-rounded text-6xl text-gray-300">menu_book</span>
            <p className="text-sm text-gray-400 mt-4">No materials available</p>
            <p className="text-[10px] text-gray-300 mt-1">Check back later for study materials</p>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {
        toastMsg && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#1E293B] text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-3 z-50 animate-fade-in-up">
            {toastMsg.includes('Error') || toastMsg.includes('Failed') ? (
              <span className="material-symbols-rounded text-red-400 text-lg border-2 border-red-400 rounded-full p-0.5">close</span>
            ) : toastMsg.includes('Downloading') ? (
              <span className="material-symbols-rounded text-teal-400 animate-spin text-xl">progress_activity</span>
            ) : (
              <span className="material-symbols-rounded text-green-400 text-xl">check_circle</span>
            )}
            <span className="text-sm font-bold tracking-wide">{toastMsg}</span>
          </div>
        )
      }
    </div >
  );
};

export default EbookNotes;
