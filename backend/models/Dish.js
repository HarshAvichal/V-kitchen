const mongoose = require('mongoose');

const dishSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a dish name'],
    trim: true,
    maxlength: [100, 'Dish name cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  price: {
    type: Number,
    required: [true, 'Please add a price'],
    min: [0, 'Price cannot be negative']
  },
  imageUrl: {
    type: String,
    default: 'https://via.placeholder.com/300x200?text=No+Image+Available'
  },
  category: {
    type: String,
    required: [true, 'Please add a category'],
    enum: ['breakfast', 'lunch', 'dinner', 'snacks', 'beverages', 'dessert'],
    lowercase: true
  },
  availability: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String,
    enum: ['spicy', 'mild', 'vegan', 'vegetarian', 'non-vegetarian', 'gluten-free', 'dairy-free', 'nut-free', 'popular', 'new', 'dessert']
  }],
  preparationTime: {
    type: Number,
    default: 15, // in minutes
    min: [1, 'Preparation time must be at least 1 minute']
  },
  ingredients: [{
    type: String,
    trim: true
  }],
  nutritionalInfo: {
    calories: Number,
    protein: Number, // in grams
    carbs: Number,   // in grams
    fat: Number      // in grams
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
dishSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create comprehensive indexes for better search performance
dishSchema.index({ name: 'text', description: 'text', tags: 'text' });
dishSchema.index({ category: 1, availability: 1, isActive: 1 });
dishSchema.index({ price: 1 });
dishSchema.index({ tags: 1, isActive: 1 });
dishSchema.index({ isActive: 1, createdAt: -1 });
dishSchema.index({ category: 1, isActive: 1, availability: 1 });
dishSchema.index({ createdBy: 1, isActive: 1 });

module.exports = mongoose.model('Dish', dishSchema);
