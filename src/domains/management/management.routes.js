import express from 'express';
import * as manageController from './management.controller.js';
import { resolveTenant } from '../../middlewares/tenant.middleware.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { restrictTo } from '../../middlewares/role.middleware.js';

const router = express.Router();

router.use(resolveTenant);
router.use(protect);

// --- Branch Routes ---
router.get('/branches', restrictTo('store_owner'), manageController.getBranches);
router.post('/branches', restrictTo('store_owner'), manageController.createBranch);
router.put('/branches/:id', restrictTo('store_owner'), manageController.updateBranch);
router.delete('/branches/:id', restrictTo('store_owner'), manageController.deleteBranch);

// --- Staff Routes ---
router.get('/staff', restrictTo('store_owner', 'branch_manager'), manageController.getStaff);
router.get('/staff/:id', restrictTo('store_owner', 'branch_manager'), manageController.getStaffById);
router.post('/staff', restrictTo('store_owner', 'branch_manager'), manageController.createStaff);
router.put('/staff/:id', restrictTo('store_owner', 'branch_manager'), manageController.updateStaff);
router.delete('/staff/:id', restrictTo('store_owner', 'branch_manager'), manageController.deleteStaff);

export default router;