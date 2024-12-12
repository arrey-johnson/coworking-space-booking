const express = require('express');
const router = express.Router();
const stripeService = require('../services/stripe.service');
const db = require('../models');
const Booking = db.bookings;
const User = db.users;
const { authJwt } = require('../middleware');

// Create payment intent
router.post('/create-payment-intent', [authJwt.verifyToken], async (req, res) => {
  try {
    const { bookingId } = req.body;
    const userId = req.userId;

    const booking = await Booking.findOne({
      where: {
        id: bookingId,
        userId,
        paymentStatus: 'pending'
      },
      include: ['workspace']
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found or already paid' });
    }

    const user = await User.findByPk(userId);
    const customer = await stripeService.getOrCreateCustomer(user);
    const paymentIntent = await stripeService.createPaymentIntent(
      booking.totalAmount,
      customer,
      booking.id
    );

    res.json({
      clientSecret: paymentIntent.client_secret,
      customerId: customer.id
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ message: 'Error processing payment' });
  }
});

// Create checkout session
router.post('/create-checkout-session', [authJwt.verifyToken], async (req, res) => {
  try {
    const { bookingId } = req.body;
    const userId = req.userId;

    const booking = await Booking.findOne({
      where: {
        id: bookingId,
        userId,
        paymentStatus: 'pending'
      },
      include: ['workspace']
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found or already paid' });
    }

    const user = await User.findByPk(userId);
    const session = await stripeService.createCheckoutSession(booking, user);

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ message: 'Error creating checkout session' });
  }
});

// Get customer payment methods
router.get('/payment-methods', [authJwt.verifyToken], async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user.stripeCustomerId) {
      return res.json({ paymentMethods: [] });
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: 'card'
    });

    res.json({ paymentMethods: paymentMethods.data });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ message: 'Error fetching payment methods' });
  }
});

// Payment webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    await stripeService.handleWebhookEvent(event);
    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook event:', error);
    res.status(500).json({ message: 'Error handling webhook event' });
  }
});

// Get payment history
router.get('/history', [authJwt.verifyToken], async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user.stripeCustomerId) {
      return res.json({ payments: [] });
    }

    const payments = await stripe.paymentIntents.list({
      customer: user.stripeCustomerId,
      limit: 10
    });

    const paymentHistory = await Promise.all(
      payments.data.map(async (payment) => {
        const booking = await Booking.findByPk(payment.metadata.bookingId, {
          include: ['workspace']
        });

        return {
          id: payment.id,
          amount: payment.amount / 100,
          status: payment.status,
          created: payment.created,
          booking: booking ? {
            id: booking.id,
            workspace: booking.workspace.name,
            startTime: booking.startTime,
            endTime: booking.endTime
          } : null
        };
      })
    );

    res.json({ payments: paymentHistory });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ message: 'Error fetching payment history' });
  }
});

// Attach payment method to customer
router.post('/attach-payment-method', [authJwt.verifyToken], async (req, res) => {
  try {
    const { paymentMethodId } = req.body;
    const user = await User.findByPk(req.userId);
    
    if (!user.stripeCustomerId) {
      const customer = await stripeService.getOrCreateCustomer(user);
    }

    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: user.stripeCustomerId,
    });

    // Set as default payment method
    await stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    res.json({ paymentMethod });
  } catch (error) {
    console.error('Error attaching payment method:', error);
    res.status(500).json({ message: 'Error attaching payment method' });
  }
});

// Update payment intent with payment method
router.post('/update-payment-intent', [authJwt.verifyToken], async (req, res) => {
  try {
    const { paymentIntentId, paymentMethodId } = req.body;
    
    const paymentIntent = await stripe.paymentIntents.update(paymentIntentId, {
      payment_method: paymentMethodId
    });

    res.json({ paymentIntent });
  } catch (error) {
    console.error('Error updating payment intent:', error);
    res.status(500).json({ message: 'Error updating payment intent' });
  }
});

module.exports = router;
