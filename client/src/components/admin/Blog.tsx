import React, { useState, useEffect } from 'react';
import { blogAPI } from '../../services/apiClient';
import { RightSideDrawer, DrawerHeader, DrawerBody, DrawerFooter } from './DrawerSystem';
import RichTextEditor from '../shared/RichTextEditor';

interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  author: string;
  category: string;
  tags: string;
  status: 'draft' | 'published';
  featured: boolean;
  readingTime: number;
  views: number;
  publishDate: string;
  createdAt: string;
  thumbnail?: string;
  pdfUrl?: string;
}

interface Props {
  showToast: (m: string, type?: 'success' | 'error') => void;
}

const Blog: React.FC<Props> = ({ showToast }) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '', content: '', excerpt: '', author: '', category: '', tags: '',
    status: 'draft' as 'draft' | 'published', featured: false,
    publishDate: new Date().toISOString().split('T')[0], thumbnail: ''
  });

  useEffect(() => { 
    loadPosts(); 

    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const loadPosts = async () => {
    try {
      const data = await blogAPI.getAll();
      const sortedData = (Array.isArray(data) ? data : []).sort((a: any, b: any) => {
        const getTimestamp = (item: any) => {
          if (!item) return 0;
          if (item.id && typeof item.id === 'string') {
            const numStr = item.id.replace(/\D/g, '');
            if (numStr.length >= 13) {
              const parsed = parseInt(numStr.substring(0, 13));
              if (!isNaN(parsed)) return parsed;
            }
          }
          const d = new Date(item.createdAt || item.publishDate || item.createdDate || 0).getTime();
          return isNaN(d) ? 0 : d;
        };
        return getTimestamp(b) - getTimestamp(a);
      });
      setPosts(sortedData);
    } catch (error) {
      showToast('Failed to load posts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = !searchQuery || post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredPosts.length / itemsPerPage);
  const paginatedPosts = filteredPosts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      showToast('Title and content are required', 'error');
      return;
    }
    try {
      const postData = {
        id: editingPost?.id || `post_${Date.now()}`,
        title: formData.title,
        content: formData.content,
        excerpt: formData.excerpt,
        author: formData.author,
        category: formData.category,
        tags: formData.tags,
        status: formData.status as 'draft' | 'published',
        featured: formData.featured,
        publishDate: formData.publishDate,
        thumbnail: formData.thumbnail,
        createdAt: editingPost?.createdAt || new Date().toISOString()
      };

      if (editingPost) {
        await blogAPI.update(editingPost.id, postData);
        showToast('Post updated successfully!');
      } else {
        await blogAPI.create(postData);
        showToast('Post created successfully!');
      }

      setShowModal(false);
      setEditingPost(null);
      setThumbnailFile(null);
      setFormData({
        title: '', content: '', excerpt: '', author: '', category: '', tags: '',
        status: 'draft', featured: false,
        publishDate: new Date().toISOString().split('T')[0], thumbnail: ''
      });
      loadPosts();
    } catch (error) {
      showToast('Failed to save post', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this post?')) {
      try {
        await blogAPI.delete(id);
        showToast('Post deleted successfully!');
        loadPosts();
      } catch (error) {
        showToast('Failed to delete post', 'error');
      }
    }
  };

  const handleThumbnailFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file', 'error');
      return;
    }

    setIsUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      const res = await fetch('/api/v2/upload/image', { 
        method: 'POST', 
        headers: { 'x-admin-id': localStorage.getItem('adminId') || '' },
        body: formDataUpload 
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setFormData(prev => ({ ...prev, thumbnail: data.url }));
      showToast('Thumbnail uploaded successfully!');
    } catch (err) {
      console.error('Upload failed:', err);
      showToast('Thumbnail upload failed', 'error');
    } finally {
      setIsUploading(false);
    }
  };


  const openEditModal = (post: BlogPost) => {
    setEditingPost(post);
    setThumbnailFile(null);
    setFormData({
      title: post.title,
      content: post.content,
      excerpt: post.excerpt,
      author: post.author,
      category: post.category || '',
      tags: post.tags || '',
      status: post.status,
      featured: post.featured || false,
      publishDate: post.publishDate || new Date().toISOString().split('T')[0],
      thumbnail: post.thumbnail || ''
    });
    setShowModal(true);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy"></div></div>;

  return (
    <div className="space-y-4">
      {/* Header with search, add, filter */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-[17px] font-bold text-gray-800 tracking-tight">News</h3>
          <p className="text-[11px] font-medium text-gray-500 mt-0.5">Total: {posts.length}</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group w-64 lg:w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
            <input
              type="text"
              placeholder="Search by title or author..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] font-medium outline-none focus:border-navy transition-all placeholder:text-gray-400"
            />
          </div>

          <button
            onClick={() => {
              setEditingPost(null);
              setThumbnailFile(null);
              setFormData({ title: '', content: '', excerpt: '', author: '', category: '', tags: '', status: 'draft', featured: false, publishDate: new Date().toISOString().split('T')[0], thumbnail: '' });
              setShowModal(true);
            }}
            className="w-9 h-9 bg-[#1a1c1e] text-white rounded-full flex items-center justify-center shadow-lg hover:bg-black transition-all"
          >
            <span className="material-icons-outlined text-lg">add</span>
          </button>

          <div className="relative">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-gray-600 hover:bg-gray-50 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">tune</span>
              Filters
            </button>
            {isFilterOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-100 rounded-xl shadow-2xl z-[100] p-5 animate-in fade-in zoom-in duration-200 origin-top-right">
                <div className="flex justify-between items-center mb-5">
                  <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Filter Status</h4>
                  <button
                    onClick={() => { setStatusFilter('all'); setIsFilterOpen(false); }}
                    className="text-[10px] font-bold text-blue-600 hover:underline"
                  >
                    Reset
                  </button>
                </div>

                <div className="space-y-4">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Status</label>
                  <div className="flex flex-col gap-1">
                    {[
                      { id: 'all', label: 'All', icon: 'list', color: 'text-gray-500' },
                      { id: 'published', label: 'Published', icon: 'public', color: 'text-green-500' },
                      { id: 'draft', label: 'Draft', icon: 'edit_note', color: 'text-amber-500' }
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => { setStatusFilter(item.id); setIsFilterOpen(false); }}
                        className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-[12px] font-bold transition-all ${statusFilter === item.id ? 'bg-navy text-white shadow-md' : 'hover:bg-gray-50 text-gray-600'}`}
                      >
                        <span className={`material-symbols-outlined text-[18px] ${statusFilter === item.id ? 'text-white' : item.color || 'text-gray-400'}`}>{item.icon}</span>
                        {item.label}
                        {statusFilter === item.id && <span className="material-symbols-outlined text-[16px] ml-auto">check</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        {paginatedPosts.length === 0 ? (
          <div className="p-12 text-center">
            <span className="material-icons-outlined text-5xl text-gray-200 block mb-4">newspaper</span>
            <p className="text-gray-400 font-bold uppercase">No news found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-visible">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider w-20">#</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700">
                        Date & Stats
                        <span className="material-symbols-outlined text-sm">unfold_more</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700">
                        Title & Excerpt
                        <span className="material-symbols-outlined text-sm">unfold_more</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      Author Info
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedPosts.map((post, index) => (
                    <tr key={post.id} className="hover:bg-gray-50/30 transition-colors">
                      <td className="px-6 py-5 text-[13px] font-medium text-gray-600">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      <td className="px-6 py-5">
                        <div className="text-[13px] font-medium text-gray-600 mb-1">
                          {new Date(post.publishDate || post.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}
                        </div>
                        <div className="flex gap-2">
                          {post.status === 'published' ? (
                            <span className="inline-block px-2 py-0.5 bg-green-50 text-green-600 border border-green-100/50 text-[10px] font-bold rounded capitalize">Published</span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-100/50 text-[10px] font-bold rounded capitalize">Draft</span>
                          )}
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 text-gray-500 border border-gray-100/50 text-[10px] font-bold rounded">
                            <span className="material-icons-outlined text-[12px]">visibility</span> {post.views || 0}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 min-w-[240px]">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-bold text-[#4361EE] group-hover:text-blue-700 transition-colors max-w-xs truncate">{post.title}</p>
                          {post.featured && <span className="material-icons-outlined text-amber-400 text-[14px]">star</span>}
                        </div>
                        <span className="inline-block mt-1 text-gray-400 text-[11px] max-w-xs truncate">{post.excerpt || 'No excerpt'}</span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-[13px] font-medium text-gray-600">{post.author || '—'}</div>
                        <div className="text-[11px] mt-1 text-gray-400">{post.category || '—'}</div>
                      </td>
                      <td className="px-6 py-5 text-right overflow-visible">
                        <div className="relative inline-block text-left">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === post.id ? null : post.id);
                            }}
                            className={`flex items-center gap-1 px-4 py-1.5 border rounded-lg text-[11px] font-bold transition-all ${activeMenuId === post.id ? 'bg-navy text-white border-navy' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                          >
                            Actions
                            <span className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${activeMenuId === post.id ? 'rotate-180' : ''}`}>expand_more</span>
                          </button>

                          <div className={`absolute right-0 ${index >= paginatedPosts.length - 2 ? 'bottom-full mb-1 origin-bottom-right' : 'top-full mt-1 origin-top-right'} w-32 bg-white border border-gray-100 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.12)] z-[100] py-1 transition-all duration-200 ${activeMenuId === post.id ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}>
                            <button onClick={() => openEditModal(post)} className="w-full px-4 py-2.5 text-left text-[12px] font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                              <span className="material-icons-outlined text-sm">edit</span> Edit
                            </button>
                            <button onClick={() => handleDelete(post.id)} className="w-full px-4 py-2.5 text-left text-[12px] font-bold text-red-500 hover:bg-red-50 flex items-center gap-2">
                              <span className="material-icons-outlined text-sm">delete</span> Delete
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Standardized Pagination Footer */}
            {!loading && filteredPosts.length > 0 && (
              <div className="p-6 border-t border-gray-50 flex items-center justify-between bg-white rounded-b-2xl">
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
                    {Math.min(currentPage * itemsPerPage, filteredPosts.length)} of{" "}
                    {filteredPosts.length} entries
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
        )}
      </div>

      <RightSideDrawer isOpen={showModal} onClose={() => setShowModal(false)} width="600px">
        <DrawerHeader
          title={editingPost ? 'Edit News' : 'Add News'}
          onClose={() => setShowModal(false)}
        />

        <DrawerBody className="bg-[#fcfcfc]">
          <div className="space-y-6 pb-10">
            {/* Title */}
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-gray-700 ml-1">Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="News title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full h-[54px] px-5 border border-gray-200 rounded-2xl text-[15px] font-medium outline-none focus:border-navy transition-all placeholder:text-gray-300 bg-white shadow-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-gray-700 ml-1">Author</label>
                <input
                  type="text"
                  placeholder="Author name"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  className="w-full h-[54px] px-5 border border-gray-200 rounded-2xl text-[15px] font-medium outline-none focus:border-navy transition-all placeholder:text-gray-300 bg-white shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-gray-700 ml-1">Category</label>
                <input
                  type="text"
                  placeholder="e.g. Technology"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full h-[54px] px-5 border border-gray-200 rounded-2xl text-[15px] font-medium outline-none focus:border-navy transition-all placeholder:text-gray-300 bg-white shadow-sm"
                />
              </div>
            </div>

            {/* Excerpt */}
            <div className="space-y-3">
              <label className="text-[14px] font-bold text-gray-700 ml-1 uppercase tracking-wider">Excerpt</label>
              <textarea
                placeholder="Short summary"
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                rows={2}
                className="w-full h-[90px] px-5 py-4 border border-gray-200 rounded-xl text-[14px] font-medium outline-none focus:border-navy transition-all resize-none placeholder:text-gray-300 bg-white shadow-sm"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[14px] font-bold text-gray-700 ml-1 uppercase tracking-wider">Content <span className="text-red-500">*</span></label>
              <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                <RichTextEditor
                  content={formData.content}
                  onChange={(html) => setFormData({ ...formData, content: html })}
                  height="450px"
                />
              </div>
            </div>

            {/* Media Uploads */}
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-3">
                <label className="text-[14px] font-bold text-gray-700 ml-1 uppercase tracking-wider">Thumbnail Image</label>
                <div
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files[0]) handleThumbnailFile(e.dataTransfer.files[0]);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  className="w-full border border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-navy hover:bg-gray-50 transition-all bg-white flex flex-col justify-center min-h-[200px] shadow-sm"
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files && handleThumbnailFile(e.target.files[0])}
                    className="hidden"
                    id="thumbnail-input"
                  />
                  <label htmlFor="thumbnail-input" className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                    {isUploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 border-4 border-navy border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-[12px] font-bold text-gray-400">Uploading...</p>
                      </div>
                    ) : formData.thumbnail ? (
                      <div className="flex flex-col items-center gap-2 w-full h-full relative">
                        <img src={formData.thumbnail} alt="Preview" className="w-full h-full object-cover rounded-lg opacity-40" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                          <span className="material-icons-outlined text-navy text-3xl">check_circle</span>
                          <p className="text-[11px] font-bold text-navy bg-white/80 px-2 py-1 rounded">Image Selected</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <span className="material-icons-outlined text-gray-200 text-3xl font-light">image</span>
                        <p className="text-[12px] font-bold text-gray-400 leading-tight">Drop image or click here</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-gray-700 ml-1">Status</label>
                <div className="flex bg-[#f8fafc] p-1.5 rounded-[20px] w-full border border-gray-100 h-[54px]">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'draft' })}
                    className={`flex-1 text-[13px] font-bold rounded-xl transition-all ${formData.status === 'draft' ? 'bg-white text-gray-900 shadow-sm border border-gray-100/50' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'published' })}
                    className={`flex-1 text-[13px] font-bold rounded-xl transition-all ${formData.status === 'published' ? 'bg-white text-gray-900 shadow-sm border border-gray-100/50' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    Published
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-bold text-gray-700 ml-1">Tags</label>
                <input
                  type="text"
                  placeholder="Comma separated"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full h-[54px] px-5 border border-gray-200 rounded-2xl text-[15px] font-medium outline-none focus:border-navy transition-all bg-white shadow-sm placeholder:text-gray-300"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-bold text-gray-700 ml-1">Publish Date</label>
                <input
                  type="date"
                  value={formData.publishDate}
                  onChange={(e) => setFormData({ ...formData, publishDate: e.target.value })}
                  className="w-full h-[54px] px-5 border border-gray-200 rounded-2xl text-[15px] font-medium outline-none focus:border-navy transition-all bg-white shadow-sm text-gray-700"
                />
              </div>


              <div className="space-y-2 flex items-center h-full pt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-200 accent-navy"
                  />
                  <span className="text-[13px] font-bold text-gray-700">Featured News</span>
                </label>
              </div>

            </div>

            <div className="flex gap-4 pt-8 mt-10 border-t border-gray-100">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-white border border-gray-200 text-gray-500 h-[56px] rounded-xl font-black uppercase hover:bg-gray-50 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 bg-[#1A237E] text-white h-[56px] rounded-xl font-black uppercase hover:bg-[#151b60] transition-all shadow-lg active:scale-95"
              >
                {editingPost ? 'Update News' : 'Create News'}
              </button>
            </div>

          </div>
        </DrawerBody>
      </RightSideDrawer>
    </div>
  );
};

export default Blog;

