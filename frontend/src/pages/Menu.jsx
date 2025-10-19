import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { dishesAPI } from '../services/api';
import { useCart } from '../context/CartContext';
import { useMenuUpdates } from '../hooks/useMenuUpdates';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon,
  PlusIcon,
  MinusIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Menu = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [dishes, setDishes] = useState([]);
  const [categories, setCategories] = useState(['beverages', 'breakfast', 'lunch', 'dinner', 'dessert']);
  const [tags, setTags] = useState(['popular', 'spicy', 'vegetarian', 'non-vegetarian', 'mild', 'dessert']);
  const [loading, setLoading] = useState(true);
  
  // Initialize filters from URL parameters
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    tags: searchParams.get('tags') ? searchParams.get('tags').split(',') : [],
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    sort: searchParams.get('sort') || 'newest'
  });
  const [pagination, setPagination] = useState({
    page: parseInt(searchParams.get('page')) || 1,
    limit: 12,
    total: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Force re-render by creating completely new objects
  const forceRerender = useCallback(() => {
    setDishes(prevDishes => {
      return prevDishes.map(dish => ({ ...dish, _forceUpdate: Date.now() }));
    });
    setRefreshKey(prev => prev + 1);
  }, []);

  const { addToCart } = useCart();

  // Fetch dishes function - completely independent
  const fetchDishes = async (forceRefresh = false, currentFilters = filters, currentPagination = pagination) => {
    try {
      console.log('🔍 CUSTOMER: fetchDishes called with forceRefresh:', forceRefresh);
      console.log('🔍 CUSTOMER: currentFilters:', currentFilters);
      console.log('🔍 CUSTOMER: currentPagination:', currentPagination);
      setLoading(true);
      const params = {
        page: currentPagination.page,
        limit: currentPagination.limit,
        // Remove availability filter - show all dishes but handle unavailable state in UI
        ...currentFilters
      };
      
      // Convert tags array to comma-separated string
      if (currentFilters.tags.length > 0) {
        params.tags = currentFilters.tags.join(',');
      }

      console.log('🔍 CUSTOMER: Final params being sent:', params);
      const response = await dishesAPI.getDishes(params, forceRefresh);
      
      // Debug: Check what server returns
      console.log('🔍 CUSTOMER: Server returned dishes:', response.data.data.map(d => ({ 
        id: d._id, 
        name: d.name, 
        price: d.price,
        isActive: d.isActive,
        availability: d.availability 
      })));
      
      // AGGRESSIVE: Completely recreate the dishes array with new objects
      const newDishes = response.data.data.map((dish, index) => ({
        ...dish,
        _forceUpdate: Date.now() + index,
        _refreshKey: refreshKey + 1
      }));
      
      setDishes(newDishes);
      setPagination(prev => ({
        ...prev,
        total: response.data.total
      }));
      
      // Force component re-render
      setRefreshKey(prev => prev + 1);
      
      // Additional force re-render after state update
      setTimeout(() => {
        setDishes(prevDishes => [...prevDishes]);
        setRefreshKey(prev => prev + 1);
      }, 100);
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
    fetchDishes(true, filters, pagination); // Always force refresh on initial load to get fresh data
  }, []);

  // Handle filter changes
  useEffect(() => {
    fetchDishes(false, filters, pagination);
  }, [filters, pagination.page]);

  // Handle real-time menu updates
  const handleMenuUpdate = (data) => {
    console.log('Customer: Real-time menu update received:', data);
    console.log('Customer: Event type:', data.type, 'Action:', data.action, 'UpdateType:', data.updateType);
    
    // Show toast notification for new dishes
    if (data.action === 'created' || data.updateType === 'dish-added') {
      const dishName = data.dish?.name || data.data?.name;
      if (dishName) {
        toast.success(`New dish added: ${dishName}`, {
          duration: 3000,
          icon: '🍽️'
        });
      }
    }
    
    // IMMEDIATE UI UPDATE for specific dish changes
    if (data.action === 'updated' || data.updateType === 'dish-updated') {
      const updatedDish = data.dish || data.data;
      if (updatedDish) {
        console.log('Customer: Updating specific dish immediately:', updatedDish);
        console.log('Customer: Dish availability:', updatedDish.availability);
        console.log('Customer: Dish name:', updatedDish.name);
        
        // Updating specific dish immediately
        setDishes(prevDishes => {
          const updatedDishes = prevDishes.map(dish => {
            if (dish._id === updatedDish._id) {
              console.log('Customer: Found dish to update:', dish.name, 'Old availability:', dish.availability, 'New availability:', updatedDish.availability);
              // Force a complete update with the new data
              return { 
                ...updatedDish, 
                _forceUpdate: Date.now(),
                // Ensure availability is properly set
                availability: updatedDish.availability !== undefined ? updatedDish.availability : dish.availability
              };
            }
            return dish;
          });
          console.log('Customer: Updated dishes array:', updatedDishes.map(d => ({ name: d.name, availability: d.availability })));
          return [...updatedDishes];
        });
        setRefreshKey(prev => prev + 1);
        return; // Skip the full refresh for specific updates
      }
    }
    
    // Handle dish creation (separate from the above)
    if (data.action === 'created' || data.updateType === 'dish-added') {
      const newDish = data.dish || data.data;
      if (newDish) {
        console.log('Customer: Adding new dish:', newDish.name);
        setDishes(prevDishes => {
          // Check if dish already exists to prevent duplicates
          const dishExists = prevDishes.some(dish => dish._id === newDish._id);
          if (dishExists) {
            console.log('Customer: Dish already exists, skipping duplicate addition');
            return prevDishes;
          }
          const updatedDishes = [...prevDishes, { ...newDish, _forceUpdate: Date.now() }];
          return updatedDishes;
        });
        setRefreshKey(prev => prev + 1);
        return; // Skip the full refresh for new dishes
      }
    }
    
    // Handle dish deletion
    if (data.action === 'deleted' || data.updateType === 'dish-deleted') {
      const deletedDishId = data.dish?._id || data.data?.id;
      if (deletedDishId) {
        console.log('Customer: Removing deleted dish:', deletedDishId);
        setDishes(prevDishes => {
          const updatedDishes = prevDishes.filter(dish => dish._id !== deletedDishId);
          return [...updatedDishes];
        });
        setRefreshKey(prev => prev + 1);
        return; // Skip the full refresh for deletions
      }
    }
    
    // Note: We rely on immediate UI updates above for better performance
    // Only refresh from server if no specific update was handled
  };

  // Use menu updates hook
  useMenuUpdates(handleMenuUpdate);

  // Update URL parameters when filters change
  const updateURLParams = (newFilters, newPagination) => {
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
    if (newFilters.minPrice) {
      params.set('minPrice', newFilters.minPrice);
    }
    if (newFilters.maxPrice) {
      params.set('maxPrice', newFilters.maxPrice);
    }
    if (newFilters.sort && newFilters.sort !== 'newest') {
      params.set('sort', newFilters.sort);
    }
    if (newPagination.page && newPagination.page > 1) {
      params.set('page', newPagination.page.toString());
    }
    
    setSearchParams(params);
  };

  // Handle URL parameter changes (e.g., browser back/forward)
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    const urlCategory = searchParams.get('category') || '';
    const urlTags = searchParams.get('tags') ? searchParams.get('tags').split(',') : [];
    const urlMinPrice = searchParams.get('minPrice') || '';
    const urlMaxPrice = searchParams.get('maxPrice') || '';
    const urlSort = searchParams.get('sort') || 'newest';
    const urlPage = parseInt(searchParams.get('page')) || 1;
    
    const urlFilters = {
      search: urlSearch,
      category: urlCategory,
      tags: urlTags,
      minPrice: urlMinPrice,
      maxPrice: urlMaxPrice,
      sort: urlSort
    };
    
    if (JSON.stringify(urlFilters) !== JSON.stringify(filters) || urlPage !== pagination.page) {
      setFilters(urlFilters);
      setPagination(prev => ({ ...prev, page: urlPage }));
    }
  }, [searchParams]);

  const handleFilterChange = (key, value) => {
    const newFilters = {
      ...filters,
      [key]: value
    };
    const newPagination = {
      ...pagination,
      page: 1
    };
    
    setFilters(newFilters);
    setPagination(newPagination);
    updateURLParams(newFilters, newPagination);
  };

  const handleTagToggle = (tag) => {
    const newFilters = {
      ...filters,
      tags: filters.tags.includes(tag)
        ? filters.tags.filter(t => t !== tag)
        : [...filters.tags, tag]
    };
    
    const newPagination = {
      ...pagination,
      page: 1
    };
    
    setFilters(newFilters);
    setPagination(newPagination);
    updateURLParams(newFilters, newPagination);
  };

  const handleAddToCart = (dish) => {
    addToCart(dish, 1);
    toast.success(`${dish.name} added to cart!`);
  };

  const handlePageChange = (newPage) => {
    const newPagination = {
      ...pagination,
      page: newPage
    };
    setPagination(newPagination);
    updateURLParams(filters, newPagination);
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Our Menu</h1>
          <p className="text-xl text-gray-600">Fresh ingredients, delicious flavors</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search dishes..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="bg-orange-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-orange-600 transition-colors"
            >
              <FunnelIcon className="h-5 w-5" />
              <span>Filters</span>
            </button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Price</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={filters.minPrice}
                    onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Price</label>
                  <input
                    type="number"
                    placeholder="100"
                    value={filters.maxPrice}
                    onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                {/* Sort */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                  <select
                    value={filters.sort}
                    onChange={(e) => handleFilterChange('sort', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="name-asc">Name: A to Z</option>
                    <option value="name-desc">Name: Z to A</option>
                  </select>
                </div>
              </div>

              {/* Tags Filter */}
              <div className="mt-4">
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
          )}
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            Showing {dishes.length} of {pagination.total} dishes
          </p>
        </div>

        {/* Dishes Grid */}
        <div key={refreshKey}>
        {dishes.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.709M15 6.291A7.962 7.962 0 0112 4c-2.34 0-4.29 1.009-5.824 2.709" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No dishes found</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {dishes.map((dish) => (
              <div key={`${dish._id}-${dish._forceUpdate || refreshKey}`} className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow ${!dish.availability ? 'opacity-75' : ''}`}>
                <Link to={`/dish/${dish._id}`}>
                  <div className="relative">
                    <img
                      src={dish.imageUrl}
                      alt={dish.name}
                      className="w-full h-48 object-cover"
                    />
                    {!dish.availability && (
                      <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                        <span className="text-white font-semibold bg-red-500 px-3 py-1 rounded-full">Currently Unavailable</span>
                      </div>
                    )}
                  </div>
                </Link>
                
                <div className="p-4">
                  <Link to={`/dish/${dish._id}`}>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-orange-500 transition-colors">
                      {dish.name}
                    </h3>
                  </Link>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{dish.description}</p>
                  
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xl font-bold text-orange-500">${dish.price}</span>
                    <span className="text-sm text-gray-500">{dish.preparationTime} min</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mb-4">
                    {dish.tags?.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                    {dish.tags?.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        +{dish.tags.length - 3} more
                      </span>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleAddToCart(dish)}
                    disabled={!dish.availability}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                      dish.availability
                        ? 'bg-orange-500 text-white hover:bg-orange-600'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {dish.availability ? 'Add to Cart' : 'Unavailable'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <nav className="flex space-x-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg ${
                    page === pagination.page
                      ? 'bg-orange-500 text-white'
                      : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
};

export default Menu;