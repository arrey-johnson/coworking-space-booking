const express = require('express');
const router = express.Router();

// Import admin route modules
const paymentRoutes = require('./payment.routes');
const analyticsRoutes = require('./analytics.routes');
const settingsRoutes = require('./settings.routes');

// Register routes
router.use('/payments', paymentRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/settings', settingsRoutes);

module.exports = router;
