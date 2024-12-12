module.exports = (sequelize, Sequelize) => {
  const Workspace = sequelize.define("workspaces", {
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
      type: Sequelize.ENUM('desk', 'office', 'meeting', 'conference'),
      allowNull: false
    },
    capacity: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    pricePerHour: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false
    },
    isAvailable: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    imageUrl: {
      type: Sequelize.STRING,
      allowNull: true
    }
  }, {
    tableName: 'workspaces',
    timestamps: true
  });

  // Remove the associate method as we're defining associations in index.js
  return Workspace;
};
