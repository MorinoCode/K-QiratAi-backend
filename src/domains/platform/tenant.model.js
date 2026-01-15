//domains/platform/tenant.model.js

import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

const Tenant = sequelize.define('Tenant', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  db_schema: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  owner_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false
  },
  subscription_status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended'),
    defaultValue: 'active'
  },
  subscription_expires_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'tenants',
  schema: 'public',
  underscored: true,
  timestamps: true
});

export default Tenant;