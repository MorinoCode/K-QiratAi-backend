//domains/old-gold/old-gold.routes.js
import express from 'express';
import * as oldGoldController from './old-gold.controller.js';
import { resolveTenant } from '../../middlewares/tenant.middleware.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { upload } from '../../middlewares/upload.middleware.js';

const router = express.Router();

router.use(resolveTenant);
router.use(protect);

router.post('/create', upload.single('image'), oldGoldController.createPurchase);
router.get('/', oldGoldController.getPurchases);

export default router;