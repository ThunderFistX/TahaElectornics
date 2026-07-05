import { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { FiEdit, FiTrash2, FiPlus, FiX } from 'react-icons/fi';
import { PRODUCT_CATEGORIES } from '../lib/catalog';
import { assetUrl } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../lib/currency';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const CATEGORY_STORAGE_KEY = 'taha_product_categories';

const getStoredCategories = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(CATEGORY_STORAGE_KEY));
    return Array.isArray(saved) && saved.length ? saved : PRODUCT_CATEGORIES;
  } catch {
    return PRODUCT_CATEGORIES;
  }
};

const Projects = () => {
  const { token } = useAuth();
  const [projects, setProjects] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [categories, setCategories] = useState(getStoredCategories);
  const [newCategory, setNewCategory] = useState('');

  // Form State
  const [formData, setFormData] = useState({ 
    title: '', 
    shortDescription: '',
    description: '',
    itemType: 'main_product',
    category: '', 
    price: '', 
    stockQuantity: '',
    imageUrl: ''
  });
  const [formErrors, setFormErrors] = useState({});

  const uniqueProjects = (items) => {
    const seen = new Set();
    return items.filter((item) => {
      const key = item._id || item.id;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/products`);
      if (response.ok) {
        const data = await response.json();
        setProjects(uniqueProjects(Array.isArray(data) ? data : []));
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      setToast('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  // Load projects from API
  useEffect(() => {
    let isMounted = true;
    // schedule fetchProjects to avoid calling setState synchronously within the effect
    queueMicrotask(() => {
      if (isMounted) fetchProjects();
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(categories));
  }, [categories]);

  const handleAdd = () => {
    setCurrentProject(null);
    setImageFile(null);
    setFormData({ title: '', shortDescription: '', description: '', itemType: 'main_product', category: '', price: '', stockQuantity: '', imageUrl: '' });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleEdit = (project) => {
    setCurrentProject(project);
    setImageFile(null);
    setFormData({ 
      title: project.title, 
      shortDescription: project.shortDescription || '',
      description: project.description || '',
      itemType: project.itemType || 'main_product',
      category: project.category || '', 
      price: project.price, 
      stockQuantity: project.stockQuantity ?? '',
      imageUrl: project.imageUrl || ''
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleDeleteClick = (project) => {
    setCurrentProject(project);
    setDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      const response = await fetch(`${API_URL}/products/${currentProject._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        setProjects(projects.filter(p => p._id !== currentProject._id));
        setToast('Project deleted successfully!');
      } else {
        const error = await response.json().catch(() => ({}));
        setToast(error.message || 'Failed to delete project');
      }
    } catch (error) {
      console.error('Delete error:', error);
      setToast('Error deleting project');
    }
    setDeleteConfirm(false);
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFormErrors(prev => ({ ...prev, [field]: '' }));
  };

  const closeModal = () => {
    if (saving) return;
    setIsModalOpen(false);
    setImageFile(null);
    setFormErrors({});
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      // Show preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({ ...prev, imageUrl: event.target?.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.title.trim()) {
      errors.title = 'Product title is required.';
    }

    if (!formData.shortDescription.trim()) {
      errors.shortDescription = 'Short information is required.';
    } else if (formData.shortDescription.trim().length > 180) {
      errors.shortDescription = 'Short information must be 180 characters or less.';
    }

    if (!formData.description.trim()) {
      errors.description = 'Description is required.';
    }

    if (!formData.category) {
      errors.category = 'Category is required.';
    }

    if (!['main_product', 'accessory'].includes(formData.itemType)) {
      errors.itemType = 'Choose whether this item is a main product or an accessory.';
    }

    if (formData.price === '' || formData.price === null) {
      errors.price = 'Price is required.';
    } else if (Number.isNaN(Number(formData.price)) || Number(formData.price) < 0) {
      errors.price = 'Price must be a valid non-negative number.';
    }

    if (formData.stockQuantity !== '' && (Number.isNaN(Number(formData.stockQuantity)) || Number(formData.stockQuantity) < 0)) {
      errors.stockQuantity = 'Stock must be a valid non-negative number.';
    }

    return errors;
  };

  const addCategory = () => {
    const category = newCategory.trim();
    if (!category) return;
    if (categories.some((item) => item.toLowerCase() === category.toLowerCase())) {
      setToast('Category already exists');
      return;
    }
    setCategories((prev) => [...prev, category]);
    setFormData((prev) => ({ ...prev, category }));
    setNewCategory('');
  };

  const removeCategory = (category) => {
    setCategories((prev) => prev.filter((item) => item !== category));
    setFormData((prev) => ({ ...prev, category: prev.category === category ? '' : prev.category }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    const errors = validateForm();
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      return;
    }

    try {
      setSaving(true);
      const formDataObj = new FormData();
      
      formDataObj.append('title', formData.title.trim());
      formDataObj.append('shortDescription', formData.shortDescription.trim());
      formDataObj.append('description', formData.description.trim());
      formDataObj.append('itemType', formData.itemType);
      formDataObj.append('category', formData.category);
      formDataObj.append('price', formData.price);
      formDataObj.append('stockQuantity', formData.stockQuantity || 0);
      
      if (imageFile) {
        formDataObj.append('image', imageFile);
      }

      let url = `${API_URL}/products`;
      let method = 'POST';

      if (currentProject) {
        url = `${API_URL}/products/${currentProject._id}`;
        method = 'PUT';
      }

      const response = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataObj
      });

      if (response.ok) {
        const result = await response.json();
        
        if (currentProject) {
          setProjects(prev => uniqueProjects(prev.map(p => p._id === currentProject._id ? result.product : p)));
          setToast('Product updated successfully!');
        } else {
          setProjects(prev => uniqueProjects([...prev, result.product]));
          setToast('Product added successfully!');
        }
        setIsModalOpen(false);
        setImageFile(null);
      } else {
        const error = await response.json();
        setToast(error.message || 'Failed to save project');
      }
    } catch (error) {
      console.error('Submit error:', error);
      setToast('Error saving project');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading products...</div>;
  }

  return (
    <section className="w-full">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-xl md:text-2xl font-bold text-dark">Manage Products</h2>
        <button onClick={handleAdd} className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg flex items-center gap-2 transition w-full md:w-auto justify-center md:justify-start">
          <FiPlus /> Add Product
        </button>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto table-scroll">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-gray-500">
                <th className="py-4 px-6">Image</th>
                <th className="py-4 px-6">Code</th>
                <th className="py-4 px-6">Title</th>
                <th className="py-4 px-6">Type</th>
                <th className="py-4 px-6">Category</th>
                <th className="py-4 px-6">Price</th>
                <th className="py-4 px-6">Stock</th>
                <th className="py-4 px-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project._id} className="border-b hover:bg-gray-50 transition">
                  <td className="py-4 px-6">
                    {project.imageUrl && (
                      <img src={assetUrl(project.imageUrl)} alt={project.title} className="w-12 h-12 object-cover rounded" />
                    )}
                  </td>
                  <td className="py-4 px-6 font-mono text-xs font-bold text-slate-600">{project.productCode}</td>
                  <td className="py-4 px-6 font-semibold text-dark">{project.title}</td>
                  <td className="py-4 px-6">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                      {(project.itemType || 'main_product') === 'accessory' ? 'Accessory' : 'Main Product'}
                    </span>
                  </td>
                  <td className="py-4 px-6"><span className="bg-indigo-50 text-primary px-3 py-1 rounded-full text-xs">{project.category}</span></td>
                  <td className="py-4 px-6 font-bold">{formatCurrency(project.price)}</td>
                  <td className="py-4 px-6 font-semibold">{project.stockQuantity ?? 0}</td>
                  <td className="py-4 px-6 flex gap-3">
                    <button onClick={() => handleEdit(project)} className="text-blue-500 hover:text-blue-700" title="Edit"><FiEdit /></button>
                    <button onClick={() => handleDeleteClick(project)} className="text-red-500 hover:text-red-700" title="Delete"><FiTrash2 /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden grid grid-cols-1 gap-4">
        {projects.map((project) => (
          <div key={project._id} className="bg-white p-4 rounded-lg shadow-card hover:shadow-card-hover transition">
            {project.imageUrl && (
              <img src={assetUrl(project.imageUrl)} alt={project.title} className="w-full h-40 object-cover rounded mb-3" />
            )}
            <div className="flex justify-between items-start gap-2 mb-3">
              <div>
                <h3 className="font-semibold text-dark text-base mb-1">{project.title}</h3>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-block bg-slate-100 text-slate-700 px-2 py-1 rounded-full text-xs">
                    {(project.itemType || 'main_product') === 'accessory' ? 'Accessory' : 'Main Product'}
                  </span>
                  <span className="inline-block bg-indigo-50 text-primary px-2 py-1 rounded-full text-xs">{project.category}</span>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => handleEdit(project)} className="text-blue-500 hover:text-blue-700 text-lg"><FiEdit /></button>
                <button onClick={() => handleDeleteClick(project)} className="text-red-500 hover:text-red-700 text-lg"><FiTrash2 /></button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-gray-500">Price</p>
                <p className="font-bold text-dark">{formatCurrency(project.price)}</p>
              </div>
              <div>
                <p className="text-gray-500">Code</p>
                <p className="font-bold text-dark">{project.productCode}</p>
              </div>
              <div>
                <p className="text-gray-500">Stock</p>
                <p className="font-bold text-dark">{project.stockQuantity ?? 0}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={currentProject ? "Edit Product" : "Add New Product"}>
        <form onSubmit={handleSubmit} noValidate>
          {currentProject?.productCode && (
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">System Product Code</label>
              <div className="w-full rounded-lg border-2 border-slate-200 bg-slate-50 px-4 py-2 font-mono text-sm font-bold text-slate-600">
                {currentProject.productCode}
              </div>
            </div>
          )}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">Product Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              className="w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:border-primary"
              required
            />
            {formErrors.title && <p className="mt-2 text-sm text-red-500">{formErrors.title}</p>}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">Short Information</label>
            <textarea
              value={formData.shortDescription}
              onChange={(e) => handleFieldChange('shortDescription', e.target.value)}
              rows="2"
              maxLength="180"
              className="w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:border-primary"
              required
            />
            {formErrors.shortDescription && <p className="mt-2 text-sm text-red-500">{formErrors.shortDescription}</p>}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">Full Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              rows="3"
              className="w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:border-primary"
              required
            />
            {formErrors.description && <p className="mt-2 text-sm text-red-500">{formErrors.description}</p>}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">Product Image</label>
            {formData.imageUrl && !imageFile && (
              <div className="mb-2">
                <img src={formData.imageUrl} alt="Preview" className="max-w-xs h-32 object-cover rounded" />
              </div>
            )}
            {imageFile && (
              <div className="mb-2">
                <img src={formData.imageUrl} alt="Preview" className="max-w-xs h-32 object-cover rounded" />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full px-4 py-2 border-2 rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">Maximum file size: 5MB</p>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">Item Type</label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { value: 'main_product', label: 'Main Product', description: 'Shown on the Products page.' },
                { value: 'accessory', label: 'Accessory', description: 'Shown on the Accessories page.' }
              ].map((option) => (
                <label
                  key={option.value}
                  className={`cursor-pointer rounded-lg border-2 p-4 transition ${formData.itemType === option.value ? 'border-primary bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <input
                    type="radio"
                    name="itemType"
                    value={option.value}
                    checked={formData.itemType === option.value}
                    onChange={(e) => handleFieldChange('itemType', e.target.value)}
                    className="sr-only"
                  />
                  <span className="block text-sm font-bold text-slate-950">{option.label}</span>
                  <span className="mt-1 block text-xs text-slate-500">{option.description}</span>
                </label>
              ))}
            </div>
            {formErrors.itemType && <p className="mt-2 text-sm text-red-500">{formErrors.itemType}</p>}
          </div>
          <div className="mb-4">
            <div className="flex items-center justify-between gap-3 mb-2">
              <label className="block text-sm font-semibold">Category</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCategory();
                    }
                  }}
                  className="w-40 px-3 py-2 border-2 rounded-lg focus:outline-none focus:border-primary text-sm"
                  placeholder="New category"
                />
                <button type="button" onClick={addCategory} className="h-10 w-10 inline-flex items-center justify-center rounded-lg bg-primary text-white hover:bg-primary-dark" aria-label="Add category" title="Add category">
                  <FiPlus />
                </button>
              </div>
            </div>
            <select
              value={formData.category}
              onChange={(e) => handleFieldChange('category', e.target.value)}
              className="w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:border-primary"
              required
            >
              <option value="">Select Category</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <div className="mt-3 flex flex-wrap gap-2">
              {categories.map((category) => (
                <span key={category} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {category}
                  <button type="button" onClick={() => removeCategory(category)} className="text-slate-500 hover:text-red-600" aria-label={`Remove ${category}`} title={`Remove ${category}`}>
                    <FiX />
                  </button>
                </span>
              ))}
            </div>
            {formErrors.category && <p className="mt-2 text-sm text-red-500">{formErrors.category}</p>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold mb-2">Price (PKR)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => handleFieldChange('price', e.target.value)}
                className="w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:border-primary"
                required
              />
              {formErrors.price && <p className="mt-2 text-sm text-red-500">{formErrors.price}</p>}
            </div>
            <div>
            <label className="block text-sm font-semibold mb-2">Available Stock</label>
            <input
              type="number"
              min="0"
              step="1"
              value={formData.stockQuantity}
              onChange={(e) => handleFieldChange('stockQuantity', e.target.value)}
              className="w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:border-primary"
            />
            {formErrors.stockQuantity && <p className="mt-2 text-sm text-red-500">{formErrors.stockQuantity}</p>}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={closeModal} disabled={saving} className="px-4 py-2 border-2 rounded-lg hover:bg-gray-50 text-sm font-semibold disabled:opacity-60">Cancel</button>
            <button type="submit" disabled={saving} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <Modal isOpen={deleteConfirm} onClose={() => setDeleteConfirm(false)} title="Confirm Deletion">
        <p className="text-gray-600 mb-6">Are you sure you want to delete <span className="font-bold">{currentProject?.title}</span>? This action cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteConfirm(false)} className="px-4 py-2 border-2 rounded-lg hover:bg-gray-50 text-sm font-semibold">Cancel</button>
          <button onClick={confirmDelete} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 text-sm font-semibold">Delete</button>
        </div>
      </Modal>
    </section>
  );
};

export default Projects;
