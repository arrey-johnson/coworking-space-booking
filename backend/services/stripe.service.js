const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../models');
const User = db.user;

class StripeService {
  async createCustomer(user) {
    try {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.username,
        metadata: {
          userId: user.id
        }
      });

      await User.update(
        { stripeCustomerId: customer.id },
        { where: { id: user.id } }
      );

      return customer;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw error;
    }
  }

  async getOrCreateCustomer(user) {
    if (user.stripeCustomerId) {
      return await stripe.customers.retrieve(user.stripeCustomerId);
    }
    return await this.createCustomer(user);
  }

  async createPaymentIntent(amount, customer, bookingId) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        customer: customer.id,
        metadata: {
          bookingId: bookingId
        },
        automatic_payment_methods: {
          enabled: true
        }
      });

      return paymentIntent;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  async createCheckoutSession(bookingDetails, customer) {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer: customer.id,
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Workspace Booking - ${bookingDetails.workspace.name}`,
                description: `Booking from ${new Date(bookingDetails.startTime).toLocaleString()} to ${new Date(bookingDetails.endTime).toLocaleString()}`
              },
              unit_amount: Math.round(bookingDetails.totalAmount * 100)
            },
            quantity: 1
          }
        ],
        metadata: {
          bookingId: bookingDetails.id
        },
        success_url: `${process.env.FRONTEND_URL}/bookings?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/bookings?canceled=true`
      });

      return session;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }

  async handleWebhookEvent(event) {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object);
          break;
        // Add more webhook event handlers as needed
      }
    } catch (error) {
      console.error('Error handling webhook event:', error);
      throw error;
    }
  }

  async handlePaymentSuccess(paymentIntent) {
    const bookingId = paymentIntent.metadata.bookingId;
    // Update booking status to confirmed
    await db.booking.update(
      {
        paymentStatus: 'paid',
        status: 'confirmed'
      },
      {
        where: { id: bookingId }
      }
    );
  }

  async handlePaymentFailure(paymentIntent) {
    const bookingId = paymentIntent.metadata.bookingId;
    // Update booking status to failed
    await db.booking.update(
      {
        paymentStatus: 'failed',
        status: 'cancelled'
      },
      {
        where: { id: bookingId }
      }
    );
  }

  async processRefund(payment) {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: payment.stripePaymentId,
        reason: 'requested_by_customer'
      });
      return refund;
    } catch (error) {
      console.error('Error processing refund:', error);
      throw error;
    }
  }

  async getPaymentDetails(paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ['charges', 'latest_charge', 'payment_method']
      });
      return paymentIntent;
    } catch (error) {
      console.error('Error retrieving payment details:', error);
      throw error;
    }
  }
}

module.exports = new StripeService();
