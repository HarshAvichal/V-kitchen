const { body, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// User validation rules
const validateUserRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  handleValidationErrors
];

const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Dish validation rules
const validateDish = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Dish name must be between 2 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('category')
    .isIn(['breakfast', 'lunch', 'dinner', 'snacks', 'beverages', 'dessert'])
    .withMessage('Category must be one of: breakfast, lunch, dinner, snacks, beverages, dessert'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('preparationTime')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Preparation time must be a positive integer'),
  handleValidationErrors
];

// Order validation rules
const validateOrder = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must have at least one item'),
  body('items.*.dish')
    .isMongoId()
    .withMessage('Each item must have a valid dish ID'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Each item must have a quantity of at least 1'),
  body('deliveryType')
    .isIn(['pickup', 'delivery'])
    .withMessage('Delivery type must be either pickup or delivery'),
  body('contactPhone')
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),
  body('deliveryAddress.street')
    .if(body('deliveryType').equals('delivery'))
    .notEmpty()
    .withMessage('Street address is required for delivery'),
  body('deliveryAddress.city')
    .if(body('deliveryType').equals('delivery'))
    .notEmpty()
    .withMessage('City is required for delivery'),
  body('deliveryAddress.state')
    .if(body('deliveryType').equals('delivery'))
    .notEmpty()
    .withMessage('State is required for delivery'),
  body('deliveryAddress.zipCode')
    .if(body('deliveryType').equals('delivery'))
    .notEmpty()
    .withMessage('ZIP code is required for delivery'),
  handleValidationErrors
];

const validateOrderStatusUpdate = [
  body('status')
    .isIn(['pending', 'preparing', 'ready', 'completed', 'cancelled'])
    .withMessage('Status must be one of: pending, preparing, ready, completed, cancelled'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validateDish,
  validateOrder,
  validateOrderStatusUpdate
};
