import React, { useState, useEffect } from 'react';
import { storeAPI } from '../../services/apiClient';

interface Product {
  id: string;
  name: string;
  course: string;
  price: number;
  validDays: number;
  description?: string;
  imageUrl?: string;
}

interface Props {
  showToast: (m: string, type?: 'success' | 'error') => void;
}

const Store: React.FC<Props> = ({ showToast }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({ name: '', course: '', price: '', validDays: '365', description: '', imageUrl: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCourse, setFilterCourse] = useState('all');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await storeAPI.getAll();
      setProducts(data);
    } catch (error) {
      showToast('Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const productData = {
        id: editingProduct?.id || `prod_${Date.now()}`,
        name: formData.name,
        course: formData.course,
        price: parseFloat(formData.price),
        validDays: parseInt(formData.validDays),
        description: formData.description,
        imageUrl: formData.imageUrl
      };

      if (editingProduct) {
        await storeAPI.update(editingProduct.id, productData);
        showToast('Product updated successfully!');
      } else {
        await storeAPI.create(productData);
        showToast('Product created successfully!');
      }

      setShowModal(false);
      setEditingProduct(null);
      setFormData({ name: '', course: '', price: '', validDays: '365', description: '', imageUrl: '' });
      loadProducts();
    } catch (error) {
      showToast('Failed to save product', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await storeAPI.delete(id);
        showToast('Product deleted successfully!');
        loadProducts();
      } catch (error) {
        showToast('Failed to delete product', 'error');
      }
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      course: product.course,
      price: product.price.toString(),
      validDays: product.validDays.toString(),
      description: product.description || '',
      imageUrl: product.imageUrl || ''
    });
    setShowModal(true);
  };

  const filteredProducts = products.filter(p => {
    if (filterCourse !== 'all' && p.course !== filterCourse) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.course.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const uniqueCourses = Array.from(new Set(products.map(p => p.course))).filter(Boolean);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h3 className="text-xl font-black text-navy uppercase tracking-widest">Store Inventory</h3>

        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none shadow-sm"
          >
            <option value="all">All Courses</option>
            {uniqueCourses.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <div className="relative">
            <span className="material-icons-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
            <input
              type="text"
              placeholder="Search product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold outline-none shadow-sm w-48 md:w-64 focus:border-navy"
            />
          </div>

          <button
            onClick={() => { setEditingProduct(null); setFormData({ name: '', course: '', price: '', validDays: '365', description: '', imageUrl: '' }); setShowModal(true); }}
            className="bg-navy text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-xl tracking-widest flex items-center gap-2"
          >
            <span className="material-icons-outlined text-sm">add</span>
            Add Package
          </button>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] p-16 text-center border border-gray-100">
          <span className="material-icons-outlined text-6xl text-gray-200 mb-4">inventory_2</span>
          <p className="text-gray-400 font-bold uppercase tracking-widest">No products found</p>
          <p className="text-xs text-gray-300 mt-2">Try adjusting your filters or add a new package</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm group">
              <div className="aspect-video bg-navy/5 flex items-center justify-center relative">
                <span className="material-icons-outlined text-4xl text-navy/20">inventory_2</span>
                <div className="absolute top-4 right-4 bg-navy text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                  Valid: {product.validDays} Days
                </div>
              </div>
              <div className="p-6">
                <h4 className="font-black text-navy uppercase text-sm mb-2 leading-tight truncate">{product.name}</h4>
                <p className="text-[10px] text-gray-400 font-bold mb-4 uppercase tracking-widest">Course: {product.course}</p>
                <div className="flex justify-between items-center border-t border-gray-50 pt-4">
                  <span className="text-lg font-black text-navy">₹{product.price.toLocaleString()}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(product)}
                      className="p-2 text-navy hover:bg-navy/5 rounded-lg transition-all"
                    >
                      <span className="material-icons-outlined text-sm">edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <span className="material-icons-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md mx-4">
            <h3 className="text-lg font-black text-navy uppercase tracking-widest mb-6">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Product Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-gray-50 border border-gray-100 p-4 rounded-xl text-xs font-bold outline-none"
              />
              <input
                type="text"
                placeholder="Course Name"
                value={formData.course}
                onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                className="w-full bg-gray-50 border border-gray-100 p-4 rounded-xl text-xs font-bold outline-none"
              />
              <input
                type="number"
                placeholder="Price (₹)"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full bg-gray-50 border border-gray-100 p-4 rounded-xl text-xs font-bold outline-none"
              />
              <input
                type="number"
                placeholder="Valid Days"
                value={formData.validDays}
                onChange={(e) => setFormData({ ...formData, validDays: e.target.value })}
                className="w-full bg-gray-50 border border-gray-100 p-4 rounded-xl text-xs font-bold outline-none"
              />
              <textarea
                placeholder="Description (optional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-gray-50 border border-gray-100 p-4 rounded-xl text-xs font-bold outline-none resize-none"
                rows={3}
              />
              <input
                type="url"
                placeholder="Image URL (Cloudflare/CDN)"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                className="w-full bg-gray-50 border border-gray-100 p-4 rounded-xl text-xs font-bold outline-none"
              />
              {formData.imageUrl && (
                <img src={formData.imageUrl} alt="Preview" className="w-full h-32 object-cover rounded-xl" onError={(e) => (e.currentTarget.style.display = 'none')} />
              )}
            </div>
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-black text-xs uppercase"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 bg-navy text-white py-3 rounded-xl font-black text-xs uppercase"
              >
                {editingProduct ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Store;

