const express = require('express');
const router = express.Router();
const db = require('../models');
const { authJwt } = require('../middleware');
const dashboardRoutes = require('./admin/dashboard.routes');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Admin dashboard routes
router.use('/dashboard', dashboardRoutes);

// Get all spaces
router.get('/spaces', [authJwt.verifyToken, authJwt.isAdmin], async (req, res) => {
  try {
    const spaces = await db.workspaces.findAll({
      include: [{
        model: db.amenities,
        through: { attributes: [] },
        as: 'amenities'
      }]
    });

    // Convert isAvailable to boolean and log the data
    const formattedSpaces = spaces.map(space => {
      const spaceData = space.get({ plain: true });
      console.log('Space before formatting:', spaceData);
      return {
        ...spaceData,
        isAvailable: Boolean(spaceData.isAvailable)
      };
    });
    
    console.log('Formatted spaces:', formattedSpaces);
    res.json(formattedSpaces);
  } catch (error) {
    console.error('Error fetching spaces:', error);
    res.status(500).json({ message: 'Error fetching spaces', error: error.message });
  }
});

// Create new space
router.post('/spaces', [authJwt.verifyToken, authJwt.isAdmin], upload.single('image'), async (req, res) => {
  try {
    const { name, type, capacity, hourlyRate, description, amenities } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const space = await db.workspaces.create({
      name,
      type,
      capacity: parseInt(capacity),
      hourlyRate: parseFloat(hourlyRate),
      description,
      imageUrl,
      isAvailable: true
    });

    if (amenities) {
      const amenityList = JSON.parse(amenities);
      await space.setAmenities(amenityList);
    }

    const createdSpace = await db.workspaces.findByPk(space.id, {
      include: [{
        model: db.amenities,
        through: { attributes: [] },
        as: 'amenities'
      }]
    });

    res.status(201).json(createdSpace);
  } catch (error) {
    console.error('Error creating space:', error);
    res.status(500).json({ message: 'Error creating space', error: error.message });
  }
});

// Update space
router.put('/spaces/:id', [authJwt.verifyToken, authJwt.isAdmin], upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, capacity, hourlyRate, description, amenities, isAvailable } = req.body;
    
    const space = await db.workspaces.findByPk(id);
    if (!space) {
      return res.status(404).json({ message: 'Space not found' });
    }

    // Update basic info
    const updateData = {
      name,
      type,
      capacity: parseInt(capacity),
      hourlyRate: parseFloat(hourlyRate),
      description,
      isAvailable: Boolean(isAvailable)
    };

    // Update image if provided
    if (req.file) {
      updateData.imageUrl = `/uploads/${req.file.filename}`;
      
      // Delete old image if exists
      if (space.imageUrl) {
        const oldImagePath = path.join(__dirname, '..', space.imageUrl);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    }

    await space.update(updateData);

    // Update amenities if provided
    if (amenities) {
      const amenityList = JSON.parse(amenities);
      await space.setAmenities(amenityList);
    }

    const updatedSpace = await db.workspaces.findByPk(id, {
      include: [{
        model: db.amenities,
        through: { attributes: [] },
        as: 'amenities'
      }]
    });

    res.json(updatedSpace);
  } catch (error) {
    console.error('Error updating space:', error);
    res.status(500).json({ message: 'Error updating space', error: error.message });
  }
});

// Delete space
router.delete('/spaces/:id', [authJwt.verifyToken, authJwt.isAdmin], async (req, res) => {
  try {
    const { id } = req.params;
    const space = await db.workspaces.findByPk(id);
    
    if (!space) {
      return res.status(404).json({ message: 'Space not found' });
    }

    // Check if space has any active bookings
    const activeBookings = await db.bookings.count({
      where: {
        workspaceId: id,
        status: {
          [Op.in]: ['pending', 'confirmed']
        }
      }
    });

    if (activeBookings > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete space with active bookings' 
      });
    }

    // Delete image if exists
    if (space.imageUrl) {
      const imagePath = path.join(__dirname, '..', space.imageUrl);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await space.destroy();
    res.json({ message: 'Space deleted successfully' });
  } catch (error) {
    console.error('Error deleting space:', error);
    res.status(500).json({ message: 'Error deleting space' });
  }
});

// Get space details
router.get('/spaces/:id', [authJwt.verifyToken, authJwt.isAdmin], async (req, res) => {
  try {
    const { id } = req.params;
    const space = await db.workspaces.findByPk(id, {
      include: [{
        model: db.amenities,
        through: { attributes: [] },
        as: 'amenities'
      }]
    });
    
    if (!space) {
      return res.status(404).json({ message: 'Space not found' });
    }

    res.json(space);
  } catch (error) {
    console.error('Error fetching space details:', error);
    res.status(500).json({ message: 'Error fetching space details' });
  }
});

// Get all payments
router.get('/payments', [authJwt.verifyToken, authJwt.isAdmin], async (req, res) => {
  try {
    const payments = await db.payments.findAll({
      include: [
        {
          model: db.users,
          attributes: ['username', 'email']
        },
        {
          model: db.bookings,
          include: [{
            model: db.workspaces,
            attributes: ['name', 'type']
          }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json({ payments });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ message: 'Error fetching payments' });
  }
});

// Mark payment as paid
router.post('/payments/:id/mark-paid', [authJwt.verifyToken, authJwt.isAdmin], async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await db.payments.findByPk(id);
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    await payment.update({ status: 'succeeded' });

    // Update associated booking if exists
    if (payment.bookingId) {
      await db.bookings.update(
        { status: 'confirmed' },
        { where: { id: payment.bookingId } }
      );
    }

    res.json({ message: 'Payment marked as paid successfully' });
  } catch (error) {
    console.error('Error marking payment as paid:', error);
    res.status(500).json({ message: 'Error marking payment as paid' });
  }
});

// Process refund
router.post('/payments/:id/refund', [authJwt.verifyToken, authJwt.isAdmin], async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const payment = await db.payments.findByPk(id);
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.status !== 'succeeded') {
      return res.status(400).json({ message: 'Only successful payments can be refunded' });
    }

    await payment.update({ 
      status: 'refunded',
      refundReason: reason,
      refundedAt: new Date()
    });

    // Cancel associated booking if exists
    if (payment.bookingId) {
      await db.bookings.update(
        { status: 'cancelled' },
        { where: { id: payment.bookingId } }
      );
    }

    res.json({ message: 'Refund processed successfully' });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({ message: 'Error processing refund' });
  }
});

// Get all bookings
router.get('/bookings', [authJwt.verifyToken, authJwt.isAdmin], async (req, res) => {
  try {
    const bookings = await db.bookings.findAll({
      include: [
        {
          model: db.users,
          attributes: ['username', 'email']
        },
        {
          model: db.workspaces,
          attributes: ['name', 'type']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ message: 'Error fetching bookings' });
  }
});

// Update booking
router.put('/bookings/:id', [authJwt.verifyToken, authJwt.isAdmin], async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await db.bookings.findByPk(id);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    await booking.update(req.body);
    
    const updatedBooking = await db.bookings.findByPk(id, {
      include: [
        {
          model: db.users,
          attributes: ['username', 'email']
        },
        {
          model: db.workspaces,
          attributes: ['name', 'type']
        }
      ]
    });

    res.json(updatedBooking);
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ message: 'Error updating booking' });
  }
});

// Update booking status
router.put('/bookings/:id/status', [authJwt.verifyToken, authJwt.isAdmin], async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const booking = await db.bookings.findByPk(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    await booking.update({ status });
    
    const updatedBooking = await db.bookings.findByPk(id, {
      include: [
        {
          model: db.users,
          attributes: ['username', 'email']
        },
        {
          model: db.workspaces,
          attributes: ['name', 'type']
        }
      ]
    });

    res.json(updatedBooking);
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ message: 'Error updating booking status' });
  }
});

// Get analytics data
router.get('/analytics', [authJwt.verifyToken, authJwt.isAdmin], async (req, res) => {
  try {
    // Get total revenue
    const totalRevenue = await db.payments.sum('amount', {
      where: { status: 'succeeded' }
    });

    // Get total bookings
    const totalBookings = await db.bookings.count();

    // Get active spaces
    const activeSpaces = await db.workspaces.count({
      where: { isAvailable: true }
    });

    // Get booking trends (last 7 days)
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    const bookingTrends = await db.bookings.findAll({
      where: {
        createdAt: {
          [Op.gte]: lastWeek
        }
      },
      attributes: [
        [db.sequelize.fn('DATE', db.sequelize.col('createdAt')), 'date'],
        [db.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: [db.sequelize.fn('DATE', db.sequelize.col('createdAt'))]
    });

    // Get popular spaces
    const popularSpaces = await db.bookings.findAll({
      attributes: [
        'workspaceId',
        [db.sequelize.fn('COUNT', '*'), 'bookingCount']
      ],
      include: [{
        model: db.workspaces,
        attributes: ['name', 'type']
      }],
      group: ['workspaceId'],
      order: [[db.sequelize.fn('COUNT', '*'), 'DESC']],
      limit: 5
    });

    res.json({
      totalRevenue,
      totalBookings,
      activeSpaces,
      bookingTrends,
      popularSpaces
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ 
      message: 'Error fetching analytics data',
      error: error.message 
    });
  }
});

// Get system settings
router.get('/settings', [authJwt.verifyToken, authJwt.isAdmin], async (req, res) => {
  try {
    const settings = await db.settings.findAll();
    res.json({ settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Error fetching settings' });
  }
});

// Update system settings
router.put('/settings', [authJwt.verifyToken, authJwt.isAdmin], async (req, res) => {
  try {
    const { settings } = req.body;
    
    for (const setting of settings) {
      await db.settings.upsert({
        key: setting.key,
        value: setting.value,
        description: setting.description
      });
    }
    
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ message: 'Error updating settings' });
  }
});

// Get all users
router.get('/users', [authJwt.verifyToken, authJwt.isAdmin], async (req, res) => {
  try {
    const users = await db.users.findAll({
      attributes: { exclude: ['password'] },
      include: [{
        model: db.bookings,
        include: [{
          model: db.workspaces,
          attributes: ['name', 'type']
        }]
      }],
      order: [['createdAt', 'DESC']]
    });
    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Update user
router.put('/users/:id', [authJwt.verifyToken, authJwt.isAdmin], async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role, status } = req.body;
    
    const user = await db.users.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    await user.update({
      username,
      email,
      role,
      status
    });
    
    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Error updating user' });
  }
});

// Delete user
router.delete('/users/:id', [authJwt.verifyToken, authJwt.isAdmin], async (req, res) => {
  try {
    const { id } = req.params;
    const user = await db.users.findByPk(id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user has any active bookings
    const activeBookings = await db.bookings.count({
      where: {
        userId: id,
        status: {
          [Op.in]: ['pending', 'confirmed']
        }
      }
    });
    
    if (activeBookings > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete user with active bookings' 
      });
    }
    
    await user.destroy();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Error deleting user' });
  }
});

module.exports = router;
