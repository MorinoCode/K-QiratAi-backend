//domains/sote.branch.model.js
import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

const Branch = sequelize.define('Branch', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  is_main: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  manager_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'branches',
  underscored: true,
  timestamps: true
});

export default Branch;