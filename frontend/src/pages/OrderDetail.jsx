import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ordersAPI } from '../services/api';
import { 
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  MapPinIcon,
  PhoneIcon,
  TruckIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    preparing: 'bg-blue-100 text-blue-800',
    ready: 'bg-purple-100 text-purple-800', // Purple for "Out for Delivery"
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
  };

  const statusIcons = {
    pending: ClockIcon,
    preparing: ClockIcon,
    ready: TruckIcon, // Truck icon for "Out for Delivery"
    completed: CheckCircleIcon,
    cancelled: XCircleIcon
  };

  // Map backend status to customer-friendly status
  const getCustomerStatus = (backendStatus) => {
    const statusMap = {
      'pending': 'Order Placed',
      'preparing': 'Preparing',
      'ready': 'Out for Delivery',
      'completed': 'Delivered',
      'cancelled': 'Cancelled'
    };
    return statusMap[backendStatus] || backendStatus;
  };

  // Map payment method details to customer-friendly display
  const getPaymentMethodDisplay = (order) => {
    if (order.paymentMethod === 'cash') {
      return 'Cash on Delivery';
    }
    
    if (order.paymentMethod === 'stripe') {
      // If we have specific payment method details
      if (order.paymentMethodType === 'card' && order.cardBrand) {
        const brandMap = {
          'visa': 'Visa Card',
          'mastercard': 'Mastercard',
          'amex': 'American Express',
          'discover': 'Discover',
          'diners': 'Diners Club',
          'jcb': 'JCB',
          'unionpay': 'UnionPay'
        };
        return brandMap[order.cardBrand] || 'Card';
      }
      
      if (order.paymentMethodType === 'wallet' && order.walletType) {
        const walletMap = {
          'apple_pay': 'Apple Pay',
          'google_pay': 'Google Pay',
          'samsung_pay': 'Samsung Pay',
          'microsoft_pay': 'Microsoft Pay'
        };
        return walletMap[order.walletType] || 'Digital Wallet';
      }
      
      if (order.paymentMethodType) {
        return order.paymentMethodType.charAt(0).toUpperCase() + order.paymentMethodType.slice(1);
      }
      
      return 'Card'; // Default fallback for Stripe payments
    }
    
    return order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1);
  };

  const statusSteps = [
    { key: 'pending', label: 'Order Placed' },
    { key: 'preparing', label: 'Preparing' },
    { key: 'ready', label: 'Out for Delivery' },
    { key: 'completed', label: 'Delivered' }
  ];

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await ordersAPI.getOrder(id);
      setOrder(response.data.data);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to load order details');
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    try {
      setCancelling(true);
      await ordersAPI.cancelOrder(id);
      toast.success('Order cancelled successfully');
      fetchOrder(); // Refresh order data
    } catch (error) {
      console.error('Error cancelling order:', error);
      const message = error.response?.data?.message || 'Failed to cancel order';
      toast.error(message);
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCurrentStepIndex = () => {
    return statusSteps.findIndex(step => step.key === order?.status);
  };

  const canCancel = order?.status === 'pending' || order?.status === 'preparing';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Order not found</h1>
            <button
              onClick={() => navigate('/orders')}
              className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
            >
              Back to Orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  const StatusIcon = statusIcons[order.status] || ClockIcon;
  const currentStepIndex = getCurrentStepIndex();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/orders')}
            className="flex items-center text-orange-600 hover:text-orange-700 mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Orders
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Order #{order.orderNumber}
              </h1>
              <p className="text-lg text-gray-600 mt-2">
                Placed on {formatDate(order.createdAt)}
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <StatusIcon className="h-6 w-6 text-gray-400" />
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusColors[order.status]}`}>
                {getCustomerStatus(order.status)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Status Progress */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Order Status</h2>
              
              <div className="flex items-center justify-between">
                {statusSteps.map((step, index) => {
                  const isCompleted = index <= currentStepIndex;
                  const isCurrent = index === currentStepIndex;
                  
                  return (
                    <div key={step.key} className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isCompleted 
                          ? 'bg-orange-500 text-white' 
                          : 'bg-gray-200 text-gray-400'
                      }`}>
                        {isCompleted ? (
                          <CheckCircleIcon className="h-5 w-5" />
                        ) : (
                          <span className="text-sm font-semibold">{index + 1}</span>
                        )}
                      </div>
                      <span className={`text-xs mt-2 text-center ${
                        isCurrent ? 'text-orange-600 font-semibold' : 'text-gray-500'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
              
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div key={index} className="flex items-center space-x-4 py-4 border-b border-gray-200 last:border-b-0">
                    <img
                      src={item.dish.imageUrl}
                      alt={item.dish.name}
                      className="h-16 w-16 object-cover rounded-lg"
                    />
                    
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{item.dish.name}</h3>
                      <p className="text-sm text-gray-600">{item.dish.description}</p>
                      <div className="flex items-center mt-1">
                        <span className="text-sm text-gray-500">Quantity: {item.quantity}</span>
                        <span className="mx-2 text-gray-300">•</span>
                        <span className="text-sm text-gray-500">${item.price} each</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className="font-semibold text-gray-900">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Special Instructions */}
            {order.specialInstructions && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Special Instructions</h2>
                <p className="text-gray-600">{order.specialInstructions}</p>
              </div>
            )}

            {/* Cancel Order Button */}
            {canCancel && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Actions</h2>
                <button
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                  className="bg-red-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Order'}
                </button>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal ({order.items.reduce((total, item) => total + item.quantity, 0)} items)</span>
                  <span className="font-medium">${order.totalAmount.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delivery Fee</span>
                  <span className="font-medium">$0.00</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-medium">$0.00</span>
                </div>
                
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span className="text-orange-600">${order.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <TruckIcon className="h-5 w-5 mr-2" />
                Delivery Information
              </h2>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Delivery Type</p>
                  <p className="font-semibold text-gray-900 capitalize">{order.deliveryType}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Contact Phone</p>
                  <p className="font-semibold text-gray-900">{order.contactPhone}</p>
                </div>
                
                {order.deliveryType === 'delivery' && order.deliveryAddress && (
                  <div>
                    <p className="text-sm text-gray-500">Delivery Address</p>
                    <p className="font-semibold text-gray-900">
                      {order.deliveryAddress.street}, {order.deliveryAddress.city}, {order.deliveryAddress.state} - {order.deliveryAddress.zipCode}
                    </p>
                    {order.deliveryAddress.landmark && (
                      <p className="text-sm text-gray-600 mt-1">
                        Landmark: {order.deliveryAddress.landmark}
                      </p>
                    )}
                    {order.deliveryAddress.instructions && (
                      <p className="text-sm text-gray-600 mt-1">
                        Instructions: {order.deliveryAddress.instructions}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h2>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Payment Method</p>
                  <p className="font-semibold text-gray-900">{getPaymentMethodDisplay(order)}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Payment Status</p>
                  <p className="font-semibold text-gray-900 capitalize">{order.paymentStatus}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
