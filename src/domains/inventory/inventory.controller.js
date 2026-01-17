import InventoryItem from "./item.model.js";
import { Op } from "sequelize";
import { saveImage, deleteImage } from "../../utils/fileUpload.js";

const generateSmartBarcode = (metal, category) => {
  const metalCode = metal.charAt(0).toUpperCase();
  const catCode = category.substring(0, 3).toUpperCase();
  const uniqueId = Date.now().toString().slice(-6);
  const random = Math.floor(10 + Math.random() * 90);

  return `${metalCode}-${catCode}-${uniqueId}${random}`;
};

export const addItem = async (req, res) => {
  try {
    console.log("🔵 [DEBUG] Adding Item...");
    const schema = req.tenant.db_schema;
    const tenantId = req.tenant.id;

    const {
      metal_type, item_name, item_name_ar, category, country_of_origin,
      description, description_ar, karat, weight, quantity,
      buy_price_per_gram, branch_id, barcode: providedBarcode, min_stock_level
    } = req.body;

    let barcode = providedBarcode;
    if (!barcode) {
      barcode = generateSmartBarcode(metal_type, category);
    }

    // Check duplicate
    const existingItem = await InventoryItem.schema(schema).findOne({ where: { barcode } });
    if (existingItem) {
      return res.status(400).json({ message: "Barcode already exists." });
    }

    // Handle Images
    const storageFolder = `${tenantId}_${category || 'general'}`;
    const imagePromises = (req.files || []).map((file) =>
      saveImage(file, "inventory", storageFolder)
    );
    
    // منتظر می‌مانیم تا تمام عکس‌ها آپلود شوند و لینک بگیرند
    const uploadedImages = await Promise.all(imagePromises);
    
    console.log("📸 [DEBUG] Uploaded Images Links:", uploadedImages);

    // Save to DB
    const newItem = await InventoryItem.schema(schema).create({
      metal_type,
      item_name,
      item_name_ar,
      category,
      country_of_origin,
      description,
      description_ar,
      karat,
      weight,
      quantity,
      min_stock_level: min_stock_level || 2,
      buy_price_per_gram,
      barcode,
      branch_id: branch_id || req.user.branch_id,
      created_by: req.user.id,
      
      // ✅ نکته کلیدی: اینجا آرایه لینک‌ها را در ستون images ذخیره می‌کنیم
      images: uploadedImages, 
      
      status: "In Stock",
    });

    console.log("✅Item Created ID:", newItem.id);

    res.status(201).json({
      success: true,
      message: "Item added successfully",
      data: newItem,
    });
  } catch (error) {
    console.error("❌ Add Item Error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getInventory = async (req, res) => {
  try {
    const schema = req.tenant.db_schema;
    const { branch_id, search, metal_type, category } = req.query;

    const whereClause = { status: "In Stock" };

    if (req.user.role !== 'store_owner') {
        whereClause.branch_id = req.user.branch_id;
    } else if (branch_id) {
        whereClause.branch_id = branch_id;
    }

    if (metal_type && metal_type !== 'All') whereClause.metal_type = metal_type;
    if (category && category !== 'All') whereClause.category = category;

    if (search) {
      whereClause[Op.or] = [
        { item_name: { [Op.iLike]: `%${search}%` } },
        { item_name_ar: { [Op.iLike]: `%${search}%` } },
        { barcode: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const items = await InventoryItem.schema(schema).findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      limit: 200,
    });

    res.json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getItemById = async (req, res) => {
  try {
    const schema = req.tenant.db_schema;
    const { id } = req.params;
    const item = await InventoryItem.schema(schema).findByPk(id);

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    if (req.user.role !== 'store_owner' && item.branch_id !== req.user.branch_id) {
        return res.status(403).json({ message: "Access denied to this item." });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getItemByBarcode = async (req, res) => {
  try {
    const schema = req.tenant.db_schema;
    const { barcode } = req.params;
    const item = await InventoryItem.schema(schema).findOne({ where: { barcode } });

    if (!item) return res.status(404).json({ message: "Item not found" });

    if (req.user.role !== 'store_owner' && item.branch_id !== req.user.branch_id) {
        return res.status(403).json({ message: "Access denied to this item." });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateItem = async (req, res) => {
  try {
    const schema = req.tenant.db_schema;
    const tenantId = req.tenant.id;
    const { id } = req.params;
    
    const item = await InventoryItem.schema(schema).findByPk(id);

    if (!item) return res.status(404).json({ message: "Item not found" });

    if (req.user.role !== 'store_owner' && item.branch_id !== req.user.branch_id) {
        return res.status(403).json({ message: "Access denied." });
    }

    const updateData = { ...req.body };

    if (req.files && req.files.length > 0) {
      const categoryForFolder = updateData.category || item.category;
      const storageFolder = `${tenantId}_${categoryForFolder}`;

      const imagePromises = req.files.map((file) =>
        saveImage(file, "inventory", storageFolder)
      );
      const newImages = await Promise.all(imagePromises);

      const currentImages = item.images || [];
      const combinedImages = [...currentImages, ...newImages].slice(0, 5);
      updateData.images = combinedImages;
    }

    await item.update(updateData);

    res.json({
      success: true,
      message: "Item updated successfully",
      data: item,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteItemImage = async (req, res) => {
  try {
    const schema = req.tenant.db_schema;
    const { id } = req.params;
    const { imageUrl } = req.body;

    const item = await InventoryItem.schema(schema).findByPk(id);
    if (!item) return res.status(404).json({ message: "Item not found" });

    if (req.user.role !== 'store_owner' && item.branch_id !== req.user.branch_id) {
        return res.status(403).json({ message: "Access denied." });
    }

    const currentImages = item.images || [];
    const updatedImages = currentImages.filter((img) => img !== imageUrl);

    await deleteImage(imageUrl);

    item.images = updatedImages;
    await item.save();

    res.json({ success: true, message: "Image deleted", data: item });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteItem = async (req, res) => {
  try {
    const schema = req.tenant.db_schema;
    const { id } = req.params;
    const item = await InventoryItem.schema(schema).findByPk(id);

    if (!item) return res.status(404).json({ message: "Item not found" });

    if (req.user.role !== 'store_owner' && item.branch_id !== req.user.branch_id) {
        return res.status(403).json({ message: "Access denied." });
    }

    if (item.images && item.images.length > 0) {
      for (const img of item.images) {
        await deleteImage(img);
      }
    }

    await item.destroy();
    res.json({ message: "Item deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};