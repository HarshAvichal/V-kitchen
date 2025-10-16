const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { validateOrder, validateOrderStatusUpdate } = require('../utils/validation');
const {
  createOrder,
  confirmPayment,
  getMyOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder,
  deleteOrder,
  simulatePayment
} = require('../controllers/orderController');

const router = express.Router();

// All routes are protected
router.use(protect);

// User routes
router.post('/', validateOrder, createOrder);
router.put('/:id/confirm-payment', confirmPayment);
router.get('/my-orders', getMyOrders);
router.get('/:id', getOrder);
router.put('/:id/cancel', cancelOrder);
router.delete('/:id', deleteOrder);

// Development only - simulate payment
if (process.env.NODE_ENV === 'development') {
  router.post('/:id/simulate-payment', simulatePayment);
}

// Admin routes
router.put('/:id/status', authorize('admin'), validateOrderStatusUpdate, updateOrderStatus);

module.exports = router;
