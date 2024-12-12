module.exports = (sequelize, Sequelize) => {
  const User = sequelize.define("user", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: Sequelize.STRING,
      unique: true,
      allowNull: false
    },
    email: {
      type: Sequelize.STRING,
      unique: true,
      allowNull: false
    },
    password: {
      type: Sequelize.STRING,
      allowNull: false
    },
    role: {
      type: Sequelize.ENUM('admin', 'member', 'staff'),
      defaultValue: 'member'
    },
    membershipType: {
      type: Sequelize.ENUM('basic', 'premium', 'enterprise'),
      defaultValue: 'basic'
    },
    status: {
      type: Sequelize.ENUM('active', 'inactive', 'suspended'),
      defaultValue: 'active'
    },
    stripeCustomerId: {
      type: Sequelize.STRING,
      unique: true,
      allowNull: true
    },
    phoneNumber: {
      type: Sequelize.STRING,
      allowNull: true
    },
    company: {
      type: Sequelize.STRING,
      allowNull: true
    },
    lastLoginAt: {
      type: Sequelize.DATE,
      allowNull: true
    },
    profilePicture: {
      type: Sequelize.STRING,
      allowNull: true
    },
    billingAddress: {
      type: Sequelize.JSON,
      allowNull: true
    },
    notificationPreferences: {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: {
        emailNotifications: true,
        bookingReminders: true,
        paymentReminders: true,
        promotionalEmails: false
      }
    },
    twoFactorEnabled: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    twoFactorSecret: {
      type: Sequelize.STRING,
      allowNull: true
    },
    lastActivity: {
      type: Sequelize.JSON,
      allowNull: true
    },
    accountDeletionRequest: {
      type: Sequelize.DATE,
      allowNull: true
    },
    dataExportRequest: {
      type: Sequelize.DATE,
      allowNull: true
    }
  });

  return User;
};
