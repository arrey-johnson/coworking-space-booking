module.exports = (sequelize, Sequelize) => {
  const Resource = sequelize.define("resource", {
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
      type: Sequelize.ENUM('projector', 'printer', 'whiteboard', 'tv', 'other'),
      allowNull: false
    },
    status: {
      type: Sequelize.ENUM('available', 'in_use', 'maintenance'),
      defaultValue: 'available'
    },
    description: {
      type: Sequelize.TEXT
    }
  });

  return Resource;
};
