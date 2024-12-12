module.exports = (sequelize, Sequelize) => {
  const Activity = sequelize.define("activity", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    type: {
      type: Sequelize.ENUM('login', 'security', 'payment', 'booking', 'profile_update', 'account'),
      allowNull: false
    },
    description: {
      type: Sequelize.STRING,
      allowNull: false
    },
    timestamp: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW
    },
    metadata: {
      type: Sequelize.JSON,
      allowNull: true
    }
  });

  return Activity;
};
