import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { dishesAPI } from '../../services/api';
import { useMenuUpdates } from '../../hooks/useMenuUpdates';
import { 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const AdminMenu = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [dishes, setDishes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDish, setEditingDish] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [dishToDelete, setDishToDelete] = useState(null);
  
  // Initialize filters from URL parameters
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    tags: searchParams.get('tags') ? searchParams.get('tags').split(',') : []
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingAvailability, setTogglingAvailability] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch dishes function - completely independent
  const fetchDishes = async (forceRefresh = false, currentFilters = filters) => {
    try {
      console.log('Admin: fetchDishes called with forceRefresh:', forceRefresh);
      setLoading(true);
      const params = { ...currentFilters };
      
      // Convert tags array to comma-separated string
      if (currentFilters.tags.length > 0) {
        params.tags = currentFilters.tags.join(',');
      }

      const response = await dishesAPI.getDishes(params, forceRefresh);
      console.log('Admin: fetchDishes response:', response.data.data.length, 'dishes');
      console.log('Admin: Setting dishes state with:', response.data.data);
      
      // Force React to re-render by creating a new array reference
      const newDishes = [...response.data.data];
      setDishes(newDishes);
      setRefreshKey(prev => prev + 1); // Force component re-render
      console.log('Admin: Dishes state updated with new array reference and refresh key');
    } catch (error) {
      console.error('Error fetching dishes:', error);
      toast.error('Failed to load dishes');
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories function
  const fetchCategories = async () => {
    try {
      const response = await dishesAPI.getCategories();
      setCategories(response.data.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Fetch tags function
  const fetchTags = async () => {
    try {
      const response = await dishesAPI.getTags();
      setTags(response.data.data);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  // Load initial data
  useEffect(() => {
    alert('🔴 ADMIN MENU COMPONENT LOADED - This should appear when you visit /admin/menu - FORCE DEPLOY TEST - VERSION 2');
    console.log('🔴 COMPONENT MOUNTED - AdminMenu component is loaded');
    fetchDishes(false, filters);
    fetchCategories();
    fetchTags();
  }, []);

  // Handle filter changes
  useEffect(() => {
    fetchDishes(false, filters);
  }, [filters]);

  // Handle escape key to close modals
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (showDeleteModal) {
          handleDeleteCancel();
        }
        if (showAddForm || editingDish) {
          resetForm();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showDeleteModal, showAddForm, editingDish]);

  // Handle real-time menu updates
  const handleMenuUpdate = (data) => {
    console.log('Admin: Real-time menu update received:', data);
    
    // Always refresh from server for real-time updates to ensure consistency
    fetchDishes(true, filters);
  };

  // Use menu updates hook
  useMenuUpdates(handleMenuUpdate);

  // Update URL parameters when filters change
  const updateURLParams = (newFilters) => {
    const params = new URLSearchParams();
    
    if (newFilters.search) {
      params.set('search', newFilters.search);
    }
    if (newFilters.category) {
      params.set('category', newFilters.category);
    }
    if (newFilters.tags && newFilters.tags.length > 0) {
      params.set('tags', newFilters.tags.join(','));
    }
    
    setSearchParams(params);
  };

  // Handle URL parameter changes (e.g., browser back/forward)
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    const urlCategory = searchParams.get('category') || '';
    const urlTags = searchParams.get('tags') ? searchParams.get('tags').split(',') : [];
    
    const urlFilters = {
      search: urlSearch,
      category: urlCategory,
      tags: urlTags
    };
    
    if (JSON.stringify(urlFilters) !== JSON.stringify(filters)) {
      setFilters(urlFilters);
    }
  }, [searchParams]);

  // Set selected tags when editing a dish
  useEffect(() => {
    if (editingDish) {
      setSelectedTags(editingDish.tags || []);
    } else {
      setSelectedTags([]);
    }
  }, [editingDish]);

  const handleDeleteClick = (dish) => {
    setDishToDelete(dish);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!dishToDelete) return;
    
    try {
      console.log('Deleting dish:', dishToDelete._id);
      const response = await dishesAPI.deleteDish(dishToDelete._id);
      console.log('Delete response:', response);
      toast.success(`"${dishToDelete.name}" deleted successfully`);
      
      setShowDeleteModal(false);
      setDishToDelete(null);
      
      // Immediately refresh from server to get updated data
      console.log('Admin: About to refresh dishes after delete');
      await fetchDishes(true, filters);
      console.log('Admin: Dishes refreshed after delete');
      
      // Force immediate UI update by removing the dish from state
      setDishes(prevDishes => {
        const updatedDishes = prevDishes.filter(d => d._id !== dishToDelete._id);
        console.log('Admin: Removed dish from state, new count:', updatedDishes.length);
        return updatedDishes;
      });
    } catch (error) {
      console.error('Error deleting dish:', error);
      console.error('Error details:', error.response?.data);
      const errorMessage = error.response?.data?.message || 'Failed to delete dish';
      toast.error(`Error: ${errorMessage}`);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setDishToDelete(null);
  };

  const handleToggleAvailability = async (dish) => {
    if (togglingAvailability === dish._id) return; // Prevent double clicks
    
    alert('🔴 TOGGLE CLICKED - Function is working!');
    console.log('🔴 TOGGLE CLICKED - This should appear in console!');
    setTogglingAvailability(dish._id);
    try {
      const newAvailability = !dish.availability;
      const updateData = {
        availability: newAvailability
      };
      
      console.log('Updating dish availability:', dish._id, updateData);
      const response = await dishesAPI.updateDish(dish._id, updateData);
      console.log('Update response:', response);
      
      toast.success(`Dish ${newAvailability ? 'shown' : 'hidden'} successfully`);
      
      // IMMEDIATE UI UPDATE - Update state right now
      setDishes(prevDishes => {
        const updatedDishes = prevDishes.map(d => 
          d._id === dish._id ? { ...d, availability: newAvailability } : d
        );
        console.log('✅ IMMEDIATE STATE UPDATE - Dish availability changed');
        return updatedDishes;
      });
      
      // Also refresh from server for consistency
      console.log('Admin: About to refresh dishes after toggle');
      await fetchDishes(true, filters);
      console.log('Admin: Dishes refreshed after toggle');
    } catch (error) {
      console.error('Error updating dish:', error);
      console.error('Error details:', error.response?.data);
      toast.error(`Failed to update dish availability: ${error.response?.data?.message || error.message}`);
    } finally {
      setTogglingAvailability(null);
    }
  };

  const handleFilterChange = (key, value) => {
    const newFilters = {
      ...filters,
      [key]: value
    };
    setFilters(newFilters);
    updateURLParams(newFilters);
  };

  const handleTagToggle = (tag) => {
    const newFilters = {
      ...filters,
      tags: filters.tags.includes(tag)
        ? filters.tags.filter(t => t !== tag)
        : [...filters.tags, tag]
    };
    setFilters(newFilters);
    updateURLParams(newFilters);
  };

  const handleFormTagToggle = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingDish(null);
    setSelectedTags([]);
    setIsSubmitting(false);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) return; // Prevent double submission
    
    setIsSubmitting(true);
    
    const formData = new FormData(e.target);
    
    // Basic form validation
    const name = formData.get('name')?.trim();
    const price = parseFloat(formData.get('price'));
    const description = formData.get('description')?.trim();
    const category = formData.get('category');
    const preparationTime = parseInt(formData.get('preparationTime'));
    const imageUrl = formData.get('imageUrl')?.trim();
    
    // Validate required fields
    if (!name || name.length < 2) {
      toast.error('Dish name must be at least 2 characters long');
      setIsSubmitting(false);
      return;
    }
    
    if (!price || price <= 0) {
      toast.error('Price must be a positive number');
      setIsSubmitting(false);
      return;
    }
    
    if (!description || description.length < 10) {
      toast.error('Description must be at least 10 characters long');
      setIsSubmitting(false);
      return;
    }
    
    if (!category) {
      toast.error('Please select a category');
      setIsSubmitting(false);
      return;
    }
    
    if (!preparationTime || preparationTime < 1) {
      toast.error('Preparation time must be at least 1 minute');
      setIsSubmitting(false);
      return;
    }
    
    if (!imageUrl || !imageUrl.startsWith('http')) {
      toast.error('Please provide a valid image URL');
      setIsSubmitting(false);
      return;
    }
    
    const dishData = {
      name,
      price,
      description,
      category,
      preparationTime,
      imageUrl,
      tags: selectedTags.length > 0 ? selectedTags : ['popular'],
      availability: true,
      ingredients: editingDish?.ingredients || ['Rice', 'Spices', 'Vegetables'],
      nutritionalInfo: editingDish?.nutritionalInfo || {
        calories: 300,
        protein: 15,
        carbs: 40,
        fat: 10
      }
    };

    try {
      console.log('Submitting dish data:', dishData);
      
      if (editingDish) {
        console.log('Updating dish:', editingDish._id);
        const response = await dishesAPI.updateDish(editingDish._id, dishData);
        console.log('Update response:', response);
        toast.success('Dish updated successfully');
      } else {
        console.log('Creating new dish');
        const response = await dishesAPI.createDish(dishData);
        console.log('Create response:', response);
        toast.success('Dish added successfully');
      }
      
      // Reset form and close modal
      resetForm();
      
      // Immediately refresh from server to get updated data
      await fetchDishes(true, filters);
    } catch (error) {
      console.error('Error saving dish:', error);
      console.error('Error details:', error.response?.data);
      const errorMessage = error.response?.data?.message || 'Failed to save dish';
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menu Management</h1>
          <p className="text-gray-600">Manage your restaurant's menu items</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-200 transition-colors"
          >
            <FunnelIcon className="h-5 w-5" />
            <span>Filters</span>
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-orange-600 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Add New Dish</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search dishes..."
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      filters.tags.includes(tag)
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dishes Grid */}
      {dishes.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.709M15 6.291A7.962 7.962 0 0112 4c-2.34 0-4.29 1.009-5.824 2.709" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No dishes found</h3>
          <p className="text-gray-500 mb-4">Try adjusting your search or filter criteria, or add a new dish.</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors flex items-center space-x-2 mx-auto"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Add New Dish</span>
          </button>
        </div>
      ) : (
        <div key={refreshKey} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {dishes.map((dish) => (
          <div key={dish._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <div className="relative">
              <img
                src={dish.imageUrl}
                alt={dish.name}
                className="w-full h-48 object-cover"
              />
              <div className="absolute top-2 right-2">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🔴 BUTTON CLICKED - Eye icon clicked for dish:', dish.name);
                    handleToggleAvailability(dish);
                  }}
                  disabled={togglingAvailability === dish._id}
                  className={`p-2 rounded-full transition-colors ${
                    togglingAvailability === dish._id
                      ? 'bg-gray-400 cursor-not-allowed'
                      : dish.availability
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-red-500 text-white hover:bg-red-600'
                  }`}
                  title={dish.availability ? 'Hide dish' : 'Show dish'}
                >
                  {togglingAvailability === dish._id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : dish.availability ? (
                    <EyeIcon className="h-4 w-4" />
                  ) : (
                    <EyeSlashIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{dish.name}</h3>
              <p className="text-gray-600 text-sm mb-2 line-clamp-2">{dish.description}</p>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xl font-bold text-orange-500">${dish.price}</span>
                <span className="text-sm text-gray-500">{dish.preparationTime} min</span>
              </div>
              
              <div className="flex flex-wrap gap-1 mb-3">
                {dish.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => setEditingDish(dish)}
                  className="flex-1 bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center space-x-1"
                >
                  <PencilIcon className="h-4 w-4" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDeleteClick(dish)}
                  className="flex-1 bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center space-x-1"
                >
                  <TrashIcon className="h-4 w-4" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dish Modal */}
      {(showAddForm || editingDish) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {editingDish ? 'Edit Dish' : 'Add New Dish'}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={editingDish?.name || ''}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                  <input
                    type="number"
                    name="price"
                    step="0.01"
                    min="0"
                    defaultValue={editingDish?.price || ''}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    name="description"
                    rows="3"
                    defaultValue={editingDish?.description || ''}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    name="category"
                    defaultValue={editingDish?.category || ''}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preparation Time (minutes)</label>
                  <input
                    type="number"
                    name="preparationTime"
                    min="1"
                    defaultValue={editingDish?.preparationTime || ''}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                  <input
                    type="url"
                    name="imageUrl"
                    defaultValue={editingDish?.imageUrl || ''}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleFormTagToggle(tag)}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          selectedTags.includes(tag)
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
                    isSubmitting
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-orange-500 text-white hover:bg-orange-600'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>{editingDish ? 'Updating...' : 'Adding...'}</span>
                    </>
                  ) : (
                    <span>{editingDish ? 'Update Dish' : 'Add Dish'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Delete Dish</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{dishToDelete?.name}"? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={handleDeleteCancel}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMenu;