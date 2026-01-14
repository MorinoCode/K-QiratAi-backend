import Customer from './customer.model.js';
import Invoice from '../invoices/invoice.model.js';
import { Op } from 'sequelize';
import Tesseract from 'tesseract.js';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // کلید را در .env بگذارید
});

// export const scanIDCard = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ message: "No image uploaded" });
//     }

//     const { data: { text } } = await Tesseract.recognize(
//       req.file.buffer,
//       'eng',
//       { logger: m => console.log(m) }
//     );

//     console.log("OCR Result:", text);

//     const civilIdMatch = text.match(/\b\d{12}\b/);
//     const civilId = civilIdMatch ? civilIdMatch[0] : '';

//     const lines = text.split('\n').filter(line => line.trim().length > 3);
    
//     let full_name = '';
//     const nameIndex = lines.findIndex(l => l.includes('Name'));
//     if (nameIndex !== -1 && lines[nameIndex + 1]) {
//       full_name = lines[nameIndex + 1].replace(/[^a-zA-Z\s]/g, '').trim();
//     }

//     let nationality = 'Kuwaiti';
//     const nationalityMatch = text.match(/Nationality\s+([A-Z]{3})/i);
//     if (nationalityMatch) nationality = nationalityMatch[1];

//     let gender = '';
//     const genderMatch = text.match(/Sex\s+([MF])/i);
//     if (genderMatch) gender = genderMatch[1];

//     const dateMatches = text.match(/\d{2}\/\d{2}\/\d{4}/g);
//     let birth_date = '';
//     let expiry_date = '';
    
//     if (dateMatches && dateMatches.length >= 2) {
//       birth_date = dateMatches[0];
//       expiry_date = dateMatches[1];
//     }

//     res.json({
//       success: true,
//       data: {
//         civil_id: civilId,
//         full_name: full_name,
//         nationality: nationality,
//         gender: gender,
//         birth_date: birth_date,
//         expiry_date: expiry_date,
//         raw_text: text
//       }
//     });

//   } catch (error) {
//     console.error("OCR Error:", error);
//     res.status(500).json({ message: "Failed to scan ID card" });
//   }
// };

export const scanIDCard = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    const base64Image = req.file.buffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${base64Image}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: "Extract the following fields from this Kuwait Civil ID card image and return the result as a strict JSON object (no markdown, no code blocks). If a field is not visible or clear, return an empty string. The fields are: 'full_name' (English name), 'civil_id' (12 digits), 'nationality' (e.g., Kuwaiti), 'gender' (M or F), 'birth_date' (YYYY-MM-DD), 'expiry_date' (YYYY-MM-DD), 'address' (if visible on back). Ensure dates are formatted correctly." 
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
              },
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
        console.error("JSON Parse Error:", e);
        return res.status(500).json({ message: "Failed to parse AI response" });
    }

    console.log("AI Extracted Data:", data);

    res.json({
      success: true,
      data: {
        civil_id: data.civil_id || '',
        full_name: data.full_name || '',
        nationality: data.nationality || 'Kuwaiti',
        gender: data.gender || 'M',
        birth_date: data.birth_date || '',
        expiry_date: data.expiry_date || '',
        address: data.address || '',
        raw_text: "Processed by OpenAI GPT-4o"
      }
    });

  } catch (error) {
    console.error("OpenAI OCR Error:", error);
    res.status(500).json({ message: "AI Scan failed", error: error.message });
  }
};

export const getCustomers = async (req, res) => {
  try {
    const { store_id, search } = req.query;
    const whereClause = { store_id };

    if (search) {
      whereClause[Op.or] = [
        { full_name: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { civil_id: { [Op.like]: `%${search}%` } }
      ];
    }

    const customers = await Customer.findAll({
      where: whereClause,
      attributes: { exclude: ['id_card_image'] },
      order: [['createdAt', 'DESC']]
    });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findByPk(id, {
        attributes: { exclude: ['id_card_image'] } 
    });

    if (!customer) return res.status(404).json({ message: "Customer not found" });

    const history = await Invoice.findAll({
      where: { customer_id: id },
      include: ['items'],
      order: [['createdAt', 'DESC']]
    });

    let totalSpent = 0;
    history.forEach(inv => totalSpent += parseFloat(inv.total_amount));

    res.json({
      customer,
      history,
      stats: {
        total_spent: totalSpent.toFixed(3),
        invoice_count: history.length,
        last_purchase: history.length > 0 ? history[0].createdAt : null
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCustomerImage = async (req, res) => {
    try {
      const customer = await Customer.findByPk(req.params.id);
      if (customer && customer.id_card_image) {
        res.set('Content-Type', customer.id_card_mime_type);
        res.send(customer.id_card_image);
      } else {
        res.status(404).send('Image not found');
      }
    } catch (error) {
      res.status(500).send('Error retrieving image');
    }
};

export const createCustomer = async (req, res) => {
  try {
    const customerData = { ...req.body };

    if (req.file) {
      customerData.id_card_image = req.file.buffer;
      customerData.id_card_mime_type = req.file.mimetype;
    }

    const newCustomer = await Customer.create(customerData);
    res.status(201).json(newCustomer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findByPk(id);
    
    if(!customer) return res.status(404).json({message: "Customer not found"});

    const updateData = { ...req.body };
    
    if (req.file) {
        updateData.id_card_image = req.file.buffer;
        updateData.id_card_mime_type = req.file.mimetype;
    }

    await customer.update(updateData);
    res.json({ message: "Updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const hasInvoices = await Invoice.findOne({ where: { customer_id: id } });
    if (hasInvoices) {
      return res.status(400).json({ message: "Cannot delete customer with purchase history." });
    }
    await Customer.destroy({ where: { id } });
    res.json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};