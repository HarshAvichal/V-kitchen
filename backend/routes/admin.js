const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  getAllOrders,
  getDashboardStats,
  getAllUsers,
  toggleUserStatus,
  deleteOrder,
  getUserStats
} = require('../controllers/adminController');

const router = express.Router();

// All admin routes are protected and require admin role
router.use(protect);
router.use(authorize('admin'));

// Dashboard and statistics
router.get('/stats', getDashboardStats);

// Order management
router.get('/orders', getAllOrders);
router.delete('/orders/:id', deleteOrder);

// User management
router.get('/users', getAllUsers);
router.get('/users/:userId/stats', getUserStats);
router.put('/users/:id/toggle-status', toggleUserStatus);

module.exports = router;
