import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ordersAPI, paymentAPI } from '../services/api';
import { useOrderUpdates } from '../hooks/useOrderUpdates';
import { usePaymentUpdates } from '../hooks/usePaymentUpdates';
import { formatPhoneNumber } from '../utils/phoneUtils';
import { 
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  MapPinIcon,
  PhoneIcon,
  TruckIcon,
  ArrowLeftIcon,
  ClipboardDocumentIcon,
  UserIcon,
  ShoppingBagIcon,
  HomeIcon
} from '@heroicons/react/24/outline';
import { MdEmail } from 'react-icons/md';
import { FaUtensils } from 'react-icons/fa';
import toast from 'react-hot-toast';

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [requestingRefund, setRequestingRefund] = useState(false);

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    placed: 'bg-green-100 text-green-800',
    preparing: 'bg-blue-100 text-blue-800',
    ready: 'bg-purple-100 text-purple-800', // Purple for "Out for Delivery"
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
  };

  const statusIcons = {
    pending: ClockIcon,
    placed: CheckCircleIcon,
    preparing: ClockIcon,
    ready: TruckIcon, // Truck icon for "Out for Delivery"
    completed: CheckCircleIcon,
    cancelled: XCircleIcon
  };

  // Map backend status to customer-friendly status
  const getCustomerStatus = (backendStatus) => {
    const statusMap = {
      'pending': 'Pending Payment',
      'placed': 'Order Placed',
      'preparing': 'Preparing',
      'ready': 'Out for Delivery',
      'completed': 'Delivered',
      'cancelled': 'Cancelled'
    };
    return statusMap[backendStatus] || backendStatus;
  };

  // Map payment method details to customer-friendly display
  const getPaymentMethodDisplay = (order) => {
    if (order.paymentMethod === 'card') {
      return 'Credit/Debit Card';
    }
    
    if (order.paymentMethod === 'upi') {
      return 'UPI Payment';
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

  // Dynamic status steps based on delivery type
  const getStatusSteps = (deliveryType) => {
    if (deliveryType === 'pickup') {
      return [
        { key: 'placed', label: 'Order Placed', icon: ClipboardDocumentIcon, description: 'Your order has been received' },
        { key: 'preparing', label: 'Preparing', icon: UserIcon, description: 'Kitchen is cooking your food' },
        { key: 'ready', label: 'Ready for Pickup', icon: ShoppingBagIcon, description: 'Your order is ready for pickup' },
        { key: 'completed', label: 'Picked Up', icon: CheckCircleIcon, description: 'Order picked up successfully' }
      ];
    } else {
      return [
        { key: 'placed', label: 'Order Placed', icon: ClipboardDocumentIcon, description: 'Your order has been received' },
        { key: 'preparing', label: 'Preparing', icon: UserIcon, description: 'Kitchen is cooking your food' },
        { key: 'ready', label: 'Ready & Out for Delivery', icon: TruckIcon, description: 'Your order is ready and out for delivery' },
        { key: 'completed', label: 'Delivered', icon: HomeIcon, description: 'Order delivered successfully' }
      ];
    }
  };

  const statusSteps = getStatusSteps(order?.deliveryType);

  // 🚀 Real-time order updates via WebSocket
  const handleOrderUpdate = (updatedOrder) => {
    setOrder(prev => ({
      ...prev,
      status: updatedOrder.status,
      paymentStatus: updatedOrder.paymentStatus,
      statusTimestamps: updatedOrder.statusTimestamps || prev.statusTimestamps
    }));
  };

  useOrderUpdates(id, handleOrderUpdate);
  
  // Also listen for payment success events (for simulated payments)
  usePaymentUpdates(id, (data) => {
    // Refresh the order data to get updated payment status
    fetchOrder();
  }, () => {
    // Don't navigate since we're already on the order detail page
  });

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

  const handleCancelOrder = () => {
    setShowCancelModal(true);
  };

  const confirmCancelOrder = async () => {
    try {
      setCancelling(true);
      setShowCancelModal(false);
      await ordersAPI.cancelOrder(id);
      // Redirect to orders page after successful cancellation
      // Toast notification will be shown by the notification system
      navigate('/orders');
    } catch (error) {
      console.error('Error cancelling order:', error);
      const message = error.response?.data?.message || 'Failed to cancel order';
      toast.error(message);
    } finally {
      setCancelling(false);
    }
  };

  const cancelCancelOrder = () => {
    setShowCancelModal(false);
  };

  const handleRequestRefund = () => {
    setShowRefundModal(true);
  };

  const confirmRequestRefund = async () => {
    try {
      setRequestingRefund(true);
      setShowRefundModal(false);
      await paymentAPI.requestRefund(id, refundReason);
      // Toast notification will be shown by the notification system
      // Refresh order data
      fetchOrder();
    } catch (error) {
      console.error('Error requesting refund:', error);
      const message = error.response?.data?.message || 'Failed to request refund';
      toast.error(message);
    } finally {
      setRequestingRefund(false);
      setRefundReason('');
    }
  };

  const cancelRequestRefund = () => {
    setShowRefundModal(false);
    setRefundReason('');
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

  const formatTime = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusTimestamp = (status) => {
    return order?.statusTimestamps?.[status];
  };

  const getCurrentStepIndex = () => {
    return statusSteps.findIndex(step => step.key === order?.status);
  };

  // Check if order can be cancelled based on status and time
  const canCancel = () => {
    if (!order) return false;
    
    
    // Can't cancel if already completed or cancelled
    if (['completed', 'cancelled'].includes(order.status)) {
      return false;
    }
    
    // Can't cancel if order is out for delivery or ready
    if (['ready'].includes(order.status)) {
      return false;
    }
    
    // For placed orders, allow cancellation (temporarily removing time restriction for testing)
    if (order.status === 'placed') {
      return true;
    }
    
    // Allow cancellation for pending and preparing orders
    const canCancelPending = ['pending', 'preparing'].includes(order.status);
    return canCancelPending;
  };

  // Check if order can request refund - DISABLED
  const canRequestRefund = () => {
    return false; // Never show refund button
  };

  // Check if order is refunded
  const isRefunded = () => {
    return order?.paymentStatus === 'refunded';
  };

  // Check if refund is requested
  const isRefundRequested = () => {
    return order?.refundRequested;
  };

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
            {/* Enhanced Order Status Progress */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-8">Order Tracking</h2>
              
              {/* Interactive Timeline with Connected Circles */}
              <div className="relative">
                {/* Progress Line */}
                <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-200">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-1000 ease-out"
                    style={{ 
                      width: `${(currentStepIndex / (statusSteps.length - 1)) * 100}%` 
                    }}
                  />
                </div>
                
                {/* Timeline Steps */}
                <div className="flex justify-between relative z-10">
                  {statusSteps.map((step, index) => {
                    const isCompleted = index <= currentStepIndex;
                    const isCurrent = index === currentStepIndex;
                    const isPast = index < currentStepIndex;
                    const isOrderFullyCompleted = order?.status === 'completed';
                    const isFinalStep = index === statusSteps.length - 1;
                    const timestamp = getStatusTimestamp(step.key);
                    
                    return (
                      <div key={step.key} className="flex flex-col items-center group">
                        {/* Circle with Animation */}
                        <div className="relative">
                          {/* Pulse Animation for Current Step (but not if order is fully completed) */}
                          {isCurrent && !isOrderFullyCompleted && (
                            <div className="absolute inset-0 rounded-full bg-orange-400 animate-ping opacity-75" />
                          )}
                          
                          {/* Main Circle */}
                          <div className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 transform ${
                            isOrderFullyCompleted && isFinalStep
                              ? 'bg-green-500 text-white shadow-lg scale-110' 
                              : isCompleted 
                              ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow-lg scale-110' 
                              : isCurrent
                              ? 'bg-gradient-to-br from-orange-300 to-orange-400 text-white shadow-md scale-105'
                              : 'bg-gray-200 text-gray-400 hover:bg-gray-300 hover:scale-105'
                          }`}>
                            {isOrderFullyCompleted && isFinalStep ? (
                              <CheckCircleIcon className="h-6 w-6" />
                            ) : isCompleted || isCurrent ? (
                              <step.icon className="h-6 w-6" />
                            ) : (
                              <span className="text-sm font-bold">{index + 1}</span>
                            )}
                          </div>
                          
                          {/* Checkmark for Completed Steps */}
                          {isPast && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                              <CheckCircleIcon className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </div>
                        
                        {/* Step Label */}
                        <div className="mt-3 text-center max-w-24">
                          <span className={`text-xs font-medium transition-colors duration-300 ${
                            isCurrent 
                              ? 'text-orange-600 font-bold' 
                              : isCompleted 
                              ? 'text-gray-700 font-semibold'
                              : 'text-gray-500'
                          }`}>
                            {step.label}
                          </span>
                          
                          {/* Step Description */}
                          <p className={`text-xs mt-1 transition-colors duration-300 ${
                            isCurrent 
                              ? 'text-orange-500' 
                              : isCompleted 
                              ? 'text-gray-600'
                              : 'text-gray-400'
                          }`}>
                            {step.description}
                          </p>
                          
                          {/* Timestamp Display */}
                          {timestamp && (
                            <p className="text-xs mt-1 text-green-600 font-medium">
                              {formatTime(timestamp)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
              
              <div className="space-y-4">
                {order.items.map((item, index) => {
                  const dishName = item.dish?.name || 'Item No Longer Available';
                  const dishDescription = item.dish?.description || 'This item is no longer available in our menu';
                  const dishImage = item.dish?.imageUrl || '/placeholder-dish.jpg';
                  const itemPrice = item.price || 0;
                  const itemTotal = itemPrice * item.quantity;
                  
                  return (
                    <div key={index} className="flex items-center space-x-4 py-4 border-b border-gray-200 last:border-b-0">
                      <img
                        src={dishImage}
                        alt={dishName}
                        className="h-16 w-16 object-cover rounded-lg"
                        onError={(e) => {
                          e.target.src = '/placeholder-dish.jpg';
                        }}
                      />
                      
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{dishName}</h3>
                        <p className="text-sm text-gray-600">{dishDescription}</p>
                        <div className="flex items-center mt-1">
                          <span className="text-sm text-gray-500">Quantity: {item.quantity}</span>
                          <span className="mx-2 text-gray-300">•</span>
                          <span className="text-sm text-gray-500">
                            {itemPrice > 0 ? `$${itemPrice} each` : 'Price not available'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <span className="font-semibold text-gray-900">
                          ${itemTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Special Instructions */}
            {order.specialInstructions && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Special Instructions</h2>
                <p className="text-gray-600">{order.specialInstructions}</p>
              </div>
            )}

            {/* Order Actions */}
            {(canCancel() || canRequestRefund() || isRefunded() || isRefundRequested()) && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Actions</h2>
                
                {/* Refund Status Messages */}
                {isRefunded() && (
                  <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                      <div>
                        <h3 className="text-sm font-medium text-green-800">Refund Processed</h3>
                        <p className="text-sm text-green-700">
                          Your refund has been processed successfully. The amount will be credited to your original payment method within 5-10 business days.
                        </p>
                        {order.refundId && (
                          <p className="text-xs text-green-600 mt-1">
                            Refund ID: {order.refundId}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {isRefundRequested() && !isRefunded() && (
                  <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center">
                      <ClockIcon className="h-5 w-5 text-yellow-500 mr-2" />
                      <div>
                        <h3 className="text-sm font-medium text-yellow-800">Refund Requested</h3>
                        <p className="text-sm text-yellow-700">
                          Your refund request has been submitted and is under review. We'll process it within 1-2 business days.
                        </p>
                        {order.refundReason && (
                          <p className="text-xs text-yellow-600 mt-1">
                            Reason: {order.refundReason}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3">
                  {canCancel() && (
                    <div>
                      <button
                        onClick={handleCancelOrder}
                        disabled={cancelling}
                        className="w-full bg-red-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {cancelling ? 'Cancelling...' : 'Cancel Order'}
                      </button>
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        Cancelling will automatically process your refund
                      </p>
                    </div>
                  )}

                  {canRequestRefund() && (
                    <div>
                      <button
                        onClick={handleRequestRefund}
                        disabled={requestingRefund}
                        className="w-full bg-orange-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {requestingRefund ? 'Requesting...' : 'Request Refund'}
                      </button>
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        For completed orders only (before delivery)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Order Status Messages for Non-Cancellable Orders */}
            {order?.status === 'ready' && !canCancel() && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-yellow-800 mb-2">Order Status</h2>
                <p className="text-yellow-700">
                  This order is ready for pickup/delivery and cannot be cancelled. If you need assistance, please contact our support team.
                </p>
              </div>
            )}

            {/* Delivered Order Message */}
            {order?.status === 'completed' && !canRequestRefund() && !isRefunded() && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-8 text-center shadow-sm">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircleIcon className="w-8 h-8 text-green-600" />
                  </div>
                </div>
                
                <h2 className="text-2xl font-bold text-green-800 mb-3">Order Delivered Successfully!</h2>
            <p className="text-green-700 text-lg mb-6 max-w-md mx-auto">
              Your delicious meal has been delivered. We hope you enjoyed every bite! <FaUtensils className="inline-block ml-1 text-gray-600" />
            </p>
                
                <div className="bg-white rounded-lg p-4 mb-6 shadow-sm border border-green-100">
                  <p className="text-sm text-gray-600 mb-2">Facing any issues with your order?</p>
                  <button
                    onClick={() => window.open(`mailto:support@vkitchen.com?subject=Order Issue - ${order.orderNumber}&body=Hi V Kitchen Team,%0D%0A%0D%0AI need assistance with my order #${order.orderNumber}.%0D%0A%0D%0AIssue description:%0D%0A%0D%0AThank you!`, '_blank')}
                    className="inline-flex items-center px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                  >
                    <MdEmail className="w-5 h-5 mr-2" />
                    Contact Support
                  </button>
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-gray-500">
                    Reference: <span className="font-mono font-semibold text-gray-700">#{order.orderNumber}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Delivered on {order?.statusTimestamps?.completed ? 
                      new Date(order.statusTimestamps.completed).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 
                      'Recently'
                    }
                  </p>
                </div>
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
                  <p className="font-semibold text-gray-900">{formatPhoneNumber(order.contactPhone)}</p>
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

        {/* Cancel Order Confirmation Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                {/* Modal Header */}
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <XCircleIcon className="w-6 h-6 text-red-600" />
                  </div>
                </div>
                
                {/* Modal Title */}
                <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                  Cancel Order
                </h3>
                
                {/* Modal Message */}
                <p className="text-gray-600 text-center mb-6">
                  Are you sure you want to cancel order <span className="font-semibold text-gray-900">#{order?.orderNumber}</span>? 
                  <br /><br />
                  <span className="text-green-600 font-medium">Your refund will be processed automatically</span> and credited to your original payment method within 5-10 business days.
                </p>
                
                {/* Modal Buttons */}
                <div className="flex space-x-3">
                  <button
                    onClick={cancelCancelOrder}
                    disabled={cancelling}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmCancelOrder}
                    disabled={cancelling}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {cancelling ? 'Cancelling...' : 'Cancel Order'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Refund Request Modal */}
        {showRefundModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                {/* Modal Header */}
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <ClockIcon className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
                
                {/* Modal Title */}
                <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                  Request Refund
                </h3>
                
                {/* Modal Message */}
                <p className="text-gray-600 text-center mb-4">
                  Please provide a reason for your refund request. Our team will review it within 1-2 business days.
                </p>
                
                {/* Refund Reason Input */}
                <div className="mb-6">
                  <label htmlFor="refundReason" className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for refund
                  </label>
                  <textarea
                    id="refundReason"
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="Please explain why you need a refund..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    rows={3}
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {refundReason.length}/500 characters
                  </p>
                </div>
                
                {/* Modal Actions */}
                <div className="flex space-x-3">
                  <button
                    onClick={cancelRequestRefund}
                    disabled={requestingRefund}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmRequestRefund}
                    disabled={requestingRefund || !refundReason.trim()}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {requestingRefund ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetail;
