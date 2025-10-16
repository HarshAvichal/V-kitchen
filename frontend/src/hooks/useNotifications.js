import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import { useAuth } from '../context/AuthContext';
import { notificationsAPI } from '../services/api';
import toast from 'react-hot-toast';
import notificationSounds from '../utils/notificationSounds';

// Global notification manager to prevent duplicate toasts
class NotificationManager {
  constructor() {
    this.processedNotifications = new Set();
    this.listenerSetup = false;
    this.lastProcessedTime = new Map(); // Track when notifications were processed
  }

  hasProcessed(notificationId) {
    return this.processedNotifications.has(notificationId);
  }

  markAsProcessed(notificationId) {
    this.processedNotifications.add(notificationId);
    this.lastProcessedTime.set(notificationId, Date.now());
  }

  isListenerSetup() {
    return this.listenerSetup;
  }

  setListenerSetup(value) {
    this.listenerSetup = value;
  }

  clearProcessed() {
    this.processedNotifications.clear();
    this.lastProcessedTime.clear();
  }

  // Clean up old processed notifications (older than 5 minutes)
  cleanupOldProcessed() {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    for (const [id, time] of this.lastProcessedTime.entries()) {
      if (time < fiveMinutesAgo) {
        this.processedNotifications.delete(id);
        this.lastProcessedTime.delete(id);
      }
    }
  }
}

const notificationManager = new NotificationManager();

export const useNotifications = () => {
  const { socket, isConnected, on, off } = useWebSocket();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [renderKey, setRenderKey] = useState(0);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [notificationUpdateTrigger, setNotificationUpdateTrigger] = useState(0);
  const [forceComponentUpdate, setForceComponentUpdate] = useState(0);
  const listenerSetupRef = useRef(false);
  const deletedNotificationsRef = useRef(new Set());
  const isOnNotificationsPage = useRef(false);


  // Fetch notifications from API
  const fetchNotifications = useCallback(async (page = 1, limit = 20, filters = {}, replace = false) => {
    try {
      setLoading(true);
      setError(null);
      
      // Filter out null/undefined values to avoid sending "null" as string
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([key, value]) => value !== null && value !== undefined)
      );
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...cleanFilters
      });

      const response = await notificationsAPI.getNotifications(Object.fromEntries(params));
      
      if (response.data.success) {
        if (replace || page === 1) {
          // Replace notifications for first page or when explicitly requested
          setNotifications(response.data.data.notifications);
          // Clear deleted notifications set when fetching fresh data
          deletedNotificationsRef.current.clear();
          // Don't override unread count here - let it be managed by WebSocket events
          // The unread count should come from the backend API, not calculated from notifications
        } else {
          // Append notifications for pagination
          setNotifications(prev => [...prev, ...response.data.data.notifications]);
          // Don't modify unread count for pagination
        }
        return response.data.data;
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err.response?.data?.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await notificationsAPI.getUnreadCount();
      if (response.data.success) {
        setUnreadCount(response.data.data.unreadCount);
        // Store the count in localStorage as backup
        localStorage.setItem('unreadCount', response.data.data.unreadCount.toString());
      }
    } catch (err) {
      console.error('Error fetching unread count:', err);
      // Fallback to localStorage if API fails
      const storedCount = localStorage.getItem('unreadCount');
      if (storedCount) {
        setUnreadCount(parseInt(storedCount, 10));
      }
    }
  }, []);

  // Mark notifications as read
  const markAsRead = useCallback(async (notificationIds) => {
    try {
      const response = await notificationsAPI.markAsRead(
        Array.isArray(notificationIds) ? notificationIds : [notificationIds]
      );

      if (response.data.success) {
        // Calculate unread count to subtract before updating notifications
        const unreadCountToSubtract = notifications.filter(n => 
          notificationIds.includes(n._id || n.id) && !n.read
        ).length;
        
        // Update local state immediately as fallback
        setNotifications(prev => 
          prev.map(notification => {
            const notificationId = notification._id || notification.id;
            if (notificationIds.includes(notificationId)) {
              return { ...notification, read: true, readAt: new Date() };
            }
            return notification;
          })
        );
        
        // Update unread count
        setUnreadCount(prev => Math.max(0, prev - unreadCountToSubtract));
        
        return response.data;
      }
    } catch (err) {
      console.error('Error marking notifications as read:', err);
      throw err;
    }
  }, [notifications]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await notificationsAPI.markAllAsRead();
      
      if (response.data.success) {
        // Update local state immediately as fallback
        setNotifications(prev => 
          prev.map(notification => ({ 
            ...notification, 
            read: true, 
            readAt: new Date() 
          }))
        );
        setUnreadCount(0);
        return response.data;
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      throw err;
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      // Check if already deleted
      if (deletedNotificationsRef.current.has(notificationId)) {
        return { success: true };
      }
      
      const response = await notificationsAPI.deleteNotification(notificationId);
      
      if (response.data.success) {
        // Mark as deleted to prevent duplicate attempts
        deletedNotificationsRef.current.add(notificationId);
        
        // Update local state immediately as fallback
        const notification = notifications.find(n => (n._id || n.id) === notificationId);
        const wasUnread = notification && !notification.read;
        
        setNotifications(prev => 
          prev.filter(n => (n._id || n.id) !== notificationId)
        );
        
        if (wasUnread) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
        
        return response.data;
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
      // If it's a 404 error, the notification was already deleted
      if (err.response?.status === 404) {
        deletedNotificationsRef.current.add(notificationId);
        
        setNotifications(prev => 
          prev.filter(n => (n._id || n.id) !== notificationId)
        );
        
        return { success: true };
      }
      throw err;
    }
  }, [notifications]);

  // Handle real-time notification
  const handleNewNotification = useCallback((notification) => {
    // Use _id as the primary ID for consistency
    const notificationId = notification._id || notification.id;
    
    // Check if we've already processed this notification globally
    if (notificationManager.hasProcessed(notificationId)) {
      return;
    }
    
    // Mark as processed globally BEFORE doing anything else
    notificationManager.markAsProcessed(notificationId);
    
    // Add to notifications list and force re-render in one batch
    const timestamp = Date.now();
    setRenderKey(timestamp);
    setForceUpdate(timestamp);
    
    // Force immediate state update
    setNotificationUpdateTrigger(prev => prev + 1);
    
    // Also force a render key update
    setRenderKey(prev => prev + 1);
    
    // Force component update
    setForceComponentUpdate(prev => prev + 1);
    
    // Force a complete state reset to ensure React detects the change
    setNotifications(prev => {
      // Create a completely new array with spread operator
      const newNotifications = [notification, ...prev];
      // Force a new reference by creating a new array
      return [...newNotifications];
    });
    
    // Update unread count
    setUnreadCount(prev => prev + 1);
    
    // Play notification sound
    notificationSounds.playByPriority(notification.priority, notification.type);
    
    // Show toast notification (only show one toast per order to avoid duplicates)
    if (notification.type === 'order-placed') {
      const orderNumber = notification.data?.orderNumber || 'Unknown';
      toast.success(`Order #${orderNumber} placed successfully! 🎉`, {
        duration: 4000,
        position: 'top-right'
      });
    } else if (notification.type === 'kitchen-started') {
      const orderNumber = notification.data?.orderNumber || 'Unknown';
      toast(`Order #${orderNumber} is being prepared! 👨‍🍳`, {
        duration: 4000,
        position: 'top-right',
        icon: '👨‍🍳'
      });
    } else if (notification.type === 'ready-pickup') {
      const orderNumber = notification.data?.orderNumber || 'Unknown';
      toast.success(`Order #${orderNumber} is ready for pickup! 📦`, {
        duration: 4000,
        position: 'top-right'
      });
    } else if (notification.type === 'ready-delivery') {
      const orderNumber = notification.data?.orderNumber || 'Unknown';
      toast.success(`Order #${orderNumber} is ready and out for delivery! 🚚`, {
        duration: 4000,
        position: 'top-right'
      });
    } else if (notification.type === 'delivered') {
      const orderNumber = notification.data?.orderNumber || 'Unknown';
      toast.success(`Order #${orderNumber} has been delivered! ✅`, {
        duration: 4000,
        position: 'top-right'
      });
    } else if (notification.type === 'payment-success') {
      // Don't show separate payment success toast - order placed already covers this
    } else if (notification.type === 'cancelled') {
      toast.error('Order cancelled', {
        duration: 4000,
        position: 'top-right'
      });
    } else if (notification.type === 'refund-requested') {
      toast.success('Refund request submitted successfully', {
        duration: 4000,
        position: 'top-right'
      });
    }
  }, []); // Empty dependency array to make it stable

  // Handle notification updates (mark as read, delete, etc.)
  const handleNotificationUpdate = useCallback((updateData) => {
    switch (updateData.type) {
      case 'notifications-marked-read':
        // Update specific notifications as read
        setNotifications(prev => 
          prev.map(notification => {
            const notificationId = notification._id || notification.id;
            if (updateData.notificationIds.includes(notificationId)) {
              return { ...notification, read: true, readAt: new Date() };
            }
            return notification;
          })
        );
        break;
        
      case 'all-notifications-marked-read':
        // Mark all notifications as read
        setNotifications(prev => 
          prev.map(notification => ({ 
            ...notification, 
            read: true, 
            readAt: new Date() 
          }))
        );
        setUnreadCount(0);
        break;
        
      case 'notification-deleted':
        // Remove deleted notification
        setNotifications(prev => 
          prev.filter(notification => {
            const notificationId = notification._id || notification.id;
            return notificationId !== updateData.notificationId;
          })
        );
        break;
        
      default:
        break;
    }
  }, []);

  // Handle unread count updates
  const handleUnreadCountUpdate = useCallback((data) => {
    setUnreadCount(data.unreadCount);
    // Store in localStorage as backup
    localStorage.setItem('unreadCount', data.unreadCount.toString());
  }, []);

  // Set up WebSocket listeners (only allow one instance globally)
  useEffect(() => {
    if (!socket || !user || notificationManager.isListenerSetup()) {
      return;
    }

    notificationManager.setListenerSetup(true);
    listenerSetupRef.current = true;
    
    // Set up all notification-related event listeners using the on/off functions
    const wrappedHandleNewNotification = (notification) => {
      handleNewNotification(notification);
    };
    
    on('notification-created', wrappedHandleNewNotification);
    on('notification-updated', handleNotificationUpdate);
    on('unread-count-updated', handleUnreadCountUpdate);

    return () => {
      notificationManager.setListenerSetup(false);
      listenerSetupRef.current = false;
      off('notification-created', wrappedHandleNewNotification);
      off('notification-updated', handleNotificationUpdate);
      off('unread-count-updated', handleUnreadCountUpdate);
    };
  }, [socket, user, on, off, handleNewNotification, handleNotificationUpdate, handleUnreadCountUpdate]);

  // Fetch initial data when user changes
  useEffect(() => {
    if (user) {
      // Clear processed notifications when user changes
      notificationManager.clearProcessed();
      
      // Initialize unread count from localStorage as fallback
      const storedCount = localStorage.getItem('unreadCount');
      if (storedCount) {
        setUnreadCount(parseInt(storedCount, 10));
      }
      
      fetchNotifications();
      fetchUnreadCount();
    } else {
      // Clear state when user logs out
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user, fetchNotifications, fetchUnreadCount]);

  // Clean up old processed notifications periodically
  useEffect(() => {
    const interval = setInterval(() => {
      notificationManager.cleanupOldProcessed();
    }, 60000); // Clean up every minute

    return () => clearInterval(interval);
  }, []);

  // Function to set notifications page flag
  const setOnNotificationsPage = useCallback((isOnPage) => {
    isOnNotificationsPage.current = isOnPage;
  }, []);

  return {
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
    isConnected,
    setOnNotificationsPage
  };
};
