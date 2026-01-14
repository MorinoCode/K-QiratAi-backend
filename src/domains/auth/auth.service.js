import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from './user.model.js';
import Store from './store.model.js';
import sequelize from '../../config/database.js';

export const registerStore = async (data) => {
  const transaction = await sequelize.transaction();
  try {
    const { store_name, location, phone, username, password, full_name } = data;

    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      throw new Error('Username already exists');
    }

    const newStore = await Store.create({
      name: store_name,
      location,
      phone
    }, { transaction });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const adminUser = await User.create({
      username,
      password: hashedPassword,
      full_name,
      role: 'admin',
      store_id: newStore.id
    }, { transaction });

    newStore.manager_id = adminUser.id;
    await newStore.save({ transaction });

    await transaction.commit();
    return adminUser;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

export const loginUser = async (username, password) => {
  const user = await User.findOne({ where: { username } });
  if (!user) return null;

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return null;

  return user;
};

export const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '24h'
  });
};

export const registerStaff = async (data, adminStoreId) => {
  const { username, password, full_name } = data;

  const existingUser = await User.findOne({ where: { username } });
  if (existingUser) {
    throw new Error('Username already exists');
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newStaff = await User.create({
    username,
    password: hashedPassword,
    full_name,
    role: 'staff',
    store_id: adminStoreId
  });

  return newStaff;
};

export const getStoreStaff = async (storeId) => {
  return await User.findAll({
    where: { 
      store_id: storeId,
      role: 'staff'
    },
    attributes: { exclude: ['password'] }
  });
};