const express = require('express');
const router = express.Router();
const db = require('../models');
const Booking = db.bookings;
const Workspace = db.workspaces;
const User = db.users;
const { authJwt } = require('../middleware');
const { Op } = require('sequelize');
const emailService = require('../services/email.service');
const stripeService = require('../services/stripe.service');

// Create a new booking
router.post('/create', [authJwt.verifyToken], async (req, res) => {
  try {
    const { workspaceId, startTime, endTime, notes, paymentMethod, paymentStatus } = req.body;
    const userId = req.userId;

    // Validate input
    if (!workspaceId || !startTime || !endTime) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if workspace exists
    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Validate booking times
    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    if (start < now) {
      return res.status(400).json({ message: 'Cannot book in the past' });
    }

    if (end <= start) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

    // Check if workspace is available for the requested time
    const conflictingBookings = await Booking.findOne({
      where: {
        workspaceId,
        status: 'confirmed',
        [Op.or]: [
          {
            startTime: {
              [Op.between]: [startTime, endTime],
            },
          },
          {
            endTime: {
              [Op.between]: [startTime, endTime],
            },
          },
          {
            [Op.and]: [
              { startTime: { [Op.lte]: startTime } },
              { endTime: { [Op.gte]: endTime } },
            ],
          },
        ],
      },
    });

    if (conflictingBookings) {
      return res.status(400).json({ message: 'Workspace not available for the selected time' });
    }

    // Calculate duration and total amount
    const duration = (end - start) / (1000 * 60 * 60); // in hours
    const totalAmount = duration * workspace.pricePerHour;

    // Create booking with pending status
    const booking = await Booking.create({
      userId,
      workspaceId,
      startTime,
      endTime,
      notes,
      totalAmount,
      status: paymentMethod === 'cash' ? 'pending' : 'confirmed',
      paymentStatus: paymentStatus || 'pending',
      paymentMethod: paymentMethod || 'card'
    });

    // If it's a cash payment, we don't need to create a payment intent
    if (paymentMethod === 'cash') {
      return res.status(201).json({
        message: 'Booking created successfully with pending cash payment',
        booking
      });
    }

    // For card payments, create a payment intent
    const user = await User.findByPk(userId);
    const customer = await stripeService.getOrCreateCustomer(user);
    const session = await stripeService.createCheckoutSession({
      id: booking.id,
      workspace,
      startTime,
      endTime,
      totalAmount
    }, customer);

    // Send booking initiated email
    await emailService.sendBookingInitiated(booking, user, workspace);

    // Get full booking details with workspace info
    const fullBooking = await Booking.findByPk(booking.id, {
      include: [
        {
          model: Workspace,
          attributes: ['name', 'type', 'pricePerHour'],
        },
      ],
    });

    res.status(201).json({
      message: 'Booking created successfully',
      booking: fullBooking,
      checkoutSessionId: session.id
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ message: 'Error creating booking', error: error.message });
  }
});

// Get user's bookings
router.get('/my-bookings', [authJwt.verifyToken], async (req, res) => {
  try {
    const bookings = await Booking.findAll({
      where: { userId: req.userId },
      include: [
        {
          model: Workspace,
          attributes: ['name', 'type', 'pricePerHour'],
        },
      ],
      order: [['startTime', 'DESC']],
    });
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ message: 'Error fetching bookings' });
  }
});

// Get single booking
router.get('/:id', [authJwt.verifyToken], async (req, res) => {
  try {
    const booking = await Booking.findOne({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
      include: [
        {
          model: Workspace,
          attributes: ['name', 'type', 'pricePerHour', 'amenities'],
        },
      ],
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ message: 'Error fetching booking' });
  }
});

// Modify booking
router.put('/:id', [authJwt.verifyToken], async (req, res) => {
  try {
    const { startTime, endTime, notes, isRecurring, recurringEndDate, recurringDays } = req.body;
    const bookingId = req.params.id;
    const userId = req.userId;

    const booking = await Booking.findOne({
      where: {
        id: bookingId,
        userId,
        status: { [Op.notIn]: ['cancelled'] }
      },
      include: ['workspace']
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found or cannot be modified' });
    }

    // Check if the new time slot is available
    const isAvailable = await checkWorkspaceAvailability(
      booking.workspaceId,
      startTime,
      endTime,
      bookingId // Exclude current booking from availability check
    );

    if (!isAvailable) {
      return res.status(400).json({ message: 'Selected time slot is not available' });
    }

    // Calculate price difference if any
    const oldDuration = (new Date(booking.endTime) - new Date(booking.startTime)) / (1000 * 60 * 60);
    const newDuration = (new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60);
    const priceDifference = (newDuration - oldDuration) * booking.workspace.pricePerHour;

    await db.sequelize.transaction(async (t) => {
      // Update the booking
      await booking.update({
        startTime,
        endTime,
        notes,
        isRecurring,
        recurringEndDate,
        recurringDays,
        totalAmount: booking.totalAmount + priceDifference
      }, { transaction: t });

      // If there's a price difference and it's a card payment, handle the payment adjustment
      if (priceDifference !== 0 && booking.paymentMethod === 'card') {
        if (priceDifference > 0) {
          // Create a new payment intent for the additional amount
          const user = await User.findByPk(userId);
          const customer = await stripeService.getOrCreateCustomer(user);
          await stripeService.createPaymentIntent(priceDifference, customer, booking.id);
        } else {
          // Process partial refund
          await stripeService.processPartialRefund(booking.paymentId, Math.abs(priceDifference));
        }
      }

      // If recurring booking, create additional bookings
      if (isRecurring && recurringEndDate && recurringDays?.length > 0) {
        await createRecurringBookings(
          booking,
          recurringDays,
          new Date(recurringEndDate),
          t
        );
      }
    });

    const updatedBooking = await Booking.findByPk(bookingId, {
      include: ['workspace', 'payment']
    });

    res.json({ message: 'Booking modified successfully', booking: updatedBooking });
  } catch (error) {
    console.error('Error modifying booking:', error);
    res.status(500).json({ message: 'Error modifying booking' });
  }
});

// Cancel booking
router.post('/:id/cancel', [authJwt.verifyToken], async (req, res) => {
  try {
    const { reason } = req.body;
    const bookingId = req.params.id;
    const userId = req.userId;

    const booking = await Booking.findOne({
      where: {
        id: bookingId,
        userId,
        status: { [Op.notIn]: ['cancelled'] }
      },
      include: ['payment']
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found or already cancelled' });
    }

    // Calculate refund amount based on cancellation policy
    const hoursUntilStart = (new Date(booking.startTime) - new Date()) / (1000 * 60 * 60);
    let refundAmount = 0;

    if (hoursUntilStart >= 24) {
      // Full refund if cancelled at least 24 hours in advance
      refundAmount = booking.totalAmount;
    } else if (hoursUntilStart >= 12) {
      // 50% refund if cancelled between 12-24 hours in advance
      refundAmount = booking.totalAmount * 0.5;
    }
    // No refund if cancelled less than 12 hours in advance

    await db.sequelize.transaction(async (t) => {
      // Update booking status
      await booking.update({
        status: 'cancelled',
        cancellationReason: reason,
        cancelledAt: new Date()
      }, { transaction: t });

      // Handle refund if applicable
      if (refundAmount > 0 && booking.payment) {
        if (booking.payment.paymentMethod === 'card') {
          // Process Stripe refund
          await stripeService.processRefund(booking.payment, refundAmount);
        }

        // Update payment status
        await booking.payment.update({
          status: 'refunded',
          refundAmount,
          refundReason: reason,
          refundedAt: new Date()
        }, { transaction: t });
      }

      // Cancel all future recurring bookings if this is part of a series
      if (booking.isRecurring) {
        await Booking.update(
          {
            status: 'cancelled',
            cancellationReason: 'Series cancelled',
            cancelledAt: new Date()
          },
          {
            where: {
              recurringGroupId: booking.recurringGroupId,
              startTime: { [Op.gt]: new Date() }
            },
            transaction: t
          }
        );
      }
    });

    res.json({
      message: 'Booking cancelled successfully',
      refundAmount,
      booking
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ message: 'Error cancelling booking' });
  }
});

// Admin routes
router.get('/admin/all', [authJwt.verifyToken], async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const bookings = await Booking.findAll({
      include: [
        {
          model: Workspace,
          attributes: ['name', 'type', 'pricePerHour'],
        },
        {
          model: User,
          attributes: ['username', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json(bookings);
  } catch (error) {
    console.error('Error fetching all bookings:', error);
    res.status(500).json({ message: 'Error fetching bookings' });
  }
});

module.exports = router;
