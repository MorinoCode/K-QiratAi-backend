import Branch from '../store/branch.model.js';
import User from '../auth/user.model.js';
import Invoice from '../sales/invoice.model.js';
import bcrypt from 'bcrypt';

// --- Branch Management ---

export const createBranch = async (req, res) => {
  try {
    const { name, location, phone } = req.body;

    const newBranch = await Branch.create({
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
    // شعبه اصلی همیشه اول بیاید
    const branches = await Branch.findAll({ order: [['is_main', 'DESC'], ['id', 'ASC']] });
    res.json({ success: true, data: branches });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, phone } = req.body;

    const branch = await Branch.findByPk(id);
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
    const { id } = req.params;
    
    const branch = await Branch.findByPk(id);
    if (!branch) return res.status(404).json({ message: "Branch not found" });
    
    if (branch.is_main) {
      return res.status(403).json({ message: "Cannot delete the Main Branch (HQ)." });
    }

    const hasStaff = await User.findOne({ where: { branch_id: id } });
    if (hasStaff) {
      return res.status(400).json({ message: "Cannot delete branch with active staff." });
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
    const { full_name, username, password, role, branch_id } = req.body;

    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
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
    const staff = await User.findAll({
      // نقش store_owner را در لیست پرسنل نشان ندهیم (اختیاری)
      // where: { role: { [Op.ne]: 'store_owner' } }, 
      attributes: { exclude: ['password'] },
      include: [{ model: Branch, as: 'branch', attributes: ['name'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: staff });
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
        { model: Branch, as: 'branch', attributes: ['name', 'location'] }
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
    const { id } = req.params;
    const { full_name, username, password, role, branch_id, is_active } = req.body;

    const staff = await User.findByPk(id);
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
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
    const { id } = req.params;
    await User.destroy({ where: { id } });
    res.json({ success: true, message: "Staff deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};