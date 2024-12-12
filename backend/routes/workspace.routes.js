const express = require('express');
const router = express.Router();
const db = require('../models');
const Workspace = db.workspaces;
const Booking = db.bookings;
const { authJwt } = require('../middleware');
const { Op } = require('sequelize');

// Get all workspaces
router.get('/', [authJwt.verifyToken], async (req, res) => {
  try {
    const workspaces = await Workspace.findAll({
      where: { status: 'available' },
    });
    res.json(workspaces);
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    res.status(500).json({ message: 'Error fetching workspaces' });
  }
});

// Get single workspace
router.get('/:id', [authJwt.verifyToken], async (req, res) => {
  try {
    const workspace = await Workspace.findByPk(req.params.id);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }
    res.json(workspace);
  } catch (error) {
    console.error('Error fetching workspace:', error);
    res.status(500).json({ message: 'Error fetching workspace' });
  }
});

// Check workspace availability
router.get('/:id/availability', [authJwt.verifyToken], async (req, res) => {
  try {
    const { startTime, endTime } = req.query;
    const workspaceId = req.params.id;

    if (!startTime || !endTime) {
      return res.status(400).json({ 
        message: 'Start time and end time are required' 
      });
    }

    // Validate the workspace exists
    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    const conflictingBookings = await Booking.findAll({
      where: {
        workspaceId,
        status: 'confirmed',
        [Op.or]: [
          {
            startTime: {
              [Op.between]: [startTime, endTime]
            }
          },
          {
            endTime: {
              [Op.between]: [startTime, endTime]
            }
          },
          {
            [Op.and]: [
              {
                startTime: {
                  [Op.lte]: startTime
                }
              },
              {
                endTime: {
                  [Op.gte]: endTime
                }
              }
            ]
          }
        ]
      }
    });

    res.json({
      available: conflictingBookings.length === 0,
      conflictingBookings: conflictingBookings.length
    });
  } catch (error) {
    console.error('Error checking workspace availability:', error);
    res.status(500).json({ 
      message: 'Error checking workspace availability',
      error: error.message 
    });
  }
});

// Admin routes for managing workspaces
router.post('/', [authJwt.verifyToken], async (req, res) => {
  try {
    const { user } = req;
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const workspace = await Workspace.create(req.body);
    res.status(201).json(workspace);
  } catch (error) {
    console.error('Error creating workspace:', error);
    res.status(500).json({ message: 'Error creating workspace', error: error.message });
  }
});

router.put('/:id', [authJwt.verifyToken], async (req, res) => {
  try {
    const { user } = req;
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const workspace = await Workspace.findByPk(req.params.id);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    await workspace.update(req.body);
    res.json(workspace);
  } catch (error) {
    console.error('Error updating workspace:', error);
    res.status(500).json({ message: 'Error updating workspace' });
  }
});

router.delete('/:id', [authJwt.verifyToken], async (req, res) => {
  try {
    const { user } = req;
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const workspace = await Workspace.findByPk(req.params.id);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    await workspace.destroy();
    res.json({ message: 'Workspace deleted successfully' });
  } catch (error) {
    console.error('Error deleting workspace:', error);
    res.status(500).json({ message: 'Error deleting workspace' });
  }
});

module.exports = router;
