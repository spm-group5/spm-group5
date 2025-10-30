import express from 'express';
import reportController from '../controllers/report.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = express.Router();

// GET /api/reports/logged-time/department/:department
router.get('/reports/logged-time/department/:department',
    requireAuth,
    requireRole(['admin']),
    reportController.generateDepartmentLoggedTimeReport
);

export default router;
