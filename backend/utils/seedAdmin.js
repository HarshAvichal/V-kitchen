const User = require('../models/User');

const seedAdmin = async () => {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      return;
    }

    // Create admin user
    const admin = await User.create({
      name: 'V Kitchen Admin',
      email: process.env.ADMIN_EMAIL || 'admin@vkitchen.com',
      phone: '+919876543210',
      password: process.env.ADMIN_PASSWORD || 'admin123',
      role: 'admin'
    });

    console.log('✅ Admin user created successfully');
    console.log(`📧 Email: ${admin.email}`);
    console.log(`🔑 Password: ${process.env.ADMIN_PASSWORD || 'admin123'}`);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  }
};

module.exports = seedAdmin;
