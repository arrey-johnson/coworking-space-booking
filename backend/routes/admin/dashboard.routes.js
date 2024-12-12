const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const db = require('../../models');
const { authJwt } = require('../../middleware');

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized: Admin access required' });
  }
  next();
};

// Get dashboard statistics
router.get('/stats', [authJwt.verifyToken, authJwt.isAdmin], async (req, res) => {
  try {
    // Get total users
    const totalUsers = await db.users.count();

    // Get total spaces
    const totalSpaces = await db.workspaces.count();

    // Get active bookings
    const activeBookings = await db.bookings.count({
      where: {
        status: 'confirmed',
        endTime: {
          [Op.gte]: new Date()
        }
      }
    });

    // Get total revenue
    const totalRevenue = await db.payments.sum('amount', {
      where: {
        status: 'succeeded'
      }
    });

    res.json({
      totalUsers,
      totalSpaces,
      activeBookings,
      totalRevenue: totalRevenue || 0
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Error fetching dashboard statistics' });
  }
});

// Get revenue data
router.get('/revenue', [authJwt.verifyToken, authJwt.isAdmin], async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case 'daily':
        startDate.setDate(startDate.getDate() - 7); // Last 7 days
        break;
      case 'weekly':
        startDate.setDate(startDate.getDate() - 30); // Last 30 days
        break;
      case 'monthly':
        startDate.setMonth(startDate.getMonth() - 12); // Last 12 months
        break;
      case 'yearly':
        startDate.setFullYear(startDate.getFullYear() - 5); // Last 5 years
        break;
      default:
        startDate.setDate(startDate.getDate() - 30); // Default to last 30 days
    }

    const revenueData = await db.payments.findAll({
      attributes: [
        [db.sequelize.fn('DATE', db.sequelize.col('createdAt')), 'date'],
        [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'amount']
      ],
      where: {
        status: 'succeeded',
        createdAt: {
          [Op.between]: [startDate, now]
        }
      },
      group: [db.sequelize.fn('DATE', db.sequelize.col('createdAt'))],
      order: [[db.sequelize.fn('DATE', db.sequelize.col('createdAt')), 'ASC']]
    });

    res.json(revenueData);
  } catch (error) {
    console.error('Error fetching revenue data:', error);
    res.status(500).json({ message: 'Error fetching revenue data' });
  }
});

// Get space utilization
router.get('/space-utilization', [authJwt.verifyToken, authJwt.isAdmin], async (req, res) => {
  try {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const utilizationData = await db.bookings.findAll({
      attributes: [
        [db.sequelize.fn('DATE', db.sequelize.col('startTime')), 'date'],
        [db.sequelize.fn('COUNT', '*'), 'bookings']
      ],
      where: {
        status: 'confirmed',
        startTime: {
          [Op.between]: [weekAgo, now]
        }
      },
      group: [db.sequelize.fn('DATE', db.sequelize.col('startTime'))],
      order: [[db.sequelize.fn('DATE', db.sequelize.col('startTime')), 'ASC']]
    });

    const totalSpaces = await db.workspaces.count();
    const utilization = utilizationData.map(data => ({
      date: data.get('date'),
      rate: (data.get('bookings') * 100) / totalSpaces
    }));

    res.json(utilization);
  } catch (error) {
    console.error('Error fetching space utilization:', error);
    res.status(500).json({ message: 'Error fetching space utilization data' });
  }
});

// Get recent bookings
router.get('/recent-bookings', [authJwt.verifyToken, authJwt.isAdmin], async (req, res) => {
  try {
    const recentBookings = await db.bookings.findAll({
      limit: 5,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: db.users,
          attributes: ['firstName', 'lastName', 'email']
        },
        {
          model: db.workspaces,
          attributes: ['name', 'type']
        }
      ]
    });

    res.json(recentBookings);
  } catch (error) {
    console.error('Error fetching recent bookings:', error);
    res.status(500).json({ message: 'Error fetching recent bookings' });
  }
});

// Get recent activities
router.get('/activities', [authJwt.verifyToken, authJwt.isAdmin], async (req, res) => {
  try {
    const activities = await db.activities.findAll({
      order: [['createdAt', 'DESC']],
      limit: 10,
      include: [{
        model: db.users,
        attributes: ['username']
      }]
    });

    res.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ message: 'Error fetching activities' });
  }
});

// Get user statistics
router.get('/users/stats', [authJwt.verifyToken, authJwt.isAdmin], async (req, res) => {
  try {
    const totalUsers = await db.users.count();
    const usersByRole = await db.users.findAll({
      attributes: ['role', [db.sequelize.fn('COUNT', '*'), 'count']],
      group: ['role']
    });
    const usersByMembership = await db.users.findAll({
      attributes: ['membershipType', [db.sequelize.fn('COUNT', '*'), 'count']],
      group: ['membershipType']
    });
    const activeUsers = await db.users.count({ where: { status: 'active' } });

    res.json({
      totalUsers,
      usersByRole,
      usersByMembership,
      activeUsers
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ message: 'Error fetching user statistics' });
  }
});

// Get booking statistics
router.get('/bookings/stats', [authJwt.verifyToken, authJwt.isAdmin], async (req, res) => {
  try {
    const totalBookings = await db.bookings.count();
    const activeBookings = await db.bookings.count({
      where: {
        status: 'active',
        endTime: {
          [Op.gte]: new Date()
        }
      }
    });
    const bookingsByWorkspace = await db.bookings.findAll({
      attributes: [
        'workspaceId',
        [db.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['workspaceId'],
      include: [{
        model: db.workspaces,
        attributes: ['name']
      }]
    });

    res.json({
      totalBookings,
      activeBookings,
      bookingsByWorkspace
    });
  } catch (error) {
    console.error('Error fetching booking stats:', error);
    res.status(500).json({ message: 'Error fetching booking statistics' });
  }
});

// Analytics endpoint
router.get('/analytics', [authJwt.verifyToken], async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    console.log('Fetching analytics for date range:', { startDate, endDate });

    // Get total number of spaces
    const totalSpaces = await db.workspaces.count();

    // Get available spaces
    const availableSpaces = await db.workspaces.count({
      where: {
        isAvailable: true
      }
    });

    // Get total bookings in date range
    const totalBookings = await db.bookings.count({
      where: {
        createdAt: {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        }
      }
    });

    // Get total revenue in date range
    const bookings = await db.bookings.findAll({
      where: {
        createdAt: {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        },
        status: 'completed'
      },
      attributes: [
        [db.sequelize.fn('SUM', db.sequelize.col('totalAmount')), 'totalRevenue']
      ],
      raw: true
    });

    // Get popular spaces (most booked)
    const popularSpaces = await db.bookings.findAll({
      where: {
        createdAt: {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        }
      },
      attributes: [
        'workspaceId',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'bookingCount']
      ],
      include: [{
        model: db.workspaces,
        attributes: ['name', 'type']
      }],
      group: ['workspaceId', 'workspace.id', 'workspace.name', 'workspace.type'],
      order: [[db.sequelize.fn('COUNT', db.sequelize.col('id')), 'DESC']],
      limit: 5,
      raw: true,
      nest: true
    });

    // Get recent bookings
    const recentBookings = await db.bookings.findAll({
      where: {
        createdAt: {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        }
      },
      include: [
        {
          model: db.workspaces,
          attributes: ['name', 'type']
        },
        {
          model: db.users,
          attributes: ['username', 'email']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    const analyticsData = {
      totalSpaces,
      availableSpaces,
      totalBookings,
      totalRevenue: bookings[0]?.totalRevenue || 0,
      popularSpaces: popularSpaces.map(space => ({
        id: space.workspaceId,
        name: space.workspace.name,
        type: space.workspace.type,
        bookingCount: parseInt(space.bookingCount)
      })),
      recentBookings: recentBookings.map(booking => ({
        id: booking.id,
        workspace: booking.workspace.name,
        user: booking.user.username,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status,
        totalAmount: booking.totalAmount
      }))
    };

    console.log('Analytics data:', analyticsData);
    res.json(analyticsData);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ 
      message: 'Error fetching analytics data', 
      error: error.message 
    });
  }
});

// Space Management Routes
// Get all spaces
router.get('/spaces', [authJwt.verifyToken, authJwt.isAdmin], async (req, res) => {
  try {
    const spaces = await db.spaces.findAll({
      include: [{
        model: db.bookings,
        as: 'bookings',
        attributes: ['id', 'startTime', 'endTime', 'status'],
        include: [{
          model: db.users,
          as: 'user',
          attributes: ['id', 'username', 'email']
        }]
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json(spaces);
  } catch (error) {
    console.error('Error fetching spaces:', error);
    res.status(500).json({ 
      message: 'Error fetching spaces',
      error: error.message 
    });
  }
});

// Create a new space
router.post('/spaces', [authJwt.verifyToken, authJwt.isAdmin], async (req, res) => {
  try {
    const {
      name,
      type,
      capacity,
      hourlyRate,
      description,
      amenities,
      location,
      imageUrl
    } = req.body;

    // Validate space type
    const validTypes = ['desk', 'office', 'meeting_room', 'conference_room'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        message: 'Invalid space type. Must be one of: ' + validTypes.join(', ') 
      });
    }

    const space = await db.spaces.create({
      name,
      type,
      capacity,
      hourlyRate,
      description,
      amenities,
      status: 'available',
      location,
      imageUrl
    });

    res.status(201).json(space);
  } catch (error) {
    console.error('Error creating space:', error);
    res.status(500).json({ 
      message: 'Error creating space',
      error: error.message 
    });
  }
});

// Update a space
router.put('/spaces/:id', [authJwt.verifyToken, authJwt.isAdmin], async (req, res) => {
  try {
    const spaceId = req.params.id;
    const {
      name,
      type,
      capacity,
      hourlyRate,
      description,
      amenities,
      status,
      location,
      imageUrl
    } = req.body;

    const space = await db.spaces.findByPk(spaceId);
    if (!space) {
      return res.status(404).json({ message: 'Space not found' });
    }

    // Validate space type if provided
    if (type) {
      const validTypes = ['desk', 'office', 'meeting_room', 'conference_room'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ 
          message: 'Invalid space type. Must be one of: ' + validTypes.join(', ') 
        });
      }
    }

    await space.update({
      name,
      type,
      capacity,
      hourlyRate,
      description,
      amenities,
      status,
      location,
      imageUrl
    });

    res.json(space);
  } catch (error) {
    console.error('Error updating space:', error);
    res.status(500).json({ 
      message: 'Error updating space',
      error: error.message 
    });
  }
});

// Delete a space
router.delete('/spaces/:id', [authJwt.verifyToken, authJwt.isAdmin], async (req, res) => {
  try {
    const spaceId = req.params.id;
    
    const space = await db.spaces.findByPk(spaceId);
    if (!space) {
      return res.status(404).json({ message: 'Space not found' });
    }

    // Check if space has any active bookings
    const activeBookings = await db.bookings.count({
      where: {
        spaceId,
        status: 'confirmed',
        endTime: {
          [Op.gte]: new Date()
        }
      }
    });

    if (activeBookings > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete space with active bookings' 
      });
    }

    await space.destroy();
    res.json({ message: 'Space deleted successfully' });
  } catch (error) {
    console.error('Error deleting space:', error);
    res.status(500).json({ 
      message: 'Error deleting space',
      error: error.message 
    });
  }
});

module.exports = router;
