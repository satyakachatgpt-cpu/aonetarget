import React, { useState, useEffect } from 'react';
import { videosAPI, coursesAPI } from '../../services/apiClient';
import { getImageUrl, extractYouTubeId, toYouTubeEmbed } from '../../lib/utils';

interface Course {
  id: string;
  name: string;
  title?: string;
}

interface Video {
  id: string;
  title: string;
  subject: string;
  topic: string;
  course: string;
  courseId?: string;
  duration: string;
  quality: string;
  views: number;
  uploadDate: string;
  status: 'active' | 'inactive' | 'archived';
  videoUrl?: string;
  thumbnail?: string;
  instructor?: string;
  isFree?: boolean;
  isLiveRecording?: boolean;
}

interface Props {
  showToast: (m: string, type?: 'success' | 'error') => void;
}

const Videos: React.FC<Props> = ({ showToast }) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterQuality, setFilterQuality] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<Video | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    topic: '',
    course: '',
    courseId: '',
    instructor: '',
    duration: '',
    quality: 'HD 1080P',
    videoUrl: '',
    thumbnail: '',
    thumbnailFile: null as File | null,
    status: 'active' as 'active' | 'inactive' | 'archived',
    isFree: false,
    isLiveRecording: false
  });

  const [dragActive, setDragActive] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);


  const handleThumbnailFile = (file: File) => {
    if (file.type.startsWith('image/')) {
      setFormData(prev => ({ ...prev, thumbnailFile: file, thumbnail: file.name }));
      showToast(`Thumbnail selected: ${file.name}`);
    } else {
      showToast('Please select a valid image file', 'error');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent, type: 'thumbnail') => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleThumbnailFile(files[0]);
    }
  };

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      const [data, courseData] = await Promise.all([
        videosAPI.getAll(),
        coursesAPI.getAll().catch(() => [])
      ]);
      setVideos(data);
      setCourses(Array.isArray(courseData) ? courseData : []);
    } catch (error) {
      showToast('Failed to load videos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredVideos = videos.filter(video => {
    const matchesSearch = !searchQuery ||
      video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !filterStatus || video.status === filterStatus;
    const matchesQuality = !filterQuality || video.quality === filterQuality;
    return matchesSearch && matchesStatus && matchesQuality;
  });

  const totalPages = Math.ceil(filteredVideos.length / itemsPerPage);
  const paginatedVideos = filteredVideos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSubmit = async () => {
    if (!formData.title || (!formData.course && !formData.courseId) || !formData.subject) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    setUploadingFile(true);
    try {
      let finalVideoUrl = formData.videoUrl;
      let finalThumbnail = formData.thumbnail;

      // Handle YouTube URL Formatting
      if (formData.videoUrl) {
        finalVideoUrl = toYouTubeEmbed(formData.videoUrl);
      }

      // Handle Thumbnail File Upload
      if (formData.thumbnailFile) {
        const adminId = localStorage.getItem('adminId');
        const tFormData = new FormData();
        tFormData.append('file', formData.thumbnailFile);
        const res = await fetch('/api/v2/upload/image', {
          method: 'POST',
          headers: { 'x-admin-id': adminId || '' },
          body: tFormData,
        });
        if (!res.ok) throw new Error('Thumbnail upload failed');
        const data = await res.json();
        finalThumbnail = data.url;
      }

      const selectedCourse = courses.find(c => c.id === formData.courseId);
      const videoData = {
        id: editingVideo?.id || `vid_${Date.now()}`,
        title: formData.title,
        subject: formData.subject,
        topic: formData.topic,
        course: formData.course || (selectedCourse ? (selectedCourse.name || selectedCourse.title) : ''),
        courseId: formData.courseId,
        courseName: selectedCourse ? (selectedCourse.name || selectedCourse.title) : formData.course,
        instructor: formData.instructor,
        duration: formData.duration,
        quality: formData.quality,
        views: editingVideo?.views || 0,
        thumbnail: finalThumbnail,
        videoUrl: finalVideoUrl,
        uploadDate: editingVideo?.uploadDate || new Date().toISOString(),
        status: formData.status,
        isFree: formData.isFree,
        isLiveRecording: formData.isLiveRecording
      };

      if (editingVideo) {
        await videosAPI.update(editingVideo.id, videoData);
        showToast('Video updated successfully!');
      } else {
        await videosAPI.create(videoData);
        showToast('Video created successfully!');
      }

      setShowModal(false);
      setEditingVideo(null);
      setFormData({ title: '', subject: '', topic: '', course: '', courseId: '', instructor: '', duration: '', quality: 'HD 1080P', videoUrl: '', thumbnail: '', thumbnailFile: null, status: 'active', isFree: false, isLiveRecording: false });
      loadVideos();
    } catch (error) {
      console.error('Upload/Save error:', error);
      showToast('Failed to save video', 'error');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this video?')) {
      try {
        await videosAPI.delete(id);
        showToast('Video deleted successfully!');
        loadVideos();
      } catch (error) {
        showToast('Failed to delete video', 'error');
      }
    }
  };

  const openEditModal = (video: Video) => {
    setEditingVideo(video);
    setFormData({
      title: video.title,
      subject: video.subject,
      topic: video.topic,
      course: video.course,
      courseId: video.courseId || '',
      instructor: video.instructor || '',
      duration: video.duration,
      quality: video.quality,
      thumbnail: video.thumbnail || '',
      thumbnailFile: null,
      videoUrl: video.videoUrl || '',
      status: video.status,
      isFree: video.isFree || false,
      isLiveRecording: video.isLiveRecording || false
    });
    setShowModal(true);
  };

  const getQualityColor = (quality: string) => {
    const colors = {
      'HD 1080P': 'from-blue-500 to-cyan-500',
      'HD 720P': 'from-purple-500 to-pink-500',
      'SD 480P': 'from-orange-500 to-red-500'
    };
    return colors[quality as keyof typeof colors] || 'from-gray-500 to-gray-600';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'from-green-500/20 to-emerald-500/20',
      inactive: 'from-red-500/20 to-pink-500/20',
      archived: 'from-gray-500/20 to-slate-500/20'
    };
    return colors[status as keyof typeof colors];
  };

  const getStatusTextColor = (status: string) => {
    const colors = {
      active: 'text-green-700',
      inactive: 'text-red-700',
      archived: 'text-gray-700'
    };
    return colors[status as keyof typeof colors];
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-bold">Loading videos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-600 rounded-3xl p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/3 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                  <span className="material-icons-outlined text-2xl">video_library</span>
                </div>
                <h1 className="text-4xl font-black tracking-tight">Video Library</h1>
              </div>
              <p className="text-white/80 text-sm font-semibold">Manage and organize your video lectures</p>
            </div>
            <button
              onClick={() => { setEditingVideo(null); setFormData({ title: '', subject: '', topic: '', course: '', courseId: '', instructor: '', duration: '', quality: 'HD 1080P', videoUrl: '', thumbnail: '', thumbnailFile: null, status: 'active', isFree: false, isLiveRecording: false }); setShowModal(true); }}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-6 py-3 rounded-2xl font-black text-sm uppercase shadow-lg border border-white/20 transition-all hover:shadow-xl hover:scale-105"
            >
              <span className="flex items-center gap-2">
                <span className="material-icons-outlined">add_circle</span>
                Upload Video
              </span>
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
              <p className="text-white/70 text-xs font-bold uppercase tracking-wide">Total Videos</p>
              <p className="text-3xl font-black mt-2">{videos.length}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
              <p className="text-white/70 text-xs font-bold uppercase tracking-wide">Total Views</p>
              <p className="text-3xl font-black mt-2">{videos.reduce((sum, v) => sum + (v.views || 0), 0).toLocaleString()}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
              <p className="text-white/70 text-xs font-bold uppercase tracking-wide">Active</p>
              <p className="text-3xl font-black mt-2">{videos.filter(v => v.status === 'active').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Controls */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
        <div className="flex-1 relative group">
          <span className="material-icons-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors">search</span>
          <input
            type="text"
            placeholder="Search videos by title or subject..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-indigo-200 transition-all shadow-sm focus:shadow-md"
          />
        </div>

        <div className="relative">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center gap-2 px-6 py-4 border rounded-2xl text-[13px] font-black uppercase tracking-wider transition-all shadow-sm ${isFilterOpen ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-200 shadow-lg' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'}`}
          >
            <span className="material-symbols-outlined text-[20px]">tune</span>
            Filters
          </button>

          {isFilterOpen && (
            <div className="absolute right-0 top-full mt-3 w-80 bg-white border border-gray-100 rounded-3xl shadow-2xl z-[100] p-6 animate-in fade-in zoom-in duration-200 origin-top-right">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Advanced Filters</h4>
                <button onClick={() => { setFilterStatus(''); setFilterQuality(''); setIsFilterOpen(false); }} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors">Reset All</button>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Video Status</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['', 'active', 'inactive', 'archived'].map((status) => (
                      <button
                        key={status}
                        onClick={() => { setFilterStatus(status); setIsFilterOpen(false); }}
                        className={`text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${filterStatus === status ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' : 'bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
                      >
                        {status === '' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Video Quality</label>
                  <div className="flex flex-col gap-2">
                    {['', 'HD 1080P', 'HD 720P', 'SD 480P'].map((quality) => (
                      <button
                        key={quality}
                        onClick={() => { setFilterQuality(quality); setIsFilterOpen(false); }}
                        className={`text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${filterQuality === quality ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' : 'bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
                      >
                        {quality === '' ? 'All Qualities' : quality}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-100 shadow-sm">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <span className="material-icons-outlined text-[22px]">dashboard</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-2.5 rounded-xl transition-all ${viewMode === 'table' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <span className="material-icons-outlined text-[22px]">table_chart</span>
          </button>
        </div>

        <select
          value={itemsPerPage}
          onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
          className="px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[13px] font-black text-gray-600 outline-none hover:bg-white transition-all shadow-sm cursor-pointer appearance-none min-w-[140px] text-center"
        >
          <option value="12">12 / page</option>
          <option value="24">24 / page</option>
          <option value="48">48 / page</option>
        </select>
      </div>

      {/* Videos Grid/Table View */}
      {paginatedVideos.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-16 text-center">
          <span className="material-icons-outlined text-6xl text-gray-200 block mb-4">video_library</span>
          <p className="text-gray-400 font-bold text-lg">No videos found</p>
          <p className="text-gray-300 text-sm mt-2">Try adjusting your search or filters</p>
        </div>
      ) : viewMode === 'grid' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedVideos.map((video) => (
              <div key={video.id} className="group bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-xl hover:border-indigo-200 transition-all duration-300">
                {/* Thumbnail */}
                <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 aspect-video">
                  <img
                    src={video.thumbnail || `https://picsum.photos/500/280?sig=${video.id}`}
                    alt={video.title}
                    className="w-full h-full object-cover opacity-75 group-hover:scale-110 transition-transform duration-500"
                  />
                  <div 
                    className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex items-center justify-center cursor-pointer"
                    onClick={() => setPreviewVideo(video)}
                  >
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border-2 border-white/40 group-hover:scale-110 transition-transform">
                      <span className="material-icons-outlined text-white text-3xl">play_arrow</span>
                    </div>
                  </div>

                  {/* Quality Badge */}
                  <div className={`absolute top-4 right-4 bg-gradient-to-r ${getQualityColor(video.quality)} text-white px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-lg`}>
                    {video.quality}
                  </div>

                  {/* Duration */}
                  <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-[10px] font-bold">
                    {video.duration}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <p className="text-[11px] font-black text-indigo-600 uppercase tracking-wider mb-1">{video.subject}</p>
                      <h3 className="font-black text-navy text-sm leading-tight line-clamp-2 group-hover:text-indigo-600 transition-colors">{video.title}</h3>
                    </div>
                    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r ${getStatusColor(video.status)} border ${getStatusTextColor(video.status)}`}>
                      <span className="w-2 h-2 rounded-full bg-current"></span>
                      <span className="text-[10px] font-bold uppercase">{video.status}</span>
                    </div>
                  </div>

                  {/* Meta Info */}
                  <div className="grid grid-cols-2 gap-2 mb-4 py-3 border-y border-gray-100">
                    <div className="text-center">
                      <p className="text-gray-500 text-[10px] font-bold uppercase">Course</p>
                      <p className="font-black text-navy text-xs mt-1">{video.course}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-500 text-[10px] font-bold uppercase">Views</p>
                      <p className="font-black text-indigo-600 text-xs mt-1">{((video.views || 0) / 1000).toFixed(1)}K</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(video)}
                      className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold py-2 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      <span className="material-icons-outlined text-base">edit</span>
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(video.id)}
                      className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      <span className="material-icons-outlined text-base">delete</span>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Standardized Pagination Footer (Grid) */}
          {!loading && filteredVideos.length > 0 && (
            <div className="p-6 border-t border-gray-50 flex items-center justify-between bg-white rounded-2xl shadow-sm mt-4">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center group">
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2 pr-10 text-[13px] font-bold text-gray-700 outline-none focus:border-gray-500 transition-all cursor-pointer shadow-sm hover:bg-gray-50"
                  >
                    <option value={10}>10</option>
                    <option value={12}>12</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 pointer-events-none text-[20px] text-gray-400 flex items-center justify-center h-full top-0 group-focus-within:text-black">
                    expand_more
                  </span>
                </div>
                <span className="text-[13px] font-medium text-gray-400 italic">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, filteredVideos.length)} of{" "}
                  {filteredVideos.length} entries
                </span>
              </div>

              <div className="flex items-center p-1.5 bg-white border border-gray-200 rounded-2xl shadow-sm">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-9 px-4 flex items-center justify-center text-[13px] font-bold text-gray-400 hover:text-black hover:bg-gray-50 rounded-xl transition-all disabled:opacity-50"
                >
                  Previous
                </button>
                <div className="w-[1px] h-4 bg-gray-100 mx-1"></div>
                <button className="h-9 w-9 flex items-center justify-center text-[13px] font-black bg-black text-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
                  {currentPage}
                </button>
                <div className="w-[1px] h-4 bg-gray-100 mx-1"></div>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="h-9 px-4 flex items-center justify-center text-[13px] font-bold text-gray-400 hover:text-black hover:bg-gray-50 rounded-xl transition-all disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        // Table View
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <th className="px-6 py-4 text-left font-black text-gray-700 text-xs uppercase tracking-wider">#</th>
                  <th className="px-6 py-4 text-left font-black text-gray-700 text-xs uppercase tracking-wider">Title</th>
                  <th className="px-6 py-4 text-left font-black text-gray-700 text-xs uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-4 text-left font-black text-gray-700 text-xs uppercase tracking-wider">Course</th>
                  <th className="px-6 py-4 text-center font-black text-gray-700 text-xs uppercase tracking-wider">Quality</th>
                  <th className="px-6 py-4 text-center font-black text-gray-700 text-xs uppercase tracking-wider">Views</th>
                  <th className="px-6 py-4 text-center font-black text-gray-700 text-xs uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-center font-black text-gray-700 text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedVideos.map((video, idx) => (
                  <tr key={video.id} className="hover:bg-indigo-50/50 transition-colors group">
                    <td className="px-6 py-4 font-bold text-gray-400">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={video.thumbnail || `https://picsum.photos/40/40?sig=${video.id}`}
                          alt={video.title}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                        <span className="font-bold text-navy max-w-xs truncate">{video.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700 font-semibold">{video.subject}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs">{video.course}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-lg bg-gradient-to-r ${getQualityColor(video.quality)} text-white font-black text-[10px]`}>{video.quality}</span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-indigo-600">{(video.views || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase bg-gradient-to-r ${getStatusColor(video.status)} ${getStatusTextColor(video.status)}`}>
                        {video.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(video)}
                          className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                        >
                          <span className="material-icons-outlined text-base">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(video.id)}
                          className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                        >
                          <span className="material-icons-outlined text-base">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Standardized Pagination Footer (Table) */}
          {!loading && filteredVideos.length > 0 && (
            <div className="p-6 border-t border-gray-50 flex items-center justify-between bg-white rounded-b-2xl shadow-sm">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center group">
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2 pr-10 text-[13px] font-bold text-gray-700 outline-none focus:border-gray-500 transition-all cursor-pointer shadow-sm hover:bg-gray-50"
                  >
                    <option value={10}>10</option>
                    <option value={12}>12</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 pointer-events-none text-[20px] text-gray-400 flex items-center justify-center h-full top-0 group-focus-within:text-black">
                    expand_more
                  </span>
                </div>
                <span className="text-[13px] font-medium text-gray-400 italic">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, filteredVideos.length)} of{" "}
                  {filteredVideos.length} entries
                </span>
              </div>

              <div className="flex items-center p-1.5 bg-white border border-gray-200 rounded-2xl shadow-sm">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-9 px-4 flex items-center justify-center text-[13px] font-bold text-gray-400 hover:text-black hover:bg-gray-50 rounded-xl transition-all disabled:opacity-50"
                >
                  Previous
                </button>
                <div className="w-[1px] h-4 bg-gray-100 mx-1"></div>
                <button className="h-9 w-9 flex items-center justify-center text-[13px] font-black bg-black text-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
                  {currentPage}
                </button>
                <div className="w-[1px] h-4 bg-gray-100 mx-1"></div>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="h-9 px-4 flex items-center justify-center text-[13px] font-bold text-gray-400 hover:text-black hover:bg-gray-50 rounded-xl transition-all disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Professional Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6 text-white flex justify-between items-center border-b border-indigo-700">
              <div>
                <h3 className="text-2xl font-black tracking-tight flex items-center gap-3">
                  <span className="material-icons-outlined text-3xl">{editingVideo ? 'edit' : 'video_library'}</span>
                  {editingVideo ? 'Edit Video' : 'Upload New Video'}
                </h3>
                <p className="text-white/80 text-sm mt-1">{editingVideo ? 'Update video details' : 'Create a new video lecture'}</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
              >
                <span className="material-icons-outlined text-2xl">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-8 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Video Title *</label>
                <input
                  type="text"
                  placeholder="Enter video title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                />
              </div>

              {/* Subject, Topic, Course */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Subject *</label>
                  <input
                    type="text"
                    placeholder="e.g., Physics, Chemistry"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Topic</label>
                  <input
                    type="text"
                    placeholder="e.g., Newton's Laws"
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Course *</label>
                  {courses.length > 0 ? (
                    <select
                      value={formData.courseId}
                      onChange={(e) => {
                        const cId = e.target.value;
                        const c = courses.find(c => c.id === cId);
                        setFormData({ ...formData, courseId: cId, course: c ? (c.name || c.title || '') : '' });
                      }}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-indigo-500/30"
                    >
                      <option value="">Select Course</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.name || c.title}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="e.g., NEET, JEE"
                      value={formData.course}
                      onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Instructor</label>
                  <input
                    type="text"
                    placeholder="e.g., Dr. John Doe"
                    value={formData.instructor}
                    onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              </div>

              {/* Duration, Quality, Status */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Duration</label>
                  <input
                    type="text"
                    placeholder="45:30 MINS"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Quality</label>
                  <select
                    value={formData.quality}
                    onChange={(e) => setFormData({ ...formData, quality: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-indigo-500/30"
                  >
                    <option value="HD 1080P">HD 1080P</option>
                    <option value="HD 720P">HD 720P</option>
                    <option value="SD 480P">SD 480P</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' | 'archived' })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-indigo-500/30"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Free Preview & Live Recording Options */}
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl cursor-pointer hover:bg-green-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.isFree}
                    onChange={(e) => setFormData({ ...formData, isFree: e.target.checked })}
                    className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                  />
                  <div>
                    <p className="font-bold text-gray-800 text-sm">Free Preview</p>
                    <p className="text-xs text-gray-500">Visible to all students</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-xl cursor-pointer hover:bg-purple-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.isLiveRecording}
                    onChange={(e) => setFormData({ ...formData, isLiveRecording: e.target.checked })}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <div>
                    <p className="font-bold text-gray-800 text-sm">Live Recording</p>
                    <p className="text-xs text-gray-500">From live class session</p>
                  </div>
                </label>
              </div>

              {/* YouTube Video URL & Preview */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">YouTube Video URL *</label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-500 transition-colors">link</span>
                    <input
                      type="text"
                      placeholder="Paste YouTube link: https://youtube.com/watch?v=..."
                      value={formData.videoUrl}
                      onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all placeholder:text-gray-300"
                    />
                  </div>
                </div>

                {extractYouTubeId(formData.videoUrl) ? (
                  <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl border-4 border-white ring-1 ring-gray-100 group animate-in zoom-in-95 duration-300">
                    <iframe
                      src={toYouTubeEmbed(formData.videoUrl)}
                      className="w-full h-full"
                      allowFullScreen
                      title="Video Preview"
                    />
                    <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-lg flex items-center gap-1.5 backdrop-blur-md">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                      YouTube Preview
                    </div>
                  </div>
                ) : formData.videoUrl ? (
                  <div className="p-6 border-2 border-dashed border-red-100 bg-red-50/50 rounded-2xl flex flex-col items-center justify-center text-center">
                    <span className="material-symbols-outlined text-red-400 text-3xl mb-2">error</span>
                    <p className="text-red-500 text-xs font-black uppercase tracking-widest leading-relaxed">
                      Invalid YouTube Link Provided<br/>
                      <span className="text-[10px] font-bold text-red-300">Please provide a valid watch or embed URL</span>
                    </p>
                  </div>
                ) : null}
              </div>

              {/* Thumbnail Upload */}
              <div>
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-3">Upload Thumbnail Image</label>
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={(e) => handleDrop(e, 'thumbnail')}
                  className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${dragActive
                      ? 'border-indigo-500 bg-indigo-50'
                      : formData.thumbnailFile
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-300 bg-gray-50 hover:border-indigo-300'
                    }`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files && handleThumbnailFile(e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="pointer-events-none">
                    <div className="mb-2">
                      {formData.thumbnailFile ? (
                        <span className="material-icons-outlined text-3xl text-green-600">image</span>
                      ) : (
                        <span className="material-icons-outlined text-3xl text-gray-400">image_search</span>
                      )}
                    </div>
                    <p className="font-bold text-gray-700 text-xs mb-1">
                      {formData.thumbnailFile ? 'Thumbnail selected' : 'Drag & drop thumbnail'}
                    </p>
                    <p className="text-[10px] text-gray-500">or click to select image</p>
                    {formData.thumbnailFile && (
                      <p className="text-xs font-bold text-green-600 mt-1">🖼️ {formData.thumbnailFile.name}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Alternative URL Option */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs font-bold text-blue-700 mb-3 flex items-center gap-2">
                  <span className="material-icons-outlined text-base">info</span>
                  Or paste URL directly (optional)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Video URL</label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={formData.videoUrl}
                      onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg font-semibold outline-none focus:ring-2 focus:ring-indigo-500/30 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Thumbnail URL</label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={formData.thumbnail}
                      onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg font-semibold outline-none focus:ring-2 focus:ring-indigo-500/30 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="sticky bottom-0 bg-gradient-to-t from-gray-50 to-transparent px-8 py-6 border-t border-gray-200 flex gap-4">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-xl font-black text-sm uppercase transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3 rounded-xl font-black text-sm uppercase shadow-lg hover:shadow-xl transition-all"
              >
                {editingVideo ? 'Update Video' : 'Upload Video'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Video Preview Modal */}
      {previewVideo && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="relative w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              <button 
                onClick={() => setPreviewVideo(null)} 
                className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white backdrop-blur-md transition-all border border-white/20"
              >
                 <span className="material-symbols-rounded">close</span>
              </button>
              
              <div className="w-full h-full flex items-center justify-center">
                {previewVideo.videoUrl?.includes('youtube') || (previewVideo.videoUrl?.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|user\/\S+|shorts\/))([^?&#\s]+)/)) ? (
                  <iframe 
                    src={`https://www.youtube.com/embed/${previewVideo.videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|user\/\S+|shorts\/))([^?&#\s]+)/)?.[1]}?autoplay=1`}
                    className="w-full h-full border-0"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />
                ) : (
                  <video 
                    src={getImageUrl(previewVideo.videoUrl)} 
                    controls 
                    autoPlay 
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
              
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black to-transparent pointer-events-none">
                 <h3 className="text-white font-black text-xl mb-1">{previewVideo.title}</h3>
                 <p className="text-white/60 text-sm font-bold uppercase tracking-widest">{previewVideo.subject} • {previewVideo.course}</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Videos;

