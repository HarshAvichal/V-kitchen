import { useState, useEffect } from 'react';
import { dishesAPI } from '../services/api';
import { 
  PrinterIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  SunIcon,
  CubeTransparentIcon,
  CakeIcon,
  SparklesIcon,
  BeakerIcon,
  HomeIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const MenuCard = () => {
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchDishes();
  }, []);

  const fetchDishes = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const response = await dishesAPI.getDishes({}, forceRefresh);
      setDishes(response.data.data);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(response.data.data.map(dish => dish.category))];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching dishes:', error);
      toast.error('Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredDishes = dishes.filter(dish => {
    const matchesSearch = dish.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         dish.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || dish.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedDishes = filteredDishes.reduce((acc, dish) => {
    const category = dish.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(dish);
    return acc;
  }, {});

  // Define the order of categories for restaurant menu
  const categoryOrder = [
    'beverages',
    'beverage', 
    'breakfast',
    'breakfast & snacks',
    'snacks',
    'lunch',
    'dinner',
    'desserts',
    'dessert',
    'appetizer',
    'appetizers',
    'soup',
    'soups',
    'salad',
    'salads',
    'main course',
    'main',
    'other'
  ];

  // Sort categories according to the predefined order
  const sortedCategories = Object.keys(groupedDishes).sort((a, b) => {
    const indexA = categoryOrder.findIndex(cat => 
      a.toLowerCase().includes(cat.toLowerCase()) || cat.toLowerCase().includes(a.toLowerCase())
    );
    const indexB = categoryOrder.findIndex(cat => 
      b.toLowerCase().includes(cat.toLowerCase()) || cat.toLowerCase().includes(b.toLowerCase())
    );
    
    // If both categories are found in the order, sort by their position
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    // If only one is found, prioritize it
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    // If neither is found, sort alphabetically
    return a.localeCompare(b);
  });

  const getCategoryIcon = (category) => {
    const IconComponent = {
      'beverages': BeakerIcon,
      'beverage': BeakerIcon,
      'breakfast': SunIcon,
      'breakfast & snacks': SunIcon,
      'snacks': CubeTransparentIcon,
      'lunch': HomeIcon,
      'dinner': HomeIcon,
      'desserts': CakeIcon,
      'dessert': CakeIcon,
      'appetizer': HomeIcon,
      'appetizers': HomeIcon,
      'soup': HomeIcon,
      'soups': HomeIcon,
      'salad': HomeIcon,
      'salads': HomeIcon,
      'main course': HomeIcon,
      'main': HomeIcon,
      'other': SparklesIcon
    }[category?.toLowerCase()] || SparklesIcon;

    return <IconComponent className="h-6 w-6 text-orange-500 mr-2" />;
  };

  const getCategoryTitle = (category) => {
    const titles = {
      'beverages': 'Beverages',
      'beverage': 'Beverages',
      'breakfast': 'Breakfast',
      'breakfast & snacks': 'Breakfast & Snacks',
      'snacks': 'Snacks',
      'lunch': 'Lunch',
      'dinner': 'Dinner',
      'desserts': 'Desserts',
      'dessert': 'Desserts',
      'appetizer': 'Appetizers',
      'appetizers': 'Appetizers',
      'soup': 'Soups',
      'soups': 'Soups',
      'salad': 'Salads',
      'salads': 'Salads',
      'main course': 'Main Course',
      'main': 'Main Course',
      'other': 'Other'
    };
    return titles[category?.toLowerCase()] || category || 'Other';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            <span className="ml-3 text-gray-600">Loading menu...</span>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8 print:mb-4">
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 bg-orange-500 rounded-lg flex items-center justify-center mr-4">
              <span className="text-white font-bold text-2xl">V</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900">V Kitchen</h1>
          </div>
          <p className="text-lg text-gray-600 italic">Fresh Food, Your Way</p>
          <div className="w-24 h-1 bg-orange-500 mx-auto mt-4"></div>
        </div>

        {/* Controls - Hidden in print */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8 print:hidden">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search dishes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <FunnelIcon className="h-5 w-5" />
                Filter
              </button>
              
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                <PrinterIcon className="h-5 w-5" />
                Print Menu
              </button>
            </div>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory('')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === '' 
                      ? 'bg-orange-500 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Categories
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${
                      selectedCategory === category 
                        ? 'bg-orange-500 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {getCategoryIcon(category)}
                    {getCategoryTitle(category)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Menu Content */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden print:shadow-none print:rounded-none">
          {Object.keys(groupedDishes).length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No dishes found matching your criteria.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {sortedCategories.map((category) => (
                <div key={category} className="p-8 print:p-6">
                  {/* Category Header */}
                  <div className="text-center mb-8 print:mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2 print:text-xl flex items-center justify-center">
                      {getCategoryIcon(category)}
                      {getCategoryTitle(category)}
                    </h2>
                    <div className="w-16 h-0.5 bg-orange-500 mx-auto"></div>
                  </div>

                  {/* Dishes Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:gap-4">
                    {groupedDishes[category].map((dish) => (
                      <div key={dish._id} className="flex items-start space-x-4 print:space-x-3">
                        {/* Dish Image */}
                        <div className="flex-shrink-0 w-20 h-20 print:w-16 print:h-16">
                          {dish.imageUrl ? (
                            <img
                              src={dish.imageUrl}
                              alt={dish.name}
                              className="w-full h-full object-cover rounded-lg print:rounded"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-200 rounded-lg print:rounded flex items-center justify-center">
                              <span className="text-gray-400 text-2xl print:text-xl">🍽️</span>
                            </div>
                          )}
                        </div>

                        {/* Dish Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 print:text-base">
                              {dish.name}
                            </h3>
                            <span className="text-lg font-bold text-orange-600 print:text-base">
                              ${dish.price.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm mt-1 print:text-xs">
                            {dish.description}
                          </p>
                          {dish.tags && dish.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2 print:hidden">
                              {dish.tags.map((tag, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 print:mt-6">
          <p className="text-gray-500 text-sm">
            Thank you for choosing V Kitchen! • Fresh ingredients • Made with love
          </p>
          <p className="text-gray-400 text-xs mt-2 print:hidden">
            Visit our website or call us to place your order
          </p>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:mb-4 {
            margin-bottom: 1rem !important;
          }
          .print\\:p-6 {
            padding: 1.5rem !important;
          }
          .print\\:text-xl {
            font-size: 1.25rem !important;
          }
          .print\\:text-base {
            font-size: 1rem !important;
          }
          .print\\:text-xs {
            font-size: 0.75rem !important;
          }
          .print\\:gap-4 {
            gap: 1rem !important;
          }
          .print\\:space-x-3 > * + * {
            margin-left: 0.75rem !important;
          }
          .print\\:w-16 {
            width: 4rem !important;
          }
          .print\\:h-16 {
            height: 4rem !important;
          }
          .print\\:rounded {
            border-radius: 0.25rem !important;
          }
          .print\\:rounded-none {
            border-radius: 0 !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default MenuCard;
