import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import StudentSidebar from '../components/StudentSidebar';
import { testsAPI, testSeriesAPI, coursesAPI, getAuthHeaders } from '../services/apiClient';
import { getImageUrl, getVideoUrl, getPdfUrl, getYouTubeThumbnail, toYouTubeEmbed, isYouTubeUrl } from '../lib/utils';
import { API_BASE_URL } from '../services/apiClient';

const FreeContent: React.FC = () => {
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [student, setStudent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'all' | 'videos' | 'tests' | 'notes'>('all');
    const [activeSubject, setActiveSubject] = useState('All Subjects');
    const [subjects, setSubjects] = useState<any[]>([]);

    const [freeCourses, setFreeCourses] = useState<any[]>([]);
    const [freeVideos, setFreeVideos] = useState<any[]>([]);
    const [freeTests, setFreeTests] = useState<any[]>([]);
    const [freeSubjectiveTests, setFreeSubjectiveTests] = useState<any[]>([]);
    const [freeTestSeries, setFreeTestSeries] = useState<any[]>([]);
    const [freeNotes, setFreeNotes] = useState<any[]>([]);
    const [examDocs, setExamDocs] = useState<any[]>([]);


    useEffect(() => {
        const storedStudent = localStorage.getItem('studentData');
        if (storedStudent) {
            setStudent(JSON.parse(storedStudent));
        }
        fetchFreeContent();
    }, []);


    const fetchFreeContent = async () => {
        try {
            setLoading(true);




            const [coursesRes, testsRes, subjTestsRes, seriesRes, ebooksRes, docsRes, videosRes, pdfsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/courses?isFree=true&t=${Date.now()}`).then(r => r.json()),
                fetch(`${API_BASE_URL}/tests?isFree=true&t=${Date.now()}`).then(r => r.json()),
                fetch(`${API_BASE_URL}/subjective-tests?isFree=true&t=${Date.now()}`).then(r => r.json()),
                fetch(`${API_BASE_URL}/test-series?isFree=true&t=${Date.now()}`).then(r => r.json()),
                fetch(`${API_BASE_URL}/ebooks?isFree=true&t=${Date.now()}`).then(r => r.json()),
                fetch(`${API_BASE_URL}/exam-documents?isFree=true&t=${Date.now()}`).then(r => r.json()),
                fetch(`${API_BASE_URL}/videos?isFree=true&t=${Date.now()}`).then(r => r.json()),
                fetch(`${API_BASE_URL}/pdfs?isFree=true&t=${Date.now()}`).then(r => r.json())
            ]);

            const getItems = (res: any) => {
                if (Array.isArray(res)) return res;
                if (res && Array.isArray(res.courses)) return res.courses;
                if (res && Array.isArray(res.tests)) return res.tests;
                if (res && Array.isArray(res.data)) return res.data;
                return [];
            };

            const checkFree = (item: any) => {
                if (!item) return false;

                const price = item.price;
                const isFreeFlag = item.isFree;

                // 1. If explicitly marked as NOT free, then it is NOT free
                if (isFreeFlag === false || isFreeFlag === "false" || isFreeFlag === 0) {
                    return false;
                }

                // 2. If it has a price > 0, it is definitely PAID
                if (price !== undefined && price !== null && price !== "" && Number(price) > 0) {
                    return false;
                }

                // 3. To be free, it MUST have isFree: true OR price: 0
                const isExplicitlyFree = isFreeFlag === true || isFreeFlag === "true" || isFreeFlag === 1;
                const isZeroPrice = price === 0 || price === "0";

                return isExplicitlyFree || isZeroPrice;
            };

            const courses = getItems(coursesRes).filter(checkFree);
            const videos = getItems(videosRes).filter(checkFree);
            const tests = getItems(testsRes).filter(checkFree);
            const notes = getItems(pdfsRes).filter(checkFree);

            // Extract unique subjects from all content
            const allContent = [...courses, ...videos, ...tests, ...notes];
            const uniqueSubjects = Array.from(new Set(allContent.map(item => item.subject).filter(Boolean)));
            setSubjects([{ id: 'all', name: 'All Subjects' }, ...uniqueSubjects.map(s => ({ id: s, name: s }))]);

            setFreeCourses(courses);
            setFreeVideos(videos);
            setFreeTests(tests);
            setFreeSubjectiveTests(getItems(subjTestsRes).filter(checkFree));
            setFreeTestSeries(getItems(seriesRes).filter(checkFree));

            // Combine ebooks and pdfs for general notes
            const combinedNotes = [
                ...getItems(ebooksRes),
                ...getItems(pdfsRes)
            ];
            setFreeNotes(combinedNotes.filter(checkFree).sort((a, b) => (Number(a.sortBy) || 0) - (Number(b.sortBy) || 0)));
            setExamDocs(
                getItems(docsRes)
                    .filter((item: any) => item.status === 'active' && checkFree(item))
                    .sort((a: any, b: any) => {
                        const aOrder = typeof a.order === 'number' ? a.order : Infinity;
                        const bOrder = typeof b.order === 'number' ? b.order : Infinity;
                        if (aOrder !== bOrder) return aOrder - bOrder;
                        return String(a._id || '').localeCompare(String(b._id || ''));
                    })
            );

        } catch (error) {
            console.error('Error fetching free content:', error);
        } finally {
            setLoading(false);
        }
    };




    const handleVideoClick = (video: any) => {
        if (video.videoUrl || video.youtubeUrl || video.url || video.link) {
            const videoId = video._id || video.id;
            navigate(`/watch/${videoId}`, { 
                state: { 
                    video: { ...video }, 
                    courseTitle: 'Free Content', 
                    courseId: video.courseId || videoId || '' 
                } 
            });
        } else {
            toast.error('Video link not available');
        }
    };

    const handlePDFClick = (pdf: any) => {
        if (pdf.fileUrl || pdf.url || pdf.link) {
            const pUrl = getPdfUrl(pdf.fileUrl || pdf.url || pdf.link);
            navigate('/pdf-viewer', { state: { pdf: { ...pdf, fileUrl: pUrl }, title: pdf.title || pdf.name } });
        } else {
            toast.error('File link not available');
        }
    };

    const renderTabButton = (tab: typeof activeTab, label: string, icon: string) => (
        <button
            onClick={() => setActiveTab(tab)}
            className="flex flex-col items-center gap-1.5 group transition-all active:scale-95"
        >
            <div className={`w-[52px] h-[52px] rounded-full flex items-center justify-center transition-all duration-300 ${activeTab === tab
                ? 'bg-primary text-white shadow-lg shadow-white/10 ring-2 ring-white/10'
                : 'bg-white/15 text-white/50 backdrop-blur-md'
                }`}>
                <span className="material-symbols-rounded text-[25px]" style={{ fontVariationSettings: activeTab === tab ? "'FILL' 1" : "'FILL' 0" }}>{icon}</span>
            </div>
            <span className={`text-[9px] font-black uppercase tracking-tight text-center ${activeTab === tab ? 'text-white' : 'text-white/40'}`}>
                {label}
            </span>
        </button>
    );

    return (
        <div className="min-h-screen bg-surface-100 pb-24">
            <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} student={student} />

            <header className="relative bg-gradient-to-br from-[#1A237E] via-[#283593] to-[#3949AB] text-white pt-6 pb-8 px-4 overflow-hidden rounded-b-[32px] shadow-2xl">
                <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>

                <div className="relative flex items-center justify-between gap-4 mb-6 px-1">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center border border-white/10 active:scale-95">
                            <span className="material-symbols-rounded text-xl">arrow_back</span>
                        </button>
                        <div>
                            <h1 className="text-xl font-black tracking-tight leading-none mb-1 text-white">Free Library</h1>
                            <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mt-0.5">Premium Resources</p>
                        </div>
                    </div>

                </div>

                <div className="relative flex justify-start gap-7 px-4">
                    {renderTabButton('all', 'All', 'apps')}
                    {renderTabButton('videos', 'Lessons', 'play_circle')}
                    {renderTabButton('tests', 'Mock Test', 'quiz')}
                    {renderTabButton('notes', 'Notes/PDF', 'auto_stories')}
                </div>
            </header>

            <main className="px-4 py-6">
                {/* Subject Filter Pills */}
                {subjects.length > 1 && (
                    <div className="flex gap-2.5 overflow-x-auto hide-scrollbar -mx-4 px-4 mb-6">
                        {subjects.map((sub, i) => (
                            <button
                                key={i}
                                onClick={() => setActiveSubject(sub.name || sub)}
                                className={`flex-shrink-0 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubject === (sub.name || sub)
                                    ? 'bg-[#1A237E] text-white shadow-lg active:scale-95'
                                    : 'bg-white text-gray-400 border border-gray-100 active:scale-95'
                                    }`}
                            >
                                {sub.name || sub}
                            </button>
                        ))}
                    </div>
                )}
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-24 w-full bg-white rounded-3xl animate-pulse"></div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-6">
                        {(activeTab === 'all' || activeTab === 'videos') && (freeCourses.length > 0 || freeVideos.length > 0) && (
                            <section className="animate-fade-in-up">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-1.5 h-6 bg-accent rounded-full"></div>
                                    <h2 className="font-black text-gray-800 text-sm tracking-tight">Free Courses & Video Lessons</h2>
                                </div>
                                <div className="space-y-3">
                                    {freeCourses
                                        .filter(c => activeSubject === 'All Subjects' || c.subject === activeSubject)
                                        .map((course) => (
                                            <div
                                                key={course._id || course.id}
                                                onClick={() => navigate(`/course/${course._id || course.id}`)}
                                                className="group bg-white p-3 rounded-3xl flex gap-4 cursor-pointer hover:shadow-xl transition-all duration-300 border border-gray-100"
                                            >
                                                {/* ... course card content ... */}
                                                <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-md shrink-0">
                                                    <img
                                                        src={getImageUrl(course.imageUrl || course.thumbnail) || '/attached_assets/alonelogo_1770810181717.jpg'}
                                                        alt={course.title}
                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                    />
                                                </div>
                                                <div className="flex-1 py-1 min-w-0">
                                                    <span className="text-[9px] font-black text-accent bg-accent/10 px-2 py-0.5 rounded-full uppercase tracking-widest">Free Course</span>
                                                    <h3 className="font-bold text-gray-800 text-sm mt-1 line-clamp-1 group-hover:text-primary transition-colors">{course.title}</h3>
                                                    <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">{course.instructor || 'Institute Faculty'}</p>
                                                    <div className="flex items-center gap-3 mt-2">
                                                        <span className="flex items-center gap-1 text-[10px] text-gray-500 font-medium">
                                                            <span className="material-symbols-rounded text-xs text-primary">play_circle</span>
                                                            {course.lessons || 0} Lessons
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center pr-1">
                                                    <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                                                        <span className="material-symbols-rounded text-lg">chevron_right</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    {freeVideos
                                        .filter(v => activeSubject === 'All Subjects' || v.subject === activeSubject)
                                        .slice(0, 6)
                                        .map((video) => (
                                            <div
                                                key={video._id || video.id}
                                                onClick={() => handleVideoClick(video)}
                                                className="group bg-white p-3 rounded-3xl flex gap-4 cursor-pointer hover:shadow-xl transition-all duration-300 border border-gray-100 relative"
                                            >
                                                <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-md shrink-0 bg-black flex items-center justify-center relative">
                                                    <img
                                                        src={getImageUrl(video.thumbnail) || getYouTubeThumbnail(video.videoUrl || video.url || '') || '/attached_assets/alonelogo_1770810181717.jpg'}
                                                        alt={video.title}
                                                        className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-500"
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <span className="material-symbols-rounded text-white text-3xl">play_circle</span>
                                                    </div>
                                                </div>
                                                <div className="flex-1 py-1 min-w-0">
                                                    <span className="text-[9px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-widest">Free Video</span>
                                                    <h3 className="font-bold text-gray-800 text-sm mt-1 line-clamp-1 group-hover:text-primary transition-colors">{video.title}</h3>
                                                    <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">{video.subject || 'General'}</p>
                                                </div>

                                            </div>
                                        ))}

                                    {freeVideos.filter(v => activeSubject === 'All Subjects' || v.subject === activeSubject).length > 6 && (
                                        <button
                                            onClick={() => navigate('/free-videos')}
                                            className="w-full py-4 bg-gray-50 text-primary font-black text-[10px] uppercase tracking-widest rounded-3xl border border-dashed border-gray-200 hover:bg-white hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-rounded text-lg">video_library</span>
                                            View More Lessons
                                        </button>
                                    )}
                                </div>
                            </section>
                        )}

                        {(activeTab === 'all' || activeTab === 'tests') && (freeTests.length > 0 || freeSubjectiveTests.length > 0 || freeTestSeries.length > 0) && (
                            <section className="animate-fade-in-up">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-1.5 h-6 bg-red-600 rounded-full"></div>
                                    <h2 className="font-black text-gray-800 text-sm tracking-tight">Free Mock Tests</h2>
                                </div>
                                <div className="space-y-3">
                                    {freeTests
                                        .filter(t => activeSubject === 'All Subjects' || t.subject === activeSubject)
                                        .map((test) => (
                                            <div
                                                key={test._id || test.id}
                                                onClick={() => navigate(`/test/${test._id || test.id}`)}
                                                className="group bg-white p-4 rounded-3xl flex items-center gap-4 cursor-pointer hover:shadow-xl transition-all duration-300 border border-gray-100"
                                            >
                                                <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center shrink-0 group-hover:bg-red-600 group-hover:text-white transition-all">
                                                    <span className="material-symbols-rounded">quiz</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-gray-800 text-sm truncate uppercase tracking-tight">{test.title || test.name}</h3>
                                                    <p className="text-[10px] text-gray-400 mt-0.5">{test.courseName || 'Objective Test'} • {test.duration || 60} mins</p>
                                                </div>
                                                <button className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest group-hover:bg-red-600 group-hover:text-white transition-all">
                                                    Start
                                                </button>
                                            </div>
                                        ))}
                                    {freeTestSeries
                                        .filter(s => activeSubject === 'All Subjects' || s.subject === activeSubject)
                                        .map((series) => (
                                            <div
                                                key={series._id || series.id}
                                                className="group bg-white p-4 rounded-3xl flex items-center gap-4 cursor-pointer hover:shadow-xl transition-all duration-300 border border-gray-100"
                                            >
                                                <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0 group-hover:bg-orange-600 group-hover:text-white transition-all">
                                                    <span className="material-symbols-rounded">collections_bookmark</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[8px] font-black bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full uppercase">Series</span>
                                                        <h3 className="font-bold text-gray-800 text-sm truncate uppercase tracking-tight">{series.title || series.name}</h3>
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 mt-1">{series.tests?.length || 0} Total Tests</p>
                                                </div>
                                                <span className="material-symbols-rounded text-gray-300">chevron_right</span>
                                            </div>
                                        ))}
                                    {freeSubjectiveTests
                                        .filter(t => activeSubject === 'All Subjects' || t.subject === activeSubject)
                                        .map((test) => (
                                            <div
                                                key={test._id || test.id}
                                                className="group bg-white p-4 rounded-3xl flex items-center gap-4 cursor-pointer hover:shadow-xl transition-all duration-300 border border-gray-100"
                                            >
                                                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                    <span className="material-symbols-rounded">edit_note</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-gray-800 text-sm truncate uppercase tracking-tight">{test.title || test.name}</h3>
                                                    <p className="text-[10px] text-gray-400 mt-0.5">Subjective • {test.subject || 'General'}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {test.fileUrl && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handlePDFClick(test);
                                                            }}
                                                            className="bg-blue-50 text-blue-600 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white"
                                                        >
                                                            View
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </section>
                        )}

                        {(activeTab === 'all' || activeTab === 'notes') && (freeNotes.length > 0 || examDocs.length > 0) && (
                            <section className="animate-fade-in-up">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-1.5 h-6 bg-teal-600 rounded-full"></div>
                                    <h2 className="font-black text-gray-800 text-sm tracking-tight">Free Study Notes & PDFs</h2>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {freeNotes
                                        .filter(n => activeSubject === 'All Subjects' || n.subject === activeSubject)
                                        .map((note, idx) => {
                                            const subject = (note.subject || 'general').toLowerCase();
                                            let bgColor = 'from-purple-500 to-purple-700';
                                            let icon = 'menu_book';

                                            if (subject.includes('physics')) { bgColor = 'from-blue-500 to-blue-700'; icon = 'bolt'; }
                                            else if (subject.includes('chemistry')) { bgColor = 'from-green-500 to-green-700'; icon = 'science'; }
                                            else if (subject.includes('biology')) { bgColor = 'from-orange-500 to-orange-700'; icon = 'biotech'; }

                                            return (
                                                <div
                                                    key={note.id || idx}
                                                    className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
                                                >
                                                    <div
                                                        onClick={() => handlePDFClick(note)}
                                                        className={`h-24 bg-gradient-to-br ${bgColor} flex items-center justify-center relative overflow-hidden`}
                                                    >
                                                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[length:10px_10px]"></div>
                                                        <span className="material-symbols-rounded text-white text-3xl relative z-10">{icon}</span>
                                                    </div>
                                                    <div className="p-3" onClick={() => handlePDFClick(note)}>
                                                        <h3 className="font-bold text-gray-800 text-[10px] line-clamp-2 leading-tight h-7">{note.title}</h3>
                                                        <div className="flex items-center justify-between mt-2">
                                                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">{note.subject || 'General'}</span>
                                                            <span className="material-symbols-rounded text-primary text-sm">visibility</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    {examDocs
                                        .filter(d => activeSubject === 'All Subjects' || d.subject === activeSubject)
                                        .map((doc, idx) => (
                                            <div
                                                key={doc.id || idx}
                                                className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
                                            >
                                                <div
                                                    onClick={() => handlePDFClick(doc)}
                                                    className="h-24 bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center relative overflow-hidden"
                                                >
                                                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[length:10px_10px]"></div>
                                                    <span className="material-symbols-rounded text-white text-3xl relative z-10">description</span>
                                                </div>
                                                <div className="p-3" onClick={() => handlePDFClick(doc)}>
                                                    <h3 className="font-bold text-gray-800 text-[10px] line-clamp-2 leading-tight h-7">{doc.title}</h3>
                                                    <div className="flex items-center justify-between mt-2">
                                                        <span className="text-[8px] font-black text-teal-600 uppercase tracking-tighter">{doc.exam || 'Document'}</span>
                                                        <div className="flex gap-2">
                                                            <span className="material-symbols-rounded text-gray-300 text-sm">visibility</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </section>
                        )}
                        {/* Specific Empty States for individual tabs */}
                        {activeTab === 'videos' && !loading && freeCourses.length === 0 && freeVideos.length === 0 && (
                            <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-100 flex flex-col items-center">
                                <span className="material-symbols-rounded text-6xl text-gray-200 block mb-4">video_library</span>
                                <h3 className="font-black text-gray-800">No Free Videos Yet</h3>
                                <p className="text-gray-400 text-xs mt-2 max-w-[200px]">Check back soon for new high-quality lessons!</p>
                            </div>
                        )}

                        {activeTab === 'tests' && !loading && freeTests.length === 0 && freeSubjectiveTests.length === 0 && freeTestSeries.length === 0 && (
                            <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-100 flex flex-col items-center">
                                <span className="material-symbols-rounded text-6xl text-gray-200 block mb-4">quiz</span>
                                <h3 className="font-black text-gray-800">No Free Tests Yet</h3>
                                <p className="text-gray-400 text-xs mt-2 max-w-[200px]">Practice tests will appear here once available.</p>
                            </div>
                        )}

                        {activeTab === 'notes' && !loading && freeNotes.length === 0 && examDocs.length === 0 && (
                            <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-100 flex flex-col items-center">
                                <span className="material-symbols-rounded text-6xl text-gray-200 block mb-4">description</span>
                                <h3 className="font-black text-gray-800">No Free Notes Available</h3>
                                <p className="text-gray-400 text-xs mt-2 max-w-[200px]">Our team is uploading new study materials daily!</p>
                            </div>
                        )}

                        {activeTab === 'all' && !loading && freeCourses.length === 0 && freeVideos.length === 0 && freeTests.length === 0 && freeTestSeries.length === 0 && freeNotes.length === 0 && examDocs.length === 0 && (
                            <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-100 flex flex-col items-center">
                                <span className="material-symbols-rounded text-6xl text-gray-200 block mb-4">folder_off</span>
                                <h3 className="font-black text-gray-800">No Free Content Found</h3>
                                <p className="text-gray-400 text-xs mt-2 max-w-[200px]">Try again later or check premium courses.</p>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* No dynamic modals here anymore, uses next-page navigation */}
        </div >
    );
};

export default FreeContent;
