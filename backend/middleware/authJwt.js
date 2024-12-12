const jwt = require('jsonwebtoken');
const db = require('../models');
const User = db.users;

const verifyToken = async (req, res, next) => {
  try {
    let token = req.headers['x-access-token'] || req.headers['authorization'];

    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ message: 'No token provided' });
    }

    // Remove Bearer from string
    if (token.startsWith('Bearer ')) {
      token = token.slice(7, token.length);
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token decoded:', decoded);

      // Get user from database
      const user = await User.findByPk(decoded.id);
      if (!user) {
        console.log('User not found:', decoded.id);
        return res.status(401).json({ message: 'User not found' });
      }

      if (user.status !== 'active') {
        console.log('User account is not active:', user.id);
        return res.status(401).json({ message: 'Account is not active' });
      }

      // Attach user info to request
      req.userId = user.id;
      req.userRole = user.role;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        console.log('Token expired');
        return res.status(401).json({ message: 'Token expired' });
      }
      if (error.name === 'JsonWebTokenError') {
        console.log('Invalid token');
        return res.status(401).json({ message: 'Invalid token' });
      }
      throw error;
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      message: 'Error authenticating user',
      error: error.message 
    });
  }
};

const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) {
      console.log('User not found:', req.userId);
      return res.status(401).json({ message: 'User not found' });
    }

    if (user.role !== 'admin') {
      console.log('Access denied. User role:', user.role);
      return res.status(403).json({ 
        message: 'Access denied. Admin role required.' 
      });
    }
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ 
      message: 'Error checking admin status',
      error: error.message 
    });
  }
};

module.exports = {
  verifyToken,
  isAdmin
};
