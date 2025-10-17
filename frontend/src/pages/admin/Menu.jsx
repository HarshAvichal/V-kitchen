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

  useEffect(() => {
    fetchDishes(false, filters);
    fetchCategories();
    fetchTags();
  }, [filters]);

  // Handle escape key to close modals
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (showDeleteModal) {
          handleDeleteCancel();
        }
        if (showAddForm || editingDish) {
          setShowAddForm(false);
          setEditingDish(null);
          setSelectedTags([]);
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showDeleteModal, showAddForm, editingDish]);

  // Handle real-time menu updates for admin
  const handleMenuUpdate = useCallback((data) => {
    console.log('Admin: Real-time menu update received:', data);
    // Refresh dishes when menu is updated - get current filters from state
    setFilters(currentFilters => {
      fetchDishes(true, currentFilters);
      return currentFilters;
    });
  }, [fetchDishes]);

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

  const fetchDishes = useCallback(async (forceRefresh = false, currentFilters = filters) => {
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
      setDishes(response.data.data);
    } catch (error) {
      console.error('Error fetching dishes:', error);
      toast.error('Failed to load dishes');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await dishesAPI.getCategories();
      setCategories(response.data.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await dishesAPI.getTags();
      setTags(response.data.data);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const handleDeleteClick = (dish) => {
    setDishToDelete(dish);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!dishToDelete) return;
    
    try {
      await dishesAPI.deleteDish(dishToDelete._id);
      toast.success('Dish deleted successfully');
      // Small delay to ensure backend processing
      setTimeout(() => {
        setFilters(currentFilters => {
          fetchDishes(true, currentFilters);
          return currentFilters;
        });
      }, 100);
      setShowDeleteModal(false);
      setDishToDelete(null);
    } catch (error) {
      console.error('Error deleting dish:', error);
      toast.error('Failed to delete dish');
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setDishToDelete(null);
  };

  const handleToggleAvailability = async (dish) => {
    try {
        await dishesAPI.updateDish(dish._id, {
        ...dish,
        availability: !dish.availability
      });
      toast.success(`Dish ${dish.availability ? 'hidden' : 'shown'} successfully`);
      // Small delay to ensure backend processing
      setTimeout(() => {
        setFilters(currentFilters => {
          fetchDishes(true, currentFilters);
          return currentFilters;
        });
      }, 100);
    } catch (error) {
      console.error('Error updating dish:', error);
      toast.error('Failed to update dish availability');
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

  const clearFilters = () => {
    const newFilters = {
      search: '',
      category: '',
      tags: []
    };
    setFilters(newFilters);
    updateURLParams(newFilters);
  };

  // Function to get automatic image URL based on dish name
  const getAutomaticImageUrl = (dishName) => {
    const name = dishName.toLowerCase();
    
    // Define image mappings for common dishes with correct URLs
    const imageMappings = {
      'chicken biryani': 'https://images.unsplash.com/photo-1593483316242-efeea8084cda?w=400&h=300&fit=crop',
      'butter chicken': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop',
      'masala dosa': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop',
      'paneer tikka': 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&h=300&fit=crop',
      'mango lassi': 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&h=300&fit=crop',
      'dal makhani': 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&h=300&fit=crop',
      'naan': 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&h=300&fit=crop',
      'samosa': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop',
      'tandoori chicken': 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=300&fit=crop',
      'rajma': 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&h=300&fit=crop',
      'biryani': 'https://images.unsplash.com/photo-1593483316242-efeea8084cda?w=400&h=300&fit=crop',
      'dosa': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop',
      'tikka': 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&h=300&fit=crop',
      'lassi': 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&h=300&fit=crop',
      'dal': 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&h=300&fit=crop',
      'bread': 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&h=300&fit=crop',
      'chicken': 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=300&fit=crop',
      'curry': 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&h=300&fit=crop'
    };

    // Check for exact matches first
    if (imageMappings[name]) {
      return imageMappings[name];
    }

    // Check for partial matches
    for (const [key, url] of Object.entries(imageMappings)) {
      if (name.includes(key) || key.includes(name)) {
        return url;
      }
    }

    // Default fallback image - using a generic food placeholder
    return 'https://via.placeholder.com/400x300/FF6B35/FFFFFF?text=Food+Image';
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const dishData = {
      name: formData.get('name'),
      price: parseFloat(formData.get('price')),
      description: formData.get('description'),
      category: formData.get('category'),
      preparationTime: parseInt(formData.get('preparationTime')),
      imageUrl: formData.get('imageUrl'),
      tags: selectedTags.length > 0 ? selectedTags : ['popular'], // Use selected tags or default
      availability: true,
      ingredients: ['Rice', 'Spices', 'Vegetables'], // Default ingredients
      nutritionalInfo: {
        calories: 300,
        protein: 15,
        carbs: 40,
        fat: 10
      }
    };

    try {
      if (editingDish) {
        // Update existing dish
        await dishesAPI.updateDish(editingDish._id, dishData);
        toast.success('Dish updated successfully');
      } else {
        // Create new dish
        await dishesAPI.createDish(dishData);
        toast.success('Dish added successfully');
      }
      
      // Reset form and close modal
      setShowAddForm(false);
      setEditingDish(null);
      setSelectedTags([]);
      // Small delay to ensure backend processing
      setTimeout(() => {
        setFilters(currentFilters => {
          fetchDishes(true, currentFilters);
          return currentFilters;
        });
      }, 100);
    } catch (error) {
      console.error('Error saving dish:', error);
      toast.error('Failed to save dish');
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
            <button
              onClick={clearFilters}
              className="text-sm text-orange-600 hover:text-orange-700 flex items-center space-x-1"
            >
              <XMarkIcon className="h-4 w-4" />
              <span>Clear All</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {dishes.map((dish) => (
          <div key={dish._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
            <div className="relative">
              <img
                src={dish.imageUrl}
                alt={dish.name}
                className="w-full h-48 object-cover"
              />
              <div className="absolute top-2 right-2">
                <button
                  onClick={() => handleToggleAvailability(dish)}
                  className={`p-2 rounded-full ${
                    dish.availability 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-red-100 text-red-600'
                  }`}
                  title={dish.availability ? 'Hide dish' : 'Show dish'}
                >
                  {dish.availability ? (
                    <EyeIcon className="h-4 w-4" />
                  ) : (
                    <EyeSlashIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{dish.name}</h3>
                <span className="text-2xl font-bold text-orange-600">${dish.price}</span>
              </div>
              
              <p className="text-gray-600 text-sm mb-3 flex-1">{dish.description}</p>
              
              <div className="flex flex-wrap gap-1 mb-2">
                {dish.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              
              <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
                <span>Category: {dish.category}</span>
                <span>{dish.preparationTime} min</span>
              </div>
              
              <div className="flex space-x-2 mt-auto">
                <button
                  onClick={() => setEditingDish(dish)}
                  className="flex-1 bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600 transition-colors flex items-center justify-center space-x-1"
                >
                  <PencilIcon className="h-4 w-4" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDeleteClick(dish)}
                  className="flex-1 bg-red-500 text-white px-3 py-2 rounded text-sm hover:bg-red-600 transition-colors flex items-center justify-center space-x-1"
                >
                  <TrashIcon className="h-4 w-4" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {dishes.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No dishes found</h3>
          <p className="text-gray-500 mb-4">Get started by adding your first dish to the menu.</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
          >
            Add Your First Dish
          </button>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {(showAddForm || editingDish) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingDish ? 'Edit Dish' : 'Add New Dish'}
              </h2>
              
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dish Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      defaultValue={editingDish?.name || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="Enter dish name"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price ($)
                    </label>
                    <input
                      type="number"
                      name="price"
                      step="0.01"
                      defaultValue={editingDish?.price || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    defaultValue={editingDish?.description || ''}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Enter dish description"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      name="category"
                      defaultValue={editingDish?.category || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      required
                    >
                      <option value="">Select category</option>
                      <option value="breakfast">Breakfast</option>
                      <option value="lunch">Lunch</option>
                      <option value="dinner">Dinner</option>
                      <option value="snacks">Snacks</option>
                      <option value="beverages">Beverages</option>
                      <option value="dessert">Dessert</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Preparation Time (min)
                    </label>
                    <input
                      type="number"
                      name="preparationTime"
                      defaultValue={editingDish?.preparationTime || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="15"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Image URL (Required)
                    </label>
                    <input
                      type="url"
                      name="imageUrl"
                      defaultValue={editingDish?.imageUrl || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="https://example.com/image.jpg"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      💡 Tip: Right-click any image online and "Copy image address" to get the URL
                    </p>
                  </div>
                </div>
                
                {/* Tags Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleFormTagToggle(tag)}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          selectedTags.includes(tag)
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Select tags to help customers filter dishes (e.g., spicy, vegetarian, popular)
                  </p>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingDish(null);
                      setSelectedTags([]);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    {editingDish ? 'Update Dish' : 'Add Dish'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && dishToDelete && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={handleDeleteCancel}
        >
          <div 
            className="bg-white rounded-lg max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <TrashIcon className="w-6 h-6 text-red-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Delete Dish
                  </h3>
                  <p className="text-sm text-gray-500">
                    This action cannot be undone.
                  </p>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700">
                  Are you sure you want to delete <span className="font-semibold text-gray-900">"{dishToDelete.name}"</span>?
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  This will permanently remove the dish from your menu.
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleDeleteCancel}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Delete Dish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMenu;
