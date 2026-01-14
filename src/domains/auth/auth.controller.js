import * as authService from './auth.service.js';
import dotenv from "dotenv";
dotenv.config();

export const register = async (req, res) => {
  try {
    const user = await authService.registerStore(req.body);
    const { password, ...userWithoutPassword } = user.toJSON();
    
    res.status(201).json({
      message: 'Store registered successfully',
      data: userWithoutPassword
    });
  } catch (error) {
    res.status(400).json({
      message: 'Registration failed',
      error: error.message
    });
  }
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await authService.loginUser(username, password);

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = authService.generateToken(user.id);

    res.cookie('token', token, {
      httpOnly: true,
      secure: false,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    });

    const { password: _, ...userData } = user.toJSON();
    res.json({ message: 'Login successful', user: userData });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addStaff = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    const staff = await authService.registerStaff(req.body, req.user.store_id);
    
    const { password, ...staffWithoutPassword } = staff.toJSON();
    res.status(201).json({
      message: 'Staff registered successfully',
      data: staffWithoutPassword
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const listStaff = async (req, res) => {
  try {
    const storeId = req.user.store_id;
    const staffList = await authService.getStoreStaff(storeId);
    res.json(staffList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};