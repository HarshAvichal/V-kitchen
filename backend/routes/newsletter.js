const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  subscribeToNewsletter,
  unsubscribeFromNewsletter,
  getNewsletterStats,
  testEmailConfiguration,
  sendTestEmail
} = require('../controllers/newsletterController');

const router = express.Router();

// Public routes
router.post('/subscribe', subscribeToNewsletter);
router.post('/unsubscribe', unsubscribeFromNewsletter);
router.post('/send-test-email', sendTestEmail); // Public for testing

// Admin routes
router.get('/stats', protect, authorize('admin'), getNewsletterStats);
router.get('/test-email', protect, authorize('admin'), testEmailConfiguration);

module.exports = router;
