const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');

// Initialize Sequelize
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.resolve(__dirname, '../database.sqlite'),
});

const db = {};

// Load Models
fs.readdirSync(__dirname)
  .filter(file => file !== 'index.js' && file.endsWith('.js'))
  .forEach(file => {
    const modelImport = require(path.join(__dirname, file));
    const model = modelImport(sequelize, DataTypes);
    db[model.name] = model;
    console.log(`Loaded model: ${model.name}`);
});

// Define Associations
db.User.hasMany(db.UserSubscription, { foreignKey: 'userId' });
db.UserSubscription.belongsTo(db.User, { foreignKey: 'userId' });

db.Subscription.hasMany(db.UserSubscription, { foreignKey: 'subscriptionId' });
db.UserSubscription.belongsTo(db.Subscription, { foreignKey: 'subscriptionId' });

console.log('Registered models:', Object.keys(db));

// Export Database
db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
