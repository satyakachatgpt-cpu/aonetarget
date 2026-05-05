import React, { useState, useEffect } from 'react';
import { examDocumentsAPI } from '../../services/courseService';
import { getAdminHeaders } from '../../services/apiClient';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  showToast: (m: string, type?: 'success' | 'error') => void;
}

interface ExamDocument {
  _id: string;
  title: string;
  fileUrl: string;
  exam?: string;
  status?: string;
  order?: number;
}

const SortableRow = ({ doc, index, onEdit, onDelete }: { doc: ExamDocument, index: number, onEdit: (d: any) => void, onDelete: (id: string) => void }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: doc._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${isDragging ? 'bg-white shadow-xl ring-1 ring-blue-500 rounded-lg scale-[1.01]' : ''}`}>
      <td className="p-4 text-center">
        <button
          {...attributes}
          {...listeners}
          className="p-2 hover:bg-gray-100 rounded-lg cursor-grab active:cursor-grabbing text-gray-400 hover:text-blue-600 transition-colors"
          title="Drag to reorder"
        >
          <span className="material-icons-outlined text-[20px]">drag_indicator</span>
        </button>
      </td>
      <td className="p-4 text-center text-sm font-bold text-gray-500">
        #{index + 1}
      </td>
      <td className="p-4">
        <div className="font-bold text-gray-800 text-[14px]">{doc.title}</div>
        <div className="text-[12px] text-gray-500 font-medium truncate max-w-xs">{doc.exam || 'General'}</div>
      </td>
      <td className="p-4">
        <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-[13px] font-bold inline-flex items-center gap-1">
          <span className="material-icons-outlined text-[16px]">picture_as_pdf</span>
          View File
        </a>
      </td>
      <td className="p-4 text-center">
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-black tracking-wide uppercase ${doc.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
          {doc.status || 'active'}
        </span>
      </td>
      <td className="p-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => onEdit(doc)}
            className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors"
            title="Edit"
          >
            <span className="material-icons-outlined text-[18px]">edit</span>
          </button>
          <button
            onClick={() => onDelete(doc._id)}
            className="w-8 h-8 rounded-full bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition-colors"
            title="Delete"
          >
            <span className="material-icons-outlined text-[18px]">delete</span>
          </button>
        </div>
      </td>
    </tr>
  );
};

const ExamDocuments: React.FC<Props> = ({ showToast }) => {
  const [documents, setDocuments] = useState<ExamDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<ExamDocument | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    fileUrl: '',
    exam: '',
    status: 'active'
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const data = await examDocumentsAPI.getAll();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast('Failed to load exam documents', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = documents.findIndex((d) => d._id === active.id);
    const newIndex = documents.findIndex((d) => d._id === over.id);

    const newOrder = arrayMove(documents, oldIndex, newIndex);
    setDocuments(newOrder);

    try {
      const orderedIds = newOrder.map((d) => d._id);
      await examDocumentsAPI.reorder(orderedIds);
      showToast('Order saved!');
    } catch (error) {
      showToast('Failed to save order', 'error');
      loadDocuments(); // Revert
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.fileUrl) {
      showToast('Title and File URL are required', 'error');
      return;
    }

    try {
      if (editingDoc) {
        await examDocumentsAPI.update(editingDoc._id, formData);
        showToast('Document updated successfully');
      } else {
        await examDocumentsAPI.create({ ...formData, order: documents.length + 1 });
        showToast('Document created successfully');
      }
      setShowModal(false);
      loadDocuments();
    } catch (error) {
      showToast('Failed to save document', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await examDocumentsAPI.delete(id);
      showToast('Document deleted');
      loadDocuments();
    } catch (error) {
      showToast('Failed to delete document', 'error');
    }
  };

  const openAddModal = () => {
    setEditingDoc(null);
    setFormData({ title: '', fileUrl: '', exam: '', status: 'active' });
    setShowModal(true);
  };

  const openEditModal = (doc: ExamDocument) => {
    setEditingDoc(doc);
    setFormData({
      title: doc.title || '',
      fileUrl: doc.fileUrl || '',
      exam: doc.exam || '',
      status: doc.status || 'active'
    });
    setShowModal(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Exam Documents</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Manage global exam documents and notes.</p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-[13px] font-bold tracking-wide transition-colors flex items-center gap-2 shadow-sm shadow-blue-600/20"
        >
          <span className="material-icons-outlined text-[18px]">add</span>
          Add Document
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100">
              <th className="p-4 text-center w-16"><span className="material-icons-outlined text-gray-400 text-[18px]">unfold_more</span></th>
              <th className="p-4 text-center w-20 text-[11px] font-black text-gray-400 uppercase tracking-wider">Order</th>
              <th className="p-4 text-[11px] font-black text-gray-400 uppercase tracking-wider">Document Details</th>
              <th className="p-4 text-[11px] font-black text-gray-400 uppercase tracking-wider">File</th>
              <th className="p-4 text-center w-24 text-[11px] font-black text-gray-400 uppercase tracking-wider">Status</th>
              <th className="p-4 text-center w-28 text-[11px] font-black text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && documents.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-400 text-sm font-bold">Loading documents...</td></tr>
            ) : documents.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-400 text-sm font-bold">No exam documents found.</td></tr>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={documents.map(d => d._id)} strategy={verticalListSortingStrategy}>
                  {documents.map((doc, index) => (
                    <SortableRow key={doc._id} doc={doc} index={index} onEdit={openEditModal} onDelete={handleDelete} />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl relative flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-black text-gray-900">{editingDoc ? 'Edit Document' : 'Add Document'}</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors">
                <span className="material-icons-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  placeholder="e.g. Current Affairs 2024"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Exam / Tag</label>
                <input
                  type="text"
                  value={formData.exam}
                  onChange={(e) => setFormData({ ...formData, exam: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  placeholder="e.g. UPSC, SSC (Optional)"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">File URL *</label>
                <input
                  type="url"
                  required
                  value={formData.fileUrl}
                  onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-3 rounded-xl text-[13px] font-bold tracking-wide transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl text-[13px] font-bold tracking-wide transition-colors shadow-sm shadow-blue-600/20"
                >
                  Save Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamDocuments;
