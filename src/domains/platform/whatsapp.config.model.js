import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

const WhatsappConfig = sequelize.define('WhatsappConfig', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tenant_slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  is_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  owner_phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  manager_phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  session_status: {
    type: DataTypes.ENUM('DISCONNECTED', 'CONNECTING', 'CONNECTED'),
    defaultValue: 'DISCONNECTED'
  },
  last_active: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'whatsapp_configs',
  schema: 'public', 
  timestamps: true,
  underscored: true
});

export default WhatsappConfig;