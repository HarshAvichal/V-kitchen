const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { validateOrder, validateOrderStatusUpdate } = require('../utils/validation');
const {
  createOrder,
  getMyOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder,
  deleteOrder
} = require('../controllers/orderController');

const router = express.Router();

// All routes are protected
router.use(protect);

// User routes
router.post('/', validateOrder, createOrder);
router.get('/my-orders', getMyOrders);
router.get('/:id', getOrder);
router.put('/:id/cancel', cancelOrder);
router.delete('/:id', deleteOrder);

// Admin routes
router.put('/:id/status', authorize('admin'), validateOrderStatusUpdate, updateOrderStatus);

module.exports = router;
