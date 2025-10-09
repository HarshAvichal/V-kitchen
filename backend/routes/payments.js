const express = require('express');
const router = express.Router();
const { 
  createPaymentIntent, 
  handleWebhook, 
  processRefund, 
  getPaymentDetails,
  updatePaymentStatus
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

// Webhook endpoint (no auth required - Stripe handles verification)
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Protected routes
router.use(protect);

// Create payment intent
router.post('/create-payment-intent', createPaymentIntent);

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

// Update payment status
router.put('/status/:orderId', updatePaymentStatus);

module.exports = router;
