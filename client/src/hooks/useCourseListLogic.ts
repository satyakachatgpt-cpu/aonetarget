import { useState, useEffect, useMemo, useCallback } from 'react';
import { useDebounce } from './useDebounce';
import { coursesAPI, categoriesAPI } from '../services/apiClient';

interface Course {
  id: string;
  _id?: string;
  name: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  thumbnail?: string;
  price?: string | number;
  originalPrice?: string | number;
  categoryId?: string;
  status?: string;
  isPublished?: boolean;
}

const API_BASE_URL = '/api';

const getAuthHeaders = () => {
  const adminToken = localStorage.getItem('adminToken');
  const adminId = localStorage.getItem('adminId');
  const headers: any = {};
  if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;
  if (adminId) headers['x-admin-id'] = adminId;
  return headers;
};

export const useCourseListLogic = (showToast: (msg: string, type?: 'success' | 'error') => void) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const debouncedProductSearch = useDebounce(productSearchQuery, 300);
  const [productStatusFilter, setProductStatusFilter] = useState('all');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [isProductFilterOpen, setIsProductFilterOpen] = useState(false);
  const [courseCategories, setCourseCategories] = useState<any[]>([]);

  const loadCourses = useCallback(async () => {
    try {
      setLoading(true);
      const data = await coursesAPI.getAll();
      setCourses(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast('Failed to load courses', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    categoriesAPI.getAll()
      .then(res => setCourseCategories(Array.isArray(res) ? res : []))
      .catch(() => { });
  }, []);

  const filteredCourses = useMemo(() => {
    return courses.filter(c => {
      const matchesSearch = (c.name || c.title || '').toLowerCase().includes(debouncedProductSearch.toLowerCase());
      const matchesStatus = productStatusFilter === 'all' || (c.status === productStatusFilter);
      const matchesCategory = productCategoryFilter === 'all' || (c.categoryId === productCategoryFilter);
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [courses, debouncedProductSearch, productStatusFilter, productCategoryFilter]);

  const handleTogglePublish = useCallback(async (course: Course, setIsPublished: (v: boolean) => void, setPublishLoading: (v: boolean) => void) => {
    if (!course) return;
    const isPublished = course.status !== 'inactive' && course.isPublished !== false;
    const newStatus = !isPublished;
    setPublishLoading(true);
    try {
      const courseId = course._id || course.id;
      const endpoint = course.id?.toString().startsWith('pkg_') ? 'packages' : 'courses';
      const adminToken = localStorage.getItem('adminToken');
      await fetch(`${API_BASE_URL}/${endpoint}/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ isPublished: newStatus, status: newStatus ? 'active' : 'inactive' })
      });
      setIsPublished(newStatus);
      showToast(newStatus ? 'Batch published successfully!' : 'Batch unpublished successfully!');
      // Update local courses list
      setCourses(prev => prev.map(c => (c._id || c.id) === courseId ? { ...c, isPublished: newStatus, status: newStatus ? 'active' : 'inactive' } : c));
    } catch (error) {
      showToast('Failed to update publish status');
    } finally {
      setPublishLoading(false);
    }
  }, [showToast]);

  const handlePreview = useCallback((course: Course) => {
    if (!course) return;
    const courseId = course._id || course.id;
    window.open(`/#/course/${courseId}`, '_blank');
  }, []);

  return {
    courses,
    setCourses,
    loading,
    setLoading,
    productSearchQuery,
    setProductSearchQuery,
    productStatusFilter,
    setProductStatusFilter,
    productCategoryFilter,
    setProductCategoryFilter,
    isProductFilterOpen,
    setIsProductFilterOpen,
    courseCategories,
    loadCourses,
    filteredCourses,
    handleTogglePublish,
    handlePreview
  };
};
