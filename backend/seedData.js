const mongoose = require('mongoose');
const Dish = require('./models/Dish');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vkitchen');
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Sample dishes data
const sampleDishes = [
  {
    name: 'Chicken Biryani',
    description: 'Aromatic basmati rice with tender chicken pieces, cooked with traditional spices',
    price: 12.99,
    imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=300&fit=crop&t=' + Date.now(),
    category: 'lunch',
    tags: ['spicy', 'non-vegetarian', 'popular'],
    preparationTime: 25,
    ingredients: ['Basmati Rice', 'Chicken', 'Onions', 'Yogurt', 'Garam Masala'],
    nutritionalInfo: {
      calories: 450,
      protein: 25,
      carbs: 35,
      fat: 20
    }
  },
  {
    name: 'Butter Chicken',
    description: 'Creamy tomato curry with tender chicken pieces, served with naan bread',
    price: 14.99,
    imageUrl: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&h=300&fit=crop&t=' + Date.now(),
    category: 'lunch',
    tags: ['mild', 'non-vegetarian', 'popular'],
    preparationTime: 20,
    ingredients: ['Chicken', 'Tomatoes', 'Cream', 'Butter', 'Garam Masala'],
    nutritionalInfo: {
      calories: 380,
      protein: 28,
      carbs: 15,
      fat: 25
    }
  },
  {
    name: 'Masala Dosa',
    description: 'Crispy crepe filled with spiced potato mixture, served with sambar and chutney',
    price: 6.99,
    imageUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop&t=' + Date.now(),
    category: 'breakfast',
    tags: ['vegetarian', 'spicy', 'popular'],
    preparationTime: 15,
    ingredients: ['Rice Flour', 'Potatoes', 'Onions', 'Mustard Seeds', 'Curry Leaves'],
    nutritionalInfo: {
      calories: 320,
      protein: 8,
      carbs: 45,
      fat: 12
    }
  },
  {
    name: 'Paneer Tikka',
    description: 'Grilled cottage cheese with aromatic spices, served with mint chutney',
    price: 9.99,
    imageUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=300&fit=crop&t=' + Date.now(),
    category: 'snacks',
    tags: ['vegetarian', 'mild', 'popular'],
    preparationTime: 18,
    ingredients: ['Paneer', 'Yogurt', 'Garam Masala', 'Ginger', 'Garlic'],
    nutritionalInfo: {
      calories: 280,
      protein: 18,
      carbs: 8,
      fat: 20
    }
  },
  {
    name: 'Mango Lassi',
    description: 'Refreshing yogurt drink with fresh mango puree',
    price: 4.99,
    imageUrl: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&h=300&fit=crop',
    category: 'beverages',
    tags: ['vegetarian', 'mild'],
    preparationTime: 5,
    ingredients: ['Mango', 'Yogurt', 'Sugar', 'Cardamom'],
    nutritionalInfo: {
      calories: 180,
      protein: 6,
      carbs: 35,
      fat: 2
    }
  }
];

// Create admin user
const createAdmin = async () => {
  try {
    const existingAdmin = await User.findOne({ email: 'admin@vkitchen.com' });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const admin = new User({
        name: 'Admin User',
        email: 'admin@vkitchen.com',
        password: hashedPassword,
        role: 'admin',
        phone: '+1234567890'
      });
      await admin.save();
      console.log('✅ Admin user created');
    } else {
      console.log('✅ Admin user already exists');
    }
  } catch (error) {
    console.error('Error creating admin:', error);
  }
};

// Seed dishes
const seedDishes = async () => {
  try {
    // Clear existing dishes
    await Dish.deleteMany({});
    console.log('🗑️  Cleared existing dishes');

    // Create admin user first
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      await createAdmin();
    }

    // Add dishes
    const dishesWithAdmin = sampleDishes.map(dish => ({
      ...dish,
      createdBy: admin._id
    }));

    await Dish.insertMany(dishesWithAdmin);
    console.log('✅ Sample dishes added successfully');
  } catch (error) {
    console.error('Error seeding dishes:', error);
  }
};

// Main function
const seed = async () => {
  await connectDB();
  await seedDishes();
  console.log('🎉 Database seeded successfully!');
  process.exit(0);
};

seed();
