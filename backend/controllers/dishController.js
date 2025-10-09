const Dish = require('../models/Dish');

// @desc    Get all dishes
// @route   GET /api/v1/dishes
// @access  Public
const getDishes = async (req, res, next) => {
  try {
    let query = { isActive: true };

    // Filter by category
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Filter by availability
    if (req.query.availability !== undefined) {
      query.availability = req.query.availability === 'true';
    }

    // Filter by tags - require ALL selected tags to match
    if (req.query.tags) {
      const tags = req.query.tags.split(',');
      query.tags = { $all: tags };
    }

    // Search by name or description
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Price range filter
    if (req.query.minPrice || req.query.maxPrice) {
      query.price = {};
      if (req.query.minPrice) {
        query.price.$gte = parseFloat(req.query.minPrice);
      }
      if (req.query.maxPrice) {
        query.price.$lte = parseFloat(req.query.maxPrice);
      }
    }

    // Sorting
    let sortBy = '-createdAt'; // Default sort by newest first
    if (req.query.sort) {
      const sortFields = {
        'price-asc': 'price',
        'price-desc': '-price',
        'name-asc': 'name',
        'name-desc': '-name',
        'newest': '-createdAt',
        'oldest': 'createdAt'
      };
      sortBy = sortFields[req.query.sort] || sortBy;
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const total = await Dish.countDocuments(query);

    const dishes = await Dish.find(query)
      .sort(sortBy)
      .limit(limit)
      .skip(startIndex)
      .populate('createdBy', 'name email');

    // Pagination result
    const pagination = {};

    if (startIndex + limit < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: dishes.length,
      total,
      pagination,
      data: dishes
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single dish
// @route   GET /api/v1/dishes/:id
// @access  Public
const getDish = async (req, res, next) => {
  try {
    const dish = await Dish.findById(req.params.id).populate('createdBy', 'name email');

    if (!dish) {
      return res.status(404).json({
        success: false,
        message: 'Dish not found'
      });
    }

    res.status(200).json({
      success: true,
      data: dish
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new dish
// @route   POST /api/v1/dishes
// @access  Private (Admin only)
const createDish = async (req, res, next) => {
  try {
    // Add user to req.body
    req.body.createdBy = req.user.id;

    const dish = await Dish.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Dish created successfully',
      data: dish
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update dish
// @route   PUT /api/v1/dishes/:id
// @access  Private (Admin only)
const updateDish = async (req, res, next) => {
  try {
    let dish = await Dish.findById(req.params.id);

    if (!dish) {
      return res.status(404).json({
        success: false,
        message: 'Dish not found'
      });
    }

    dish = await Dish.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      message: 'Dish updated successfully',
      data: dish
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete dish
// @route   DELETE /api/v1/dishes/:id
// @access  Private (Admin only)
const deleteDish = async (req, res, next) => {
  try {
    const dish = await Dish.findById(req.params.id);

    if (!dish) {
      return res.status(404).json({
        success: false,
        message: 'Dish not found'
      });
    }

    // Soft delete - set isActive to false
    dish.isActive = false;
    await dish.save();

    res.status(200).json({
      success: true,
      message: 'Dish deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dish categories
// @route   GET /api/v1/dishes/categories
// @access  Public
const getCategories = async (req, res, next) => {
  try {
    const categories = await Dish.distinct('category', { isActive: true });
    
    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dish tags
// @route   GET /api/v1/dishes/tags
// @access  Public
const getTags = async (req, res, next) => {
  try {
    const tags = await Dish.distinct('tags', { isActive: true });
    
    res.status(200).json({
      success: true,
      data: tags
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDishes,
  getDish,
  createDish,
  updateDish,
  deleteDish,
  getCategories,
  getTags
};
