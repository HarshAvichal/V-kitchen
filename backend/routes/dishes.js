const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { validateDish } = require('../utils/validation');
const {
  getDishes,
  getDish,
  createDish,
  updateDish,
  deleteDish,
  getCategories,
  getTags
} = require('../controllers/dishController');

const router = express.Router();

// Public routes
router.get('/', getDishes);
router.get('/categories', getCategories);
router.get('/tags', getTags);
router.get('/:id', getDish);

// Protected routes (Admin only)
router.post('/', protect, authorize('admin'), validateDish, createDish);
router.put('/:id', protect, authorize('admin'), validateDish, updateDish);
router.delete('/:id', protect, authorize('admin'), deleteDish);

module.exports = router;
