module.exports = (sequelize, Sequelize) => {
  const Payment = sequelize.define("payments", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    amount: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false
    },
    status: {
      type: Sequelize.ENUM('pending', 'completed', 'failed', 'refunded'),
      defaultValue: 'pending'
    },
    paymentMethod: {
      type: Sequelize.ENUM('card', 'cash'),
      allowNull: false
    },
    stripePaymentId: {
      type: Sequelize.STRING,
      unique: true,
      allowNull: true
    },
    refundId: {
      type: Sequelize.STRING,
      unique: true,
      allowNull: true
    },
    refundedAt: {
      type: Sequelize.DATE,
      allowNull: true
    },
    refundReason: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    paidAt: {
      type: Sequelize.DATE,
      allowNull: true
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    metadata: {
      type: Sequelize.JSON,
      allowNull: true
    },
    currency: {
      type: Sequelize.STRING(3),
      defaultValue: 'USD'
    }
  }, {
    tableName: 'payments'
  });

  Payment.associate = (models) => {
    Payment.belongsTo(models.users, {
      foreignKey: 'userId',
      as: 'user'
    });
    Payment.belongsTo(models.bookings, {
      foreignKey: 'bookingId',
      as: 'booking'
    });
  };

  return Payment;
};
