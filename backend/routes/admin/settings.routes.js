const express = require('express');
const router = express.Router();
const db = require('../../models');
const Settings = db.settings;
const authMiddleware = require('../../middleware/auth.middleware');
const adminMiddleware = require('../../middleware/admin.middleware');

// Initialize default settings if none exist
const initializeSettings = async () => {
  try {
    const count = await Settings.count();
    if (count === 0) {
      await Settings.bulkCreate([
        {
          key: 'workingHours',
          value: JSON.stringify({ start: '09:00', end: '18:00' }),
          description: 'Business working hours'
        },
        {
          key: 'bookingRules',
          value: JSON.stringify({
            maxDurationHours: 8,
            minAdvanceHours: 1,
            maxAdvanceDays: 30
          }),
          description: 'Rules for booking workspaces'
        },
        {
          key: 'notifications',
          value: JSON.stringify({
            emailEnabled: true,
            smsEnabled: false
          }),
          description: 'Notification preferences'
        }
      ]);
    }
  } catch (error) {
    console.error('Error initializing settings:', error);
  }
};

// Initialize settings when the server starts
initializeSettings();

// Get all settings
router.get('/', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const settings = await Settings.findAll();
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Error fetching settings' });
  }
});

// Update settings
router.put('/', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const { settings } = req.body;
    if (!Array.isArray(settings)) {
      return res.status(400).json({ message: 'Settings must be an array' });
    }

    // Update or create each setting
    const updatedSettings = await Promise.all(
      settings.map(async ({ key, value, description }) => {
        const [setting] = await Settings.upsert({
          key,
          value,
          description
        });
        return setting;
      })
    );

    // Log the activity
    await db.activities.create({
      userId: req.user.id,
      type: 'settings',
      description: 'Updated system settings',
      metadata: { updatedKeys: settings.map(s => s.key) }
    });

    res.json(updatedSettings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ message: 'Error updating settings' });
  }
});

module.exports = router;
