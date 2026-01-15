//domains/dashboard/dashboard.routes.js
import express from 'express';
import * as dashboardController from './dashboard.controller.js';
import { resolveTenant } from '../../middlewares/tenant.middleware.js';
import { protect } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.use(resolveTenant);
router.use(protect);

router.get('/rates', dashboardController.getLiveRates);
router.get('/stats', dashboardController.getStats);

export default router;