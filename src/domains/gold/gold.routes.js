import express from 'express';
import multer from 'multer';
import * as goldController from './gold.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/live-price', protect, goldController.getLivePrice);
router.post('/add', protect, upload.single('image'), goldController.addGoldItem);
router.get('/inventory', protect, goldController.getInventory);
router.get('/dashboard', protect, goldController.getDashboardData);
router.get('/barcode/:barcode', protect, goldController.getItemByBarcode);
router.post('/purchase-old-gold', protect, goldController.purchaseOldGold);
router.get('/image/:id', goldController.getItemImage);
router.get('/:id', protect, goldController.getGoldItemById);
router.put('/:id', protect, upload.single('image'), goldController.updateGoldItem);
router.delete('/:id', protect, goldController.deleteGoldItem);

export default router;