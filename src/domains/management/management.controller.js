import { Op } from 'sequelize';
import Branch from '../store/branch.model.js';
import User from '../auth/user.model.js';
import Invoice from '../sales/invoice.model.js';
import bcrypt from 'bcrypt';

// --- Branch Management ---

export const createBranch = async (req, res) => {
  try {
    const schema = req.tenant.db_schema;
    const { name, location, phone } = req.body;

    const newBranch = await Branch.schema(schema).create({
      name,
      location,
      phone,
      is_main: false
    });

    res.status(201).json({
      success: true,
      message: 'Branch created successfully',
      data: newBranch
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getBranches = async (req, res) => {
  try {
    const schema = req.tenant.db_schema;
    let whereClause = {};

    // ✅ FIX: اگر مدیر شعبه بود، فقط شعبه خودش را ببیند
    if (req.user.role === 'branch_manager') {
        whereClause = { id: req.user.branch_id };
    }

    const branches = await Branch.schema(schema).findAll({ 
        where: whereClause,
        order: [['is_main', 'DESC'], ['id', 'ASC']] 
    });
    
    res.json({ success: true, data: branches });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateBranch = async (req, res) => {
  try {
    const schema = req.tenant.db_schema;
    const { id } = req.params;
    const { name, location, phone } = req.body;

    const branch = await Branch.schema(schema).findByPk(id);
    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }

    await branch.update({ name, location, phone });
    res.json({ success: true, message: "Branch updated successfully", data: branch });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteBranch = async (req, res) => {
  try {
    const schema = req.tenant.db_schema;
    const { id } = req.params;
    
    const branch = await Branch.schema(schema).findByPk(id);
    if (!branch) return res.status(404).json({ message: "Branch not found" });
    
    if (branch.is_main) {
      return res.status(403).json({ message: "Cannot delete the Main Branch (HQ)." });
    }

    const hasStaff = await User.schema(schema).findOne({ where: { branch_id: id, is_active: true } });
    if (hasStaff) {
      return res.status(400).json({ message: "Cannot delete branch with active staff. Please reassign or deactivate them first." });
    }

    await branch.destroy();
    res.json({ success: true, message: "Branch deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Staff Management ---

export const createStaff = async (req, res) => {
  try {
    const schema = req.tenant.db_schema;
    const { full_name, username, password, role, branch_id } = req.body;

    if (req.user.role !== 'store_owner' && (role === 'store_owner' || role === 'branch_manager')) {
        return res.status(403).json({ message: "Access Denied: You cannot create Admins or Managers." });
    }

    if (req.user.role === 'branch_manager') {
        if (parseInt(branch_id) !== req.user.branch_id) {
             return res.status(403).json({ message: "You can only add staff to your own branch." });
        }
    }

    const existingUser = await User.schema(schema).findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.schema(schema).create({
      full_name,
      username,
      password: hashedPassword,
      role,
      branch_id,
      is_active: true
    });

    res.status(201).json({
      success: true,
      message: 'Staff created successfully',
      data: { id: newUser.id, username: newUser.username }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getStaff = async (req, res) => {
  try {
    const schema = req.tenant.db_schema;
    const whereClause = { is_active: true };

    if (req.user.role === 'branch_manager') {
        whereClause.branch_id = req.user.branch_id;
        whereClause.role = { [Op.not]: 'store_owner' };
    }

    const staff = await User.schema(schema).findAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      include: [{ model: Branch.schema(schema), as: 'branch', attributes: ['name'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getStaffById = async (req, res) => {
  try {
    const schema = req.tenant.db_schema;
    const { id } = req.params;
    
    const staffMember = await User.schema(schema).findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [
        { model: Branch.schema(schema), as: 'branch', attributes: ['name', 'location'] }
      ]
    });

    if (!staffMember) return res.status(404).json({ message: "Staff not found" });

    if (req.user.role === 'branch_manager' && staffMember.branch_id !== req.user.branch_id) {
        return res.status(403).json({ message: "Access Denied." });
    }

    const salesHistory = await Invoice.schema(schema).findAll({
      where: { created_by: id },
      order: [['createdAt', 'DESC']],
      limit: 50 
    });

    let totalSales = 0;
    salesHistory.forEach(inv => {
      totalSales += parseFloat(inv.total_amount);
    });

    res.json({
      success: true,
      data: {
        staff: staffMember,
        history: salesHistory,
        stats: {
          total_sales_volume: totalSales.toFixed(3),
          total_invoices: salesHistory.length
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateStaff = async (req, res) => {
  try {
    const schema = req.tenant.db_schema;
    const { id } = req.params;
    const { full_name, username, password, role, branch_id, is_active } = req.body;

    const staff = await User.schema(schema).findByPk(id);
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    if (req.user.role !== 'store_owner') {
        if (staff.role === 'store_owner' || role === 'store_owner') {
             return res.status(403).json({ message: "Cannot modify Store Owner account." });
        }
    }

    if (req.user.role === 'branch_manager') {
        if (staff.branch_id !== req.user.branch_id) {
             return res.status(403).json({ message: "Access Denied: Not in your branch." });
        }
        if (branch_id && parseInt(branch_id) !== req.user.branch_id) {
             return res.status(403).json({ message: "Cannot move staff to another branch." });
        }
    }

    staff.full_name = full_name || staff.full_name;
    staff.username = username || staff.username;
    staff.role = role || staff.role;
    staff.branch_id = branch_id || staff.branch_id;
    if (is_active !== undefined) staff.is_active = is_active;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      staff.password = await bcrypt.hash(password, salt);
    }

    await staff.save();

    res.json({
      success: true,
      message: 'Staff updated successfully',
      data: { id: staff.id, username: staff.username }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteStaff = async (req, res) => {
  try {
    const schema = req.tenant.db_schema;
    const { id } = req.params;
    
    if (parseInt(id) === req.user.id) {
        return res.status(400).json({ message: "You cannot delete your own account." });
    }

    const staff = await User.schema(schema).findByPk(id);

    if (!staff) return res.status(404).json({ message: "Staff not found" });

    if (staff.role === 'store_owner') {
        return res.status(403).json({ message: "CRITICAL: Cannot delete the Store Owner account." });
    }

    if (req.user.role === 'branch_manager' && staff.branch_id !== req.user.branch_id) {
        return res.status(403).json({ message: "Access Denied: Not in your branch." });
    }

    staff.is_active = false;
    await staff.save();

    res.json({ success: true, message: "Staff account deactivated successfully." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};