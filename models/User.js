module.exports = (sequelize, DataTypes) => {
  return sequelize.define('User', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    tags: {
      type: DataTypes.STRING,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('tags');
        return rawValue ? rawValue.split(',') : [];
      },
      set(value) {
        this.setDataValue('tags', Array.isArray(value) ? value.join(',') : value);
      },
    },
    username: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    implayerInfo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    deviceCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    freeUser: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    owner: {
      type: DataTypes.STRING, // Choose STRING or TEXT as needed
      allowNull: true,
    },
  });
};
