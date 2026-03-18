import React, { useState, useEffect } from 'react';
import { subjectiveTestsAPI } from '../../services/apiClient';

interface SubjectiveTest {
  id: string;
  title: string;
  course: string;
  totalQuestions: number;
  evaluationPending: number;
  status: 'active' | 'inactive' | 'draft';
  createdDate: string;
  studentsEnrolled: number;
}

interface Props {
  showToast: (m: string, type?: 'success' | 'error') => void;
}

const SubjectiveTest: React.FC<Props> = ({ showToast }) => {
  const [tests, setTests] = useState<SubjectiveTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTest, setEditingTest] = useState<SubjectiveTest | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    course: '',
    totalQuestions: '',
    status: 'draft' as 'active' | 'inactive' | 'draft'
  });

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    try {
      // Try to load from API (database)
      const data = await subjectiveTestsAPI.getAll().catch(() => []);
      setTests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log('Starting with empty state - MongoDB may not have data yet');
      setTests([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredTests = tests.filter(test => {
    const matchesSearch = !searchQuery || (test.title && test.title.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = !filterStatus || test.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredTests.length / itemsPerPage);
  const paginatedTests = filteredTests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleOpenModal = (test?: SubjectiveTest) => {
    if (test) {
      setEditingTest(test);
      setFormData({
        title: test.title,
        course: test.course,
        totalQuestions: test.totalQuestions.toString(),
        status: test.status
      });
    } else {
      setEditingTest(null);
      setFormData({ title: '', course: '', totalQuestions: '', status: 'draft' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTest(null);
    setFormData({ title: '', course: '', totalQuestions: '', status: 'draft' });
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.course || !formData.totalQuestions) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    try {
      const testData = {
        id: editingTest?.id || `subtest_${Date.now()}`,
        title: formData.title,
        course: formData.course,
        totalQuestions: parseInt(formData.totalQuestions),
        status: formData.status,
        createdDate: editingTest?.createdDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        evaluationPending: editingTest?.evaluationPending || 0,
        studentsEnrolled: editingTest?.studentsEnrolled || 0
      };

      console.log('Sending subjective test data:', testData);

      if (editingTest) {
        // Update existing test
        try {
          await subjectiveTestsAPI.update(editingTest.id, testData);
          setTests(tests.map(t => t.id === editingTest.id ? testData : t));
          showToast('Subjective test updated successfully!');
        } catch (apiError) {
          console.error('API update error:', apiError);
          // Fallback: just update state if API fails
          setTests(tests.map(t => t.id === editingTest.id ? testData : t));
          showToast('Test updated (local only)');
        }
      } else {
        // Add new test to API and state
        try {
          await subjectiveTestsAPI.create(testData);
          setTests([...tests, testData]);
          showToast('Subjective test created successfully!');
        } catch (apiError) {
          console.error('API create error:', apiError);
          // Fallback: just update state if API fails
          setTests([...tests, testData]);
          showToast('Test created (local only)');
        }
      }

      handleCloseModal();
    } catch (error) {
      console.error('Test save error:', error);
      showToast(`Error: ${error instanceof Error ? error.message : 'Failed to save test'}`, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this test?')) {
      try {
        await subjectiveTestsAPI.delete(id);
        setTests(tests.filter(t => t.id !== id));
        showToast('Subjective test deleted successfully!');
      } catch (error) {
        showToast('Failed to delete test', 'error');
      }
    }
  };

  const toggleSelectAll = () => {
    if (selectedTests.length === paginatedTests.length) {
      setSelectedTests([]);
    } else {
      setSelectedTests(paginatedTests.map(t => t.id));
    }
  };

  const toggleSelectTest = (id: string) => {
    setSelectedTests(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedTests.length === 0) return;
    if (confirm(`Delete ${selectedTests.length} selected tests?`)) {
      try {
        await Promise.all(selectedTests.map(id => subjectiveTestsAPI.delete(id)));
        setTests(tests.filter(t => !selectedTests.includes(t.id)));
        setSelectedTests([]);
        showToast(`${selectedTests.length} tests deleted!`);
      } catch (error) {
        showToast('Failed to delete tests', 'error');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-navy">Subjective Tests</h2>
          <p className="text-sm text-gray-500 mt-1">Manage essay and answer-based exams</p>
        </div>
        <div className="flex gap-3">
          {selectedTests.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-500 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-red-600 transition-colors flex items-center gap-2"
            >
              <span className="material-icons-outlined text-lg">delete</span>
              Delete ({selectedTests.length})
            </button>
          )}
          <button
            onClick={() => handleOpenModal()}
            className="bg-navy text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-navy/90 transition-colors flex items-center gap-2"
          >
            <span className="material-icons-outlined text-lg">add</span>
            Create Subjective Test
          </button>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Filters Row */}
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Show</span>
            <select
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-navy/20"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            className="border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-navy/20 min-w-[150px]"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="draft">Draft</option>
          </select>

          <div className="flex-1"></div>

          <div className="relative">
            <span className="material-icons-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
            <input
              type="text"
              placeholder="Search test..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-navy/20 w-48"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-4 text-left">
                  <input
                    type="checkbox"
                    checked={selectedTests.length === paginatedTests.length && paginatedTests.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-navy focus:ring-navy"
                  />
                </th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Test Title</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Course</th>
                <th className="px-4 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Questions</th>
                <th className="px-4 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Pending Eval</th>
                <th className="px-4 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Students</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedTests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <span className="material-icons-outlined text-6xl text-gray-200 mb-2 block">description</span>
                    <p className="text-gray-400 font-medium">No subjective tests found</p>
                  </td>
                </tr>
              ) : (
                paginatedTests.map((test, index) => (
                  <tr key={test.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedTests.includes(test.id)}
                        onChange={() => toggleSelectTest(test.id)}
                        className="w-4 h-4 rounded border-gray-300 text-navy focus:ring-navy"
                      />
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-600">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-semibold text-navy">{test.title}</span>
                      <p className="text-xs text-gray-400 mt-0.5">Created: {test.createdDate}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">{test.course}</td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-block bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-xs font-bold">{test.totalQuestions}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-block bg-orange-50 text-orange-600 px-3 py-1 rounded-lg text-xs font-bold">{test.evaluationPending}</span>
                    </td>
                    <td className="px-4 py-4 text-center text-sm font-bold text-gray-600">{test.studentsEnrolled}</td>
                    <td className="px-4 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        test.status === 'active'
                          ? 'bg-green-100 text-green-600'
                          : test.status === 'draft'
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {test.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenModal(test)}
                          className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <span className="material-icons-outlined text-lg">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(test.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <span className="material-icons-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredTests.length > 0 && (
          <div className="p-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredTests.length)} of {filteredTests.length} entries
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
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
                    className={`w-10 h-10 text-sm font-bold rounded-lg ${
                      currentPage === pageNum
                        ? 'bg-navy text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={handleCloseModal}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-black text-navy uppercase tracking-wide">
                {editingTest ? 'Edit Test' : 'Create Subjective Test'}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Test Title *</label>
                <input
                  type="text"
                  placeholder="Enter test title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl text-sm font-medium outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Course *</label>
                  <select
                    value={formData.course}
                    onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl text-sm font-medium outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition-all"
                  >
                    <option value="">Select Course</option>
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                    <option value="History">History</option>
                    <option value="Science">Science</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Social Studies">Social Studies</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Questions *</label>
                  <input
                    type="number"
                    placeholder="Number of questions"
                    value={formData.totalQuestions}
                    onChange={(e) => setFormData({ ...formData, totalQuestions: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl text-sm font-medium outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl text-sm font-medium outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition-all"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-4">
              <button
                onClick={handleCloseModal}
                className="flex-1 bg-gray-100 text-gray-600 py-3.5 rounded-xl font-bold text-sm uppercase hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 bg-navy text-white py-3.5 rounded-xl font-bold text-sm uppercase hover:bg-navy/90 transition-colors"
              >
                {editingTest ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectiveTest;

