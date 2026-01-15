// domains/auth/auth.controller.js
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from './user.model.js';
import Role from './role.model.js';
import Branch from '../store/branch.model.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '24h'
  });
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ where: { username } });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: 'Account is disabled.' });
    }

    const token = generateToken(user.id);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', 
      maxAge: 24 * 60 * 60 * 1000, 
      sameSite: 'lax'
    });

    const { password: _, ...userData } = user.toJSON();

    res.json({
      success: true,
      message: 'Login successful.',
      user: userData,
      token 
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const logout = (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully.' });
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: [
         // چون Branch در فایل app.js به User وصل شده، اینجا می‌توانیم آن را بگیریم
         { model: Branch, as: 'branch', attributes: ['name', 'is_main'] } 
      ]
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};