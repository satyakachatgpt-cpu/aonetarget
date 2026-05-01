import React from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { coursesAPI, packagesAPI, testSeriesAPI } from '../../../services/apiClient';

interface AddPackagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (selectedIds: string[]) => void;
  isAssigning: boolean;
}

export const AddPackagesModal: React.FC<AddPackagesModalProps> = ({ 
  isOpen, 
  onClose, 
  onAssign, 
  isAssigning 
}) => {
  const [products, setProducts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (isOpen) {
      fetchProducts();
      setSelectedIds([]);
      setSearch('');
    }
  }, [isOpen]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const [courses, pkgs, series] = await Promise.all([
        coursesAPI.getAll().catch(() => []),
        packagesAPI.getAll().catch(() => []),
        testSeriesAPI.getAll().catch(() => [])
      ]);

      const all = [
        ...courses.map((c: any) => ({ ...c, type: 'Batch' })),
        ...pkgs.map((p: any) => ({ ...p, type: 'Package' })),
        ...series.map((s: any) => ({ ...s, type: 'Test Series' }))
      ];
      setProducts(all);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const filtered = products.filter(p => 
    (p.name || p.title || '').toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-300" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-3xl rounded-[24px] shadow-2xl border border-slate-200 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Compact Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-[18px] font-bold text-slate-900 leading-tight">Add Packages</h3>
            <p className="text-[12px] font-medium text-slate-500 mt-0.5">Select products to assign to this student</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors text-slate-400 hover:text-slate-900">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Minimal Search Area */}
        <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 shrink-0">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search products by name or type..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-[14px] font-medium placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
            />
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
          </div>
        </div>

        {/* Clean List Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 bg-white">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-6 h-6 border-2 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
              <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Refreshing Catalog...</p>
            </div>
          ) : filtered.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-20 text-center px-10">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-4">
                   <span className="material-symbols-outlined text-[32px]">inventory_2</span>
                </div>
                <p className="text-[14px] font-bold text-slate-800">No matching products found</p>
                <p className="text-[12px] font-medium text-slate-400 mt-1">Try adjusting your search terms</p>
             </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filtered.map((p) => {
                const id = p.id || p._id;
                const isSelected = selectedIds.includes(id);
                return (
                  <div 
                    key={id} 
                    onClick={() => toggleSelect(id)}
                    className={`group flex items-center gap-4 px-6 py-4 transition-all cursor-pointer ${isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200 bg-white group-hover:border-slate-300'}`}>
                      {isSelected && <span className="material-symbols-outlined text-white text-[14px] font-bold">check</span>}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-bold text-slate-800 truncate">{p.name || p.title}</span>
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-black uppercase tracking-tight shrink-0">{p.type}</span>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-[13px] font-bold text-slate-900">₹{p.price || 0}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 backdrop-blur-md flex items-center justify-between shrink-0">
           <div className="flex flex-col">
              <span className="text-[13px] font-bold text-slate-800">{selectedIds.length} items selected</span>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Ready to assign</p>
           </div>
           
           <div className="flex items-center gap-3">
              <button 
                onClick={onClose} 
                className="px-5 py-2.5 rounded-xl text-[13px] font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => onAssign(selectedIds)}
                disabled={selectedIds.length === 0 || isAssigning}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-[13px] hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-2 shadow-lg shadow-indigo-200"
              >
                {isAssigning ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : 'Assign Packages'}
              </button>
           </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
