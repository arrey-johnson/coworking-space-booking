const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models');
const { users: User } = db;
const { sendEmail } = require('../services/notification.service');

// Register
router.post('/register', async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      role,
      phoneNumber,
      company,
      membershipType
    } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({
        message: 'Username, email, and password are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        message: 'Email already registered'
      });
    }

    // Create user
    const hashedPassword = await bcrypt.hash(password, 8);
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role: role || 'member',
      phoneNumber,
      company,
      membershipType: membershipType || 'basic'
    });

    // Generate token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({
      message: 'Error registering user',
      error: err.message
    });
  }
});

// Create admin user if not exists
router.post("/setup-admin", async (req, res) => {
  try {
    const adminUser = await User.findOne({
      where: {
        role: "admin"
      }
    });

    if (adminUser) {
      return res.status(400).json({ message: "Admin user already exists" });
    }

    // Create admin user
    const user = await User.create({
      username: "admin",
      email: "admin@example.com",
      password: bcrypt.hashSync("admin123", 8),
      role: "admin",
      membershipType: "enterprise",
      status: "active"
    });

    res.json({ message: "Admin user created successfully", userId: user.id });
  } catch (error) {
    console.error("Error creating admin user:", error);
    res.status(500).json({ message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt for email:', email);

    // Validate input
    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({
        message: 'Email and password are required'
      });
    }

    // Find user
    const user = await User.findOne({ 
      where: { 
        email,
        status: 'active' // Only allow active users to login
      } 
    });
    
    if (!user) {
      console.log('User not found or inactive:', email);
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.log('Invalid password for user:', email);
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    // Generate token
    const token = jwt.sign(
      { 
        id: user.id, 
        role: user.role,
        email: user.email 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Update last login
    await user.update({
      lastLoginAt: new Date()
    });

    console.log('Login successful for user:', email);

    // Send response
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        membershipType: user.membershipType,
        status: user.status
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Error during login',
      error: error.message
    });
  }
});

module.exports = router;
