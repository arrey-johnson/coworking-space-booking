require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../models');
const { sequelize } = db;

async function createAdminUser() {
  try {
    // Sync database
    await sequelize.sync();

    // Check if admin already exists
    const existingAdmin = await db.users.findOne({
      where: { email: 'admin@coworking.com' }
    });

    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await db.users.create({
      username: 'admin',
      email: 'admin@coworking.com',
      password: hashedPassword,
      role: 'admin',
      membershipType: 'basic',
      status: 'active'
    });

    console.log('Admin user created successfully:', {
      username: admin.username,
      email: admin.email,
      role: admin.role
    });

    console.log('\nYou can now login with:');
    console.log('Email: admin@coworking.com');
    console.log('Password: admin123');

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    process.exit(0);
  }
}

createAdminUser();
