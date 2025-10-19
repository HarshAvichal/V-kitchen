const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { validateDish, validateDishUpdate } = require('../utils/validation');
const {
  getDishes,
  getDish,
  createDish,
  updateDish,
  deleteDish,
  getCategories,
  getTags,
  debugDishes
} = require('../controllers/dishController');

const router = express.Router();

// Public routes
router.get('/', getDishes);
router.get('/categories', getCategories);
router.get('/tags', getTags);
router.get('/:id', getDish);

// Protected routes (Admin only)
router.get('/debug', protect, authorize('admin'), debugDishes);
router.post('/', protect, authorize('admin'), validateDish, createDish);
router.put('/:id', protect, authorize('admin'), validateDishUpdate, updateDish);
router.delete('/:id', protect, authorize('admin'), deleteDish);

module.exports = router;
