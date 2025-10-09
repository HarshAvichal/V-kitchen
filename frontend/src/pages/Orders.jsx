import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ordersAPI } from '../services/api';
import { 
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  TrashIcon,
  TruckIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    page: 1,
    limit: 10
  });
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

  const statusOptions = [
    { value: '', label: 'All Orders' },
    { value: 'pending', label: 'Order Placed' },
    { value: 'preparing', label: 'Preparing' },
    { value: 'ready', label: 'Out for Delivery' },
    { value: 'completed', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

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

  useEffect(() => {
    fetchOrders();
  }, [filters]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await ordersAPI.getMyOrders(filters);
      setOrders(response.data.data);
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
  };

  const handleStatusFilter = (status) => {
    setFilters(prev => ({
      ...prev,
      status,
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
      
      toast.success('Order deleted successfully');
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

  const canDeleteOrder = (order) => {
    return ['cancelled', 'completed'].includes(order.status);
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

        {/* Status Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filter by Status</h2>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleStatusFilter(option.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filters.status === option.value
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
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
                <div key={order._id} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
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
                            {item.dish.name} x {item.quantity}
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

        {/* Pagination */}
        {(pagination.hasNext || pagination.hasPrev) && (
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
      </div>
    </div>
  );
};

export default Orders;
