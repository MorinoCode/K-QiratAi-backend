import Customer from "./customer.model.js";
import Invoice from "../sales/invoice.model.js";
import { Op } from "sequelize";
import fs from "fs";
import OpenAI from "openai";
import { saveImage, deleteImage } from "../../utils/fileUpload.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const createCustomer = async (req, res) => {
  try {
    const { 
        full_name, phone, civil_id, nationality, 
        address, notes, branch_id, gender, birth_date, expiry_date, type 
    } = req.body;

    const existingCustomer = await Customer.findOne({ where: { civil_id } });
    if (existingCustomer && civil_id) {
      return res.status(400).json({ message: 'Customer with this Civil ID already exists.' });
    }

    let id_card_front_url = null;
    let id_card_back_url = null;

    if (req.files && req.files.front_image) {
      id_card_front_url = await saveImage(req.files.front_image[0], 'customers', full_name || 'unknown');
    }
    if (req.files && req.files.back_image) {
      id_card_back_url = await saveImage(req.files.back_image[0], 'customers', full_name || 'unknown');
    }

    const newCustomer = await Customer.create({
      full_name,
      phone,
      civil_id,
      nationality,
      address,
      gender,
      birth_date,
      expiry_date,
      type: type || 'Regular',
      notes,
      id_card_front_url,
      id_card_back_url,
      branch_id: branch_id || req.user.branch_id,
      created_by: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Customer registered successfully',
      data: newCustomer
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

export const getCustomers = async (req, res) => {
  try {
    const { search, branch_id } = req.query;
    const whereClause = {};

    if (branch_id) {
        whereClause.branch_id = branch_id;
    }

    if (search) {
      whereClause[Op.or] = [
        { full_name: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { civil_id: { [Op.like]: `%${search}%` } }
      ];
    }

    const customers = await Customer.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: 100
    });

    res.json({
      success: true,
      data: customers
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findByPk(id);

    if (!customer) return res.status(404).json({ message: "Customer not found" });

    const history = await Invoice.findAll({
      where: { customer_id: id },
      include: ['items'],
      order: [['createdAt', 'DESC']]
    });

    let totalSpent = 0;
    history.forEach(inv => totalSpent += parseFloat(inv.total_amount || 0));

    res.json({
      success: true,
      data: {
        customer,
        history,
        stats: {
          total_spent: totalSpent.toFixed(3),
          invoice_count: history.length,
          last_purchase: history.length > 0 ? history[0].createdAt : null
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findByPk(id);
    
    if(!customer) return res.status(404).json({message: "Customer not found"});

    const updateData = { ...req.body };
    
    if (req.files && req.files.front_image) {
      if (customer.id_card_front_url) await deleteImage(customer.id_card_front_url);
      updateData.id_card_front_url = await saveImage(req.files.front_image[0], 'customers', updateData.full_name || customer.full_name);
    }
    
    if (req.files && req.files.back_image) {
      if (customer.id_card_back_url) await deleteImage(customer.id_card_back_url);
      updateData.id_card_back_url = await saveImage(req.files.back_image[0], 'customers', updateData.full_name || customer.full_name);
    }

    await customer.update(updateData);
    res.json({ success: true, message: "Updated successfully", data: customer });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findByPk(id);
    
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    const hasInvoices = await Invoice.findOne({ where: { customer_id: id } });
    if (hasInvoices) {
      return res.status(400).json({ message: "Cannot delete customer with purchase history." });
    }

    if (customer.id_card_front_url) await deleteImage(customer.id_card_front_url);
    if (customer.id_card_back_url) await deleteImage(customer.id_card_back_url);

    await customer.destroy();
    res.json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const scanIDCard = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    const base64Image = fs.readFileSync(req.file.path, { encoding: 'base64' });
    const dataUrl = `data:${req.file.mimetype};base64,${base64Image}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: "Extract data from this ID card. If it's the FRONT, extract: 'full_name' (English), 'civil_id', 'nationality', 'gender' (M/F), 'birth_date' (YYYY-MM-DD), 'expiry_date' (YYYY-MM-DD). If it's the BACK, extract the 'address' details (Block, Street, House, etc) into a single string field named 'address'. Return strictly JSON. Use null for fields not found." 
            },
            {
              type: "image_url",
              image_url: { url: dataUrl },
            },
          ],
        },
      ],
      max_tokens: 500,
    });

    const content = response.choices[0].message.content;
    const jsonString = content.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let data;
    try {
        data = JSON.parse(jsonString);
    } catch (e) {
        return res.status(500).json({ message: "Failed to parse AI response" });
    }

    try {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    } catch(e) {}

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error("AI Scan Error:", error);
    res.status(500).json({ message: "AI Scan failed", error: error.message });
  }
};

export const getCustomerHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const history = await Invoice.findAll({
      where: { customer_id: id },
      include: ['items'],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};