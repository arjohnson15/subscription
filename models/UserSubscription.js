module.exports = (sequelize, DataTypes) => {
  const UserSubscription = sequelize.define('UserSubscription', {
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    nextRenewalDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  // Define Associations
  UserSubscription.associate = models => {
    UserSubscription.belongsTo(models.User, { foreignKey: 'userId' });
    UserSubscription.belongsTo(models.Subscription, { foreignKey: 'subscriptionId' });
  };

  return UserSubscription;
};
