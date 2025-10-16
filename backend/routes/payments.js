const express = require('express');
const router = express.Router();
const { 
  createPaymentIntent, 
  createPaymentIntentForOrder,
  handleWebhook, 
  requestRefund,
  processRefund, 
  getPaymentDetails,
  verifyPaymentStatus
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

// Webhook endpoint (no auth required - Stripe handles verification)
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Protected routes
router.use(protect);

// Create payment intent
router.post('/create-payment-intent', createPaymentIntent);

// Create payment intent for order data (before order creation)
router.post('/create-payment-intent-for-order', createPaymentIntentForOrder);

// Request refund (customer)
router.post('/request-refund', requestRefund);

// Process refund (admin only)
router.post('/refund', (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required for refunds'
    });
  }
  next();
}, processRefund);

// Get payment details
router.get('/details/:orderId', getPaymentDetails);

// Verify payment status (secure server-side verification)
router.get('/verify/:orderId', verifyPaymentStatus);

module.exports = router;
