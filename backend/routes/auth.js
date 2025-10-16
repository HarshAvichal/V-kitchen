const express = require('express');
const { protect } = require('../middleware/auth');
const { 
  validateUserRegistration, 
  validateUserLogin 
} = require('../utils/validation');
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  logout,
  getDeliveryAddresses,
  addDeliveryAddress,
  updateDeliveryAddress,
  deleteDeliveryAddress,
  setDefaultAddress
} = require('../controllers/authController');

const router = express.Router();

// Public routes
router.post('/register', validateUserRegistration, register);
router.post('/login', validateUserLogin, login);

// Protected routes
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, changePassword);
router.post('/logout', protect, logout);

// Delivery addresses routes
router.get('/addresses', protect, getDeliveryAddresses);
router.post('/addresses', protect, addDeliveryAddress);
router.put('/addresses/:addressId', protect, updateDeliveryAddress);
router.delete('/addresses/:addressId', protect, deleteDeliveryAddress);
router.put('/addresses/:addressId/default', protect, setDefaultAddress);


module.exports = router;
