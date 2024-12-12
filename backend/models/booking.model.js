module.exports = (sequelize, Sequelize) => {
  const Booking = sequelize.define("bookings", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    startTime: {
      type: Sequelize.DATE,
      allowNull: false
    },
    endTime: {
      type: Sequelize.DATE,
      allowNull: false
    },
    status: {
      type: Sequelize.ENUM('pending', 'confirmed', 'cancelled', 'completed'),
      defaultValue: 'pending'
    },
    numberOfPeople: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    additionalNotes: {
      type: Sequelize.TEXT
    }
  });

  Booking.associate = (models) => {
    Booking.belongsTo(models.users, {
      foreignKey: 'userId',
      as: 'user'
    });
    
    Booking.belongsTo(models.spaces, {
      foreignKey: 'spaceId',
      as: 'space'
    });

    Booking.hasOne(models.payments, {
      foreignKey: 'bookingId',
      as: 'payment'
    });
  };

  return Booking;
};
