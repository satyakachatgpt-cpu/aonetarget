import React, { useState, useEffect } from 'react';
import { questionsAPI } from '../../services/apiClient';

interface Passage {
  id: string;
  title: string;
  content: string;
  subject: string;
  topic: string;
  type: 'comprehension' | 'case-study' | 'poem' | 'article' | 'story';
  difficulty: 'easy' | 'medium' | 'hard';
  questionsCount: number;
  language: 'english' | 'hindi' | 'regional';
  createdDate: string;
}

interface Props {
  showToast: (m: string, type?: 'success' | 'error') => void;
}

const Passages: React.FC<Props> = ({ showToast }) => {
  const [passages, setPassages] = useState<Passage[]>([]);
  const [filteredPassages, setFilteredPassages] = useState<Passage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedPassages, setSelectedPassages] = useState<string[]>([]);
  const filterDropdownRef = React.useRef<HTMLDivElement>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPassage, setEditingPassage] = useState<Passage | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    subject: '',
    topic: '',
    type: 'comprehension' as 'comprehension' | 'case-study' | 'poem' | 'article' | 'story',
    difficulty: 'easy' as 'easy' | 'medium' | 'hard',
    questionsCount: '',
    language: 'english' as 'english' | 'hindi' | 'regional'
  });

  const subjects = ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'English', 'History', 'Geography'];
  const topics = ['Kinematics', 'Thermodynamics', 'Optics', 'Atomic Structure', 'Organic Chemistry', 'Cell Division', 'Algebra', 'Geometry', 'Literature', 'Social Studies'];

  useEffect(() => {
    loadPassages();
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let filtered = passages;

    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (subjectFilter !== 'all') {
      filtered = filtered.filter(p => p.subject === subjectFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(p => p.type === typeFilter);
    }

    setFilteredPassages(filtered);
    setCurrentPage(1);
  }, [passages, searchQuery, subjectFilter, typeFilter]);

  const totalPages = Math.ceil(filteredPassages.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPassages = filteredPassages.slice(startIndex, endIndex);

  const loadPassages = async () => {
    try {
      setLoading(true);
      const data = await questionsAPI.getAll();
      // Filter only passages from the questions collection
      const passageData = Array.isArray(data) ? data.filter((item: any) => item.type === 'passage') : [];
      setPassages(passageData as Passage[]);
    } catch (error) {
      console.log('Starting with empty state - MongoDB may not have data yet');
      setPassages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPassage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.content || !formData.subject) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    try {
      const passageData: Passage = {
        id: editingPassage?.id || `P-${String(Date.now()).slice(-6)}`,
        title: formData.title,
        content: formData.content,
        subject: formData.subject,
        topic: formData.topic,
        type: formData.type,
        difficulty: formData.difficulty,
        questionsCount: parseInt(formData.questionsCount) || 0,
        language: formData.language,
        createdDate: editingPassage?.createdDate || new Date().toISOString().split('T')[0]
      };

      console.log('Adding passage:', passageData);

      if (editingPassage) {
        await questionsAPI.update(editingPassage.id, passageData);
        setPassages(passages.map(p => p.id === editingPassage.id ? passageData : p));
        showToast('Passage updated successfully!', 'success');
      } else {
        await questionsAPI.create(passageData);
        setPassages([...passages, passageData]);
        showToast('Passage created successfully!', 'success');
      }

      resetForm();
      setShowAddModal(false);
    } catch (error) {
      console.error('Error saving passage:', error);
      showToast('Failed to save passage', 'error');
    }
  };

  const handleDeletePassage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this passage?')) {
      return;
    }

    try {
      console.log('Deleting passage:', id);
      await questionsAPI.delete(id);
      setPassages(passages.filter(p => p.id !== id));
      showToast('Passage deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting passage:', error);
      showToast('Failed to delete passage', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPassages.length === 0) return;
    if (!confirm(`Delete ${selectedPassages.length} selected passage(s)?`)) return;

    try {
      await Promise.all(selectedPassages.map(id => questionsAPI.delete(id)));
      setPassages(passages.filter(p => !selectedPassages.includes(p.id)));
      setSelectedPassages([]);
      showToast(`${selectedPassages.length} passage(s) deleted successfully!`, 'success');
    } catch (error) {
      console.error('Error deleting passages:', error);
      showToast('Failed to delete passages', 'error');
    }
  };

  const handleEditClick = (passage: Passage) => {
    setEditingPassage(passage);
    setFormData({
      title: passage.title,
      content: passage.content,
      subject: passage.subject,
      topic: passage.topic,
      type: passage.type,
      difficulty: passage.difficulty,
      questionsCount: passage.questionsCount.toString(),
      language: passage.language
    });
    setShowAddModal(true);
  };

  const toggleSelectAll = () => {
    if (selectedPassages.length === paginatedPassages.length) {
      setSelectedPassages([]);
    } else {
      setSelectedPassages(paginatedPassages.map(p => p.id));
    }
  };

  const toggleSelectPassage = (id: string) => {
    setSelectedPassages(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      subject: '',
      topic: '',
      type: 'comprehension',
      difficulty: 'easy',
      questionsCount: '',
      language: 'english'
    });
    setEditingPassage(null);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-600';
      case 'medium': return 'bg-yellow-100 text-yellow-600';
      case 'hard': return 'bg-red-100 text-red-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'comprehension': return 'bg-blue-100 text-blue-600';
      case 'case-study': return 'bg-purple-100 text-purple-600';
      case 'poem': return 'bg-pink-100 text-pink-600';
      case 'article': return 'bg-indigo-100 text-indigo-600';
      case 'story': return 'bg-orange-100 text-orange-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-navy">Passages Management</h2>
          <p className="text-sm text-gray-500 mt-1">Manage reading passages and comprehension materials</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {selectedPassages.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-500 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-red-600 transition-colors flex items-center gap-2"
            >
              <span className="material-icons-outlined text-lg">delete</span>
              Delete ({selectedPassages.length})
            </button>
          )}
          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="px-6 py-3 bg-navy text-white text-sm font-bold rounded-xl hover:bg-navy/90 transition-colors flex items-center gap-2"
          >
            <span className="material-icons-outlined text-lg">add</span>
            Add Passage
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col md:flex-row gap-4 items-center bg-gray-50/30">
        <div className="flex-1 relative group">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[20px] group-focus-within:text-navy transition-colors">search</span>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-[14px] font-bold outline-none focus:border-navy focus:ring-4 focus:ring-navy/5 transition-all shadow-sm placeholder:text-gray-400"
            placeholder="Search by title, content or ID..."
          />
        </div>

        <div className="relative" ref={filterDropdownRef}>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center gap-2 px-6 py-3 border rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all shadow-sm ${isFilterOpen || subjectFilter !== 'all' || typeFilter !== 'all' ? 'bg-navy text-white border-navy shadow-lg shadow-navy/20' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
            Advanced Filters
            {(subjectFilter !== 'all' || typeFilter !== 'all') && (
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            )}
          </button>

          {isFilterOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-100 rounded-2xl shadow-2xl z-[200] p-6 animate-in fade-in zoom-in duration-200 origin-top-right">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Filter Passages</h4>
                <button
                  onClick={() => { setSubjectFilter('all'); setTypeFilter('all'); }}
                  className="text-[10px] font-bold text-blue-600 hover:underline"
                >
                  Reset All
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Subject</label>
                  <div className="flex flex-wrap gap-1.5">
                    {['all', 'Physics', 'Chemistry', 'Biology', 'English'].map((sub) => (
                      <button
                        key={sub}
                        onClick={() => setSubjectFilter(sub)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${subjectFilter === sub ? 'bg-navy text-white shadow-md' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Passage Type</label>
                  <div className="flex flex-wrap gap-1.5">
                    {['all', 'comprehension', 'case-study', 'poem', 'article', 'story'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setTypeFilter(type)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${typeFilter === type ? 'bg-navy text-white shadow-md' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                      >
                        {type.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-gray-50">
                <button onClick={() => setIsFilterOpen(false)} className="w-full py-3 bg-gray-50 text-navy text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-gray-100 transition-all">
                  Show {filteredPassages.length} Results
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy mx-auto mb-2"></div>
              Loading passages...
            </div>
          ) : filteredPassages.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <span className="material-icons-outlined text-6xl text-gray-200 mb-2 block">description</span>
              No passages found
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedPassages.length === paginatedPassages.length && paginatedPassages.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-navy"
                    />
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Questions</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Difficulty</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Language</th>
                  <th className="px-4 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedPassages.map((passage, index) => (
                  <tr key={passage.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedPassages.includes(passage.id)}
                        onChange={() => toggleSelectPassage(passage.id)}
                        className="w-4 h-4 rounded border-gray-300 text-navy"
                      />
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-600">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-semibold text-navy line-clamp-2">{passage.title}</span>
                      <span className="text-xs text-gray-400 mt-1 block">ID: {passage.id}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600">{passage.subject}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-bold capitalize ${getTypeColor(passage.type)}`}>
                        {passage.type.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-bold text-navy">{passage.questionsCount}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-bold capitalize ${getDifficultyColor(passage.difficulty)}`}>
                        {passage.difficulty}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600 capitalize">{passage.language}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditClick(passage)}
                          className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <span className="material-icons-outlined text-lg">edit</span>
                        </button>
                        <button
                          onClick={() => handleDeletePassage(passage.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <span className="material-icons-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {filteredPassages.length > 0 && (
          <div className="p-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Show</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(parseInt(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-navy/20"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
            </div>
            <p className="text-sm text-gray-500">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredPassages.length)} of {filteredPassages.length} entries
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-2 bg-gray-100 text-navy text-sm font-bold rounded-lg disabled:opacity-50"
              >
                First
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-10 h-10 text-sm font-bold rounded-lg ${currentPage === pageNum
                        ? 'bg-navy text-white'
                        : 'bg-gray-100 text-navy hover:bg-gray-200'
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 bg-gray-100 text-navy text-sm font-bold rounded-lg disabled:opacity-50"
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-xl font-black text-navy uppercase">
                {editingPassage ? 'Edit Passage' : 'Add New Passage'}
              </h3>
              <button
                onClick={() => { resetForm(); setShowAddModal(false); }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="material-icons-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleAddPassage} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Passage Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-navy/20"
                  placeholder="Enter passage title"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Passage Content *</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-navy/20 resize-none"
                  placeholder="Enter the full passage text"
                  rows={6}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Subject *</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-navy/20"
                    required
                  >
                    <option value="">Select Subject</option>
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Topic</label>
                  <select
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-navy/20"
                  >
                    <option value="">Select Topic</option>
                    {topics.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Passage Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-navy/20"
                    required
                  >
                    <option value="comprehension">Comprehension</option>
                    <option value="case-study">Case Study</option>
                    <option value="poem">Poem</option>
                    <option value="article">Article</option>
                    <option value="story">Story</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Language</label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value as any })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-navy/20"
                  >
                    <option value="english">English</option>
                    <option value="hindi">Hindi</option>
                    <option value="regional">Regional</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Difficulty Level</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-navy/20"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Number of Questions</label>
                  <input
                    type="number"
                    value={formData.questionsCount}
                    onChange={(e) => setFormData({ ...formData, questionsCount: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-navy/20"
                    placeholder="Number of questions in this passage"
                    min="0"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { resetForm(); setShowAddModal(false); }}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-600 text-sm font-bold rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-navy text-white text-sm font-bold rounded-lg hover:bg-navy/90 transition-colors"
                >
                  {editingPassage ? 'Update Passage' : 'Add Passage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Passages;

