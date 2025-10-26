import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dishesAPI, storeAPI } from '../services/api';
import { useCart } from '../context/CartContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { 
  ClockIcon,
  PlusIcon,
  MinusIcon,
  ArrowLeftIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const DishDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [dish, setDish] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [storeStatus, setStoreStatus] = useState({ isOpen: true });
  const { on, off } = useWebSocket();

  useEffect(() => {
    fetchDish();
    fetchStoreStatus();
  }, [id]);

  // Fetch store status
  const fetchStoreStatus = async () => {
    try {
      const response = await storeAPI.getStoreStatus();
      setStoreStatus(response.data.data);
    } catch (error) {
      console.error('Error fetching store status:', error);
    }
  };

  // Listen to WebSocket for real-time store status updates
  useEffect(() => {
    const handleStoreStatusUpdate = (data) => {
      console.log('📋 DISH DETAIL: Store status updated via WebSocket:', data);
      setStoreStatus({
        isOpen: data.isOpen,
        closedMessage: data.closedMessage
      });
    };

    on('store-status-updated', handleStoreStatusUpdate);

    return () => {
      off('store-status-updated', handleStoreStatusUpdate);
    };
  }, [on, off]);

  const fetchDish = async () => {
    try {
      setLoading(true);
      const response = await dishesAPI.getDish(id);
      setDish(response.data.data);
    } catch (error) {
      console.error('Error fetching dish:', error);
      toast.error('Failed to load dish details');
      navigate('/menu');
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (change) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 1 && newQuantity <= 10) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = async () => {
    // Check if store is closed
    if (!storeStatus.isOpen) {
      toast.error(storeStatus.closedMessage || 'Store is currently closed');
      return;
    }

    if (!dish.availability) {
      toast.error('This dish is currently unavailable');
      return;
    }

    try {
      setIsAddingToCart(true);
      addToCart(dish, quantity);
      toast.success(`${dish.name} added to cart!`);
    } catch (error) {
      toast.error('Failed to add to cart');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const formatCategory = (category) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const formatTag = (tag) => {
    return tag.charAt(0).toUpperCase() + tag.slice(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!dish) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Dish not found</h1>
            <button
              onClick={() => navigate('/menu')}
              className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
            >
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/menu')}
          className="flex items-center text-orange-600 hover:text-orange-700 mb-8"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Menu
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image */}
          <div className="space-y-4">
            <div className="aspect-w-16 aspect-h-9">
              <img
                src={dish.imageUrl}
                alt={dish.name}
                className="w-full h-96 object-cover rounded-lg shadow-lg"
              />
            </div>
            
            {/* Availability Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {dish.availability ? (
                  <div className="flex items-center text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm font-medium">Available</span>
                  </div>
                ) : (
                  <div className="flex items-center text-red-600">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                    <span className="text-sm font-medium">Currently Unavailable</span>
                  </div>
                )}
              </div>
              
            </div>
          </div>

          {/* Details */}
          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{dish.name}</h1>
                <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                  <HeartIcon className="h-6 w-6" />
                </button>
              </div>
              
              <p className="text-lg text-gray-600 mb-4">{dish.description}</p>
              
              <div className="flex items-center space-x-6 mb-6">
                <div className="flex items-center text-gray-600">
                  <ClockIcon className="h-5 w-5 mr-2" />
                  <span className="text-sm">{dish.preparationTime} mins</span>
                </div>
                
                <div className="text-sm text-gray-600">
                  Category: <span className="font-medium text-gray-900">{formatCategory(dish.category)}</span>
                </div>
              </div>
            </div>

            {/* Price and Quantity */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl font-bold text-orange-600">${dish.price}</span>
                <div className="text-sm text-gray-500">per serving</div>
              </div>
              
              <div className="flex items-center space-x-4 mb-6">
                <span className="text-sm font-medium text-gray-700">Quantity:</span>
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <MinusIcon className="h-4 w-4" />
                  </button>
                  
                  <span className="px-4 py-2 text-sm font-medium min-w-[3rem] text-center">
                    {quantity}
                  </span>
                  
                  <button
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= 10}
                    className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <button
                onClick={handleAddToCart}
                disabled={!dish.availability || isAddingToCart || !storeStatus.isOpen}
                className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isAddingToCart ? 'Adding...' : !storeStatus.isOpen ? 'Store Closed' : dish.availability ? 'Add to Cart' : 'Unavailable'}
              </button>
            </div>

            {/* Tags */}
            {dish.tags && dish.tags.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {dish.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-orange-100 text-orange-800 text-sm font-medium rounded-full"
                    >
                      {formatTag(tag)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Ingredients */}
            {dish.ingredients && dish.ingredients.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Ingredients</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  {dish.ingredients.map((ingredient, index) => (
                    <li key={index}>{ingredient}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Nutritional Information */}
            {dish.nutritionalInfo && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Nutritional Information</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {dish.nutritionalInfo.calories && (
                    <div className="bg-white rounded-lg shadow-sm p-4 text-center">
                      <div className="text-2xl font-bold text-orange-600">{dish.nutritionalInfo.calories}</div>
                      <div className="text-sm text-gray-500">Calories</div>
                    </div>
                  )}
                  {dish.nutritionalInfo.protein && (
                    <div className="bg-white rounded-lg shadow-sm p-4 text-center">
                      <div className="text-2xl font-bold text-orange-600">{dish.nutritionalInfo.protein}g</div>
                      <div className="text-sm text-gray-500">Protein</div>
                    </div>
                  )}
                  {dish.nutritionalInfo.carbs && (
                    <div className="bg-white rounded-lg shadow-sm p-4 text-center">
                      <div className="text-2xl font-bold text-orange-600">{dish.nutritionalInfo.carbs}g</div>
                      <div className="text-sm text-gray-500">Carbs</div>
                    </div>
                  )}
                  {dish.nutritionalInfo.fat && (
                    <div className="bg-white rounded-lg shadow-sm p-4 text-center">
                      <div className="text-2xl font-bold text-orange-600">{dish.nutritionalInfo.fat}g</div>
                      <div className="text-sm text-gray-500">Fat</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DishDetail;
