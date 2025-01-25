import { DataTypes } from 'sequelize';
import { sequelize } from '../../infrastructure/database/index.js';

const Share = sequelize.define('Share', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  filename: {
    type: DataTypes.STRING,
    allowNull: true
  },
  originalname: {
    type: DataTypes.STRING,
    allowNull: true
  },
  mimetype: {
    type: DataTypes.STRING,
    allowNull: true
  },
  size: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  maxViews: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  createdBy: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'shares',
  timestamps: true
});

export default Share; 