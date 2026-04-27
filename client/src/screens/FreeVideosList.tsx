import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import StudentSidebar from '../components/StudentSidebar';
import { getImageUrl, getVideoUrl, getYouTubeThumbnail, toYouTubeEmbed, isYouTubeUrl } from '../lib/utils';

const FreeVideosList: React.FC = () => {
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [student, setStudent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [freeVideos, setFreeVideos] = useState<any[]>([]);
    const [activeSubject, setActiveSubject] = useState('All Subjects');
    const [subjects, setSubjects] = useState<any[]>([]);

    useEffect(() => {
        const storedStudent = localStorage.getItem('studentData');
        if (storedStudent) {
            setStudent(JSON.parse(storedStudent));
        }
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const videosRes = await fetch(`/api/videos?isFree=true&t=${Date.now()}`).then(r => r.json());

            const videos = Array.isArray(videosRes) ? videosRes.filter((v: any) => v.isFree) : [];
            setFreeVideos(videos);

            // Extract unique subjects from videos
            const uniqueSubjects = Array.from(new Set(videos.map((v: any) => v.subject).filter(Boolean)));
            setSubjects(['All Subjects', ...uniqueSubjects]);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load videos');
        } finally {
            setLoading(false);
        }
    };


    const handleVideoClick = (video: any) => {
        const videoId = video._id || video.id;
        navigate(`/watch/${videoId}`, { 
            state: { 
                video: { ...video }, 
                courseTitle: 'Free Content', 
                courseId: video.courseId || videoId || '' 
            } 
        });
    };

    const filteredVideos = freeVideos.filter(v => activeSubject === 'All Subjects' || v.subject === activeSubject);

    return (
        <div className="min-h-screen bg-surface-100 pb-24">
            <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} student={student} />

            <header className="relative bg-gradient-to-br from-[#1A237E] via-[#283593] to-[#3949AB] text-white pt-6 pb-8 px-4 overflow-hidden rounded-b-[32px] shadow-2xl">
                <div className="relative flex items-center gap-4 mb-6 px-1">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center border border-white/10 active:scale-95">
                        <span className="material-symbols-rounded text-xl">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-xl font-black tracking-tight leading-none mb-1">Free Video Lessons</h1>
                        <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mt-0.5">Explore All Content</p>
                    </div>
                </div>

                {subjects.length > 1 && (
                    <div className="flex gap-2.5 overflow-x-auto hide-scrollbar px-1">
                        {subjects.map((sub, i) => (
                            <button
                                key={i}
                                onClick={() => setActiveSubject(sub.name || sub)}
                                className={`flex-shrink-0 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubject === (sub.name || sub)
                                    ? 'bg-white text-primary shadow-lg active:scale-95'
                                    : 'bg-white/10 text-white/60 border border-white/10 active:scale-95'
                                    }`}
                            >
                                {sub.name || sub}
                            </button>
                        ))}
                    </div>
                )}
            </header>

            <main className="px-4 py-8">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-24 w-full bg-white rounded-3xl animate-pulse"></div>
                        ))}
                    </div>
                ) : filteredVideos.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredVideos.map((video) => (
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
                                <div className="flex items-center pr-1">
                                    <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                                        <span className="material-symbols-rounded text-lg">chevron_right</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-[32px] p-12 text-center border-2 border-dashed border-gray-100">
                        <span className="material-symbols-rounded text-6xl text-gray-200 block mb-4">video_library</span>
                        <h3 className="font-black text-gray-800">No Videos Found</h3>
                        <p className="text-gray-400 text-xs mt-2">Try selecting a different subject.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default FreeVideosList;
