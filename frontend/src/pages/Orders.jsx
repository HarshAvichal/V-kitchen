import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ordersAPI } from '../services/api';
import { 
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  TrashIcon,
  TruckIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Orders = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    date: '',
    page: 1,
    limit: 10
  });
  const [activeTab, setActiveTab] = useState('orders');
  const [refundedOrders, setRefundedOrders] = useState([]);
  const [refundLoading, setRefundLoading] = useState(false);
  const [pagination, setPagination] = useState({
    total: 0,
    hasNext: false,
    hasPrev: false
  });
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    orderId: null,
    orderNumber: ''
  });
  const [deleting, setDeleting] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteModal, setBulkDeleteModal] = useState({
    isOpen: false,
    count: 0
  });
  const [selectedRefunds, setSelectedRefunds] = useState(new Set());
  const [refundBulkDeleting, setRefundBulkDeleting] = useState(false);
  const [refundBulkDeleteModal, setRefundBulkDeleteModal] = useState({
    isOpen: false,
    count: 0
  });

  const statusOptions = [
    { value: '', label: 'All Orders' },
    { value: 'placed', label: 'Order Placed' },
    { value: 'preparing', label: 'Preparing' },
    { value: 'ready', label: 'Out for Delivery' },
    { value: 'completed', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const statusColors = {
    placed: 'bg-yellow-100 text-yellow-800',
    preparing: 'bg-blue-100 text-blue-800',
    ready: 'bg-purple-100 text-purple-800', // Purple for "Out for Delivery"
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
  };

  const statusIcons = {
    placed: ClockIcon,
    preparing: ClockIcon,
    ready: TruckIcon, // Truck icon for "Out for Delivery"
    completed: CheckCircleIcon,
    cancelled: XCircleIcon
  };

  // Map backend status to customer-friendly status
  const getCustomerStatus = (backendStatus) => {
    const statusMap = {
      'placed': 'Order Placed',
      'preparing': 'Preparing',
      'ready': 'Out for Delivery',
      'completed': 'Delivered',
      'cancelled': 'Cancelled'
    };
    return statusMap[backendStatus] || backendStatus;
  };

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await ordersAPI.getMyOrders(filters);
      
      // Client-side filter as safety net
      let filteredOrders = response.data.data;
      if (filters.status) {
        const statusMapping = {
          'placed': ['placed'],
          'preparing': ['preparing'],
          'ready': ['ready'],
          'completed': ['completed'],
          'cancelled': ['cancelled']
        };
        
        const allowedStatuses = statusMapping[filters.status];
        if (allowedStatuses) {
          filteredOrders = response.data.data.filter(order => 
            allowedStatuses.includes(order.status)
          );
        }
      }
      
      setOrders(filteredOrders);
      setPagination({
        total: response.data.total,
        hasNext: !!response.data.pagination?.next,
        hasPrev: !!response.data.pagination?.prev
      });
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Reset filters when switching to refunds tab
  useEffect(() => {
    if (activeTab === 'refunds') {
      setFilters(prev => ({ ...prev, status: '', date: '', page: 1 }));
    }
  }, [activeTab]);

  // Clear selections when orders change
  useEffect(() => {
    setSelectedOrders(new Set());
  }, [orders]);

  // Clear refund selections when refunded orders change
  useEffect(() => {
    setSelectedRefunds(new Set());
  }, [refundedOrders]);

  // Initialize activeTab from URL on mount
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') || 'orders';
    setActiveTab(tabFromUrl);
  }, []); // Only run once on mount

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    } else if (activeTab === 'refunds') {
      fetchRefundedOrders();
    }
  }, [activeTab, filters]); // Depend on both activeTab and filters

  const fetchRefundedOrders = useCallback(async () => {
    try {
      setRefundLoading(true);
      // Fetch orders with refunded payment status
      const response = await ordersAPI.getMyOrders({ paymentStatus: 'refunded' });
      setRefundedOrders(response.data.data);
    } catch (error) {
      console.error('Error fetching refunded orders:', error);
      toast.error('Failed to load refund history');
    } finally {
      setRefundLoading(false);
    }
  }, []);

  const handleStatusFilter = (status) => {
    setFilters(prev => ({
      ...prev,
      status,
      page: 1
    }));
  };

  const handleDateFilter = (date) => {
    setFilters(prev => ({
      ...prev,
      date: date,
      page: 1
    }));
  };

  const clearDateFilter = () => {
    setFilters(prev => ({
      ...prev,
      date: '',
      page: 1
    }));
  };

  const handlePageChange = (page) => {
    setFilters(prev => ({
      ...prev,
      page
    }));
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

  const getTotalItems = (items) => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const handleDeleteClick = (orderId, orderNumber) => {
    setDeleteModal({
      isOpen: true,
      orderId,
      orderNumber
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.orderId) return;

    try {
      setDeleting(true);
      await ordersAPI.deleteOrder(deleteModal.orderId);
      
      // Remove the order from the local state
      setOrders(prev => prev.filter(order => order._id !== deleteModal.orderId));
      
      // Also remove from refunded orders if we're on refunds tab
      if (activeTab === 'refunds') {
        setRefundedOrders(prev => prev.filter(order => order._id !== deleteModal.orderId));
      }
      
      toast.success('Order removed from your order history');
      setDeleteModal({ isOpen: false, orderId: null, orderNumber: '' });
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error(error.response?.data?.message || 'Failed to delete order');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, orderId: null, orderNumber: '' });
  };

  const handleSelectAll = () => {
    if (selectedOrders.size === orders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(orders.map(order => order._id)));
    }
  };

  const handleSelectOrder = (orderId) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const handleBulkDeleteClick = () => {
    if (selectedOrders.size === 0) return;
    setBulkDeleteModal({
      isOpen: true,
      count: selectedOrders.size
    });
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedOrders.size === 0) return;

    try {
      setBulkDeleting(true);
      const deletePromises = Array.from(selectedOrders).map(orderId => 
        ordersAPI.deleteOrder(orderId)
      );
      
      await Promise.all(deletePromises);
      
      toast.success(`${selectedOrders.size} order(s) deleted successfully`);
      setSelectedOrders(new Set());
      setBulkDeleteModal({ isOpen: false, count: 0 });
      fetchOrders();
    } catch (error) {
      console.error('Error deleting orders:', error);
      toast.error('Failed to delete some orders');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleBulkDeleteCancel = () => {
    setBulkDeleteModal({ isOpen: false, count: 0 });
  };

  const canDeleteOrder = (order) => {
    return ['cancelled', 'completed'].includes(order.status);
  };

  // Refund selection handlers
  const handleRefundSelect = (refundId) => {
    setSelectedRefunds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(refundId)) {
        newSet.delete(refundId);
      } else {
        newSet.add(refundId);
      }
      return newSet;
    });
  };

  const handleRefundSelectAll = () => {
    if (selectedRefunds.size === refundedOrders.length) {
      setSelectedRefunds(new Set());
    } else {
      setSelectedRefunds(new Set(refundedOrders.map(order => order._id)));
    }
  };

  const handleRefundBulkDeleteClick = () => {
    if (selectedRefunds.size === 0) return;
    setRefundBulkDeleteModal({
      isOpen: true,
      count: selectedRefunds.size
    });
  };

  const handleRefundBulkDeleteConfirm = async () => {
    if (selectedRefunds.size === 0) return;

    try {
      setRefundBulkDeleting(true);
      const deletePromises = Array.from(selectedRefunds).map(orderId => 
        ordersAPI.deleteOrder(orderId)
      );
      
      await Promise.all(deletePromises);
      
      // Remove deleted refunds from local state
      setRefundedOrders(prev => prev.filter(order => !selectedRefunds.has(order._id)));
      
      toast.success(`${selectedRefunds.size} refund(s) deleted successfully`);
      setSelectedRefunds(new Set());
      setRefundBulkDeleteModal({ isOpen: false, count: 0 });
    } catch (error) {
      console.error('Error deleting refunds:', error);
      toast.error('Failed to delete some refunds');
    } finally {
      setRefundBulkDeleting(false);
    }
  };

  const handleRefundBulkDeleteCancel = () => {
    setRefundBulkDeleteModal({ isOpen: false, count: 0 });
  };

  const handleRefundDeleteClick = (orderId, orderNumber) => {
    setDeleteModal({
      isOpen: true,
      orderId,
      orderNumber
    });
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
                <p className="text-lg text-gray-600 mt-2">
                  Track and manage your orders
                </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => handleTabChange('orders')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'orders'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                All Orders
              </button>
              <button
                onClick={() => handleTabChange('refunds')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'refunds'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Refund History
              </button>
            </nav>
          </div>
        </div>

        {/* Status Filters - Only show for All Orders tab */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Filter by Status</h2>
              {filters.status && (
                <span className="text-sm text-gray-500">
                  Showing {orders.length} order{orders.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    handleStatusFilter(option.value);
                    // Clear selections when changing filters
                    setSelectedOrders(new Set());
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filters.status === option.value
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
              
              {/* Calendar Icon for Date Filter */}
              <div className="flex items-center space-x-2 ml-2">
                <CalendarIcon className="h-5 w-5 text-gray-500" />
                <input
                  type="date"
                  value={filters.date}
                  onChange={(e) => {
                    handleDateFilter(e.target.value);
                    setSelectedOrders(new Set());
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                {filters.date && (
                  <button
                    onClick={clearDateFilter}
                    className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        )}


        {/* Bulk Actions - Only show for delivered and cancelled orders */}
        {activeTab === 'orders' && ['completed', 'cancelled'].includes(filters.status) && orders.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedOrders.size === orders.length && orders.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {selectedOrders.size === orders.length ? 'Deselect All' : 'Select All'}
                  </span>
                </label>
                {selectedOrders.size > 0 && (
                  <span className="text-sm text-gray-500">
                    {selectedOrders.size} of {orders.length} selected
                  </span>
                )}
              </div>
              
              {selectedOrders.size > 0 && (
                <button
                  onClick={handleBulkDeleteClick}
                  disabled={bulkDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <TrashIcon className="h-4 w-4" />
                  <span>{bulkDeleting ? 'Deleting...' : `Delete Selected (${selectedOrders.size})`}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Orders List */}
        {activeTab === 'orders' && (
          <>
            {orders.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <ClockIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                <p className="text-gray-500 mb-6">
                  {filters.status 
                    ? `No orders with status "${filters.status}"`
                    : "You haven't placed any orders yet"
                  }
                </p>
                <Link
                  to="/menu"
                  className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
                >
                  Browse Menu
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const StatusIcon = statusIcons[order.status] || ClockIcon;
                  
                  return (
                    <div key={order._id} className={`bg-white rounded-lg shadow-sm p-6 ${selectedOrders.has(order._id) ? 'ring-2 ring-orange-200 bg-orange-50' : ''}`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          {['completed', 'cancelled'].includes(filters.status) && (
                            <input
                              type="checkbox"
                              checked={selectedOrders.has(order._id)}
                              onChange={() => handleSelectOrder(order._id)}
                              className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                            />
                          )}
                          <StatusIcon className="h-5 w-5 text-gray-400" />
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              Order #{order.orderNumber}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {formatDate(order.createdAt)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.status]}`}>
                            {getCustomerStatus(order.status)}
                          </span>
                          
                          <Link
                            to={`/order/${order._id}`}
                            className="flex items-center text-orange-600 hover:text-orange-700"
                          >
                            <EyeIcon className="h-4 w-4 mr-1" />
                            View Details
                          </Link>

                          {canDeleteOrder(order) && (
                            <button
                              onClick={() => handleDeleteClick(order._id, order.orderNumber)}
                              className="flex items-center text-red-600 hover:text-red-700"
                              title="Delete order"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-500">Total Items</p>
                          <p className="font-semibold text-gray-900">
                            {getTotalItems(order.items)}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-500">Delivery Type</p>
                          <p className="font-semibold text-gray-900 capitalize">
                            {order.deliveryType}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-500">Total Amount</p>
                          <p className="font-semibold text-orange-600">
                            ${order.totalAmount.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Order Items Preview */}
                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Items:</h4>
                        <div className="space-y-1">
                          {order.items.slice(0, 3).map((item, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span className="text-gray-600">
                                {item.dish?.name || 'Unknown Dish'} x {item.quantity}
                              </span>
                              <span className="font-medium">
                                ${(item.price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                          {order.items.length > 3 && (
                            <p className="text-sm text-gray-500">
                              +{order.items.length - 3} more items
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Delivery Address (if delivery) */}
                      {order.deliveryType === 'delivery' && order.deliveryAddress && (
                        <div className="border-t border-gray-200 pt-4 mt-4">
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Delivery Address:</h4>
                          <p className="text-sm text-gray-600">
                            {order.deliveryAddress.street}, {order.deliveryAddress.city}, {order.deliveryAddress.state} - {order.deliveryAddress.zipCode}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Refund History */}
        {activeTab === 'refunds' && (
          <>
            {/* Refund History Header */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Refund History</h2>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500">
                    {refundedOrders.length} refund{refundedOrders.length !== 1 ? 's' : ''}
                  </span>
                  {selectedRefunds.size > 0 && (
                    <button
                      onClick={handleRefundBulkDeleteClick}
                      disabled={refundBulkDeleting}
                      className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {refundBulkDeleting ? 'Deleting...' : `Delete Selected (${selectedRefunds.size})`}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {refundLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
              </div>
            ) : refundedOrders.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                  <CheckCircleIcon className="h-12 w-12" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No refunds found</h3>
                <p className="text-gray-500 mb-6">
                  You haven't received any refunds yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Select All Checkbox */}
                {refundedOrders.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedRefunds.size === refundedOrders.length && refundedOrders.length > 0}
                        onChange={handleRefundSelectAll}
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                      />
                      <span className="text-sm font-medium text-gray-900">
                        Select All Refunds ({refundedOrders.length})
                      </span>
                    </label>
                  </div>
                )}

                {refundedOrders.map((order) => (
                  <div key={order._id} className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedRefunds.has(order._id)}
                          onChange={() => handleRefundSelect(order._id)}
                          className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                        />
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            Order #{order.orderNumber}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Refunded on {formatDate(order.refundRequestedAt || order.updatedAt)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          Refunded
                        </span>
                        
                        <Link
                          to={`/order/${order._id}`}
                          className="flex items-center text-orange-600 hover:text-orange-700"
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          View Details
                        </Link>

                        <button
                          onClick={() => handleRefundDeleteClick(order._id, order.orderNumber)}
                          className="flex items-center text-red-600 hover:text-red-700"
                        >
                          <TrashIcon className="h-4 w-4 mr-1" />
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-1">Total Amount</h4>
                        <p className="text-lg font-semibold text-gray-900">
                          ${order.totalAmount.toFixed(2)}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-1">Refund ID</h4>
                        <p className="text-sm text-gray-600 font-mono">
                          {order.refundId || 'Processing...'}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-1">Refund Reason</h4>
                        <p className="text-sm text-gray-600">
                          {order.refundReason || 'Order cancelled'}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Order Items:</h4>
                      <div className="space-y-2">
                        {order.items.slice(0, 3).map((item, index) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">
                              {item.quantity}x {item.dish?.name || 'Item'}
                            </span>
                            <span className="font-medium">
                              ${(item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <p className="text-sm text-gray-500">
                            +{order.items.length - 3} more items
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Pagination - Only show for All Orders tab */}
        {activeTab === 'orders' && (pagination.hasNext || pagination.hasPrev) && (
          <div className="mt-8 flex justify-center">
            <nav className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(filters.page - 1)}
                disabled={!pagination.hasPrev}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              <span className="px-3 py-2 text-sm text-gray-700">
                Page {filters.page}
              </span>
              
              <button
                onClick={() => handlePageChange(filters.page + 1)}
                disabled={!pagination.hasNext}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </nav>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <TrashIcon className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">
                    Delete Order
                  </h3>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete <span className="font-semibold">Order #{deleteModal.orderNumber}</span>? 
                  This action cannot be undone.
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleDeleteCancel}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {deleting ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </div>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Delete Confirmation Modal */}
        {bulkDeleteModal.isOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <TrashIcon className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mt-4">
                  Delete Selected Orders
                </h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to delete <span className="font-semibold">{bulkDeleteModal.count} order{bulkDeleteModal.count !== 1 ? 's' : ''}</span>? 
                    This action cannot be undone.
                  </p>
                </div>
                <div className="flex justify-center space-x-4 mt-4">
                  <button
                    onClick={handleBulkDeleteCancel}
                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors"
                    disabled={bulkDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkDeleteConfirm}
                    disabled={bulkDeleting}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bulkDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Refund Bulk Delete Confirmation Modal */}
        {refundBulkDeleteModal.isOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <TrashIcon className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mt-4">
                  Delete Selected Refunds
                </h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to delete <span className="font-semibold">{refundBulkDeleteModal.count} refund{refundBulkDeleteModal.count !== 1 ? 's' : ''}</span>? 
                    This action cannot be undone.
                  </p>
                </div>
                <div className="flex justify-center space-x-4 mt-4">
                  <button
                    onClick={handleRefundBulkDeleteCancel}
                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors"
                    disabled={refundBulkDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRefundBulkDeleteConfirm}
                    disabled={refundBulkDeleting}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {refundBulkDeleting ? 'Deleting...' : 'Delete'}
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

export default Orders;
