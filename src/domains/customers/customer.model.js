import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

const Customer = sequelize.define('Customer', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  full_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false
  },
  civil_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  nationality: {
    type: DataTypes.STRING,
    defaultValue: 'Kuwaiti'
  },
  gender: {
    type: DataTypes.ENUM('M', 'F'),
    defaultValue: 'M'
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  birth_date: {
    type: DataTypes.STRING,
    allowNull: true
  },
  expiry_date: {
    type: DataTypes.STRING,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('Regular', 'VIP', 'Wholesaler'),
    defaultValue: 'Regular'
  },
  id_card_front_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  id_card_back_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'customers',
  underscored: true,
  timestamps: true
});

export default Customer;