module.exports = (sequelize, Sequelize) => {
  const Space = sequelize.define("spaces", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    type: {
      type: Sequelize.ENUM('desk', 'office', 'meeting_room', 'conference_room'),
      allowNull: false
    },
    capacity: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    hourlyRate: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false
    },
    description: {
      type: Sequelize.TEXT
    },
    amenities: {
      type: Sequelize.JSON,
      defaultValue: []
    },
    status: {
      type: Sequelize.ENUM('available', 'occupied', 'maintenance'),
      defaultValue: 'available'
    },
    location: {
      type: Sequelize.STRING,
      allowNull: false
    },
    imageUrl: {
      type: Sequelize.STRING
    }
  });

  Space.associate = (models) => {
    Space.hasMany(models.bookings, {
      foreignKey: 'spaceId',
      as: 'bookings'
    });
  };

  return Space;
};
