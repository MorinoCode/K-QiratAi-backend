import express from 'express';
import * as manageController from './manage.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/branches', protect, manageController.getBranches);
router.post('/branches', protect, manageController.createBranch);
router.put('/branches/:id', protect, manageController.updateBranch);
router.delete('/branches/:id', protect, manageController.deleteBranch);

router.get('/staff', protect, manageController.getStaff);
router.get('/staff/:id', protect, manageController.getStaffById);
router.post('/staff', protect, manageController.createStaff);
router.delete('/staff/:id', protect, manageController.deleteStaff);

export default router;