import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentSidebar from '../components/StudentSidebar';
import { getPdfUrl } from '../lib/utils';

const EbookNotes: React.FC = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [student, setStudent] = useState<any>(null);
  const [ebooks, setEbooks] = useState<any[]>([]);
  const [examDocs, setExamDocs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [dbSubjects, setDbSubjects] = useState<any[]>([]);
  const [toastMsg, setToastMsg] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      const [ebooksRes, docsRes, subjectsRes] = await Promise.all([
        fetch('/api/ebooks').then(r => r.json()),
        fetch('/api/exam-documents').then(r => r.json()),
        fetch('/api/subjects').then(r => r.json())
      ]);
      setEbooks(Array.isArray(ebooksRes) ? ebooksRes.filter((e: any) => !e.isFree) : []);
      setExamDocs(Array.isArray(docsRes) ? docsRes.filter((d: any) => d.status === 'active' && !d.isFree).sort((a: any, b: any) => {
        const aOrder = typeof a.order === 'number' ? a.order : Infinity;
        const bOrder = typeof b.order === 'number' ? b.order : Infinity;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return String(a._id || '').localeCompare(String(b._id || ''));
      }) : []);
      setDbSubjects(Array.isArray(subjectsRes) ? subjectsRes : []);
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
    const itemSubj = String(item.subject || '').trim().toLowerCase();
    const activeTabLower = String(activeTab || 'all').trim().toLowerCase();
    
    if (activeTabLower === 'all') return true;
    if (activeTabLower === 'exam') return item.type === 'examdoc';
    return itemSubj === activeTabLower || itemSubj === activeTabLower.replace(/ /g, '_');
  });

  const getSubjectIcon = (item: any) => {
    if (item.type === 'examdoc') return 'assignment';
    // Find subject from dbSubjects to get its icon
    const subj = dbSubjects.find(s => 
      s.id === item.subject || 
      String(s.name || "").trim().toLowerCase() === String(item.subject || "").trim().toLowerCase()
    );
    return subj?.icon || 'menu_book';
  };

  const getSubjectColor = (item: any) => {
    if (item.type === 'examdoc') return 'from-teal-600 to-teal-800';
    const subj = dbSubjects.find(s => 
      s.id === item.subject || 
      String(s.name || "").trim().toLowerCase() === String(item.subject || "").trim().toLowerCase()
    );
    if (subj?.gradient) return subj.gradient;
    
    // Safety switch for common subjects if gradient is missing in DB
    switch (String(item.subject || "").trim().toLowerCase()) {
      case 'physics': return 'from-blue-500 to-blue-700';
      case 'chemistry': return 'from-green-500 to-green-700';
      case 'biology': return 'from-orange-500 to-orange-700';
      default: return 'from-purple-500 to-purple-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} student={student} />

      <header className="bg-gradient-to-r from-teal-600 to-[#00695C] text-white pt-8 pb-6 px-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/20">
            <span className="material-symbols-rounded">arrow_back</span>
          </button>
          <h1 className="text-lg font-bold">Study Materials</h1>
        </div>
      </header>

      <div className="p-4">
        <div className="flex bg-gray-100 rounded-xl p-1 mb-6 overflow-x-auto hide-scrollbar">
          {[
            { id: 'all', label: 'All' },
            ...dbSubjects.slice(0, 10).map(s => ({ id: s.id || s.name?.toLowerCase(), label: s.name })),
            { id: 'exam', label: 'Exam Docs' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id || 'all')}
              className={`flex-1 py-2 px-4 rounded-lg font-bold text-[11px] whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500'
                }`}
            >
              {tab.label}
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
                <div className={`h-24 bg-gradient-to-br ${getSubjectColor(item)} flex items-center justify-center`}>
                  <span className="material-symbols-rounded text-white text-4xl">{getSubjectIcon(item)}</span>
                </div>
                <div className="p-3">
                  <div className="flex justify-between items-start gap-1">
                    <h4 className="font-bold text-xs line-clamp-2 flex-1">{item.title}</h4>
                    {item.type === 'examdoc' && <span className="text-[8px] bg-teal-100 text-teal-700 px-1 rounded font-black uppercase">DOC</span>}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">{item.type === 'ebook' ? `${item.pages || 0} pages` : (item.exam || 'General')}</p>
                  <div className="flex gap-2 mt-3">
                    <button
                      className="flex-1 bg-teal-600 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                      onClick={() => {
                        const pdfUrl = getPdfUrl(item.fileUrl);
                        if (pdfUrl) {
                          navigate('/pdf-viewer', { state: { pdf: { ...item, fileUrl: pdfUrl }, title: item.title || 'Material' } });
                        }
                      }}
                    >
                      <span className="material-symbols-rounded text-sm">visibility</span>
                      View Content
                    </button>
                    {/* Download button removed as per requirements */}
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
