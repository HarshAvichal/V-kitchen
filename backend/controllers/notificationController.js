const Notification = require('../models/Notification');
const Order = require('../models/Order');
const socketService = require('../services/socketService');

// Get user notifications with pagination and filters
const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      page = 1,
      limit = 20,
      type,
      read,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 50), // Max 50 per page
      type: type || null,
      read: read !== undefined ? read === 'true' : null,
      sortBy,
      sortOrder
    };

    const result = await Notification.getUserNotifications(userId, options);

    // Ensure each notification has an id field
    if (result.notifications) {
      result.notifications = result.notifications.map(notification => ({
        ...notification.toObject(),
        id: notification._id ? notification._id.toString() : (notification.id || null)
      }));
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting user notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notifications',
      error: error.message
    });
  }
};

// Get unread notification count
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await Notification.getUnreadCount(userId);

    res.json({
      success: true,
      data: { unreadCount: count }
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count',
      error: error.message
    });
  }
};

// Mark notifications as read
const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationIds } = req.body;

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({
        success: false,
        message: 'Notification IDs are required'
      });
    }

    const result = await Notification.markAsRead(notificationIds, userId);

    // Send real-time update via WebSocket
    socketService.sendNotificationUpdate(userId, 'notifications-marked-read', {
      notificationIds,
      modifiedCount: result.modifiedCount
    });

    // Send updated unread count
    const unreadCount = await Notification.getUnreadCount(userId);
    socketService.sendUnreadCountUpdate(userId, unreadCount);

    res.json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount,
        message: `${result.modifiedCount} notifications marked as read`
      }
    });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notifications as read',
      error: error.message
    });
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await Notification.markAllAsRead(userId);

    // Send real-time update via WebSocket
    socketService.sendNotificationUpdate(userId, 'all-notifications-marked-read', {
      modifiedCount: result.modifiedCount
    });

    // Send updated unread count (should be 0)
    socketService.sendUnreadCountUpdate(userId, 0);

    res.json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount,
        message: `${result.modifiedCount} notifications marked as read`
      }
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message
    });
  }
};

// Delete notification
const deleteNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      userId: userId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Send real-time update via WebSocket
    socketService.sendNotificationUpdate(userId, 'notification-deleted', {
      notificationId,
      wasUnread: !notification.read
    });

    // Send updated unread count
    const unreadCount = await Notification.getUnreadCount(userId);
    socketService.sendUnreadCountUpdate(userId, unreadCount);

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message
    });
  }
};

// Create notification (internal use)
const createNotification = async (notificationData) => {
  try {
    const notification = await Notification.createNotification(notificationData);
    
    // Send real-time notification via WebSocket
    socketService.sendToUser(notification.userId, 'notification-created', {
      _id: notification._id,
      id: notification._id, // Keep both for compatibility
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      priority: notification.priority,
      read: notification.read,
      createdAt: notification.createdAt,
      timeAgo: notification.timeAgo
    });

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Create order timeline notification
const createOrderTimelineNotification = async (orderId, type, additionalData = {}) => {
  try {
    const order = await Order.findById(orderId).populate('user');
    if (!order) {
      console.error('Order not found for notification:', orderId);
      return null;
    }
    

    const notificationTemplates = {
      'order-placed': {
        title: 'Order Placed Successfully! 🎉',
        message: `Your order #${order.orderNumber} has been placed and confirmed.`,
        priority: 'high'
      },
      'kitchen-started': {
        title: 'Kitchen Started Preparing 👨‍🍳',
        message: `Your order #${order.orderNumber} is now being prepared in our kitchen.`,
        priority: 'medium'
      },
      'ready-pickup': {
        title: 'Order Ready for Pickup! 📦',
        message: `Your order #${order.orderNumber} is ready for pickup. ${additionalData.estimatedTime ? `ETA: ${additionalData.estimatedTime} minutes` : ''}`,
        priority: 'high'
      },
      'ready-delivery': {
        title: 'Order Ready & Out for Delivery! 🚚',
        message: `Your order #${order.orderNumber} is ready and out for delivery! ${additionalData.driverName ? `Driver: ${additionalData.driverName}` : ''} ${additionalData.estimatedTime ? `ETA: ${additionalData.estimatedTime} minutes` : ''}`,
        priority: 'high'
      },
      'out-for-delivery': {
        title: 'Order Out for Delivery 🚚',
        message: `Your order #${order.orderNumber} is on its way! ${additionalData.driverName ? `Driver: ${additionalData.driverName}` : ''}`,
        priority: 'high'
      },
      'delivered': {
        title: 'Order Delivered! ✅',
        message: `Your order #${order.orderNumber} has been delivered successfully. Enjoy your meal!`,
        priority: 'high'
      },
      'cancelled': {
        title: 'Order Cancelled ❌',
        message: `Your order #${order.orderNumber} has been cancelled. ${additionalData.reason ? `Reason: ${additionalData.reason}` : ''}`,
        priority: 'high'
      }
    };

    const template = notificationTemplates[type];
    if (!template) {
      console.error('Unknown notification type:', type);
      return null;
    }

    const notificationData = {
      userId: order.user._id,
      type,
      title: template.title,
      message: template.message,
      priority: template.priority,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        status: order.status,
        paymentStatus: order.paymentStatus,
        ...additionalData
      }
    };

    
    const result = await createNotification(notificationData);
    return result;
  } catch (error) {
    console.error('Error creating order timeline notification:', error);
    throw error;
  }
};

// Create payment notification
const createPaymentNotification = async (orderId, type, additionalData = {}) => {
  try {
    const order = await Order.findById(orderId).populate('user');
    if (!order) {
      console.error('Order not found for payment notification:', orderId);
      return null;
    }

    const notificationTemplates = {
      'payment-success': {
        title: 'Payment Successful! 💳',
        message: `Payment of $${order.totalAmount} for order #${order.orderNumber} was successful.`,
        priority: 'high'
      },
      'payment-failed': {
        title: 'Payment Failed ❌',
        message: `Payment for order #${order.orderNumber} failed. Please try again.`,
        priority: 'high'
      },
      'refund-processed': {
        title: 'Refund Processed 💰',
        message: `Refund of $${additionalData.refundAmount || order.totalAmount} for order #${order.orderNumber} has been processed.`,
        priority: 'medium'
      }
    };

    const template = notificationTemplates[type];
    if (!template) {
      console.error('Unknown payment notification type:', type);
      return null;
    }

    const notificationData = {
      userId: order.user._id,
      type,
      title: template.title,
      message: template.message,
      priority: template.priority,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        status: order.status,
        paymentStatus: order.paymentStatus,
        ...additionalData
      }
    };

    return await createNotification(notificationData);
  } catch (error) {
    console.error('Error creating payment notification:', error);
    throw error;
  }
};

// Get notification statistics (admin only)
const getNotificationStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const stats = await Notification.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          unreadCount: {
            $sum: { $cond: [{ $eq: ['$read', false] }, 1, 0] }
          }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const totalNotifications = await Notification.countDocuments();
    const totalUnread = await Notification.countDocuments({ read: false });

    res.json({
      success: true,
      data: {
        totalNotifications,
        totalUnread,
        byType: stats
      }
    });
  } catch (error) {
    console.error('Error getting notification stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notification statistics',
      error: error.message
    });
  }
};


module.exports = {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  createOrderTimelineNotification,
  createPaymentNotification,
  getNotificationStats
};
