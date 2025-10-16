import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import ErrorBoundary from '../components/ErrorBoundary';
import { Bell, Check, CheckCheck, Trash2, Filter, Search, X, Volume2, VolumeX } from 'lucide-react';
import { FaCheck, FaUtensils, FaBox, FaTruck, FaCreditCard, FaExclamationTriangle, FaDollarSign, FaBell } from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import notificationSounds from '../utils/notificationSounds';

const Notifications = () => {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    renderKey,
    forceUpdate,
    notificationUpdateTrigger,
    forceComponentUpdate,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    setOnNotificationsPage
  } = useNotifications();
  
  const [filter, setFilter] = useState('all');
  
  // Handle filter change
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(notificationSounds.isEnabled);
  
  

  const prevNotificationsRef = useRef([]);

  // Set notifications page flag when component mounts/unmounts
  useEffect(() => {
    setOnNotificationsPage(true);
    return () => setOnNotificationsPage(false);
  }, [setOnNotificationsPage]);

  // Load initial notifications when component mounts
  useEffect(() => {
    const loadInitialNotifications = async () => {
      setPage(1);
      setHasMore(true);
      const result = await fetchNotifications(1, 50, { 
        type: null // Load all notifications initially
      }, true);
      if (result) {
        setHasMore(result.pagination.hasNextPage);
      }
      await fetchUnreadCount();
    };
    
    loadInitialNotifications();
  }, [fetchNotifications, fetchUnreadCount]);

  // Load notifications when component mounts or filter changes
  useEffect(() => {
    const loadNotifications = async () => {
      setPage(1);
      setHasMore(true);
      const apiParams = { 
        type: filter === 'all' ? null : filter 
      };
      const result = await fetchNotifications(1, 50, apiParams, true);
      if (result) {
        setHasMore(result.pagination.hasNextPage);
      }
      await fetchUnreadCount();
    };
    
    loadNotifications();
  }, [filter, fetchNotifications, fetchUnreadCount]);

  // Load more notifications
  const loadMore = async () => {
    if (loading || !hasMore) return;
    
    const nextPage = page + 1;
    const result = await fetchNotifications(nextPage, 20, { 
      type: filter === 'all' ? null : filter 
    }, false); // Use replace=false for pagination
    
    if (result) {
      setPage(nextPage);
      setHasMore(result.pagination.hasNextPage);
    }
  };

  // Filter notifications by search term and filter type
  const filteredNotifications = notifications.filter(notification => {
    // Apply search filter (only if search term is not empty)
    const matchesSearch = searchTerm === '' || 
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Apply type filter - if 'all', show all types
    const matchesType = filter === 'all' || notification.type === filter;
    
    return matchesSearch && matchesType;
  });
  
  


  // Handle notification click
  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification._id);
    }
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  // Handle delete notification
  const handleDeleteNotification = async (notificationId) => {
    try {
      await deleteNotification(notificationId);
      toast.success('Notification deleted');
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  // Handle bulk actions
  const handleBulkMarkAsRead = async () => {
    if (selectedNotifications.length === 0) return;
    
    try {
      await markAsRead(selectedNotifications);
      setSelectedNotifications([]);
      toast.success(`${selectedNotifications.length} notifications marked as read`);
    } catch (error) {
      toast.error('Failed to mark notifications as read');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedNotifications.length === 0) return;
    
    try {
      await Promise.all(selectedNotifications.map(id => deleteNotification(id)));
      setSelectedNotifications([]);
      toast.success(`${selectedNotifications.length} notifications deleted`);
    } catch (error) {
      console.error('Error in bulk delete:', error);
      toast.error('Failed to delete notifications');
    }
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedNotifications.length === filteredNotifications.length) {
      setSelectedNotifications([]);
    } else {
      const allIds = filteredNotifications.map(n => n._id);
      setSelectedNotifications(allIds);
    }
  };

  // Handle sound toggle
  const handleSoundToggle = () => {
    const newState = notificationSounds.toggle();
    setSoundEnabled(newState);
    toast.success(newState ? 'Notification sounds enabled' : 'Notification sounds disabled');
  };


  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'order-placed':
        return <FaCheck className="h-5 w-5 text-green-600" />;
      case 'kitchen-started':
        return <FaUtensils className="h-5 w-5 text-blue-600" />;
      case 'ready-pickup':
        return <FaBox className="h-5 w-5 text-orange-600" />;
      case 'ready-delivery':
        return <FaTruck className="h-5 w-5 text-purple-600" />;
      case 'out-for-delivery':
        return <FaTruck className="h-5 w-5 text-blue-600" />;
      case 'delivered':
        return <FaCheck className="h-5 w-5 text-green-600" />;
      case 'cancelled':
        return <FaExclamationTriangle className="h-5 w-5 text-red-600" />;
      case 'payment-success':
        return <FaCreditCard className="h-5 w-5 text-green-600" />;
      case 'payment-failed':
        return <FaExclamationTriangle className="h-5 w-5 text-red-600" />;
      case 'refund-processed':
        return <FaDollarSign className="h-5 w-5 text-green-600" />;
      default:
        return <FaBell className="h-5 w-5 text-gray-600" />;
    }
  };


  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Notifications</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => fetchNotifications()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Fallback for undefined states
  if (notifications === undefined || unreadCount === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-4">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
              <p className="text-gray-600">
                {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {/* Sound controls */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSoundToggle}
                  className={`p-2 rounded-full transition-colors ${
                    soundEnabled 
                      ? 'text-green-600 hover:bg-green-100' 
                      : 'text-gray-400 hover:bg-gray-100'
                  }`}
                  title={soundEnabled ? 'Disable sounds' : 'Enable sounds'}
                >
                  {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                </button>
                
              </div>
              
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                >
                  <CheckCheck className="h-4 w-4" />
                  <span>Mark All Read</span>
                </button>
              )}
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter */}
            <select
              value={filter}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="order-placed">Order Placed</option>
              <option value="kitchen-started">Kitchen Started</option>
              <option value="ready-pickup">Ready for Pickup</option>
              <option value="ready-delivery">Ready for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
              <option value="payment-success">Payment Success</option>
              <option value="payment-failed">Payment Failed</option>
              <option value="refund-processed">Refund Processed</option>
              <option value="refund-issued">Refund Issued</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedNotifications.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-blue-800 font-medium">
                {selectedNotifications.length} notification{selectedNotifications.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleBulkMarkAsRead}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  Mark as Read
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notifications List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {loading && notifications.length === 0 ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications found</h3>
              <p className="text-gray-600">
                {searchTerm ? 'Try adjusting your search terms' : 'You\'re all caught up!'}
              </p>
            </div>
          ) : (
            <>
              {/* Select All */}
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedNotifications.length === filteredNotifications.length && filteredNotifications.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Select All</span>
                </label>
              </div>


              {/* Notifications */}
              <div className="divide-y divide-gray-100" key={`notifications-${notifications.length}`}>
                {filteredNotifications.map((notification, index) => (
                  <div
                    key={`notification-${notification._id}-${index}`}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedNotifications.includes(notification._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedNotifications([...selectedNotifications, notification._id]);
                          } else {
                            setSelectedNotifications(selectedNotifications.filter(id => id !== notification._id));
                          }
                        }}
                        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />

                      {/* Icon */}
                      <div className="flex items-center justify-center w-8 h-8">
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                            {notification.title}
                          </p>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleDeleteNotification(notification._id)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </span>
                          {!notification.read && (
                            <button
                              onClick={() => handleNotificationClick(notification)}
                              className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                            >
                              <Check className="h-3 w-3" />
                              <span>Mark as read</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Load More */}
              {hasMore && (
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="w-full text-center text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 py-2"
                  >
                    {loading ? 'Loading...' : 'Load More Notifications'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const NotificationsWithErrorBoundary = () => (
  <ErrorBoundary>
    <Notifications />
  </ErrorBoundary>
);

export default NotificationsWithErrorBoundary;
