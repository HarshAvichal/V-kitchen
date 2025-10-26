const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getStoreStatus,
  getAdminStoreStatus,
  toggleStoreStatus,
  updateClosedMessage
} = require('../controllers/storeController');

// Public route - anyone can check store status
router.get('/status', getStoreStatus);

// Create a separate router for admin routes
const adminRouter = express.Router();
adminRouter.use(protect);
adminRouter.use(authorize('admin'));

adminRouter.get('/status', getAdminStoreStatus);
adminRouter.put('/toggle', toggleStoreStatus);
adminRouter.put('/message', updateClosedMessage);

// Mount admin routes
router.use('/admin', adminRouter);

module.exports = router;

