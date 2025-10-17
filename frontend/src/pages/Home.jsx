import { Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { 
  ClockIcon, 
  HeartIcon
} from '@heroicons/react/24/outline';
import { dishesAPI, newsletterAPI } from '../services/api';
import toast from 'react-hot-toast';
import OptimizedImage from '../components/OptimizedImage';

const Home = () => {
  const [popularDishes, setPopularDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [displayedDishes, setDisplayedDishes] = useState([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [nextDishes, setNextDishes] = useState([]);
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Function to randomly select 4 dishes from popular dishes
  const getRandomDishes = useCallback((dishes, count = 4) => {
    if (dishes.length <= count) return dishes;
    
    const shuffled = [...dishes].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }, []);

  // Function to generate new slide with sliding animation
  const generateNewSlide = useCallback(() => {
    if (popularDishes.length > 0 && !isTransitioning) {
      const randomDishes = getRandomDishes(popularDishes, 4);
      
      // Start transition
      setIsTransitioning(true);
      setNextDishes(randomDishes);
      
      // After animation completes, update displayed dishes
      setTimeout(() => {
        setDisplayedDishes(randomDishes);
        setNextDishes([]);
        setIsTransitioning(false);
      }, 1000); // Faster transition
    }
  }, [popularDishes, getRandomDishes, isTransitioning]);

  useEffect(() => {
    const fetchPopularDishes = async () => {
      try {
        setLoading(true);
        const response = await dishesAPI.getDishes({ tags: 'popular' });
        setPopularDishes(response.data.data);
      } catch (error) {
        console.error('Error fetching popular dishes:', error);
        // Fallback to hardcoded data if API fails
        setPopularDishes([
          {
            _id: 1,
            name: 'Chicken Biryani',
            description: 'Aromatic basmati rice with tender chicken pieces',
            price: 12.99,
            imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=300&fit=crop',
            category: 'lunch'
          },
          {
            _id: 2,
            name: 'Butter Chicken',
            description: 'Creamy tomato curry with tender chicken pieces',
            price: 14.99,
            imageUrl: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&h=300&fit=crop',
            category: 'lunch'
          },
          {
            _id: 3,
            name: 'Masala Dosa',
            description: 'Crispy crepe filled with spiced potato mixture',
            price: 6.99,
            imageUrl: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop',
            category: 'breakfast'
          },
          {
            _id: 4,
            name: 'Paneer Tikka',
            description: 'Grilled cottage cheese with aromatic spices',
            price: 9.99,
            imageUrl: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&h=300&fit=crop',
            category: 'snacks'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchPopularDishes();
  }, []);

  // Generate initial slide when popular dishes are loaded
  useEffect(() => {
    if (popularDishes.length > 0) {
      const randomDishes = getRandomDishes(popularDishes, 4);
      setDisplayedDishes(randomDishes);
    }
  }, [popularDishes, getRandomDishes]);

  // Auto-play functionality
  useEffect(() => {
    if (popularDishes.length <= 4) return;

    const interval = setInterval(() => {
      generateNewSlide();
    }, 1000); // Change slide every 15 seconds

    return () => clearInterval(interval);
  }, [popularDishes.length, generateNewSlide]);

  // Newsletter subscription handler
  const handleSubscribe = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      setIsSubscribing(true);
      const response = await newsletterAPI.subscribe(email);
      
      if (response.data.success) {
        toast.success('Successfully Subscribed!');
        setEmail('');
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to subscribe to newsletter';
      toast.error(message);
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Welcome to <span className="text-yellow-300">V Kitchen</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-orange-100">
              Delicious home-cooked meals delivered to your doorstep
            </p>
            <div className="flex justify-center">
              <Link
                to="/menu"
                className="bg-white text-orange-600 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Order Now
              </Link>
            </div>
          </div>
        </div>
      </section>


      {/* Popular Dishes Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Popular Dishes
            </h2>
            <p className="text-lg text-gray-600">
              Our most loved dishes that customers keep coming back for
            </p>
          </div>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
          ) : (
            <div className="relative overflow-hidden">
              {/* Current dishes sliding out to the left */}
              <div 
                className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 transition-all duration-1000 ease-in-out ${
                  isTransitioning ? 'slide-out-to-left' : ''
                }`}
              >
                {displayedDishes.map((dish) => (
                <div key={dish._id || dish.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
                  <div className="relative">
                    <OptimizedImage
                      src={dish.imageUrl}
                      alt={dish.name}
                      className="w-full h-48 object-cover"
                    />
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {dish.name}
                      </h3>
                    </div>
                    <p className="text-gray-600 text-sm mb-3 flex-1">
                      {dish.description}
                    </p>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-2xl font-bold text-orange-600">
                        ${dish.price.toFixed(2)}
                      </span>
                      <Link
                        to="/menu"
                        className="bg-orange-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-orange-600 transition-colors"
                      >
                        Order Now
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
              </div>

              {/* Next dishes sliding in from the right */}
              {isTransitioning && nextDishes.length > 0 && (
                <div 
                  className="absolute top-0 left-0 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 slide-in-from-right"
                  style={{ transform: 'translateX(100%)' }}
                >
                  {nextDishes.map((dish) => (
                    <div key={`next-${dish._id || dish.id}`} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
                      <div className="relative">
                        <OptimizedImage
                          src={dish.imageUrl}
                          alt={dish.name}
                          className="w-full h-48 object-cover"
                        />
                      </div>
                      <div className="p-6 flex-1 flex flex-col">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {dish.name}
                          </h3>
                        </div>
                        <p className="text-gray-600 text-sm mb-3 flex-1">
                          {dish.description}
                        </p>
                        <div className="flex items-center justify-between mt-auto">
                          <span className="text-2xl font-bold text-orange-600">
                            ${dish.price.toFixed(2)}
                          </span>
                          <Link
                            to="/menu"
                            className="bg-orange-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-orange-600 transition-colors"
                          >
                            Order Now
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* View Full Menu CTA */}
      <div className="py-10 bg-gray-50 text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/menu"
            className="bg-orange-500 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-orange-600 transition-colors inline-block"
          >
            View Full Menu
          </Link>
        </div>
      </div>

      {/* Why Choose Us Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose V Kitchen?
            </h2>
            <p className="text-lg text-gray-600">
              We're committed to delivering the best food experience
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <ClockIcon className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Fast Delivery</h3>
              <p className="text-gray-600">Get your food delivered in 30-45 minutes with our efficient delivery system</p>
            </div>
            <div className="text-center">
              <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <HeartIcon className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Fresh Ingredients</h3>
              <p className="text-gray-600">We use only the freshest ingredients sourced daily from local suppliers</p>
            </div>
            <div className="text-center">
              <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <HeartIcon className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Quality Assured</h3>
              <p className="text-gray-600">Every dish is prepared with care and attention to detail by our expert chefs</p>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 bg-orange-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Stay Updated</h2>
            <p className="text-orange-100 mb-6">
              Get the latest updates on new dishes, special offers, and exclusive deals
            </p>
            <form onSubmit={handleSubscribe} className="max-w-md mx-auto flex gap-2 relative z-10">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 rounded-lg border-0 focus:ring-2 focus:ring-orange-300 focus:outline-none text-gray-900"
                disabled={isSubscribing}
                autoComplete="email"
              />
              <button
                type="submit"
                disabled={isSubscribing}
                className="px-6 py-2 bg-white text-orange-500 rounded-lg font-semibold hover:bg-orange-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubscribing ? 'Subscribing...' : 'Subscribe'}
              </button>
            </form>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;
