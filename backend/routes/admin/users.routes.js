const express = require('express');
const router = express.Router();
const db = require('../../models');
const { User } = db;
const authMiddleware = require('../../middleware/auth.middleware');
const adminMiddleware = require('../../middleware/admin.middleware');
const { validateEmail } = require('../../utils/validation');

// Get all users
router.get('/', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Get user by ID
router.get('/:id', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Error fetching user' });
  }
});

// Update user
router.put('/:id', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent updating admin users unless by themselves
    if (user.role === 'admin' && req.user.id !== user.id) {
      return res.status(403).json({ message: 'Cannot modify other admin users' });
    }

    const { username, email, role, membershipType, status } = req.body;

    // Validate email if provided
    if (email && !validateEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Validate role if provided
    const validRoles = ['member', 'staff', 'admin'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Validate membership type if provided
    const validMembershipTypes = ['basic', 'premium', 'enterprise'];
    if (membershipType && !validMembershipTypes.includes(membershipType)) {
      return res.status(400).json({ message: 'Invalid membership type' });
    }

    // Validate status if provided
    const validStatuses = ['active', 'inactive', 'suspended'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Update user
    await user.update({
      username: username || user.username,
      email: email || user.email,
      role: role || user.role,
      membershipType: membershipType || user.membershipType,
      status: status || user.status
    });

    // Log the activity
    await db.Activity.create({
      userId: req.user.id,
      action: 'UPDATE_USER',
      details: `Updated user ${user.username}`,
      timestamp: new Date()
    });

    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Error updating user' });
  }
});

// Delete user
router.delete('/:id', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting admin users
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot delete admin users' });
    }

    // Check for any active bookings or payments
    const activeBookings = await db.Booking.count({
      where: {
        userId: user.id,
        status: 'active'
      }
    });

    if (activeBookings > 0) {
      return res.status(400).json({
        message: 'Cannot delete user with active bookings'
      });
    }

    // Log the activity before deletion
    await db.Activity.create({
      userId: req.user.id,
      action: 'DELETE_USER',
      details: `Deleted user ${user.username}`,
      timestamp: new Date()
    });

    await user.destroy();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Error deleting user' });
  }
});

// Update user status
router.put('/:id/status', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['active', 'inactive', 'suspended'];
    
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent status changes for admin users unless by themselves
    if (user.role === 'admin' && req.user.id !== user.id) {
      return res.status(403).json({
        message: 'Cannot modify status of other admin users'
      });
    }

    await user.update({ status });

    // Log the activity
    await db.Activity.create({
      userId: req.user.id,
      action: 'UPDATE_USER_STATUS',
      details: `Updated status of user ${user.username} to ${status}`,
      timestamp: new Date()
    });

    res.json({ message: 'User status updated successfully', user });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ message: 'Error updating user status' });
  }
});

module.exports = router;
