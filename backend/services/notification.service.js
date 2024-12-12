const nodemailer = require('nodemailer');
const { format } = require('date-fns');
const config = require('../config/email.config');

class NotificationService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_SECURE,
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS
      }
    });
  }

  async sendBookingConfirmation(booking, user, workspace) {
    const mailOptions = {
      from: config.FROM_EMAIL,
      to: user.email,
      subject: 'Booking Confirmation - Coworking Space',
      html: `
        <h2>Booking Confirmation</h2>
        <p>Dear ${user.username},</p>
        <p>Your booking has been confirmed. Here are the details:</p>
        <ul>
          <li>Workspace: ${workspace.name}</li>
          <li>Date: ${format(new Date(booking.startTime), 'MMMM dd, yyyy')}</li>
          <li>Time: ${format(new Date(booking.startTime), 'HH:mm')} - ${format(new Date(booking.endTime), 'HH:mm')}</li>
          <li>Total Amount: $${booking.totalAmount}</li>
          <li>Payment Status: ${booking.paymentStatus}</li>
        </ul>
        ${booking.paymentMethod === 'cash' ? '<p><strong>Please remember to pay at the location before your booking starts.</strong></p>' : ''}
        <p>Thank you for choosing our coworking space!</p>
      `
    };

    return this.transporter.sendMail(mailOptions);
  }

  async sendPaymentReminder(booking, user, workspace) {
    const mailOptions = {
      from: config.FROM_EMAIL,
      to: user.email,
      subject: 'Payment Reminder - Coworking Space Booking',
      html: `
        <h2>Payment Reminder</h2>
        <p>Dear ${user.username},</p>
        <p>This is a reminder that payment is pending for your upcoming booking:</p>
        <ul>
          <li>Workspace: ${workspace.name}</li>
          <li>Date: ${format(new Date(booking.startTime), 'MMMM dd, yyyy')}</li>
          <li>Time: ${format(new Date(booking.startTime), 'HH:mm')} - ${format(new Date(booking.endTime), 'HH:mm')}</li>
          <li>Amount Due: $${booking.totalAmount}</li>
        </ul>
        <p>Please ensure payment is made before your booking starts to avoid cancellation.</p>
      `
    };

    return this.transporter.sendMail(mailOptions);
  }

  async sendBookingReminder(booking, user, workspace) {
    const mailOptions = {
      from: config.FROM_EMAIL,
      to: user.email,
      subject: 'Upcoming Booking Reminder - Coworking Space',
      html: `
        <h2>Upcoming Booking Reminder</h2>
        <p>Dear ${user.username},</p>
        <p>This is a reminder of your upcoming booking:</p>
        <ul>
          <li>Workspace: ${workspace.name}</li>
          <li>Date: ${format(new Date(booking.startTime), 'MMMM dd, yyyy')}</li>
          <li>Time: ${format(new Date(booking.startTime), 'HH:mm')} - ${format(new Date(booking.endTime), 'HH:mm')}</li>
        </ul>
        <p>We look forward to seeing you!</p>
      `
    };

    return this.transporter.sendMail(mailOptions);
  }

  async sendModificationConfirmation(booking, user, workspace, changes) {
    const mailOptions = {
      from: config.FROM_EMAIL,
      to: user.email,
      subject: 'Booking Modification Confirmation - Coworking Space',
      html: `
        <h2>Booking Modification Confirmation</h2>
        <p>Dear ${user.username},</p>
        <p>Your booking has been modified. Here are the updated details:</p>
        <ul>
          <li>Workspace: ${workspace.name}</li>
          <li>New Date: ${format(new Date(booking.startTime), 'MMMM dd, yyyy')}</li>
          <li>New Time: ${format(new Date(booking.startTime), 'HH:mm')} - ${format(new Date(booking.endTime), 'HH:mm')}</li>
          <li>Total Amount: $${booking.totalAmount}</li>
        </ul>
        ${changes.priceDifference > 0 
          ? `<p>Additional payment of $${changes.priceDifference} is required.</p>` 
          : changes.priceDifference < 0 
            ? `<p>A refund of $${Math.abs(changes.priceDifference)} will be processed.</p>`
            : ''
        }
      `
    };

    return this.transporter.sendMail(mailOptions);
  }

  async sendCancellationConfirmation(booking, user, workspace, refundAmount) {
    const mailOptions = {
      from: config.FROM_EMAIL,
      to: user.email,
      subject: 'Booking Cancellation Confirmation - Coworking Space',
      html: `
        <h2>Booking Cancellation Confirmation</h2>
        <p>Dear ${user.username},</p>
        <p>Your booking has been cancelled:</p>
        <ul>
          <li>Workspace: ${workspace.name}</li>
          <li>Date: ${format(new Date(booking.startTime), 'MMMM dd, yyyy')}</li>
          <li>Time: ${format(new Date(booking.startTime), 'HH:mm')} - ${format(new Date(booking.endTime), 'HH:mm')}</li>
        </ul>
        ${refundAmount > 0 
          ? `<p>A refund of $${refundAmount} will be processed according to our cancellation policy.</p>`
          : '<p>No refund is applicable according to our cancellation policy.</p>'
        }
      `
    };

    return this.transporter.sendMail(mailOptions);
  }

  async sendPaymentReceipt(payment, user, booking, workspace) {
    const mailOptions = {
      from: config.FROM_EMAIL,
      to: user.email,
      subject: 'Payment Receipt - Coworking Space',
      html: `
        <h2>Payment Receipt</h2>
        <p>Dear ${user.username},</p>
        <p>Thank you for your payment. Here are the details:</p>
        <ul>
          <li>Receipt Number: ${payment.id}</li>
          <li>Date: ${format(new Date(payment.createdAt), 'MMMM dd, yyyy')}</li>
          <li>Amount Paid: $${payment.amount}</li>
          <li>Payment Method: ${payment.paymentMethod}</li>
          <li>Booking Details:</li>
          <ul>
            <li>Workspace: ${workspace.name}</li>
            <li>Date: ${format(new Date(booking.startTime), 'MMMM dd, yyyy')}</li>
            <li>Time: ${format(new Date(booking.startTime), 'HH:mm')} - ${format(new Date(booking.endTime), 'HH:mm')}</li>
          </ul>
        </ul>
      `
    };

    return this.transporter.sendMail(mailOptions);
  }

  // Schedule reminders for upcoming bookings
  async scheduleBookingReminders(booking, user, workspace) {
    const bookingTime = new Date(booking.startTime);
    const now = new Date();
    
    // 24 hour reminder
    const reminder24h = new Date(bookingTime);
    reminder24h.setHours(bookingTime.getHours() - 24);
    if (reminder24h > now) {
      setTimeout(() => {
        this.sendBookingReminder(booking, user, workspace);
      }, reminder24h - now);
    }

    // 1 hour reminder
    const reminder1h = new Date(bookingTime);
    reminder1h.setHours(bookingTime.getHours() - 1);
    if (reminder1h > now) {
      setTimeout(() => {
        this.sendBookingReminder(booking, user, workspace);
      }, reminder1h - now);
    }
  }

  // Schedule payment reminders for cash payments
  async schedulePaymentReminders(booking, user, workspace) {
    if (booking.paymentMethod === 'cash' && booking.paymentStatus === 'pending') {
      const bookingTime = new Date(booking.startTime);
      const now = new Date();

      // 48 hour payment reminder
      const reminder48h = new Date(bookingTime);
      reminder48h.setHours(bookingTime.getHours() - 48);
      if (reminder48h > now) {
        setTimeout(() => {
          this.sendPaymentReminder(booking, user, workspace);
        }, reminder48h - now);
      }

      // 24 hour payment reminder
      const reminder24h = new Date(bookingTime);
      reminder24h.setHours(bookingTime.getHours() - 24);
      if (reminder24h > now) {
        setTimeout(() => {
          this.sendPaymentReminder(booking, user, workspace);
        }, reminder24h - now);
      }
    }
  }
}

module.exports = new NotificationService();
