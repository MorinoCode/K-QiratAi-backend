import express from 'express';
import { getOwnerDashboard, getManagerDashboard, getSalesmanDashboard } from './dashboard.controller.js';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
import { resolveTenant } from '../../middlewares/tenant.middleware.js';
import { getLastPrice } from '../../utils/gold.service.js';

const router = express.Router();

router.use(resolveTenant);
router.use(protect);

router.get('/owner', restrictTo('store_owner'), getOwnerDashboard);
router.get('/manager', restrictTo('branch_manager'), getManagerDashboard);
router.get('/salesman', restrictTo('sales_man'), getSalesmanDashboard);

router.get('/rates', (req, res) => {
    try {
        const rates = getLastPrice(); // Fetch from your gold service
        res.json({
            success: true,
            rates: rates
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching rates" });
    }
});



export default router;