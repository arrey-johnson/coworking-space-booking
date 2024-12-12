const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models');
const { users: User } = db; // Fix the model import
const { sendEmail } = require('../services/notification.service');

exports.register = async (req, res) => {
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

    // Validate role
    const allowedRoles = ['member', 'staff'];
    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({
        message: 'Invalid role selected. Available roles: member, staff'
      });
    }

    // Check if username exists
    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    // Check if email exists
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    // Create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role: role || 'member', // Default to member if no role specified
      phoneNumber,
      company,
      membershipType: membershipType || 'basic', // Default to basic membership
      status: 'active'
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Send welcome email
    try {
      await sendEmail(
        email,
        'Welcome to Coworking Space',
        `Welcome to our coworking space, ${username}! 
        Your account has been successfully created with a ${membershipType || 'basic'} membership.
        You can now log in and start booking spaces.`
      );
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Continue with registration even if email fails
    }

    // Log the registration activity
    try {
      await db.activities.create({
        userId: user.id,
        type: 'account',
        description: 'Account created',
        timestamp: new Date(),
        metadata: {
          role: user.role,
          membershipType: user.membershipType
        }
      });
    } catch (activityError) {
      console.error('Error logging activity:', activityError);
      // Continue with registration even if activity logging fails
    }

    // Return user info and token
    res.status(201).json({
      message: 'Registration successful',
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
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error during registration' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Login attempt for email:', email);

    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    console.log('User found:', {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status
    });

    // Check if user is active
    if (user.status !== 'active') {
      console.log('User account not active. Status:', user.status);
      return res.status(401).json({ message: 'Account is not active' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log('Invalid password for user:', email);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    console.log('Password verified successfully');

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('JWT token generated');

    // Update last login
    try {
      await user.update({ lastLoginAt: new Date() });
    } catch (updateError) {
      console.error('Error updating last login:', updateError);
      // Continue login process even if update fails
    }

    // Log the login activity
    try {
      await db.activities.create({
        userId: user.id,
        type: 'login',
        description: 'User logged in',
        timestamp: new Date()
      });
    } catch (activityError) {
      console.error('Error logging activity:', activityError);
      // Continue login process even if activity logging fails
    }

    // Return user info and token
    res.json({
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

    console.log('Login successful for user:', email);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error during login' });
  }
};
