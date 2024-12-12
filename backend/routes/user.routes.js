const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const archiver = require('archiver');
const db = require('../models');
const { authJwt } = require('../middleware');
const User = db.users;
const Space = db.spaces;
const Booking = db.bookings;
const Payment = db.payments;
const { sendEmail } = require('../services/notification.service');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/profile-pictures';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniquePrefix = uuidv4();
    cb(null, uniquePrefix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

// Get user profile
router.get('/profile', authJwt.verifyToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ 
      message: 'Error fetching user profile',
      error: error.message 
    });
  }
});

// Update user profile
router.put('/profile', authJwt.verifyToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const {
      username,
      email,
      phoneNumber,
      company,
      billingAddress,
      notificationPreferences
    } = req.body;

    // Validate email uniqueness if changed
    if (email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    // Validate username uniqueness if changed
    if (username !== user.username) {
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser) {
        return res.status(400).json({ message: 'Username already in use' });
      }
    }

    // Update user
    await user.update({
      username,
      email,
      phoneNumber,
      company,
      billingAddress,
      notificationPreferences
    });

    // Return updated user without password
    const updatedUser = await User.findByPk(req.userId, {
      attributes: { exclude: ['password'] }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ 
      message: 'Error updating user profile',
      error: error.message 
    });
  }
});

// Upload profile picture
router.post('/profile/picture', [authJwt.verifyToken, upload.single('profilePicture')], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const user = await User.findByPk(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete old profile picture if it exists
    if (user.profilePicture) {
      const oldPicturePath = path.join(__dirname, '..', user.profilePicture);
      if (fs.existsSync(oldPicturePath)) {
        fs.unlinkSync(oldPicturePath);
      }
    }

    // Update user with new profile picture path
    const profilePicturePath = '/' + req.file.path.replace(/\\/g, '/');
    await user.update({ profilePicture: profilePicturePath });

    res.json({
      message: 'Profile picture uploaded successfully',
      profilePicture: profilePicturePath
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({ 
      message: 'Error uploading profile picture',
      error: error.message 
    });
  }
});

// Security Settings Routes

// Get security settings
router.get('/security', authJwt.verifyToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: ['twoFactorEnabled']
    });
    res.json(user);
  } catch (error) {
    console.error('Error fetching security settings:', error);
    res.status(500).json({ 
      message: 'Error fetching security settings',
      error: error.message 
    });
  }
});

// Change password
router.put('/security/password', authJwt.verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashedPassword });

    // Log the activity
    await logActivity(user.id, 'security', 'Password changed');

    // Send email notification
    await sendEmail(user.email, 'Password Changed', 
      'Your password has been successfully changed. If you did not make this change, please contact support immediately.');

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ 
      message: 'Error changing password',
      error: error.message 
    });
  }
});

// Setup 2FA
router.post('/security/2fa/setup', authJwt.verifyToken, async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({
      name: 'Coworking Space System'
    });

    const user = await User.findByPk(req.userId);
    await user.update({ twoFactorSecret: secret.base32 });

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl
    });
  } catch (error) {
    console.error('Error setting up 2FA:', error);
    res.status(500).json({ 
      message: 'Error setting up two-factor authentication',
      error: error.message 
    });
  }
});

// Verify 2FA
router.post('/security/2fa/verify', authJwt.verifyToken, async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findByPk(req.userId);

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code
    });

    if (!verified) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    await user.update({ twoFactorEnabled: true });
    
    // Log the activity
    await logActivity(user.id, 'security', 'Two-factor authentication enabled');

    res.json({ message: 'Two-factor authentication enabled successfully' });
  } catch (error) {
    console.error('Error verifying 2FA:', error);
    res.status(500).json({ 
      message: 'Error verifying two-factor authentication',
      error: error.message 
    });
  }
});

// Disable 2FA
router.delete('/security/2fa', authJwt.verifyToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    await user.update({
      twoFactorEnabled: false,
      twoFactorSecret: null
    });

    // Log the activity
    await logActivity(user.id, 'security', 'Two-factor authentication disabled');

    res.json({ message: 'Two-factor authentication disabled successfully' });
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    res.status(500).json({ 
      message: 'Error disabling two-factor authentication',
      error: error.message 
    });
  }
});

// Activity Log Routes

// Get user activities
router.get('/activities', authJwt.verifyToken, async (req, res) => {
  try {
    const activities = await db.activities.findAll({
      where: { userId: req.userId },
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    res.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ 
      message: 'Error fetching activity log',
      error: error.message 
    });
  }
});

// Data Management Routes

// Request data export
router.post('/data/export', authJwt.verifyToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    await user.update({ dataExportRequest: new Date() });

    // Start async export process
    exportUserData(user);

    res.json({ message: 'Data export request submitted successfully' });
  } catch (error) {
    console.error('Error requesting data export:', error);
    res.status(500).json({ 
      message: 'Error requesting data export',
      error: error.message 
    });
  }
});

// Check export status
router.get('/data/export/status', authJwt.verifyToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    const exportPath = path.join(__dirname, '../exports', `user-${user.id}.zip`);

    if (fs.existsSync(exportPath)) {
      res.json({
        status: 'completed',
        downloadUrl: `/exports/user-${user.id}.zip`
      });
    } else {
      res.json({ status: 'processing' });
    }
  } catch (error) {
    console.error('Error checking export status:', error);
    res.status(500).json({ 
      message: 'Error checking export status',
      error: error.message 
    });
  }
});

// Request account deletion
router.post('/account/delete', authJwt.verifyToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    await user.update({ accountDeletionRequest: new Date() });

    // Log the activity
    await logActivity(user.id, 'account', 'Account deletion requested');

    // Send confirmation email
    await sendEmail(user.email, 'Account Deletion Request',
      'Your account has been scheduled for deletion. It will be permanently deleted in 30 days. ' +
      'You can cancel this request by logging in and visiting your profile settings.');

    res.json({ message: 'Account deletion request submitted successfully' });
  } catch (error) {
    console.error('Error requesting account deletion:', error);
    res.status(500).json({ 
      message: 'Error requesting account deletion',
      error: error.message 
    });
  }
});

// Cancel account deletion
router.delete('/account/delete', authJwt.verifyToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    await user.update({ accountDeletionRequest: null });

    // Log the activity
    await logActivity(user.id, 'account', 'Account deletion request cancelled');

    // Send confirmation email
    await sendEmail(user.email, 'Account Deletion Cancelled',
      'Your account deletion request has been cancelled. Your account will remain active.');

    res.json({ message: 'Account deletion request cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling account deletion:', error);
    res.status(500).json({ 
      message: 'Error cancelling account deletion',
      error: error.message 
    });
  }
});

// Dashboard Routes

// Get dashboard stats
router.get('/dashboard/stats', authJwt.verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    
    console.log('Fetching stats for user:', userId);

    // Get active bookings
    const activeBookings = await db.bookings.count({
      where: {
        userId,
        status: 'active'
      }
    });
    
    console.log('Active bookings:', activeBookings);

    // Calculate total hours used
    const bookings = await db.bookings.findAll({
      where: {
        userId,
        status: ['completed', 'active']
      }
    });
    
    console.log('Found bookings:', bookings.length);

    let totalHours = 0;
    bookings.forEach(booking => {
      const start = new Date(booking.startTime);
      const end = booking.status === 'active' ? new Date() : new Date(booking.endTime);
      const hours = (end - start) / (1000 * 60 * 60);
      totalHours += hours;
    });
    
    console.log('Total hours:', totalHours);

    // Calculate total amount spent
    const totalSpent = await db.payments.sum('amount', {
      where: {
        userId,
        status: 'completed'
      }
    }) || 0;
    
    console.log('Total spent:', totalSpent);

    res.json({
      activeBookings,
      totalHours: Math.round(totalHours * 10) / 10,
      totalSpent
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ 
      message: 'Error fetching dashboard stats',
      error: error.message 
    });
  }
});

// Get recent bookings
router.get('/dashboard/recent-bookings', authJwt.verifyToken, async (req, res) => {
  try {
    console.log('Fetching recent bookings for user:', req.userId);
    
    const recentBookings = await db.bookings.findAll({
      where: {
        userId: req.userId
      },
      include: [
        {
          model: db.spaces,
          as: 'space',
          attributes: ['name', 'type', 'imageUrl']
        },
        {
          model: db.payments,
          as: 'payment',
          attributes: ['amount', 'status']
        }
      ],
      attributes: [
        'id', 
        'startTime', 
        'endTime', 
        'status'
      ],
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    
    console.log('Found recent bookings:', recentBookings.length);
    
    res.json(recentBookings);
  } catch (error) {
    console.error('Error fetching recent bookings:', error);
    res.status(500).json({ 
      message: 'Error fetching recent bookings',
      error: error.message 
    });
  }
});

// Get user bookings
router.get('/bookings', authJwt.verifyToken, async (req, res) => {
  try {
    const bookings = await Booking.findAll({
      where: { userId: req.userId },
      include: [
        {
          model: Space,
          as: 'space',
          attributes: ['id', 'name', 'type', 'location', 'imageUrl']
        },
        {
          model: Payment,
          as: 'payment',
          attributes: ['id', 'amount', 'status', 'paymentMethod']
        }
      ],
      order: [['startTime', 'DESC']]
    });
    
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ 
      message: 'Error fetching bookings',
      error: error.message 
    });
  }
});

// Create a new booking
router.post('/bookings', authJwt.verifyToken, async (req, res) => {
  try {
    const { spaceId, startTime, endTime, numberOfPeople, additionalNotes } = req.body;

    // Validate the space exists and is available
    const space = await Space.findByPk(spaceId);
    if (!space) {
      return res.status(404).json({ message: 'Space not found' });
    }

    // Check if space is already booked for the requested time
    const conflictingBooking = await Booking.findOne({
      where: {
        spaceId,
        [db.Sequelize.Op.or]: [
          {
            startTime: {
              [db.Sequelize.Op.between]: [startTime, endTime]
            }
          },
          {
            endTime: {
              [db.Sequelize.Op.between]: [startTime, endTime]
            }
          }
        ]
      }
    });

    if (conflictingBooking) {
      return res.status(400).json({ message: 'Space is already booked for this time period' });
    }

    // Create the booking
    const booking = await Booking.create({
      userId: req.userId,
      spaceId,
      startTime,
      endTime,
      numberOfPeople,
      additionalNotes,
      status: 'pending'
    });

    // Create a pending payment
    const hours = Math.ceil((new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60));
    const amount = hours * space.hourlyRate;

    await Payment.create({
      bookingId: booking.id,
      userId: req.userId,
      amount,
      status: 'pending'
    });

    // Log the activity
    await logActivity(req.userId, 'booking_created', `Created booking for ${space.name}`);

    // Send confirmation email
    const user = await User.findByPk(req.userId);
    if (user && user.email) {
      await sendEmail(user.email, 'Booking Confirmation', `Your booking for ${space.name} has been confirmed.`);
    }

    res.status(201).json(booking);
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ 
      message: 'Error creating booking',
      error: error.message 
    });
  }
});

// Cancel a booking
router.delete('/bookings/:id', authJwt.verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findOne({
      where: { 
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if booking can be cancelled (e.g., not too close to start time)
    const now = new Date();
    const bookingStart = new Date(booking.startTime);
    const hoursUntilBooking = (bookingStart - now) / (1000 * 60 * 60);

    if (hoursUntilBooking < 24) {
      return res.status(400).json({ 
        message: 'Bookings can only be cancelled at least 24 hours before the start time' 
      });
    }

    // Update booking status
    await booking.update({ status: 'cancelled' });

    // Update related payment
    await Payment.update(
      { status: 'refunded' },
      { where: { bookingId: booking.id } }
    );

    // Log the activity
    await logActivity(req.userId, 'booking_cancelled', `Cancelled booking #${booking.id}`);

    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ 
      message: 'Error cancelling booking',
      error: error.message 
    });
  }
});

// Helper function to log user activity
async function logActivity(userId, type, description) {
  try {
    await db.activities.create({
      userId,
      type,
      description,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

// Helper function to export user data
async function exportUserData(user) {
  try {
    const exportDir = path.join(__dirname, '../exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir);
    }

    const exportPath = path.join(exportDir, `user-${user.id}.zip`);
    const output = fs.createWriteStream(exportPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', async () => {
      // Send email with download link
      await sendEmail(user.email, 'Data Export Ready',
        'Your data export is ready. Please log in to download your data.');
    });

    archive.pipe(output);

    // Add user profile data
    const userData = {
      profile: {
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        company: user.company,
        membershipType: user.membershipType,
        status: user.status,
        billingAddress: user.billingAddress,
        notificationPreferences: user.notificationPreferences
      }
    };
    archive.append(JSON.stringify(userData, null, 2), { name: 'profile.json' });

    // Add bookings
    const bookings = await Booking.findAll({ where: { userId: user.id } });
    archive.append(JSON.stringify(bookings, null, 2), { name: 'bookings.json' });

    // Add payments
    const payments = await Payment.findAll({ where: { userId: user.id } });
    archive.append(JSON.stringify(payments, null, 2), { name: 'payments.json' });

    // Add activity log
    const activities = await db.activities.findAll({ where: { userId: user.id } });
    archive.append(JSON.stringify(activities, null, 2), { name: 'activities.json' });

    await archive.finalize();
  } catch (error) {
    console.error('Error exporting user data:', error);
    await sendEmail(user.email, 'Data Export Failed',
      'We encountered an error while exporting your data. Please try again later.');
  }
}

module.exports = router;
