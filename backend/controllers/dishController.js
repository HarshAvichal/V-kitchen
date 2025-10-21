const Dish = require('../models/Dish');
const socketService = require('../services/socketService');

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

    // Filter by tags - show dishes that contain ANY of the selected tags
    if (req.query.tags) {
      const tags = req.query.tags.split(',');
      query.tags = { $in: tags };
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
    console.log('🔍 GET DISHES QUERY:', query);
    console.log('🔍 TOTAL DISHES FOUND:', total);

    const dishes = await Dish.find(query)
      .select('name description price imageUrl category availability tags preparationTime isActive createdAt')
      .sort(sortBy)
      .limit(limit)
      .skip(startIndex)
      .populate('createdBy', 'name email')
      .lean(); // Use lean() for better performance when we don't need full mongoose documents

    console.log('🔍 DISHES RETURNED:', dishes.length);
    console.log('🔍 DISHES DATA:', dishes.map(d => ({ 
      name: d.name, 
      availability: d.availability, 
      isActive: d.isActive 
    })));

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

    // Set cache headers to prevent caching for real-time updates
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate', // Prevent all caching
      'Pragma': 'no-cache',
      'Expires': '0'
    });

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
    const dish = await Dish.findById(req.params.id)
      .select('name description price imageUrl category availability tags preparationTime ingredients nutritionalInfo isActive createdAt')
      .populate('createdBy', 'name email')
      .lean();

    if (!dish) {
      return res.status(404).json({
        success: false,
        message: 'Dish not found'
      });
    }

    // Set cache headers to prevent caching for real-time updates
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate', // Prevent all caching
      'Pragma': 'no-cache',
      'Expires': '0'
    });

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
  const session = await Dish.startSession();
  session.startTransaction();
  
  try {
    console.log('🆕 CREATE DISH REQUEST:', req.body);
    
    // Add user to req.body
    req.body.createdBy = req.user.id;
    console.log('✅ Added createdBy:', req.body.createdBy);

    const dish = new Dish(req.body);
    console.log('✅ Created dish object:', dish);
    
    // Save with session to ensure transaction
    const savedDish = await dish.save({ session });
    console.log('✅ SAVED DISH WITH SESSION:', savedDish);
    console.log('✅ SAVED DISH ID:', savedDish._id);
    console.log('✅ SAVED DISH NAME:', savedDish.name);
    
    // Commit the transaction
    await session.commitTransaction();
    console.log('✅ TRANSACTION COMMITTED');
    
    // Verify the dish was actually saved by querying the database
    const verifyDish = await Dish.findById(savedDish._id);
    console.log('✅ VERIFICATION CREATE RESULT:', verifyDish);
    console.log('✅ VERIFICATION CREATE NAME:', verifyDish?.name);
    console.log('✅ VERIFICATION CREATE ISACTIVE:', verifyDish?.isActive);

    // Emit WebSocket event for real-time updates
    socketService.notifyMenuUpdate('dish-added', savedDish);

    res.status(201).json({
      success: true,
      message: 'Dish created successfully',
      data: savedDish
    });
  } catch (error) {
    console.error('❌ CREATE DISH ERROR:', error);
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Update dish
// @route   PUT /api/v1/dishes/:id
// @access  Private (Admin only)
const updateDish = async (req, res, next) => {
  const session = await Dish.startSession();
  session.startTransaction();
  
  try {
    console.log('🔄 UPDATE DISH REQUEST:', req.params.id, req.body);
    
    let dish = await Dish.findById(req.params.id).session(session);

    if (!dish) {
      console.log('❌ Dish not found:', req.params.id);
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Dish not found'
      });
    }

    console.log('✅ Found dish:', dish.name, 'Current data:', dish);
    console.log('✅ Update data received:', req.body);
    
    // Update the dish object with new data
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        dish[key] = req.body[key];
      }
    });
    
    console.log('✅ Dish after update:', dish);
    
    // Save the dish with session to ensure data persistence
    const updateResult = await dish.save({ session });
    
    console.log('✅ SAVE RESULT WITH SESSION:', updateResult);
    console.log('✅ SAVE RESULT AVAILABILITY:', updateResult.availability);
    console.log('✅ SAVE RESULT ISACTIVE:', updateResult.isActive);
    console.log('✅ Database save successful for dish:', updateResult.name);
    
    // Commit the transaction
    await session.commitTransaction();
    console.log('✅ UPDATE TRANSACTION COMMITTED');
    
    // Verify the update was actually saved by querying the database again
    const verifyDish = await Dish.findById(req.params.id);
    console.log('✅ VERIFICATION QUERY RESULT:', verifyDish);
    console.log('✅ VERIFICATION AVAILABILITY:', verifyDish.availability);
    console.log('✅ VERIFICATION ISACTIVE:', verifyDish.isActive);

    // Emit WebSocket event for real-time updates
    try {
      socketService.notifyDishUpdate(updateResult, 'updated');
      socketService.notifyMenuUpdate('dish-updated', updateResult);
    } catch (socketError) {
      console.error('WebSocket error:', socketError);
      // Don't fail the request if WebSocket fails
    }

    res.status(200).json({
      success: true,
      message: 'Dish updated successfully',
      data: updateResult
    });
  } catch (error) {
    console.error('Update dish error:', error);
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Delete dish
// @route   DELETE /api/v1/dishes/:id
// @access  Private (Admin only)
const deleteDish = async (req, res, next) => {
  const session = await Dish.startSession();
  session.startTransaction();
  
  try {
    console.log('🗑️ DELETE DISH REQUEST:', req.params.id);
    
    const dish = await Dish.findById(req.params.id).session(session);

    if (!dish) {
      console.log('❌ Dish not found for deletion:', req.params.id);
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Dish not found'
      });
    }

    console.log('✅ Found dish to delete:', dish.name, 'Current isActive:', dish.isActive);
    
    // Soft delete - set isActive to false
    dish.isActive = false;
    const saveResult = await dish.save({ session });
    
    console.log('✅ DELETE SAVE RESULT WITH SESSION:', saveResult);
    console.log('✅ Database soft delete successful for dish:', dish.name, 'isActive:', saveResult.isActive);
    
    // Commit the transaction
    await session.commitTransaction();
    console.log('✅ DELETE TRANSACTION COMMITTED');
    
    // Verify the delete was actually saved by querying the database again
    const verifyDeletedDish = await Dish.findById(req.params.id);
    console.log('✅ VERIFICATION DELETE RESULT:', verifyDeletedDish);
    console.log('✅ VERIFICATION DELETE ISACTIVE:', verifyDeletedDish.isActive);

    // Emit WebSocket event for real-time updates
    socketService.notifyDishUpdate(dish, 'deleted');
    socketService.notifyMenuUpdate('dish-deleted', { id: dish._id, name: dish.name });

    res.status(200).json({
      success: true,
      message: 'Dish deleted successfully'
    });
  } catch (error) {
    console.error('❌ DELETE ERROR:', error);
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Get dish categories
// @route   GET /api/v1/dishes/categories
// @access  Public
const getCategories = async (req, res, next) => {
  try {
    const categories = await Dish.distinct('category', { isActive: true });
    
    // Set cache headers to prevent caching for real-time updates
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate', // Prevent all caching
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
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
    
    // Set cache headers to prevent caching for real-time updates
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate', // Prevent all caching
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.status(200).json({
      success: true,
      data: tags
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Debug endpoint - Get all dishes without filters
// @route   GET /api/v1/dishes/debug
// @access  Private (Admin only)
const debugDishes = async (req, res, next) => {
  try {
    console.log('🔍 DEBUG: Fetching ALL dishes from database');
    
    // Get all dishes without any filters
    const allDishes = await Dish.find({})
      .select('name description price imageUrl category availability tags preparationTime isActive createdAt updatedAt')
      .sort({ createdAt: -1 })
      .lean();
    
    console.log('🔍 DEBUG: Total dishes in database:', allDishes.length);
    console.log('🔍 DEBUG: All dishes data:', allDishes.map(d => ({ 
      id: d._id,
      name: d.name, 
      availability: d.availability, 
      isActive: d.isActive,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt
    })));
    
    res.status(200).json({
      success: true,
      message: 'Debug data retrieved successfully',
      count: allDishes.length,
      data: allDishes
    });
  } catch (error) {
    console.error('❌ DEBUG ERROR:', error);
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
  getTags,
  debugDishes
};
