//domains/old-gold/old-gold.model.js
import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

const OldGold = sequelize.define('OldGold', {
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
  customer_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  description: {
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
  price_per_gram: {
    type: DataTypes.DECIMAL(15, 3),
    allowNull: false
  },
  total_amount: {
    type: DataTypes.DECIMAL(15, 3),
    allowNull: false
  },
  image_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('In Stock', 'Sent to Melting', 'Sold as Scrap'),
    defaultValue: 'In Stock'
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'old_gold_purchases',
  underscored: true,
  timestamps: true
});

export default OldGold;