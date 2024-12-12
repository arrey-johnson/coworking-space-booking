const express = require('express');
const router = express.Router();
const db = require('../models');
const { authJwt } = require('../middleware');
const Space = db.spaces;
const Booking = db.bookings;
const { Op } = require('sequelize');

// Get all space types
router.get('/types', async (req, res) => {
  try {
    const types = [
      {
        id: 'desk',
        name: 'Desk',
        description: 'Individual workspace perfect for focused work',
        icon: 'desk',
        minCapacity: 1,
        maxCapacity: 1,
        priceRange: { min: 5000, max: 10000 }
      },
      {
        id: 'office',
        name: 'Private Office',
        description: 'Private space for teams and small groups',
        icon: 'office',
        minCapacity: 1,
        maxCapacity: 4,
        priceRange: { min: 15000, max: 30000 }
      },
      {
        id: 'meeting_room',
        name: 'Meeting Room',
        description: 'Perfect for team meetings and collaborations',
        icon: 'meeting_room',
        minCapacity: 2,
        maxCapacity: 8,
        priceRange: { min: 20000, max: 40000 }
      },
      {
        id: 'conference_room',
        name: 'Conference Room',
        description: 'Large space for presentations and events',
        icon: 'conference_room',
        minCapacity: 10,
        maxCapacity: 30,
        priceRange: { min: 50000, max: 100000 }
      }
    ];
    res.json(types);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get available spaces
router.get('/available', [authJwt.verifyToken], async (req, res) => {
  try {
    const { spaceType, date, startTime, endTime } = req.query;
    
    // Find all spaces of the requested type
    const spaces = await Space.findAll({
      where: {
        type: spaceType,
        status: 'available'
      }
    });

    // If no date/time specified, return all available spaces
    if (!date || !startTime || !endTime) {
      return res.json(spaces);
    }

    // Check bookings for the requested time period
    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(`${date}T${endTime}`);

    // Get all bookings that overlap with the requested time period
    const bookings = await Booking.findAll({
      where: {
        spaceId: {
          [Op.in]: spaces.map(space => space.id)
        },
        status: 'confirmed',
        [Op.or]: [
          {
            startTime: {
              [Op.between]: [startDateTime, endDateTime]
            }
          },
          {
            endTime: {
              [Op.between]: [startDateTime, endDateTime]
            }
          },
          {
            [Op.and]: [
              {
                startTime: {
                  [Op.lte]: startDateTime
                }
              },
              {
                endTime: {
                  [Op.gte]: endDateTime
                }
              }
            ]
          }
        ]
      }
    });

    // Filter out spaces that have overlapping bookings
    const bookedSpaceIds = bookings.map(booking => booking.spaceId);
    const availableSpaces = spaces.filter(space => !bookedSpaceIds.includes(space.id));

    res.json(availableSpaces);
  } catch (error) {
    console.error('Error finding available spaces:', error);
    res.status(500).json({ 
      message: 'Error finding available spaces',
      error: error.message 
    });
  }
});

// Get space details
router.get('/:id', [authJwt.verifyToken], async (req, res) => {
  try {
    const space = await Space.findByPk(req.params.id, {
      include: [{
        model: Booking,
        as: 'bookings',
        where: {
          status: 'confirmed',
          endTime: {
            [Op.gte]: new Date()
          }
        },
        required: false
      }]
    });

    if (!space) {
      return res.status(404).json({ message: 'Space not found' });
    }

    res.json(space);
  } catch (error) {
    console.error('Error fetching space details:', error);
    res.status(500).json({ 
      message: 'Error fetching space details',
      error: error.message 
    });
  }
});

// Create sample spaces
router.post('/sample', [authJwt.verifyToken, authJwt.isAdmin], async (req, res) => {
  try {
    const sampleSpaces = [
      {
        name: 'Hot Desk 1',
        type: 'desk',
        capacity: 1,
        hourlyRate: 5000,
        description: 'Comfortable individual desk with ergonomic chair',
        amenities: ['power_outlet', 'high_speed_wifi', 'adjustable_chair'],
        status: 'available',
        location: 'Ground Floor',
        imageUrl: 'https://example.com/images/desk1.jpg'
      },
      {
        name: 'Private Office A',
        type: 'office',
        capacity: 4,
        hourlyRate: 15000,
        description: 'Private office space with meeting table',
        amenities: ['power_outlet', 'high_speed_wifi', 'whiteboard', 'tv_screen'],
        status: 'available',
        location: 'First Floor',
        imageUrl: 'https://example.com/images/office1.jpg'
      },
      {
        name: 'Meeting Room 1',
        type: 'meeting_room',
        capacity: 8,
        hourlyRate: 20000,
        description: 'Well-equipped meeting room with presentation facilities',
        amenities: ['power_outlet', 'high_speed_wifi', 'whiteboard', 'projector', 'video_conferencing'],
        status: 'available',
        location: 'Second Floor',
        imageUrl: 'https://example.com/images/meeting1.jpg'
      },
      {
        name: 'Conference Hall',
        type: 'conference_room',
        capacity: 30,
        hourlyRate: 50000,
        description: 'Large conference room for events and presentations',
        amenities: ['power_outlet', 'high_speed_wifi', 'stage', 'projector', 'sound_system', 'video_conferencing'],
        status: 'available',
        location: 'Third Floor',
        imageUrl: 'https://example.com/images/conference1.jpg'
      }
    ];

    const createdSpaces = await Space.bulkCreate(sampleSpaces);
    res.status(201).json({
      message: 'Sample spaces created successfully',
      spaces: createdSpaces
    });
  } catch (error) {
    console.error('Error creating sample spaces:', error);
    res.status(500).json({ 
      message: 'Error creating sample spaces',
      error: error.message 
    });
  }
});

// Get all spaces
router.get('/', [authJwt.verifyToken], async (req, res) => {
  try {
    const spaces = await Space.findAll({
      attributes: ['id', 'name', 'type', 'capacity', 'hourlyRate', 'description', 'amenities', 'status', 'location', 'imageUrl']
    });
    res.json(spaces);
  } catch (error) {
    console.error('Error fetching spaces:', error);
    res.status(500).json({ 
      message: 'Error fetching spaces',
      error: error.message 
    });
  }
});

module.exports = router;
