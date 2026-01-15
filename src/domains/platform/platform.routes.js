//domains/platform/platform.routes.js

import express from 'express';
import * as platformController from './platform.controller.js';

const router = express.Router();

router.post('/register', platformController.registerStore);

export default router;