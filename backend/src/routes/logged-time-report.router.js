// Stub router for logged time report
// This file is required for the test file to import and mount the router.
// Implementation is intentionally left blank for now.

import express from 'express';
import reportController from '../controllers/report.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = express.Router();

// GET /api/reports/logged-time/project/:projectId
router.get('/reports/logged-time/project/:projectId',
    requireAuth,
    requireRole(['admin']),
    reportController.generateProjectLoggedTimeReport
);

export default router;
