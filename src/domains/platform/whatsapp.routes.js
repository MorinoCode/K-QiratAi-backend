import express from 'express';
import * as whatsappController from './whatsapp.controller.js';
import { resolveTenant } from '../../middlewares/tenant.middleware.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { restrictTo } from '../../middlewares/role.middleware.js';

const router = express.Router();

router.use(resolveTenant);
router.use(protect);

router.get('/settings', restrictTo('store_owner'), whatsappController.getSettings);
router.put('/settings', restrictTo('store_owner'), whatsappController.updateSettings);

router.get('/status', restrictTo('store_owner'), whatsappController.getStatus);
router.get('/connect', restrictTo('store_owner'), whatsappController.connect); 
router.post('/disconnect', restrictTo('store_owner'), whatsappController.disconnect);

export default router;