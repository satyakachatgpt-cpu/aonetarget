import React, { useState, useEffect } from 'react';
import { tokensAPI } from '../../../services/apiClient';

interface Token {
  id: string;
  code: string;
  value: number;
  quantity: number;
  usedQuantity: number;
  expiryDate: string;
  type: 'credit' | 'exam' | 'class';
  status: 'active' | 'expired' | 'inactive';
  createdDate: string;
}

interface Props {
  showToast: (m: string, type?: 'success' | 'error') => void;
}

const Tokens: React.FC<Props> = ({ showToast }) => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [filteredTokens, setFilteredTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  
  const [formData, setFormData] = useState({
    code: '',
    value: '',
    quantity: '',
    expiryDate: '',
    type: 'credit' as 'credit' | 'exam' | 'class',
    status: 'active' as 'active' | 'expired' | 'inactive'
  });

  useEffect(() => {
    loadTokens();
  }, []);

  useEffect(() => {
    let filtered = tokens;

    if (searchQuery) {
      filtered = filtered.filter(t =>
        t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    setFilteredTokens(filtered);
    setCurrentPage(1);
  }, [tokens, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredTokens.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTokens = filteredTokens.slice(startIndex, endIndex);

  const loadTokens = async () => {
    try {
      setLoading(true);
      const data = await tokensAPI.getAll();
      setTokens(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log('Starting with empty state - MongoDB may not have data yet');
      setTokens([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToken = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code || !formData.value || !formData.quantity) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    try {
      const newToken: Token = {
        id: `TKN-${String(Date.now()).slice(-6)}`,
        code: formData.code.toUpperCase(),
        value: parseFloat(formData.value),
        quantity: parseInt(formData.quantity),
        usedQuantity: 0,
        expiryDate: formData.expiryDate,
        type: formData.type,
        status: formData.status,
        createdDate: new Date().toISOString().split('T')[0]
      };

      console.log('Adding new token:', newToken);
      await tokensAPI.create(newToken);
      setTokens([...tokens, newToken]);
      resetForm();
      setShowAddModal(false);
      showToast(`Token ${newToken.code} created successfully!`, 'success');
    } catch (error) {
      console.error('Error adding token:', error);
      showToast('Failed to add token', 'error');
    }
  };

  const handleEditToken = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedToken) return;

    try {
      const updatedToken: Token = {
        ...selectedToken,
        code: formData.code.toUpperCase(),
        value: parseFloat(formData.value),
        quantity: parseInt(formData.quantity),
        expiryDate: formData.expiryDate,
        type: formData.type,
        status: formData.status
      };

      console.log('Updating token:', updatedToken);
      await tokensAPI.update(selectedToken.id, updatedToken);
      setTokens(tokens.map(t => t.id === selectedToken.id ? updatedToken : t));
      resetForm();
      setShowEditModal(false);
      setSelectedToken(null);
      showToast('Token updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating token:', error);
      showToast('Failed to update token', 'error');
    }
  };

  const handleDeleteToken = async (tokenId: string, code: string) => {
    if (!confirm(`Are you sure you want to delete ${code}?`)) {
      return;
    }

    try {
      console.log('Deleting token:', tokenId);
      await tokensAPI.delete(tokenId);
      setTokens(tokens.filter(t => t.id !== tokenId));
      showToast(`${code} has been deleted successfully!`, 'success');
    } catch (error) {
      console.error('Error deleting token:', error);
      showToast('Failed to delete token', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTokens.length === 0) return;
    if (!confirm(`Delete ${selectedTokens.length} selected token(s)?`)) return;

    try {
      await Promise.all(selectedTokens.map(id => tokensAPI.delete(id)));
      setTokens(tokens.filter(t => !selectedTokens.includes(t.id)));
      setSelectedTokens([]);
      showToast(`${selectedTokens.length} token(s) deleted successfully!`, 'success');
    } catch (error) {
      console.error('Error deleting tokens:', error);
      showToast('Failed to delete tokens', 'error');
    }
  };

  const handleEditClick = (token: Token) => {
    setSelectedToken(token);
    setFormData({
      code: token.code,
      value: token.value.toString(),
      quantity: token.quantity.toString(),
      expiryDate: token.expiryDate,
      type: token.type,
      status: token.status
    });
    setShowEditModal(true);
  };

  const toggleSelectAll = () => {
    if (selectedTokens.length === paginatedTokens.length) {
      setSelectedTokens([]);
    } else {
      setSelectedTokens(paginatedTokens.map(t => t.id));
    }
  };

  const toggleSelectToken = (id: string) => {
    setSelectedTokens(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const resetForm = () => {
    setFormData({
      code: '',
      value: '',
      quantity: '',
      expiryDate: '',
      type: 'credit',
      status: 'active'
    });
  };

  const handleExportCSV = () => {
    try {
      const headers = ['ID', 'Code', 'Value', 'Quantity', 'Used', 'Available', 'Expiry Date', 'Type', 'Status'];
      const rows = filteredTokens.map(t => [
        t.id,
        t.code,
        t.value,
        t.quantity,
        t.usedQuantity,
        t.quantity - t.usedQuantity,
        t.expiryDate,
        t.type,
        t.status
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tokens-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast(`Exported ${filteredTokens.length} token(s) to CSV`, 'success');
    } catch (error) {
      console.error('Export error:', error);
      showToast('Failed to export CSV', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-navy">Tokens Management</h2>
          <p className="text-sm text-gray-500 mt-1">Manage credit and exam tokens</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {selectedTokens.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-500 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-red-600 transition-colors flex items-center gap-2"
            >
              <span className="material-icons-outlined text-lg">delete</span>
              Delete ({selectedTokens.length})
            </button>
          )}
          <button onClick={handleExportCSV} className="px-6 py-3 bg-white border border-gray-200 text-navy text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2">
            <span className="material-icons-outlined text-lg">download</span>
            Export CSV
          </button>
          <button onClick={() => { resetForm(); setShowAddModal(true); }} className="px-6 py-3 bg-navy text-white text-sm font-bold rounded-xl hover:bg-navy/90 transition-colors flex items-center gap-2">
            <span className="material-icons-outlined text-lg">add</span>
            Create Token
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-4 items-center">
        <div className="flex-1 relative min-w-[250px]">
          <span className="material-icons-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-navy/20 transition-all"
            placeholder="Search by token code or ID..."
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 outline-none focus:ring-2 focus:ring-navy/20"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy mx-auto mb-2"></div>
              Loading tokens...
            </div>
          ) : filteredTokens.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <span className="material-icons-outlined text-6xl text-gray-200 mb-2 block">card_giftcard</span>
              No tokens found
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedTokens.length === paginatedTokens.length && paginatedTokens.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-navy"
                    />
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Token Code</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Value</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Total Qty</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Used</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Available</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Expiry Date</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedTokens.map((token, index) => (
                  <tr key={token.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedTokens.includes(token.id)}
                        onChange={() => toggleSelectToken(token.id)}
                        className="w-4 h-4 rounded border-gray-300 text-navy"
                      />
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-600">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-block bg-navy/10 text-navy px-3 py-1 rounded-lg text-sm font-bold">{token.code}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-bold text-navy">₹{token.value}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600">{token.quantity}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-bold text-red-600">{token.usedQuantity}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-bold text-green-600">{token.quantity - token.usedQuantity}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-block bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs font-bold capitalize">{token.type}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600">{token.expiryDate}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold ${
                        token.status === 'active' ? 'bg-green-100 text-green-600' :
                        token.status === 'expired' ? 'bg-red-100 text-red-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {token.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditClick(token)}
                          className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <span className="material-icons-outlined text-lg">edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteToken(token.id, token.code)}
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
        {filteredTokens.length > 0 && (
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
              Showing {startIndex + 1} to {Math.min(endIndex, filteredTokens.length)} of {filteredTokens.length} entries
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
                    className={`w-10 h-10 text-sm font-bold rounded-lg ${
                      currentPage === pageNum
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

      {/* Add Token Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-xl font-black text-navy uppercase">Create New Token</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="material-icons-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleAddToken} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Token Code *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-navy/20"
                    placeholder="E.g., SAVE20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Value (₹) *</label>
                  <input
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-navy/20"
                    placeholder="Enter token value"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Quantity *</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-navy/20"
                    placeholder="Enter quantity"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Expiry Date</label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-navy/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'credit' | 'exam' | 'class' })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-navy/20"
                  >
                    <option value="credit">Credit</option>
                    <option value="exam">Exam</option>
                    <option value="class">Class</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' | 'expired' })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-navy/20"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-600 text-sm font-bold rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-navy text-white text-sm font-bold rounded-lg hover:bg-navy/90 transition-colors"
                >
                  Create Token
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Token Modal */}
      {showEditModal && selectedToken && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-xl font-black text-navy uppercase">Edit Token</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="material-icons-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleEditToken} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Token ID</label>
                  <input
                    type="text"
                    disabled
                    value={selectedToken.id}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm font-medium bg-gray-50 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Token Code *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-navy/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Value (₹) *</label>
                  <input
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-navy/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Quantity *</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-navy/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Expiry Date</label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-navy/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'credit' | 'exam' | 'class' })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-navy/20"
                  >
                    <option value="credit">Credit</option>
                    <option value="exam">Exam</option>
                    <option value="class">Class</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-600 text-sm font-bold rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-navy text-white text-sm font-bold rounded-lg hover:bg-navy/90 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tokens;

