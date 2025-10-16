import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import { useAdminUpdates } from '../../hooks/useAdminUpdates';
import { formatPhoneNumber } from '../../utils/phoneUtils';
import { 
  EyeIcon,
  PencilIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const AdminOrders = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Initialize filters from URL parameters
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    page: parseInt(searchParams.get('page')) || 1,
    limit: 20
  });
  
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    orderId: null,
    orderNumber: ''
  });
  const [deleting, setDeleting] = useState(false);
  
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    order: null
  });

  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteModal, setBulkDeleteModal] = useState({
    isOpen: false,
    count: 0
  });

  // Helper functions for timestamp formatting
  const formatTime = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusTimestamp = (order, status) => {
    return order?.statusTimestamps?.[status];
  };

  // 🚀 Real-time admin updates via WebSocket
  const handleNewOrder = (newOrder) => {
    setOrders(prev => [newOrder, ...prev]);
  };

  const handleOrderUpdate = (updatedOrder) => {
    
    setOrders(prev => {
      const updatedOrders = prev.map(order => 
        order._id === updatedOrder.orderId 
          ? { ...order, status: updatedOrder.status }
          : order
      );

      // Check if the updated order should still be visible based on current filter
      const currentFilter = filters.status;
      const updatedOrderData = updatedOrders.find(order => order._id === updatedOrder.orderId);
      
      if (updatedOrderData) {
        // If we're on "All Orders" filter and order became cancelled/completed, remove it
        if (!currentFilter && ['cancelled', 'completed'].includes(updatedOrderData.status)) {
          return updatedOrders.filter(order => order._id !== updatedOrder.orderId);
        }
        
        // If we're on a specific status filter and order doesn't match, remove it
        if (currentFilter && updatedOrderData.status !== currentFilter) {
          return updatedOrders.filter(order => order._id !== updatedOrder.orderId);
        }
      }

      return updatedOrders;
    });
  };

  useAdminUpdates(handleNewOrder, handleOrderUpdate);

  // Update URL parameters when filters change
  const updateURLParams = (newFilters) => {
    const params = new URLSearchParams();
    if (newFilters.status) {
      params.set('status', newFilters.status);
    }
    if (newFilters.page && newFilters.page > 1) {
      params.set('page', newFilters.page.toString());
    }
    setSearchParams(params);
  };

  const statusOptions = [
    { value: '', label: 'All Orders' },
    { value: 'placed', label: 'Order Placed' },
    { value: 'preparing', label: 'Preparing' },
    { value: 'ready', label: 'Ready' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];


  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    preparing: 'bg-blue-100 text-blue-800',
    ready: 'bg-green-100 text-green-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
  };

  const statusIcons = {
    pending: ClockIcon,
    preparing: ClockIcon,
    ready: CheckCircleIcon,
    completed: CheckCircleIcon,
    cancelled: XCircleIcon
  };

  useEffect(() => {
    fetchOrders();
  }, [filters]);

  // Clear selections when orders change
  useEffect(() => {
    setSelectedOrders(new Set());
  }, [orders]);

  // Handle URL parameter changes (e.g., browser back/forward)
  useEffect(() => {
    const urlStatus = searchParams.get('status') || '';
    const urlPage = parseInt(searchParams.get('page')) || 1;
    
    if (urlStatus !== filters.status || urlPage !== filters.page) {
      setFilters({
        status: urlStatus,
        page: urlPage,
        limit: 20
      });
    }
  }, [searchParams]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // Clean up filters - remove empty status
      const cleanFilters = { ...filters };
      if (cleanFilters.status === '') {
        delete cleanFilters.status;
      }
      
      const response = await adminAPI.getAllOrders(cleanFilters);
      setOrders(response.data.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await adminAPI.updateOrderStatus(orderId, newStatus);
      toast.success('Order status updated successfully');
      fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
      await adminAPI.deleteOrder(deleteModal.orderId);
      toast.success('Order removed successfully');
      setDeleteModal({ isOpen: false, orderId: null, orderNumber: '' });
      fetchOrders();
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error('Failed to delete order');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, orderId: null, orderNumber: '' });
  };

  const handlePreviewClick = (order) => {
    setPreviewModal({
      isOpen: true,
      order: order
    });
  };

  const handlePreviewClose = () => {
    setPreviewModal({ isOpen: false, order: null });
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
        adminAPI.deleteOrder(orderId)
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

  const canDeleteOrder = (status) => {
    return ['completed', 'cancelled'].includes(status);
  };

  // Helper function to format date with day suffix (e.g., 9th Oct 2025)
  const formatDateWithSuffix = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'short' }); // e.g., Oct
    const year = date.getFullYear();

    let suffix = 'th';
    if (day === 1 || day === 21 || day === 31) {
      suffix = 'st';
    } else if (day === 2 || day === 22) {
      suffix = 'nd';
    } else if (day === 3 || day === 23) {
      suffix = 'rd';
    }
    return `${day}${suffix} ${month} ${year}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Manage Orders</h1>
          <p className="text-lg text-gray-600 mt-2">
            View and manage all customer orders
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => {
                  const newFilters = {
                    ...filters,
                    status: e.target.value,
                    page: 1
                  };
                  setFilters(newFilters);
                  updateURLParams(newFilters);
                  // Clear selections when changing filters
                  setSelectedOrders(new Set());
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
          </div>
        </div>

        {/* Bulk Actions - Only show for completed and cancelled orders */}
        {['completed', 'cancelled'].includes(filters.status) && orders.length > 0 && (
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

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['completed', 'cancelled'].includes(filters.status) && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedOrders.size === orders.length && orders.length > 0}
                        onChange={handleSelectAll}
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                      />
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => {
                  const StatusIcon = statusIcons[order.status] || ClockIcon;
                  
                  return (
                    <tr key={order._id} className={selectedOrders.has(order._id) ? 'bg-orange-50' : ''}>
                      {['completed', 'cancelled'].includes(filters.status) && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedOrders.has(order._id)}
                            onChange={() => handleSelectOrder(order._id)}
                            className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                          />
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            #{order.orderNumber}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatDate(order.createdAt)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {order.user?.name || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {order.user?.email || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {order.items.length} items
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.deliveryType}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${order.totalAmount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <StatusIcon className="h-4 w-4 text-gray-400 mr-2" />
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[order.status]}`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => handlePreviewClick(order)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Preview Order Details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          {canDeleteOrder(order.status) && (
                            <button 
                              onClick={() => handleDeleteClick(order._id, order.orderNumber)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete Order"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusUpdate(order._id, e.target.value)}
                            className={`text-xs border rounded px-2 py-1 ${
                              order.status === 'cancelled' || order.status === 'completed'
                                ? 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed'
                                : 'border-gray-300 bg-white text-gray-700'
                            }`}
                            disabled={order.status === 'cancelled' || order.status === 'completed'}
                          >
                            <option value="placed" disabled={order.status !== 'placed'}>Placed</option>
                            <option value="preparing" disabled={['ready', 'completed'].includes(order.status)}>Preparing</option>
                            <option value="ready" disabled={order.status === 'completed'}>Ready</option>
                            <option value="completed" disabled={false}>Completed</option>
                            {order.status === 'cancelled' && (
                              <option value="cancelled" disabled>Cancelled</option>
                            )}
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {orders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No orders found.</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <TrashIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">
                Delete Order
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete order <span className="font-semibold">#{deleteModal.orderNumber}</span>? 
                  This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-center space-x-4 mt-4">
                <button
                  onClick={handleDeleteCancel}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Preview Modal */}
      {previewModal.isOpen && previewModal.order && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4"
          onClick={handlePreviewClose}
        >
          <div 
            className="relative w-full max-w-6xl bg-white rounded-lg shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">
                Order Preview - #{previewModal.order.orderNumber}
              </h3>
              <button
                onClick={handlePreviewClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Order Details */}
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-gray-900 border-b pb-2">Order Information</h4>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Order Number:</span>
                    <span className="text-sm font-medium">#{previewModal.order.orderNumber}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Order Date:</span>
                    <span className="text-sm font-medium">{formatDate(previewModal.order.createdAt)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[previewModal.order.status]}`}>
                      {previewModal.order.status.charAt(0).toUpperCase() + previewModal.order.status.slice(1)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Payment Status:</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      previewModal.order.paymentStatus === 'paid' 
                        ? 'bg-green-100 text-green-800' 
                        : previewModal.order.paymentStatus === 'refunded'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {previewModal.order.paymentStatus.charAt(0).toUpperCase() + previewModal.order.paymentStatus.slice(1)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Delivery Type:</span>
                    <span className="text-sm font-medium capitalize">{previewModal.order.deliveryType}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Amount:</span>
                    <span className="text-sm font-bold text-green-600">${previewModal.order.totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Status Timeline */}
                <div className="mt-6">
                  <h5 className="text-sm font-semibold text-gray-900 mb-3">Status Timeline</h5>
                  <div className="space-y-2">
                    {['placed', 'preparing', 'ready', 'completed'].map((status) => {
                      const timestamp = getStatusTimestamp(previewModal.order, status);
                      const isCompleted = timestamp && previewModal.order.statusTimestamps[status];
                      const statusLabels = {
                        placed: 'Order Placed',
                        preparing: 'Preparing',
                        ready: 'Ready for Pickup',
                        completed: 'Delivered/Picked Up'
                      };
                      
                      return (
                        <div key={status} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                          <span className="text-sm text-gray-700">{statusLabels[status]}</span>
                          <span className={`text-xs font-medium ${
                            isCompleted ? 'text-green-600' : 'text-gray-400'
                          }`}>
                            {isCompleted ? formatTime(timestamp) : 'Pending'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Order Items */}
                <div className="mt-6">
                  <h5 className="text-sm font-semibold text-gray-900 mb-3">Order Items ({previewModal.order.items.length})</h5>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {previewModal.order.items.map((item, index) => {
                      const dishName = item.dish?.name || 'Item No Longer Available';
                      const dishPrice = item.price || 0; // Use stored original price
                      const itemTotal = dishPrice * item.quantity;
                      
                      return (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border">
                          <div className="flex-1">
                            <div className={`text-sm font-medium ${item.dish?.name ? 'text-gray-900' : 'text-red-600'}`}>
                              {dishName}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">Quantity: {item.quantity}</div>
                            <div className="text-xs text-gray-500">${dishPrice.toFixed(2)} each</div>
                          </div>
                          <div className="text-sm font-bold text-green-600">
                            ${itemTotal.toFixed(2)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-900">Subtotal:</span>
                      <span className="text-sm font-bold text-gray-900">
                        ${previewModal.order.items.reduce((total, item) => {
                          return total + ((item.price || 0) * item.quantity);
                        }, 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Details */}
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-gray-900 border-b pb-2">Customer Information</h4>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Name:</span>
                    <span className="text-sm font-medium">{previewModal.order.user?.name || 'N/A'}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Email:</span>
                    <span className="text-sm font-medium">{previewModal.order.user?.email || 'N/A'}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Phone:</span>
                    <span className="text-sm font-medium">
                      {previewModal.order.user?.phone ? formatPhoneNumber(previewModal.order.user.phone) : 'N/A'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Member Since:</span>
                    <span className="text-sm font-medium">
                      {formatDateWithSuffix(previewModal.order.user?.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Delivery Address */}
                {previewModal.order.deliveryAddress && (
                  <div className="mt-6">
                    <h5 className="text-sm font-semibold text-gray-900 mb-3">Delivery Address</h5>
                    <div className="p-3 bg-gray-50 rounded text-sm">
                      <div className="font-medium">{previewModal.order.deliveryAddress.street}</div>
                      <div>{previewModal.order.deliveryAddress.city}, {previewModal.order.deliveryAddress.state}</div>
                      <div>{previewModal.order.deliveryAddress.zipCode}</div>
                      {previewModal.order.deliveryAddress.landmark && (
                        <div className="text-gray-500 mt-1">Landmark: {previewModal.order.deliveryAddress.landmark}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Special Instructions */}
                {previewModal.order.specialInstructions && (
                  <div className="mt-4">
                    <h5 className="text-sm font-semibold text-gray-900 mb-2">Special Instructions</h5>
                    <div className="p-3 bg-yellow-50 rounded text-sm border-l-4 border-yellow-400">
                      {previewModal.order.specialInstructions}
                    </div>
                  </div>
                )}

                {/* Contact Information */}
                {previewModal.order.contactPhone && (
                  <div className="mt-4">
                    <h5 className="text-sm font-semibold text-gray-900 mb-2">Contact Phone</h5>
                    <div className="text-sm font-medium text-blue-600">
                      {formatPhoneNumber(previewModal.order.contactPhone)}
                    </div>
                  </div>
                )}
              </div>
              </div>
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
    </div>
  );
};

export default AdminOrders;
