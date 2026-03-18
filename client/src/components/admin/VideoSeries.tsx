import React, { useState, useEffect } from 'react';
import { testSeriesAPI } from '../../services/apiClient';

interface VideoSeriesItem {
  id: string;
  seriesName: string;
  totalVideos: number;
  course: string;
  subject: string;
  description: string;
  studentsEnrolled: number;
  status: 'active' | 'inactive' | 'draft';
  createdDate: string;
  completionRate: number;
  instructor?: string;
  thumbnail?: string;
}

interface Props {
  showToast: (m: string, type?: 'success' | 'error') => void;
}

const VideoSeries: React.FC<Props> = ({ showToast }) => {
  const [series, setSeries] = useState<VideoSeriesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSeries, setEditingSeries] = useState<VideoSeriesItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const [formData, setFormData] = useState({
    seriesName: '',
    course: '',
    subject: '',
    instructor: '',
    totalVideos: '',
    description: '',
    status: 'draft' as 'active' | 'inactive' | 'draft'
  });

  useEffect(() => {
    loadSeries();
  }, []);

  const loadSeries = async () => {
    try {
      const data = await testSeriesAPI.getAll().catch(() => []);
      setSeries(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log('Starting with empty state');
      setSeries([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredSeries = series.filter(item => {
    const matchesSearch = !searchQuery || (item.seriesName && item.seriesName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = !filterStatus || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredSeries.length / itemsPerPage);
  const paginatedSeries = filteredSeries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleOpenModal = (item?: VideoSeriesItem) => {
    if (item) {
      setEditingSeries(item);
      setFormData({
        seriesName: item.seriesName,
        course: item.course,
        subject: item.subject,
        instructor: item.instructor || '',
        totalVideos: item.totalVideos.toString(),
        description: item.description,
        status: item.status
      });
    } else {
      setEditingSeries(null);
      setFormData({ seriesName: '', course: '', subject: '', instructor: '', totalVideos: '', description: '', status: 'draft' });
    }
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.seriesName || !formData.course || !formData.totalVideos) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    try {
      const seriesData = {
        id: editingSeries?.id || `vseries_${Date.now()}`,
        seriesName: formData.seriesName,
        course: formData.course,
        subject: formData.subject,
        instructor: formData.instructor,
        totalVideos: parseInt(formData.totalVideos),
        description: formData.description,
        status: formData.status,
        studentsEnrolled: editingSeries?.studentsEnrolled || 0,
        createdDate: editingSeries?.createdDate || new Date().toISOString(),
        completionRate: editingSeries?.completionRate || 0
      };

      if (editingSeries) {
        await testSeriesAPI.update(editingSeries.id, seriesData);
        showToast('Video Series updated successfully!');
      } else {
        await testSeriesAPI.create(seriesData);
        showToast('Video Series created successfully!');
      }

      setShowModal(false);
      setEditingSeries(null);
      setFormData({ seriesName: '', course: '', subject: '', instructor: '', totalVideos: '', description: '', status: 'draft' });
      loadSeries();
    } catch (error) {
      showToast('Failed to save Video Series', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this video series?')) {
      try {
        await testSeriesAPI.delete(id);
        showToast('Video Series deleted successfully!');
        loadSeries();
      } catch (error) {
        showToast('Failed to delete Video Series', 'error');
      }
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'from-green-500/20 to-emerald-500/20',
      inactive: 'from-red-500/20 to-pink-500/20',
      draft: 'from-yellow-500/20 to-orange-500/20'
    };
    return colors[status as keyof typeof colors];
  };

  const getStatusTextColor = (status: string) => {
    const colors = {
      active: 'text-green-700',
      inactive: 'text-red-700',
      draft: 'text-yellow-700'
    };
    return colors[status as keyof typeof colors];
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-bold">Loading series...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-indigo-500 to-blue-600 rounded-3xl p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/3 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                  <span className="material-icons-outlined text-2xl">playlist_play</span>
                </div>
                <h1 className="text-4xl font-black tracking-tight">Video Series</h1>
              </div>
              <p className="text-white/80 text-sm font-semibold">Organize and manage video playlists</p>
            </div>
            <button 
              onClick={() => handleOpenModal()}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-6 py-3 rounded-2xl font-black text-sm uppercase shadow-lg border border-white/20 transition-all hover:shadow-xl hover:scale-105"
            >
              <span className="flex items-center gap-2">
                <span className="material-icons-outlined">add_circle</span>
                New Series
              </span>
            </button>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
              <p className="text-white/70 text-xs font-bold uppercase tracking-wide">Total Series</p>
              <p className="text-3xl font-black mt-2">{series.length}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
              <p className="text-white/70 text-xs font-bold uppercase tracking-wide">Total Videos</p>
              <p className="text-3xl font-black mt-2">{series.reduce((sum, s) => sum + (s.totalVideos || 0), 0)}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
              <p className="text-white/70 text-xs font-bold uppercase tracking-wide">Enrolled Students</p>
              <p className="text-3xl font-black mt-2">{series.reduce((sum, s) => sum + (s.studentsEnrolled || 0), 0)}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
              <p className="text-white/70 text-xs font-bold uppercase tracking-wide">Active</p>
              <p className="text-3xl font-black mt-2">{series.filter(s => s.status === 'active').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Controls */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between mb-6">
          <h3 className="text-lg font-black text-navy">Filters & Search</h3>
          <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
            >
              <span className="material-icons-outlined">dashboard</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow-sm' : ''}`}
            >
              <span className="material-icons-outlined">table_chart</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <span className="material-icons-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
            <input
              type="text"
              placeholder="Search series..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-purple-500/30"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="draft">Draft</option>
          </select>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(parseInt(e.target.value));
              setCurrentPage(1);
            }}
            className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-purple-500/30"
          >
            <option value="12">12 per page</option>
            <option value="24">24 per page</option>
            <option value="48">48 per page</option>
          </select>
        </div>
      </div>

      {/* Grid View */}
      {paginatedSeries.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-16 text-center">
          <span className="material-icons-outlined text-6xl text-gray-200 block mb-4">playlist_play</span>
          <p className="text-gray-400 font-bold text-lg">No series found</p>
          <p className="text-gray-300 text-sm mt-2">Create your first video series</p>
        </div>
      ) : viewMode === 'grid' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedSeries.map((item) => (
              <div key={item.id} className="group bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-xl hover:border-purple-200 transition-all duration-300 flex flex-col">
                {/* Header with Gradient */}
                <div className="h-32 bg-gradient-to-br from-purple-600 via-indigo-500 to-blue-600 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="material-icons-outlined text-6xl text-white/30 group-hover:scale-110 transition-transform">playlist_play</span>
                  </div>
                  {/* Status Badge */}
                  <div className="absolute top-4 right-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase bg-gradient-to-r ${getStatusColor(item.status)} ${getStatusTextColor(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col">
                  <div className="mb-4">
                    <p className="text-[11px] font-black text-purple-600 uppercase tracking-wider mb-1">{item.subject} / {item.course}</p>
                    <h3 className="font-black text-navy text-sm leading-tight line-clamp-2 group-hover:text-purple-600 transition-colors">{item.seriesName}</h3>
                  </div>

                  {item.description && (
                    <p className="text-xs text-gray-500 mb-4 line-clamp-2">{item.description}</p>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 my-4 py-3 border-y border-gray-100 text-center">
                    <div>
                      <p className="text-gray-500 text-[10px] font-bold uppercase">Videos</p>
                      <p className="font-black text-navy text-sm mt-1">{item.totalVideos}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-[10px] font-bold uppercase">Students</p>
                      <p className="font-black text-purple-600 text-sm mt-1">{item.studentsEnrolled}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-[10px] font-bold uppercase">Progress</p>
                      <p className="font-black text-indigo-600 text-sm mt-1">{(item.completionRate || 0)}%</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-600">Completion</span>
                      <span className="text-xs font-black text-purple-600">{(item.completionRate || 0)}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500" style={{ width: `${(item.completionRate || 0)}%` }}></div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-auto">
                    <button
                      onClick={() => handleOpenModal(item)}
                      className="flex-1 bg-purple-50 hover:bg-purple-100 text-purple-600 font-bold py-2 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      <span className="material-icons-outlined text-base">edit</span>
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
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

          {/* Pagination */}
          <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-sm font-bold text-gray-600">
              Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredSeries.length)} of {filteredSeries.length}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 transition-colors"
              >
                <span className="material-icons-outlined">chevron_left</span>
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 rounded-lg font-black text-sm transition-all ${
                    page === currentPage
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 transition-colors"
              >
                <span className="material-icons-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        </>
      ) : (
        // Table View
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <th className="px-6 py-4 text-left font-black text-gray-700 text-xs uppercase tracking-wider">#</th>
                  <th className="px-6 py-4 text-left font-black text-gray-700 text-xs uppercase tracking-wider">Series Name</th>
                  <th className="px-6 py-4 text-left font-black text-gray-700 text-xs uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-4 text-left font-black text-gray-700 text-xs uppercase tracking-wider">Course</th>
                  <th className="px-6 py-4 text-center font-black text-gray-700 text-xs uppercase tracking-wider">Videos</th>
                  <th className="px-6 py-4 text-center font-black text-gray-700 text-xs uppercase tracking-wider">Students</th>
                  <th className="px-6 py-4 text-center font-black text-gray-700 text-xs uppercase tracking-wider">Progress</th>
                  <th className="px-6 py-4 text-center font-black text-gray-700 text-xs uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-center font-black text-gray-700 text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedSeries.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-purple-50/50 transition-colors group">
                    <td className="px-6 py-4 font-bold text-gray-400">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                    <td className="px-6 py-4 font-bold text-navy max-w-xs truncate">{item.seriesName}</td>
                    <td className="px-6 py-4 text-gray-700 font-semibold">{item.subject}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs">{item.course}</span>
                    </td>
                    <td className="px-6 py-4 text-center font-black text-purple-600">{item.totalVideos || 0}</td>
                    <td className="px-6 py-4 text-center font-bold text-indigo-600">{item.studentsEnrolled || 0}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500" style={{ width: `${(item.completionRate || 0)}%` }}></div>
                        </div>
                        <span className="font-bold text-gray-600 w-8 text-xs">{(item.completionRate || 0)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase bg-gradient-to-r ${getStatusColor(item.status)} ${getStatusTextColor(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenModal(item)}
                          className="p-2 hover:bg-purple-100 text-purple-600 rounded-lg transition-colors"
                        >
                          <span className="material-icons-outlined text-base">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
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

          {/* Pagination */}
          <div className="flex items-center justify-between bg-gray-50 border-t border-gray-200 px-6 py-4">
            <p className="text-sm font-bold text-gray-600">
              Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredSeries.length)} of {filteredSeries.length}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 hover:bg-white rounded-lg disabled:opacity-50 transition-colors"
              >
                <span className="material-icons-outlined">chevron_left</span>
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 rounded-lg font-black text-sm transition-all ${
                    page === currentPage
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 hover:bg-white rounded-lg disabled:opacity-50 transition-colors"
              >
                <span className="material-icons-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Professional Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-6 text-white flex justify-between items-center border-b border-purple-700">
              <div>
                <h3 className="text-2xl font-black tracking-tight flex items-center gap-3">
                  <span className="material-icons-outlined text-3xl">{editingSeries ? 'edit' : 'playlist_play'}</span>
                  {editingSeries ? 'Edit Video Series' : 'Create New Series'}
                </h3>
                <p className="text-white/80 text-sm mt-1">{editingSeries ? 'Update series details' : 'Organize your videos into a series'}</p>
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
              {/* Series Name */}
              <div>
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Series Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Physics Complete Course 2024"
                  value={formData.seriesName}
                  onChange={(e) => setFormData({ ...formData, seriesName: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
                />
              </div>

              {/* Subject & Course */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Subject *</label>
                  <input
                    type="text"
                    placeholder="e.g., Physics, Chemistry"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-purple-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Course *</label>
                  <input
                    type="text"
                    placeholder="e.g., NEET, JEE"
                    value={formData.course}
                    onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-purple-500/30"
                  />
                </div>
              </div>

              {/* Instructor & Total Videos */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Instructor</label>
                  <input
                    type="text"
                    placeholder="e.g., Dr. John Doe"
                    value={formData.instructor}
                    onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-purple-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Total Videos *</label>
                  <input
                    type="number"
                    placeholder="25"
                    value={formData.totalVideos}
                    onChange={(e) => setFormData({ ...formData, totalVideos: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-purple-500/30"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' | 'draft' })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-purple-500/30"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Description</label>
                <textarea
                  placeholder="Describe this video series..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-purple-500/30 resize-none"
                />
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
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-3 rounded-xl font-black text-sm uppercase shadow-lg hover:shadow-xl transition-all"
              >
                {editingSeries ? 'Update Series' : 'Create Series'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoSeries;

