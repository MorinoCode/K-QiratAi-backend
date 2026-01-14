import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

const GoldPurchase = sequelize.define('GoldPurchase', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  purchase_number: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  customer_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  customer_civil_id: {
    type: DataTypes.STRING(12),
    allowNull: false
  },
  customer_phone: {
    type: DataTypes.STRING
  },
  item_description: {
    type: DataTypes.STRING,
    allowNull: false
  },
  karat: {
    type: DataTypes.STRING,
    allowNull: false
  },
  weight: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false
  },
  price_per_gram_bought: {
    type: DataTypes.DECIMAL(15, 3),
    allowNull: false
  },
  total_paid: {
    type: DataTypes.DECIMAL(15, 3),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('In_Stock', 'Sent_to_Melting', 'Resold'),
    defaultValue: 'In_Stock'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'gold_purchases',
  underscored: true,
  timestamps: true
});

export default GoldPurchase;