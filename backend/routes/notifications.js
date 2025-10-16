const express = require('express');
const router = express.Router();
const {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationStats
} = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// Get user notifications with pagination and filters
router.get('/', getUserNotifications);

// Get unread notification count
router.get('/unread-count', getUnreadCount);

// Mark specific notifications as read
router.put('/mark-read', markAsRead);

// Mark all notifications as read
router.put('/mark-all-read', markAllAsRead);

// Delete a notification
router.delete('/:notificationId', deleteNotification);

// Admin routes
router.get('/stats', authorize('admin'), getNotificationStats);

module.exports = router;
