import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  full_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.STRING, // Changed from ENUM to STRING to fix Schema Sync issues
    defaultValue: 'sales_man',
    validate: {
      isIn: [['store_owner', 'branch_manager', 'sales_man']]
    }
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'users',
  underscored: true,
  timestamps: true
});

export default User;