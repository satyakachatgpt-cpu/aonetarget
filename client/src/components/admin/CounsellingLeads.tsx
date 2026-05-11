import React, { useState, useEffect } from 'react';
import { counsellingAPI } from '../../services/communicationService';

interface CounsellingLead {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  interestedCategory?: string;
  message?: string;
  status: 'new' | 'contacted' | 'resolved';
  source: string;
  createdAt: string;
}

interface Props {
  showToast: (msg: string, type: 'success' | 'error') => void;
}

const CounsellingLeads: React.FC<Props> = ({ showToast }) => {
  const [leads, setLeads] = useState<CounsellingLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'contacted' | 'resolved'>('all');
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; leadId: string | null; isDeleting: boolean }>({
    isOpen: false,
    leadId: null,
    isDeleting: false
  });

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setIsRefreshing(true);
      else setLoading(true);
      const data = await counsellingAPI.getLeads();
      setLeads(data);
    } catch (error) {
      showToast('Failed to fetch leads', 'error');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await counsellingAPI.updateLeadStatus(id, status);
      showToast('Status updated successfully', 'success');
      setLeads(leads.map(l => l._id === id ? { ...l, status: status as any } : l));
    } catch (error) {
      showToast('Failed to update status', 'error');
    }
  };

  const handleDeleteLead = async () => {
    if (!deleteModal.leadId) return;
    
    setDeleteModal(prev => ({ ...prev, isDeleting: true }));
    try {
      await counsellingAPI.deleteLead(deleteModal.leadId);
      showToast('Counselling request deleted', 'success');
      setLeads(leads.filter(l => l._id !== deleteModal.leadId));
      setDeleteModal({ isOpen: false, leadId: null, isDeleting: false });
    } catch (error) {
      console.error('[Counselling UI] Delete failed:', error);
      showToast('Failed to delete lead', 'error');
      setDeleteModal(prev => ({ ...prev, isDeleting: false }));
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.includes(searchQuery) ||
      (lead.email && lead.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (lead.interestedCategory && lead.interestedCategory.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    resolved: leads.filter(l => l.status === 'resolved').length,
  };

  const formatLeadSource = (source: string) => {
    if (!source || source === 'student_explore_cta') return 'Explore Courses Page';
    return source
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  if (loading && leads.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Counselling Leads</h2>
          <p className="text-sm text-gray-500 font-medium">Manage and track student counselling requests</p>
        </div>
        <button 
          disabled={isRefreshing}
          onClick={() => fetchLeads(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-all active:scale-95 disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-lg ${isRefreshing ? 'animate-spin' : ''}`}>refresh</span>
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Leads', value: stats.total, color: 'bg-indigo-50 text-indigo-600', icon: 'groups' },
          { label: 'New Requests', value: stats.new, color: 'bg-amber-50 text-amber-600', icon: 'fiber_new' },
          { label: 'Contacted', value: stats.contacted, color: 'bg-blue-50 text-blue-600', icon: 'call_made' },
          { label: 'Resolved', value: stats.resolved, color: 'bg-green-50 text-green-600', icon: 'check_circle' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 ${stat.color.split(' ')[0]} rounded-2xl flex items-center justify-center shrink-0`}>
              <span className={`material-symbols-outlined ${stat.color.split(' ')[1]}`}>{stat.icon}</span>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-xl font-black text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
          <input
            type="text"
            placeholder="Search leads by name, phone, email or stream..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 bg-gray-50 border-none rounded-2xl pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
          {(['all', 'new', 'contacted', 'resolved'] as const).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                statusFilter === status 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                  : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Leads List */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {filteredLeads.length > 0 ? (
          filteredLeads.map(lead => (
            <div key={lead._id} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
                    <span className="material-symbols-outlined text-2xl font-light">person</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 leading-tight">{lead.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                        lead.status === 'new' ? 'bg-amber-100 text-amber-600' :
                        lead.status === 'contacted' ? 'bg-blue-100 text-blue-600' :
                        'bg-green-100 text-green-600'
                      }`}>
                        {lead.status}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400">
                        {new Date(lead.createdAt).toLocaleDateString()} at {new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a 
                    href={`https://wa.me/91${lead.phone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-green-50 hover:text-green-600 transition-all"
                    title="WhatsApp"
                  >
                    <span className="material-symbols-outlined text-xl">chat</span>
                  </a>
                  <button 
                    onClick={() => setDeleteModal({ isOpen: true, leadId: lead._id, isDeleting: false })}
                    className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all"
                    title="Delete"
                  >
                    <span className="material-symbols-outlined text-xl">delete</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-2xl p-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Phone Number</p>
                  <p className="text-sm font-bold text-gray-700">{lead.phone}</p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Email Address</p>
                  <p className="text-sm font-bold text-gray-700 truncate">{lead.email || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Interested Category</p>
                  <p className="text-sm font-bold text-gray-700">{lead.interestedCategory || 'Not specified'}</p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Request From</p>
                  <p className="text-sm font-bold text-gray-700">{formatLeadSource(lead.source)}</p>
                </div>
              </div>

              {lead.message && (
                <div className="bg-amber-50/50 rounded-2xl p-4 mb-6 border border-amber-100/50">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Student Message</p>
                  <p className="text-sm font-medium text-gray-700 italic">"{lead.message}"</p>
                </div>
              )}

              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Update Status:</p>
                <div className="flex gap-2">
                  {(['new', 'contacted', 'resolved'] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => handleStatusUpdate(lead._id, status)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                        lead.status === status 
                          ? 'bg-gray-900 text-white shadow-md' 
                          : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-400">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-5xl font-light">person_search</span>
            </div>
            <p className="font-bold">No counselling requests found</p>
            <p className="text-xs mt-1">Try adjusting your filters or search query</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !deleteModal.isDeleting && setDeleteModal({ isOpen: false, leadId: null, isDeleting: false })} />
          <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-8 animate-slide-in-bottom">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mb-6 mx-auto">
              <span className="material-symbols-outlined text-3xl">delete_forever</span>
            </div>
            <h3 className="text-xl font-black text-gray-900 text-center mb-2">Delete counselling request?</h3>
            <p className="text-sm text-gray-500 text-center mb-8 font-medium">This action cannot be undone and will remove the lead permanently.</p>
            
            <div className="flex gap-3">
              <button
                disabled={deleteModal.isDeleting}
                onClick={() => setDeleteModal({ isOpen: false, leadId: null, isDeleting: false })}
                className="flex-1 h-12 bg-gray-50 text-gray-500 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={deleteModal.isDeleting}
                onClick={handleDeleteLead}
                className="flex-1 h-12 bg-red-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {deleteModal.isDeleting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CounsellingLeads;
