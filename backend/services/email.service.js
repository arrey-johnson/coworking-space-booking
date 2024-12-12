const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

const sendBookingInitiated = async (booking, user, workspace) => {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: user.email,
    subject: 'Booking Initiated - Coworking Space',
    html: `
      <h1>Booking Initiated</h1>
      <p>Dear ${user.username},</p>
      <p>Your booking has been initiated and is awaiting payment. Here are the details:</p>
      <ul>
        <li><strong>Workspace:</strong> ${workspace.name}</li>
        <li><strong>Start Time:</strong> ${new Date(booking.startTime).toLocaleString()}</li>
        <li><strong>End Time:</strong> ${new Date(booking.endTime).toLocaleString()}</li>
        <li><strong>Total Amount:</strong> ${formatCurrency(booking.totalAmount)}</li>
      </ul>
      <p>Please complete your payment to confirm the booking.</p>
      <p>Notes: ${booking.notes || 'No notes provided'}</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Booking initiated email sent');
  } catch (error) {
    console.error('Error sending booking initiated email:', error);
  }
};

const sendBookingConfirmation = async (booking, user, workspace) => {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: user.email,
    subject: 'Booking Confirmed - Coworking Space',
    html: `
      <h1>Booking Confirmation</h1>
      <p>Dear ${user.username},</p>
      <p>Your booking has been confirmed. Here are the details:</p>
      <ul>
        <li><strong>Workspace:</strong> ${workspace.name}</li>
        <li><strong>Start Time:</strong> ${new Date(booking.startTime).toLocaleString()}</li>
        <li><strong>End Time:</strong> ${new Date(booking.endTime).toLocaleString()}</li>
        <li><strong>Total Amount Paid:</strong> ${formatCurrency(booking.totalAmount)}</li>
      </ul>
      <p>Notes: ${booking.notes || 'No notes provided'}</p>
      <p>Thank you for choosing our coworking space!</p>
      <p>Need to make changes? You can manage your booking through our website.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Booking confirmation email sent');
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
  }
};

const sendBookingCancellation = async (booking, user, workspace) => {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: user.email,
    subject: 'Booking Cancelled - Coworking Space',
    html: `
      <h1>Booking Cancellation Confirmation</h1>
      <p>Dear ${user.username},</p>
      <p>Your booking has been cancelled. Here are the details:</p>
      <ul>
        <li><strong>Workspace:</strong> ${workspace.name}</li>
        <li><strong>Start Time:</strong> ${new Date(booking.startTime).toLocaleString()}</li>
        <li><strong>End Time:</strong> ${new Date(booking.endTime).toLocaleString()}</li>
      </ul>
      <p>If you have any questions, please contact our support team.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Booking cancellation email sent');
  } catch (error) {
    console.error('Error sending booking cancellation email:', error);
  }
};

const sendPaymentConfirmation = async (booking, user, workspace, paymentDetails) => {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: user.email,
    subject: 'Payment Confirmation - Coworking Space',
    html: `
      <h1>Payment Confirmation</h1>
      <p>Dear ${user.username},</p>
      <p>We have received your payment for the following booking:</p>
      <ul>
        <li><strong>Workspace:</strong> ${workspace.name}</li>
        <li><strong>Start Time:</strong> ${new Date(booking.startTime).toLocaleString()}</li>
        <li><strong>End Time:</strong> ${new Date(booking.endTime).toLocaleString()}</li>
        <li><strong>Amount Paid:</strong> ${formatCurrency(booking.totalAmount)}</li>
        <li><strong>Payment Method:</strong> ${paymentDetails.paymentMethod}</li>
        <li><strong>Transaction ID:</strong> ${paymentDetails.transactionId}</li>
      </ul>
      <p>Thank you for your payment! Your booking is now confirmed.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Payment confirmation email sent');
  } catch (error) {
    console.error('Error sending payment confirmation email:', error);
  }
};

const sendRefundConfirmation = async (booking, user, workspace) => {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: user.email,
    subject: 'Refund Confirmation - Coworking Space',
    html: `
      <h1>Refund Confirmation</h1>
      <p>Dear ${user.username},</p>
      <p>We have processed a refund for your cancelled booking:</p>
      <ul>
        <li><strong>Workspace:</strong> ${workspace.name}</li>
        <li><strong>Original Booking:</strong>
          <ul>
            <li>Start Time: ${new Date(booking.startTime).toLocaleString()}</li>
            <li>End Time: ${new Date(booking.endTime).toLocaleString()}</li>
          </ul>
        </li>
        <li><strong>Refund Amount:</strong> ${formatCurrency(booking.totalAmount)}</li>
      </ul>
      <p>The refund has been initiated and should appear in your account within 5-10 business days.</p>
      <p>If you have any questions about the refund, please contact our support team.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Refund confirmation email sent');
  } catch (error) {
    console.error('Error sending refund confirmation email:', error);
  }
};

const sendPaymentFailure = async (booking, user, workspace, error) => {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: user.email,
    subject: 'Payment Failed - Coworking Space',
    html: `
      <h1>Payment Failed</h1>
      <p>Dear ${user.username},</p>
      <p>We were unable to process your payment for the following booking:</p>
      <ul>
        <li><strong>Workspace:</strong> ${workspace.name}</li>
        <li><strong>Start Time:</strong> ${new Date(booking.startTime).toLocaleString()}</li>
        <li><strong>End Time:</strong> ${new Date(booking.endTime).toLocaleString()}</li>
        <li><strong>Amount:</strong> ${formatCurrency(booking.totalAmount)}</li>
      </ul>
      <p>Reason: ${error.message || 'An error occurred during payment processing'}</p>
      <p>Please try again or use a different payment method. Your booking will remain pending until payment is completed.</p>
      <p>If you continue to experience issues, please contact our support team.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Payment failure email sent');
  } catch (error) {
    console.error('Error sending payment failure email:', error);
  }
};

module.exports = {
  sendBookingInitiated,
  sendBookingConfirmation,
  sendBookingCancellation,
  sendPaymentConfirmation,
  sendRefundConfirmation,
  sendPaymentFailure,
};
