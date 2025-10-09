import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { 
  PlusIcon, 
  MinusIcon, 
  TrashIcon,
  ShoppingBagIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Cart = () => {
  const { items, totalItems, totalAmount, updateQuantity, removeFromCart, clearCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleQuantityChange = async (dishId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(dishId);
      return;
    }

    setIsUpdating(true);
    updateQuantity(dishId, newQuantity);
    setIsUpdating(false);
  };

  const handleRemoveItem = (dishId, dishName) => {
    removeFromCart(dishId);
    toast.success(`${dishName} removed from cart`);
  };

  const handleClearCart = () => {
    clearCart();
    toast.success('Cart cleared');
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/checkout' } } });
      return;
    }
    navigate('/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <ShoppingBagIcon className="mx-auto h-24 w-24 text-gray-400 mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Your cart is empty</h1>
            <p className="text-lg text-gray-600 mb-8">
              Looks like you haven't added any items to your cart yet
            </p>
            <Link
              to="/menu"
              className="bg-orange-500 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-orange-600 transition-colors"
            >
              Browse Menu
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
          <p className="text-lg text-gray-600 mt-2">
            {totalItems} {totalItems === 1 ? 'item' : 'items'} in your cart
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Cart Items</h2>
                  <button
                    onClick={handleClearCart}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Clear Cart
                  </button>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {items.map((item) => (
                  <div key={item.dish._id} className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <img
                          src={item.dish.imageUrl}
                          alt={item.dish.name}
                          className="h-20 w-20 object-cover rounded-lg"
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {item.dish.name}
                        </h3>
                        <p className="text-sm text-gray-500 truncate">
                          {item.dish.description}
                        </p>
                        <div className="flex items-center mt-1">
                        <span className="text-lg font-semibold text-orange-600">
                          ${item.dish.price}
                        </span>
                          <span className="text-sm text-gray-500 ml-2">
                            per item
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        {/* Quantity Controls */}
                        <div className="flex items-center border border-gray-300 rounded-lg">
                          <button
                            onClick={() => handleQuantityChange(item.dish._id, item.quantity - 1)}
                            disabled={isUpdating}
                            className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <MinusIcon className="h-4 w-4" />
                          </button>
                          
                          <span className="px-3 py-2 text-sm font-medium min-w-[3rem] text-center">
                            {item.quantity}
                          </span>
                          
                          <button
                            onClick={() => handleQuantityChange(item.dish._id, item.quantity + 1)}
                            disabled={isUpdating}
                            className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <PlusIcon className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Remove Button */}
                        <button
                          onClick={() => handleRemoveItem(item.dish._id, item.dish.name)}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    {/* Item Total */}
                    <div className="mt-4 flex justify-end">
                      <span className="text-lg font-semibold text-gray-900">
                        ${(item.dish.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm sticky top-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>
              </div>

              <div className="px-6 py-4 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal ({totalItems} items)</span>
                  <span className="font-medium">${totalAmount.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delivery Fee</span>
                  <span className="font-medium">$0.00</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-medium">$0.00</span>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span className="text-orange-600">${totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleCheckout}
                    className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
                  >
                    {isAuthenticated ? 'Proceed to Checkout' : 'Login to Checkout'}
                  </button>

                  <Link
                    to="/menu"
                    className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-200 transition-colors text-center block"
                  >
                    Continue Shopping
                  </Link>
                </div>

                <div className="text-xs text-gray-500 text-center">
                  <p>Free delivery on orders above ₹500</p>
                  <p>Estimated delivery time: 30-45 minutes</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
