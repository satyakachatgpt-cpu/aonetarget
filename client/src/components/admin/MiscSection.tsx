import React, { useState, useEffect } from 'react';
import { 
  coursesAPI, subjectsAPI, topicsAPI, subcoursesAPI, 
  instructionsAPI, examDocumentsAPI, newsAPI, notificationsAPI, getAdminHeaders
} from '../../services/apiClient';

interface Props {
  showToast: (m: string, type?: 'success' | 'error') => void;
}

type ModalType = 'courses' | 'subcourses' | 'subjects' | 'topics' | 'instructions' | 'examdocs' | 'news' | 'notifications' | null;

interface Student {
  id: string;
  name: string;
  email: string;
  enrolledCourses?: string[];
}

interface Course {
  id: string;
  name: string;
}

const MiscSection: React.FC<Props> = ({ showToast }) => {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [counts, setCounts] = useState({ courses: 0, subcourses: 0, subjects: 0, topics: 0, instructions: 0, examdocs: 0, news: 0, notifications: 0 });
  
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  const [instructionForm, setInstructionForm] = useState({ title: '', content: '', order: 1, isActive: true, category: 'general' });
  const [examDocForm, setExamDocForm] = useState({ title: '', description: '', fileUrl: '', category: 'syllabus', fileType: 'pdf' });
  const [newsForm, setNewsForm] = useState({ title: '', message: '', imageUrl: '', showAsModal: true, priority: 'normal', expiryDate: '' });
  const [notificationForm, setNotificationForm] = useState({ 
    title: '', message: '', targetType: 'all' as 'all' | 'selected' | 'course', 
    selectedStudentIds: [] as string[], courseId: '' 
  });
  const [genericForm, setGenericForm] = useState({ name: '', description: '' });

  useEffect(() => {
    loadCounts();
    loadStudentsAndCourses();
  }, []);

  const loadStudentsAndCourses = async () => {
    try {
      const [studentsRes, coursesRes] = await Promise.all([
        fetch('/api/students', { headers: getAdminHeaders() }).then(r => r.json()),
        coursesAPI.getAll()
      ]);
      setStudents(Array.isArray(studentsRes) ? studentsRes : []);
      setCourses(Array.isArray(coursesRes) ? coursesRes : []);
    } catch (error) {
      console.error('Failed to load students/courses');
    }
  };

  const loadCounts = async () => {
    try {
      const [courses, subjects, topics, subcourses, instructions, examdocs, news, notifications] = await Promise.all([
        coursesAPI.getAll().catch(() => []),
        subjectsAPI.getAll().catch(() => []),
        topicsAPI.getAll().catch(() => []),
        subcoursesAPI.getAll().catch(() => []),
        instructionsAPI.getAll().catch(() => []),
        examDocumentsAPI.getAll().catch(() => []),
        newsAPI.getAll().catch(() => []),
        notificationsAPI.getAll().catch(() => [])
      ]);
      setCounts({
        courses: courses.length,
        subcourses: subcourses.length,
        subjects: subjects.length,
        topics: topics.length,
        instructions: instructions.length,
        examdocs: examdocs.length,
        news: news.length,
        notifications: notifications.length
      });
    } catch (error) {
      console.error('Failed to load counts');
    }
  };

  const menuItems = [
    { name: 'Courses', key: 'courses', icon: 'auto_stories', color: 'bg-blue-600', count: counts.courses, desc: 'Manage course categories' },
    { name: 'Sub Courses', key: 'subcourses', icon: 'collections_bookmark', color: 'bg-indigo-600', count: counts.subcourses, desc: 'Course sub-sections' },
    { name: 'Subjects', key: 'subjects', icon: 'science', color: 'bg-purple-600', count: counts.subjects, desc: 'Subject management' },
    { name: 'Topics', key: 'topics', icon: 'list_alt', color: 'bg-violet-600', count: counts.topics, desc: 'Topic organization' },
    { name: 'Instructions', key: 'instructions', icon: 'help_outline', color: 'bg-pink-600', count: counts.instructions, desc: 'Test/exam instructions' },
    { name: 'Exam Documents', key: 'examdocs', icon: 'folder_shared', color: 'bg-orange-600', count: counts.examdocs, desc: 'Syllabus, papers, etc.' },
    { name: 'Global News', key: 'news', icon: 'campaign', color: 'bg-teal-600', count: counts.news, desc: 'App announcements' },
    { name: 'Push Notify', key: 'notifications', icon: 'notifications_active', color: 'bg-amber-600', count: counts.notifications, desc: 'Send notifications' },
  ];

  const getAPI = (type: ModalType) => {
    switch (type) {
      case 'courses': return coursesAPI;
      case 'subcourses': return subcoursesAPI;
      case 'subjects': return subjectsAPI;
      case 'topics': return topicsAPI;
      case 'instructions': return instructionsAPI;
      case 'examdocs': return examDocumentsAPI;
      case 'news': return newsAPI;
      case 'notifications': return notificationsAPI;
      default: return null;
    }
  };

  const openModal = async (type: ModalType) => {
    if (!type) return;
    setActiveModal(type);
    setLoading(true);
    resetForms();
    setCurrentPage(1);
    try {
      const api = getAPI(type);
      if (api) {
        const data = await api.getAll();
        setItems(data);
      }
    } catch (error) {
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForms = () => {
    setInstructionForm({ title: '', content: '', order: 1, isActive: true, category: 'general' });
    setExamDocForm({ title: '', description: '', fileUrl: '', category: 'syllabus', fileType: 'pdf' });
    setNewsForm({ title: '', message: '', imageUrl: '', showAsModal: true, priority: 'normal', expiryDate: '' });
    setNotificationForm({ title: '', message: '', targetType: 'all', selectedStudentIds: [], courseId: '' });
    setGenericForm({ name: '', description: '' });
    setSelectedStudents([]);
  };

  const handleCreateInstruction = async () => {
    if (!instructionForm.title || !instructionForm.content) {
      showToast('Please fill title and content', 'error');
      return;
    }
    try {
      await instructionsAPI.create({
        id: `inst_${Date.now()}`,
        ...instructionForm,
        createdAt: new Date().toISOString()
      });
      showToast('Instruction created!');
      openModal('instructions');
      loadCounts();
    } catch (error) {
      showToast('Failed to create instruction', 'error');
    }
  };

  const handleCreateExamDoc = async () => {
    if (!examDocForm.title || !examDocForm.fileUrl) {
      showToast('Please fill title and file URL', 'error');
      return;
    }
    try {
      await examDocumentsAPI.create({
        id: `examdoc_${Date.now()}`,
        ...examDocForm,
        downloads: 0,
        createdAt: new Date().toISOString()
      });
      showToast('Document uploaded!');
      openModal('examdocs');
      loadCounts();
    } catch (error) {
      showToast('Failed to upload document', 'error');
    }
  };

  const handleCreateNews = async () => {
    if (!newsForm.title || !newsForm.message) {
      showToast('Please fill title and message', 'error');
      return;
    }
    try {
      await newsAPI.create({
        id: `news_${Date.now()}`,
        ...newsForm,
        isActive: true,
        createdAt: new Date().toISOString()
      });
      showToast('News published!');
      openModal('news');
      loadCounts();
    } catch (error) {
      showToast('Failed to publish news', 'error');
    }
  };

  const handleSendNotification = async () => {
    if (!notificationForm.title || !notificationForm.message) {
      showToast('Please fill title and message', 'error');
      return;
    }
    
    let targetStudents: string[] = [];
    if (notificationForm.targetType === 'all') {
      targetStudents = students.map(s => s.id);
    } else if (notificationForm.targetType === 'selected') {
      targetStudents = selectedStudents;
    } else if (notificationForm.targetType === 'course' && notificationForm.courseId) {
      targetStudents = students
        .filter(s => s.enrolledCourses?.includes(notificationForm.courseId))
        .map(s => s.id);
    }

    if (targetStudents.length === 0) {
      showToast('No students to send notification to', 'error');
      return;
    }

    try {
      await notificationsAPI.create({
        id: `notif_${Date.now()}`,
        title: notificationForm.title,
        message: notificationForm.message,
        targetType: notificationForm.targetType,
        targetStudents,
        courseId: notificationForm.courseId || null,
        sentAt: new Date().toISOString(),
        status: 'sent',
        readBy: []
      });
      showToast(`Notification sent to ${targetStudents.length} students!`);
      openModal('notifications');
      loadCounts();
    } catch (error) {
      showToast('Failed to send notification', 'error');
    }
  };

  const handleCreateGeneric = async () => {
    if (!activeModal || !genericForm.name) {
      showToast('Please fill the name', 'error');
      return;
    }
    try {
      const api = getAPI(activeModal);
      if (api) {
        await api.create({
          id: `${activeModal}_${Date.now()}`,
          name: genericForm.name,
          description: genericForm.description || '',
          createdAt: new Date().toISOString()
        });
        showToast('Created successfully!');
        setGenericForm({ name: '', description: '' });
        openModal(activeModal);
        loadCounts();
      }
    } catch (error) {
      showToast('Failed to create', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!activeModal || !confirm('Are you sure you want to delete this?')) return;
    try {
      const api = getAPI(activeModal);
      if (api) {
        await api.delete(id);
        showToast('Deleted successfully!');
        openModal(activeModal);
        loadCounts();
      }
    } catch (error) {
      showToast('Failed to delete', 'error');
    }
  };

  const getModalTitle = () => {
    const item = menuItems.find(i => i.key === activeModal);
    return item?.name || '';
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const renderInstructionsForm = () => (
    <div className="space-y-4 mb-6 p-5 bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl border border-pink-100">
      <p className="text-xs font-black text-pink-600 uppercase tracking-wider flex items-center gap-2">
        <span className="material-icons-outlined text-sm">add_circle</span>
        Add New Instruction
      </p>
      <input
        type="text"
        placeholder="Instruction Title *"
        value={instructionForm.title}
        onChange={(e) => setInstructionForm({ ...instructionForm, title: e.target.value })}
        className="w-full bg-white border border-gray-200 p-3 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-pink-300"
      />
      <textarea
        placeholder="Instruction Content (can include multiple points) *"
        value={instructionForm.content}
        onChange={(e) => setInstructionForm({ ...instructionForm, content: e.target.value })}
        rows={4}
        className="w-full bg-white border border-gray-200 p-3 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-pink-300"
      />
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Category</label>
          <select
            value={instructionForm.category}
            onChange={(e) => setInstructionForm({ ...instructionForm, category: e.target.value })}
            className="w-full bg-white border border-gray-200 p-3 rounded-xl text-sm font-semibold outline-none"
          >
            <option value="general">General</option>
            <option value="test">Test Rules</option>
            <option value="exam">Exam Guidelines</option>
            <option value="payment">Payment</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Order</label>
          <input
            type="number"
            min="1"
            value={instructionForm.order}
            onChange={(e) => setInstructionForm({ ...instructionForm, order: parseInt(e.target.value) || 1 })}
            className="w-full bg-white border border-gray-200 p-3 rounded-xl text-sm font-semibold outline-none"
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={instructionForm.isActive}
              onChange={(e) => setInstructionForm({ ...instructionForm, isActive: e.target.checked })}
              className="w-5 h-5 text-pink-600 rounded"
            />
            <span className="text-sm font-semibold">Active</span>
          </label>
        </div>
      </div>
      <button onClick={handleCreateInstruction} className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
        <span className="material-icons-outlined text-sm">add</span>
        Add Instruction
      </button>
    </div>
  );

  const renderExamDocsForm = () => (
    <div className="space-y-4 mb-6 p-5 bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl border border-orange-100">
      <p className="text-xs font-black text-orange-600 uppercase tracking-wider flex items-center gap-2">
        <span className="material-icons-outlined text-sm">upload_file</span>
        Upload Document
      </p>
      <input
        type="text"
        placeholder="Document Title *"
        value={examDocForm.title}
        onChange={(e) => setExamDocForm({ ...examDocForm, title: e.target.value })}
        className="w-full bg-white border border-gray-200 p-3 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-orange-300"
      />
      <textarea
        placeholder="Description"
        value={examDocForm.description}
        onChange={(e) => setExamDocForm({ ...examDocForm, description: e.target.value })}
        rows={2}
        className="w-full bg-white border border-gray-200 p-3 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-orange-300"
      />
      <input
        type="url"
        placeholder="File URL (Google Drive, Dropbox link) *"
        value={examDocForm.fileUrl}
        onChange={(e) => setExamDocForm({ ...examDocForm, fileUrl: e.target.value })}
        className="w-full bg-white border border-gray-200 p-3 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-orange-300"
      />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Category</label>
          <select
            value={examDocForm.category}
            onChange={(e) => setExamDocForm({ ...examDocForm, category: e.target.value })}
            className="w-full bg-white border border-gray-200 p-3 rounded-xl text-sm font-semibold outline-none"
          >
            <option value="syllabus">Syllabus</option>
            <option value="previous_paper">Previous Year Paper</option>
            <option value="sample_paper">Sample Paper</option>
            <option value="notes">Study Notes</option>
            <option value="formula">Formula Sheet</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">File Type</label>
          <select
            value={examDocForm.fileType}
            onChange={(e) => setExamDocForm({ ...examDocForm, fileType: e.target.value })}
            className="w-full bg-white border border-gray-200 p-3 rounded-xl text-sm font-semibold outline-none"
          >
            <option value="pdf">PDF</option>
            <option value="doc">Word Document</option>
            <option value="image">Image</option>
            <option value="zip">ZIP Archive</option>
          </select>
        </div>
      </div>
      <button onClick={handleCreateExamDoc} className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
        <span className="material-icons-outlined text-sm">cloud_upload</span>
        Upload Document
      </button>
    </div>
  );

  const renderNewsForm = () => (
    <div className="space-y-4 mb-6 p-5 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-2xl border border-teal-100">
      <p className="text-xs font-black text-teal-600 uppercase tracking-wider flex items-center gap-2">
        <span className="material-icons-outlined text-sm">campaign</span>
        Publish News/Announcement
      </p>
      <input
        type="text"
        placeholder="News Title *"
        value={newsForm.title}
        onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
        className="w-full bg-white border border-gray-200 p-3 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-teal-300"
      />
      <textarea
        placeholder="News Message/Content *"
        value={newsForm.message}
        onChange={(e) => setNewsForm({ ...newsForm, message: e.target.value })}
        rows={3}
        className="w-full bg-white border border-gray-200 p-3 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-teal-300"
      />
      <input
        type="url"
        placeholder="Image URL (optional)"
        value={newsForm.imageUrl}
        onChange={(e) => setNewsForm({ ...newsForm, imageUrl: e.target.value })}
        className="w-full bg-white border border-gray-200 p-3 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-teal-300"
      />
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Priority</label>
          <select
            value={newsForm.priority}
            onChange={(e) => setNewsForm({ ...newsForm, priority: e.target.value })}
            className="w-full bg-white border border-gray-200 p-3 rounded-xl text-sm font-semibold outline-none"
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High (Urgent)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Expiry Date</label>
          <input
            type="date"
            value={newsForm.expiryDate}
            onChange={(e) => setNewsForm({ ...newsForm, expiryDate: e.target.value })}
            className="w-full bg-white border border-gray-200 p-3 rounded-xl text-sm font-semibold outline-none"
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer bg-white p-3 rounded-xl border border-gray-200 w-full">
            <input
              type="checkbox"
              checked={newsForm.showAsModal}
              onChange={(e) => setNewsForm({ ...newsForm, showAsModal: e.target.checked })}
              className="w-5 h-5 text-teal-600 rounded"
            />
            <span className="text-xs font-bold">Show as Popup</span>
          </label>
        </div>
      </div>
      {newsForm.showAsModal && (
        <div className="bg-teal-100 p-3 rounded-xl text-xs text-teal-700 font-semibold flex items-center gap-2">
          <span className="material-icons-outlined text-sm">info</span>
          This news will appear as a popup modal when students open the app
        </div>
      )}
      <button onClick={handleCreateNews} className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
        <span className="material-icons-outlined text-sm">send</span>
        Publish News
      </button>
    </div>
  );

  const renderNotificationsForm = () => (
    <div className="space-y-4 mb-6 p-5 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl border border-amber-100">
      <p className="text-xs font-black text-amber-600 uppercase tracking-wider flex items-center gap-2">
        <span className="material-icons-outlined text-sm">notifications_active</span>
        Send Push Notification
      </p>
      <input
        type="text"
        placeholder="Notification Title *"
        value={notificationForm.title}
        onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
        className="w-full bg-white border border-gray-200 p-3 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-amber-300"
      />
      <textarea
        placeholder="Notification Message *"
        value={notificationForm.message}
        onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
        rows={3}
        className="w-full bg-white border border-gray-200 p-3 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-amber-300"
      />
      
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-2">Send To</label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'all', label: 'All Students', icon: 'groups', count: students.length },
            { value: 'selected', label: 'Selected', icon: 'person_pin', count: selectedStudents.length },
            { value: 'course', label: 'Course Students', icon: 'school', count: 0 }
          ].map(option => (
            <button
              key={option.value}
              onClick={() => setNotificationForm({ ...notificationForm, targetType: option.value as any })}
              className={`p-4 rounded-xl border-2 transition-all ${
                notificationForm.targetType === option.value 
                  ? 'border-amber-500 bg-amber-50' 
                  : 'border-gray-200 bg-white hover:border-amber-300'
              }`}
            >
              <span className={`material-icons-outlined text-2xl mb-1 ${notificationForm.targetType === option.value ? 'text-amber-600' : 'text-gray-400'}`}>
                {option.icon}
              </span>
              <p className="text-xs font-bold">{option.label}</p>
              {option.value !== 'course' && (
                <p className="text-[10px] text-gray-400">{option.count} students</p>
              )}
            </button>
          ))}
        </div>
      </div>

      {notificationForm.targetType === 'course' && (
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Select Course</label>
          <select
            value={notificationForm.courseId}
            onChange={(e) => setNotificationForm({ ...notificationForm, courseId: e.target.value })}
            className="w-full bg-white border border-gray-200 p-3 rounded-xl text-sm font-semibold outline-none"
          >
            <option value="">-- Select Course --</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>{course.name}</option>
            ))}
          </select>
          {notificationForm.courseId && (
            <p className="text-xs text-amber-600 mt-2 font-semibold">
              {students.filter(s => s.enrolledCourses?.includes(notificationForm.courseId)).length} students enrolled
            </p>
          )}
        </div>
      )}

      {notificationForm.targetType === 'selected' && (
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-2">Select Students ({selectedStudents.length} selected)</label>
          <div className="max-h-40 overflow-y-auto bg-white border border-gray-200 rounded-xl p-2 space-y-1">
            {students.map(student => (
              <label 
                key={student.id}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                  selectedStudents.includes(student.id) ? 'bg-amber-100' : 'hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedStudents.includes(student.id)}
                  onChange={() => toggleStudentSelection(student.id)}
                  className="w-4 h-4 text-amber-600 rounded"
                />
                <div>
                  <p className="text-sm font-bold">{student.name}</p>
                  <p className="text-xs text-gray-400">{student.email}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      <button 
        onClick={handleSendNotification} 
        className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
      >
        <span className="material-icons-outlined text-sm">send</span>
        Send Notification
      </button>
    </div>
  );

  const renderGenericForm = () => (
    <div className="mb-6 p-5 bg-gray-50 rounded-2xl border border-gray-100">
      <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
        <span className="material-icons-outlined text-sm">add_circle</span>
        Add New {getModalTitle()}
      </p>
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Name *"
          value={genericForm.name}
          onChange={(e) => setGenericForm({ ...genericForm, name: e.target.value })}
          className="flex-1 bg-white border border-gray-200 p-3 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={genericForm.description}
          onChange={(e) => setGenericForm({ ...genericForm, description: e.target.value })}
          className="flex-1 bg-white border border-gray-200 p-3 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <button
          onClick={handleCreateGeneric}
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  );

  const renderItemsList = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="text-center py-16 opacity-60">
          <span className="material-icons-outlined text-5xl text-gray-300">folder_open</span>
          <p className="text-sm text-gray-400 mt-3 font-semibold">No items yet</p>
          <p className="text-xs text-gray-300">Add your first item above</p>
        </div>
      );
    }

    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    const paginatedItems = items.slice(startIndex, endIndex);

    return (
      <div className="space-y-4">
        <div className="space-y-3">
          {paginatedItems.map(item => (
            <div 
              key={item.id || item._id} 
              className="flex justify-between items-start p-4 bg-white rounded-xl border border-gray-100 group hover:shadow-md hover:border-indigo-100 transition-all"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-black text-gray-800">{item.title || item.name}</p>
                  {item.isActive === false && (
                    <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full font-bold">Inactive</span>
                  )}
                  {item.showAsModal && (
                    <span className="text-[10px] bg-teal-100 text-teal-600 px-2 py-0.5 rounded-full font-bold">Popup</span>
                  )}
                  {item.priority === 'high' && (
                    <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">Urgent</span>
                  )}
                  {item.category && (
                    <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-bold capitalize">{item.category}</span>
                  )}
                  {item.status === 'sent' && (
                    <span className="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-bold">Sent</span>
                  )}
                </div>
                {(item.description || item.message || item.content) && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description || item.message || item.content}</p>
                )}
                {item.fileUrl && (
                  <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline mt-1 flex items-center gap-1">
                    <span className="material-icons-outlined text-xs">link</span>
                    View Document
                  </a>
                )}
                {item.targetStudents && (
                  <p className="text-xs text-gray-400 mt-1">Sent to {item.targetStudents.length} students</p>
                )}
                {item.downloads !== undefined && (
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <span className="material-icons-outlined text-xs">download</span>
                    {item.downloads} downloads
                  </p>
                )}
              </div>
              <button
                onClick={() => handleDelete(item.id || item._id)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <span className="material-icons-outlined text-lg">delete</span>
              </button>
            </div>
          ))}
        </div>

        {/* Standardized Pagination Footer */}
        {totalItems > 0 && (
          <div className="p-5 border-t border-gray-100 flex items-center justify-between bg-white rounded-2xl shadow-sm mt-4">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center group">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2 pr-10 text-[13px] font-bold text-gray-700 outline-none focus:border-gray-500 transition-all cursor-pointer shadow-sm hover:bg-gray-50"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 pointer-events-none text-[20px] text-gray-400 flex items-center justify-center h-full top-0 group-focus-within:text-black">
                  expand_more
                </span>
              </div>
              <span className="text-[13px] font-medium text-gray-400 italic">
                Showing {totalItems === 0 ? 0 : startIndex + 1} to {endIndex} of {totalItems} entries
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
    );
  };
  
  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {menuItems.map(item => (
          <div 
            key={item.name} 
            onClick={() => openModal(item.key as ModalType)}
            className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-indigo-100 hover:-translate-y-1 transition-all cursor-pointer group"
          >
            <div className={`w-14 h-14 ${item.color} rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
              <span className="material-icons-outlined text-2xl">{item.icon}</span>
            </div>
            <h4 className="text-sm font-black text-gray-800 uppercase tracking-wide group-hover:text-indigo-600 transition-colors">{item.name}</h4>
            <p className="text-xs text-gray-400 mt-1">{item.desc}</p>
            <p className="text-[10px] font-bold text-indigo-600 mt-3 uppercase tracking-wider">
              {item.count} Items
            </p>
          </div>
        ))}
      </div>

      {activeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-50 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-6 bg-white border-b border-gray-100">
              <div>
                <h3 className="text-lg font-black text-gray-800 uppercase tracking-wide">{getModalTitle()}</h3>
                <p className="text-xs text-gray-400 mt-1">{menuItems.find(i => i.key === activeModal)?.desc}</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-3 hover:bg-gray-100 rounded-xl transition-colors">
                <span className="material-icons-outlined text-gray-500">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {activeModal === 'instructions' && renderInstructionsForm()}
              {activeModal === 'examdocs' && renderExamDocsForm()}
              {activeModal === 'news' && renderNewsForm()}
              {activeModal === 'notifications' && renderNotificationsForm()}
              {['courses', 'subcourses', 'subjects', 'topics'].includes(activeModal) && renderGenericForm()}
              
              <div className="mt-4">
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4">
                  Existing Items ({items.length})
                </p>
                {renderItemsList()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MiscSection;

