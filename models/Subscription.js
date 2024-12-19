module.exports = (sequelize, DataTypes) => {
  const Subscription = sequelize.define('Subscription', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    renewalPeriodMonths: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    streams: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  });
  return Subscription;
};
