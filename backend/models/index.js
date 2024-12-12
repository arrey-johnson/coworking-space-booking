const Sequelize = require("sequelize");
require('dotenv').config();

let config;
try {
  config = require("../config/db.config.js");
} catch (err) {
  config = {
    HOST: process.env.DB_HOST || "localhost",
    USER: process.env.DB_USER || "root",
    PASSWORD: process.env.DB_PASSWORD || "",
    DB: process.env.DB_NAME || "coworking_db", 
    dialect: "mysql",
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  };
}

const sequelize = new Sequelize(
  config.DB,
  config.USER,
  config.PASSWORD,
  {
    host: config.HOST,
    dialect: config.dialect,
    pool: config.pool,
    logging: console.log
  }
);

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
db.users = require("./user.model.js")(sequelize, Sequelize);
db.workspaces = require("./workspace.model.js")(sequelize, Sequelize);
db.bookings = require("./booking.model.js")(sequelize, Sequelize);
db.payments = require("./payment.model.js")(sequelize, Sequelize);
db.amenities = require("./amenity.model.js")(sequelize, Sequelize);
db.spaces = require("./space.model.js")(sequelize, Sequelize);

// Define associations
db.workspaces.belongsToMany(db.amenities, {
  through: 'workspace_amenities',
  foreignKey: 'workspaceId'
});

db.amenities.belongsToMany(db.workspaces, {
  through: 'workspace_amenities',
  foreignKey: 'amenityId'
});

// User-Booking associations
db.users.hasMany(db.bookings, {
  foreignKey: 'userId',
  as: 'bookings'
});
db.bookings.belongsTo(db.users, {
  foreignKey: 'userId',
  as: 'user'
});

// Workspace-Booking associations
db.workspaces.hasMany(db.bookings, {
  foreignKey: 'workspaceId'
});
db.bookings.belongsTo(db.workspaces, {
  foreignKey: 'workspaceId'
});

// Space-Booking associations
db.spaces.hasMany(db.bookings, {
  foreignKey: 'spaceId',
  as: 'bookings'
});
db.bookings.belongsTo(db.spaces, {
  foreignKey: 'spaceId',
  as: 'space'
});

// Booking-Payment associations
db.bookings.hasOne(db.payments, {
  foreignKey: 'bookingId',
  as: 'payment'
});
db.payments.belongsTo(db.bookings, {
  foreignKey: 'bookingId',
  as: 'booking'
});

// User-Payment associations
db.users.hasMany(db.payments, {
  foreignKey: 'userId',
  as: 'payments'
});
db.payments.belongsTo(db.users, {
  foreignKey: 'userId',
  as: 'user'
});

module.exports = db;
