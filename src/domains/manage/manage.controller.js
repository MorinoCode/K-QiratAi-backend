import Store from '../auth/store.model.js';
import User from '../auth/user.model.js';
import Invoice from '../invoices/invoice.model.js';
import bcrypt from 'bcrypt';

export const getBranches = async (req, res) => {
  try {
    const branches = await Store.findAll({ order: [['is_main', 'DESC'], ['id', 'ASC']] }); // شعبه اصلی اول بیاید
    res.json(branches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createBranch = async (req, res) => {
  try {
    const { name, location, phone } = req.body;
    const newBranch = await Store.create({ 
      name, location, phone, manager_id: req.user.id, is_main: false 
    });
    res.status(201).json(newBranch);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, phone } = req.body;
    await Store.update({ name, location, phone }, { where: { id } });
    res.json({ message: "Branch updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteBranch = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. چک کردن اینکه آیا شعبه اصلی است؟
    const branch = await Store.findByPk(id);
    if (!branch) return res.status(404).json({ message: "Branch not found" });
    
    if (branch.is_main) {
      return res.status(403).json({ message: "Cannot delete the Main Branch (HQ)." });
    }

    // 2. چک کردن اینکه کارمند دارد یا نه
    const hasStaff = await User.findOne({ where: { store_id: id } });
    if (hasStaff) {
      return res.status(400).json({ message: "Cannot delete branch with active staff." });
    }

    await Store.destroy({ where: { id } });
    res.json({ message: "Branch deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getStaff = async (req, res) => {
  try {
    const staff = await User.findAll({
      where: { role: 'staff' },
      attributes: { exclude: ['password'] },
      include: [
        { model: Store, as: 'store', attributes: ['name'] }
      ]
    });
    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getStaffById = async (req, res) => {
  try {
    const { id } = req.params;
    const staffMember = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [
        { model: Store, as: 'store', attributes: ['name', 'location'] }
      ]
    });

    if (!staffMember) return res.status(404).json({ message: "Staff not found" });

    const salesHistory = await Invoice.findAll({
      where: { created_by: id },
      order: [['createdAt', 'DESC']],
      limit: 50 
    });

    let totalSales = 0;
    salesHistory.forEach(inv => {
      totalSales += parseFloat(inv.total_amount);
    });

    res.json({
      staff: staffMember,
      history: salesHistory,
      stats: {
        total_sales_volume: totalSales.toFixed(3),
        total_invoices: salesHistory.length
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createStaff = async (req, res) => {
  try {
    const { username, password, full_name, store_id } = req.body;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newStaff = await User.create({
      username,
      password: hashedPassword,
      full_name,
      store_id,
      role: 'staff'
    });

    res.status(201).json({ message: "Staff created successfully", id: newStaff.id });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    await User.destroy({ where: { id } });
    res.json({ message: "Staff deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};