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
    allowNull: true
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
  store_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  id_card_image: {
    type: DataTypes.BLOB('long'),
    allowNull: true
  },
  id_card_mime_type: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'customers',
  underscored: true,
  timestamps: true
});

export default Customer;