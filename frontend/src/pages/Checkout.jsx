import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ordersAPI } from '../services/api';
import PaymentForm from '../components/PaymentForm';
import { 
  MapPinIcon,
  PhoneIcon,
  CreditCardIcon,
  TruckIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Checkout = () => {
  const { items, totalAmount, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [currentStep, setCurrentStep] = useState('details'); // 'details' or 'payment'
  const [createdOrder, setCreatedOrder] = useState(null);

  const [formData, setFormData] = useState({
    deliveryType: 'delivery',
    deliveryAddress: {
      street: user?.address?.street || '',
      city: user?.address?.city || '',
      state: user?.address?.state || '',
      zipCode: user?.address?.zipCode || '',
      landmark: '',
      instructions: ''
    },
    contactPhone: user?.phone || '',
    paymentMethod: 'cash',
    specialInstructions: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('deliveryAddress.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        deliveryAddress: {
          ...prev.deliveryAddress,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.contactPhone) {
      newErrors.contactPhone = 'Contact phone is required';
    }

    if (formData.deliveryType === 'delivery') {
      if (!formData.deliveryAddress.street) {
        newErrors['deliveryAddress.street'] = 'Street address is required';
      }
      if (!formData.deliveryAddress.city) {
        newErrors['deliveryAddress.city'] = 'City is required';
      }
      if (!formData.deliveryAddress.state) {
        newErrors['deliveryAddress.state'] = 'State is required';
      }
      if (!formData.deliveryAddress.zipCode) {
        newErrors['deliveryAddress.zipCode'] = 'ZIP code is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const orderData = {
        items: items.map(item => ({
          dish: item.dish._id,
          quantity: item.quantity
        })),
        deliveryType: formData.deliveryType,
        contactPhone: formData.contactPhone,
        specialInstructions: formData.specialInstructions
      };

      if (formData.deliveryType === 'delivery') {
        orderData.deliveryAddress = {
          street: formData.deliveryAddress.street,
          city: formData.deliveryAddress.city,
          state: formData.deliveryAddress.state,
          zipCode: formData.deliveryAddress.zipCode,
          landmark: formData.deliveryAddress.landmark || '',
          instructions: formData.deliveryAddress.instructions || ''
        };
      }

      const response = await ordersAPI.createOrder(orderData);
      setCreatedOrder(response.data.data);
      setCurrentStep('payment');
      toast.success('Order created! Please complete payment.');
    } catch (error) {
      console.error('Error creating order:', error);
      const message = error.response?.data?.message || 'Failed to place order';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSuccess = (paymentIntent) => {
    console.log('Payment successful:', paymentIntent);
    toast.success('Payment successful! Order confirmed.');
    clearCart();
    navigate(`/order/${createdOrder._id}`);
  };

  const handlePaymentError = (error) => {
    console.error('Payment failed:', error);
    toast.error('Payment failed. Please try again.');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
          <p className="text-lg text-gray-600 mt-2">
            {currentStep === 'details' ? 'Complete your order' : 'Complete your payment'}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center ${currentStep === 'details' ? 'text-orange-600' : 'text-green-600'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'details' ? 'bg-orange-100' : 'bg-green-100'}`}>
                {currentStep === 'payment' ? '✓' : '1'}
              </div>
              <span className="ml-2 font-medium">Order Details</span>
            </div>
            <div className="w-8 h-0.5 bg-gray-300"></div>
            <div className={`flex items-center ${currentStep === 'payment' ? 'text-orange-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'payment' ? 'bg-orange-100' : 'bg-gray-100'}`}>
                2
              </div>
              <span className="ml-2 font-medium">Payment</span>
            </div>
          </div>
        </div>

        {currentStep === 'details' ? (
          <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Order Details */}
            <div className="space-y-6">
              {/* Delivery Type */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <TruckIcon className="h-5 w-5 mr-2" />
                  Delivery Options
                </h2>
                
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="deliveryType"
                      value="delivery"
                      checked={formData.deliveryType === 'delivery'}
                      onChange={handleChange}
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700">
                      Home Delivery ($0.00)
                    </span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="deliveryType"
                      value="pickup"
                      checked={formData.deliveryType === 'pickup'}
                      onChange={handleChange}
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700">
                      Pickup from Kitchen ($0.00)
                    </span>
                  </label>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <PhoneIcon className="h-5 w-5 mr-2" />
                  Contact Information
                </h2>
                
                <div>
                  <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="contactPhone"
                    id="contactPhone"
                    value={formData.contactPhone}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border ${
                      errors.contactPhone ? 'border-red-300' : 'border-gray-300'
                    } rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500`}
                    placeholder="Enter your phone number"
                  />
                  {errors.contactPhone && (
                    <p className="mt-1 text-sm text-red-600">{errors.contactPhone}</p>
                  )}
                </div>
              </div>

              {/* Delivery Address */}
              {formData.deliveryType === 'delivery' && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <MapPinIcon className="h-5 w-5 mr-2" />
                    Delivery Address
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="deliveryAddress.street" className="block text-sm font-medium text-gray-700 mb-2">
                        Street Address *
                      </label>
                      <input
                        type="text"
                        name="deliveryAddress.street"
                        id="deliveryAddress.street"
                        value={formData.deliveryAddress.street}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border ${
                          errors['deliveryAddress.street'] ? 'border-red-300' : 'border-gray-300'
                        } rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500`}
                        placeholder="Enter street address"
                      />
                      {errors['deliveryAddress.street'] && (
                        <p className="mt-1 text-sm text-red-600">{errors['deliveryAddress.street']}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="deliveryAddress.city" className="block text-sm font-medium text-gray-700 mb-2">
                          City *
                        </label>
                        <input
                          type="text"
                          name="deliveryAddress.city"
                          id="deliveryAddress.city"
                          value={formData.deliveryAddress.city}
                          onChange={handleChange}
                          className={`w-full px-3 py-2 border ${
                            errors['deliveryAddress.city'] ? 'border-red-300' : 'border-gray-300'
                          } rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500`}
                          placeholder="Enter city"
                        />
                        {errors['deliveryAddress.city'] && (
                          <p className="mt-1 text-sm text-red-600">{errors['deliveryAddress.city']}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="deliveryAddress.state" className="block text-sm font-medium text-gray-700 mb-2">
                          State *
                        </label>
                        <input
                          type="text"
                          name="deliveryAddress.state"
                          id="deliveryAddress.state"
                          value={formData.deliveryAddress.state}
                          onChange={handleChange}
                          className={`w-full px-3 py-2 border ${
                            errors['deliveryAddress.state'] ? 'border-red-300' : 'border-gray-300'
                          } rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500`}
                          placeholder="Enter state"
                        />
                        {errors['deliveryAddress.state'] && (
                          <p className="mt-1 text-sm text-red-600">{errors['deliveryAddress.state']}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="deliveryAddress.zipCode" className="block text-sm font-medium text-gray-700 mb-2">
                          ZIP Code *
                        </label>
                        <input
                          type="text"
                          name="deliveryAddress.zipCode"
                          id="deliveryAddress.zipCode"
                          value={formData.deliveryAddress.zipCode}
                          onChange={handleChange}
                          className={`w-full px-3 py-2 border ${
                            errors['deliveryAddress.zipCode'] ? 'border-red-300' : 'border-gray-300'
                          } rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500`}
                          placeholder="Enter ZIP code"
                        />
                        {errors['deliveryAddress.zipCode'] && (
                          <p className="mt-1 text-sm text-red-600">{errors['deliveryAddress.zipCode']}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="deliveryAddress.landmark" className="block text-sm font-medium text-gray-700 mb-2">
                          Landmark (Optional)
                        </label>
                        <input
                          type="text"
                          name="deliveryAddress.landmark"
                          id="deliveryAddress.landmark"
                          value={formData.deliveryAddress.landmark}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder="Enter landmark"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="deliveryAddress.instructions" className="block text-sm font-medium text-gray-700 mb-2">
                        Delivery Instructions (Optional)
                      </label>
                      <textarea
                        name="deliveryAddress.instructions"
                        id="deliveryAddress.instructions"
                        rows={3}
                        value={formData.deliveryAddress.instructions}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Any special delivery instructions"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Special Instructions */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Special Instructions
                </h2>
                
                <textarea
                  name="specialInstructions"
                  id="specialInstructions"
                  rows={3}
                  value={formData.specialInstructions}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Any special instructions for your order"
                />
              </div>
            </div>

            {/* Order Summary */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <CreditCardIcon className="h-5 w-5 mr-2" />
                  Payment Method
                </h2>
                
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cash"
                      checked={formData.paymentMethod === 'cash'}
                      onChange={handleChange}
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700">
                      Cash on Delivery
                    </span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="upi"
                      checked={formData.paymentMethod === 'upi'}
                      onChange={handleChange}
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700">
                      UPI Payment
                    </span>
                  </label>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Order Summary
                </h2>
                
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.dish._id} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {item.dish.name} x {item.quantity}
                      </span>
                      <span className="font-medium">
                        ${(item.dish.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium">${totalAmount.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Delivery Fee</span>
                      <span className="font-medium">$0.00</span>
                    </div>
                    
                    <div className="flex justify-between text-lg font-semibold mt-3">
                      <span>Total</span>
                      <span className="text-orange-600">${totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-6 bg-orange-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Creating Order...' : 'Continue to Payment'}
                </button>
              </div>
            </div>
          </div>
        </form>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Payment Form */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <CreditCardIcon className="h-6 w-6 mr-2 text-orange-500" />
                Payment Information
              </h2>
              
              {createdOrder && (
                <PaymentForm
                  orderId={createdOrder._id}
                  totalAmount={totalAmount}
                  onPaymentSuccess={handlePaymentSuccess}
                  onPaymentError={handlePaymentError}
                />
              )}
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
              
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.dish._id} className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <img
                        src={item.dish.imageUrl}
                        alt={item.dish.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div>
                        <h3 className="font-medium text-gray-900">{item.dish.name}</h3>
                        <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <span className="font-medium">${(item.dish.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">${totalAmount.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Delivery Fee</span>
                    <span className="font-medium">$0.00</span>
                  </div>
                  
                  <div className="flex justify-between text-lg font-semibold mt-3">
                    <span>Total</span>
                    <span className="text-orange-600">${totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Back Button */}
              <button
                onClick={() => setCurrentStep('details')}
                className="w-full mt-6 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                Back to Order Details
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Checkout;
