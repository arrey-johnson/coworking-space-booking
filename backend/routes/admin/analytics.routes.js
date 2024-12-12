const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const db = require('../../models');
const { Booking, Payment, Workspace, User } = db;
const authMiddleware = require('../../middleware/auth.middleware');
const adminMiddleware = require('../../middleware/admin.middleware');

// Get analytics data
router.get('/', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 7));
    const end = endDate ? new Date(endDate) : new Date();

    // Revenue data
    const revenue = await Payment.findAll({
      attributes: [
        [db.sequelize.fn('DATE', db.sequelize.col('createdAt')), 'date'],
        [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'amount']
      ],
      where: {
        status: 'succeeded',
        createdAt: {
          [Op.between]: [start, end]
        }
      },
      group: [db.sequelize.fn('DATE', db.sequelize.col('createdAt'))],
      order: [[db.sequelize.fn('DATE', db.sequelize.col('createdAt')), 'ASC']]
    });

    // Bookings data
    const bookings = await Booking.findAll({
      attributes: [
        [db.sequelize.fn('DATE', db.sequelize.col('createdAt')), 'date'],
        [db.sequelize.fn('COUNT', '*'), 'count']
      ],
      where: {
        createdAt: {
          [Op.between]: [start, end]
        }
      },
      group: [db.sequelize.fn('DATE', db.sequelize.col('createdAt'))],
      order: [[db.sequelize.fn('DATE', db.sequelize.col('createdAt')), 'ASC']]
    });

    // Space utilization/occupancy
    const occupancyData = await Booking.findAll({
      attributes: [
        [db.sequelize.fn('DATE', db.sequelize.col('startTime')), 'date'],
        [db.sequelize.fn('COUNT', '*'), 'bookings']
      ],
      where: {
        status: 'confirmed',
        startTime: {
          [Op.between]: [start, end]
        }
      },
      group: [db.sequelize.fn('DATE', db.sequelize.col('startTime'))],
      order: [[db.sequelize.fn('DATE', db.sequelize.col('startTime')), 'ASC']]
    });

    // Get total workspaces for occupancy calculation
    const totalWorkspaces = await Workspace.count();

    // Calculate occupancy rate
    const occupancy = occupancyData.map(data => ({
      date: data.dataValues.date,
      rate: Math.min(100, (data.dataValues.bookings * 100) / totalWorkspaces)
    }));

    // Payment methods distribution
    const paymentMethods = await Payment.findAll({
      attributes: [
        'paymentMethod',
        [db.sequelize.fn('COUNT', '*'), 'count'],
        [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total']
      ],
      where: {
        status: 'succeeded',
        createdAt: {
          [Op.between]: [start, end]
        }
      },
      group: ['paymentMethod']
    });

    // Format response data
    const response = {
      revenue: revenue.map(r => ({
        date: r.dataValues.date,
        amount: parseFloat(r.dataValues.amount || 0)
      })),
      bookings: bookings.map(b => ({
        date: b.dataValues.date,
        count: parseInt(b.dataValues.count || 0)
      })),
      occupancy,
      paymentMethods: paymentMethods.map(pm => ({
        name: pm.paymentMethod || 'Other',
        value: parseFloat(pm.dataValues.total || 0),
        count: parseInt(pm.dataValues.count || 0)
      }))
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ 
      message: 'Error fetching analytics data',
      error: error.message 
    });
  }
});

module.exports = router;
