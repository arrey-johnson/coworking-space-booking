const express = require('express');
const router = express.Router();
const db = require('../../models');
const { Payment, User, Booking } = db;
const authMiddleware = require('../../middleware/auth.middleware');
const adminMiddleware = require('../../middleware/admin.middleware');
const stripeService = require('../../services/stripe.service');

// Get all payments with pagination and filters
router.get('/', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      paymentMethod,
      startDate,
      endDate,
    } = req.query;

    const where = {};
    if (status) where.status = status;
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const payments = await Payment.findAndCountAll({
      where,
      include: [{
        model: User,
        attributes: ['id', 'email', 'username']
      }, {
        model: Booking,
        attributes: ['id', 'startTime', 'endTime', 'status']
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (page - 1) * limit
    });

    res.json({
      payments: payments.rows,
      total: payments.count,
      totalPages: Math.ceil(payments.count / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ message: 'Error fetching payments' });
  }
});

// Get payment statistics
router.get('/stats', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateRange = {
      [Op.between]: [
        startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1)),
        endDate ? new Date(endDate) : new Date()
      ]
    };

    // Total revenue
    const totalRevenue = await Payment.sum('amount', {
      where: {
        status: 'paid',
        createdAt: dateRange
      }
    });

    // Payment method distribution
    const methodStats = await Payment.findAll({
      attributes: [
        'paymentMethod',
        [db.sequelize.fn('COUNT', '*'), 'count'],
        [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total']
      ],
      where: {
        status: 'paid',
        createdAt: dateRange
      },
      group: ['paymentMethod']
    });

    // Daily revenue
    const dailyRevenue = await Payment.findAll({
      attributes: [
        [db.sequelize.fn('DATE', db.sequelize.col('createdAt')), 'date'],
        [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'revenue']
      ],
      where: {
        status: 'paid',
        createdAt: dateRange
      },
      group: [db.sequelize.fn('DATE', db.sequelize.col('createdAt'))],
      order: [[db.sequelize.fn('DATE', db.sequelize.col('createdAt')), 'ASC']]
    });

    res.json({
      totalRevenue,
      methodStats,
      dailyRevenue
    });
  } catch (error) {
    console.error('Error fetching payment statistics:', error);
    res.status(500).json({ message: 'Error fetching payment statistics' });
  }
});

// Mark cash payment as paid
router.post('/:id/mark-paid', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const payment = await Payment.findByPk(req.params.id, {
      include: [{ model: Booking }]
    });

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.paymentMethod !== 'cash') {
      return res.status(400).json({ message: 'Only cash payments can be marked as paid' });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ message: 'Payment is not in pending status' });
    }

    await db.sequelize.transaction(async (t) => {
      // Update payment status
      await payment.update({
        status: 'paid',
        paidAt: new Date()
      }, { transaction: t });

      // Update booking status
      await payment.booking.update({
        status: 'confirmed',
        paymentStatus: 'paid'
      }, { transaction: t });
    });

    res.json({ message: 'Payment marked as paid successfully', payment });
  } catch (error) {
    console.error('Error marking payment as paid:', error);
    res.status(500).json({ message: 'Error marking payment as paid' });
  }
});

// Process refund
router.post('/:id/refund', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const { reason } = req.body;
    const payment = await Payment.findByPk(req.params.id, {
      include: [{ model: Booking }]
    });

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.status !== 'paid') {
      return res.status(400).json({ message: 'Only paid payments can be refunded' });
    }

    await db.sequelize.transaction(async (t) => {
      if (payment.paymentMethod === 'card') {
        // Process Stripe refund
        await stripeService.processRefund(payment);
      }

      // Update payment status
      await payment.update({
        status: 'refunded',
        refundReason: reason,
        refundedAt: new Date()
      }, { transaction: t });

      // Update booking status
      await payment.booking.update({
        status: 'cancelled',
        paymentStatus: 'refunded'
      }, { transaction: t });
    });

    res.json({ message: 'Refund processed successfully', payment });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({ message: 'Error processing refund' });
  }
});

module.exports = router;
