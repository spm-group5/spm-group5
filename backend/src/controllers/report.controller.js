import reportService from '../services/report.services.js';
import mongoose from 'mongoose';

class ReportController {
    // Add ObjectId validation helper
    isValidObjectId = (id) => {
        return mongoose.Types.ObjectId.isValid(id);
    };

    /**
     * Generate task completion report for a specific project
     * GET /api/reports/task-completion/project/:projectId
     * Query parameters (REQUIRED):
     * - startDate: Start date for filtering (ISO format YYYY-MM-DD)
     * - endDate: End date for filtering (ISO format YYYY-MM-DD)
     * - format: 'pdf' or 'excel'
     */
    generateProjectTaskCompletionReport = async (req, res) => {
        try {
            const { projectId } = req.params;
            const { startDate, endDate, format } = req.query;

            // Validate required parameters
            if (!startDate || !endDate || !format) {
                return res.status(400).json({
                    error: 'Missing required parameters',
                    message: 'startDate, endDate, and format are required parameters'
                });
            }

            // Validate format parameter (only PDF and Excel supported)
            if (!['pdf', 'excel'].includes(format.toLowerCase())) {
                return res.status(400).json({
                    error: 'Invalid format parameter',
                    message: 'Format must be either pdf or excel'
                });
            }

            if (!projectId) {
                return res.status(400).json({
                    error: 'Missing projectId',
                    message: 'Project ID is required in the URL path'
                });
            }

            // Validate and parse dates
            const parsedStartDate = new Date(startDate);
            const parsedEndDate = new Date(endDate);

            if (isNaN(parsedStartDate.getTime())) {
                return res.status(400).json({
                    error: 'Invalid start date format. Please use ISO format (YYYY-MM-DD)'
                });
            }

            if (isNaN(parsedEndDate.getTime())) {
                return res.status(400).json({
                    error: 'Invalid end date format. Please use ISO format (YYYY-MM-DD)'
                });
            }

            // Validate date range
            if (parsedStartDate > parsedEndDate) {
                return res.status(400).json({
                    error: 'Start date cannot be after end date'
                });
            }

            // Set end date to end of day to include tasks created on that day
            parsedEndDate.setHours(23, 59, 59, 999);

            // Generate report data
            const reportData = await reportService.generateProjectTaskCompletionReportData(
                projectId,
                parsedStartDate,
                parsedEndDate
            );

            // Check if no tasks found - return JSON message instead of generating files
            if (reportData.aggregates.total === 0) {
                return res.status(200).json({
                    success: false,
                    message: `No tasks found for project "${reportData.metadata.projectName}" in the specified date range (${reportData.metadata.dateRange.startDate} to ${reportData.metadata.dateRange.endDate}). Please try a different date range or project.`,
                    type: 'NO_DATA_FOUND'
                });
            }

            // Handle different formats
            return await this.handleReportFormat(res, reportData, format, `project-${projectId}`);

        } catch (error) {
            return this.handleReportError(res, error);
        }
    }

    /**
     * Generate task completion report for a specific user
     * GET /api/reports/task-completion/user/:userId
     * Query parameters (REQUIRED):
     * - startDate: Start date for filtering (ISO format YYYY-MM-DD)
     * - endDate: End date for filtering (ISO format YYYY-MM-DD)
     * - format: 'pdf' or 'excel'
     */
    generateUserTaskCompletionReport = async (req, res) => {
        try {
            const { userId } = req.params;
            const { startDate, endDate, format } = req.query;

            // Validate required parameters
            if (!startDate || !endDate || !format) {
                return res.status(400).json({
                    error: 'Missing required parameters',
                    message: 'startDate, endDate, and format are required parameters'
                });
            }

            // Validate format parameter (only PDF and Excel supported)
            if (!['pdf', 'excel'].includes(format.toLowerCase())) {
                return res.status(400).json({
                    error: 'Invalid format parameter',
                    message: 'Format must be either pdf or excel'
                });
            }

            if (!userId) {
                return res.status(400).json({
                    error: 'Missing userId',
                    message: 'User ID is required in the URL path'
                });
            }

            // Validate and parse dates
            const parsedStartDate = new Date(startDate);
            const parsedEndDate = new Date(endDate);

            if (isNaN(parsedStartDate.getTime())) {
                return res.status(400).json({
                    error: 'Invalid start date format. Please use ISO format (YYYY-MM-DD)'
                });
            }

            if (isNaN(parsedEndDate.getTime())) {
                return res.status(400).json({
                    error: 'Invalid end date format. Please use ISO format (YYYY-MM-DD)'
                });
            }

            // Validate date range
            if (parsedStartDate > parsedEndDate) {
                return res.status(400).json({
                    error: 'Start date cannot be after end date'
                });
            }

            // Set end date to end of day to include tasks created on that day
            parsedEndDate.setHours(23, 59, 59, 999);

            // Generate report data
            const reportData = await reportService.generateUserTaskCompletionReportData(
                userId,
                parsedStartDate,
                parsedEndDate
            );

            // Check if no tasks found - return JSON message instead of generating files
            if (reportData.aggregates.total === 0) {
                return res.status(200).json({
                    success: false,
                    message: `No tasks found for user "${reportData.metadata.username}" in the specified date range (${reportData.metadata.dateRange.startDate} to ${reportData.metadata.dateRange.endDate}). Please try a different date range or ensure tasks are assigned to this user.`,
                    type: 'NO_DATA_FOUND'
                });
            }

            // Handle different formats
            return await this.handleReportFormat(res, reportData, format, `user-${userId}`);

        } catch (error) {
            return this.handleReportError(res, error);
        }
    }

    /**
     * Generate team summary report for a specific project
     * GET /api/reports/team-summary/project/:projectId
     * Query parameters (REQUIRED):
     * - timeframe: 'week' or 'month'
     * - startDate: Start date for filtering (ISO format YYYY-MM-DD)
     * - format: 'pdf' or 'excel'
     */
    generateTeamSummaryReport = async (req, res) => {
        try {
            const { projectId } = req.params;
            const { timeframe, startDate, format } = req.query;

            // Validate projectId format
            if (!this.isValidObjectId(projectId)) {
                return res.status(400).json({
                    error: 'Invalid project ID format'
                });
            }

            // Validate required parameters
            if (!timeframe || !startDate || !format) {
                let missing = [];
                if (!timeframe) missing.push('timeframe');
                if (!startDate) missing.push('startDate');
                if (!format) missing.push('format');
                
                return res.status(400).json({
                    error: `Missing required parameter${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`
                });
            }

            // Validate timeframe parameter
            if (!['week', 'month'].includes(timeframe.toLowerCase())) {
                return res.status(400).json({
                    error: 'Invalid timeframe parameter. Must be either "week" or "month"'
                });
            }

            // Validate format parameter (case-insensitive)
            if (!['pdf', 'excel'].includes(format.toLowerCase())) {
                return res.status(400).json({
                    error: 'Invalid format parameter. Must be either "pdf" or "excel"'
                });
            }

            // Validate and parse start date
            const parsedStartDate = new Date(startDate);
            if (isNaN(parsedStartDate.getTime())) {
                return res.status(400).json({
                    error: 'Invalid date format',
                    message: 'Please use ISO format (YYYY-MM-DD) for startDate'
                });
            }

            // Generate report data
            const reportData = await reportService.generateTeamSummaryReportData(
                projectId,
                timeframe.toLowerCase(),
                parsedStartDate
            );

            // Check if no tasks found - return JSON message instead of generating files
            if (reportData.tasks.length === 0) {
                return res.status(200).json({
                    success: false,
                    message: `No tasks found for the specified criteria. Please try a different date range or project.`,
                    type: 'NO_DATA_FOUND'
                });
            }

            // Handle different formats
            return await this.handleTeamSummaryReportFormat(res, reportData, format.toLowerCase(), projectId);

        } catch (error) {
            return this.handleReportError(res, error);
        }
    }

    /**
     * Handle team summary report formats (PDF, Excel)
     * @param {Object} res - Express response object
     * @param {Object} reportData - Report data
     * @param {String} format - Format type (pdf or excel)
     * @param {String} projectId - Project identifier for naming
     */
    handleTeamSummaryReportFormat = async (res, reportData, format, projectId) => {
        const timestamp = Date.now();
        
        switch (format) {
            case 'pdf':
                try {
                    const pdfBuffer = await reportService.generateTeamSummaryPdfReport(reportData);
                    const filename = `team-summary-report-${timestamp}.pdf`;
                    
                    res.setHeader('Content-Type', 'application/pdf');
                    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                    res.setHeader('Content-Length', pdfBuffer.length);
                    
                    return res.send(pdfBuffer);
                } catch (pdfError) {
                    return res.status(500).json({
                        error: 'Failed to generate PDF report',
                        message: 'There was an error generating the PDF. Please try again or contact support.'
                    });
                }

            case 'excel':
                try {
                    const excelBuffer = await reportService.generateTeamSummaryExcelReport(reportData);
                    const filename = `team-summary-report-${timestamp}.xlsx`;
                    
                    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                    res.setHeader('Content-Length', excelBuffer.length);
                    
                    return res.send(excelBuffer);
                } catch (excelError) {
                    return res.status(500).json({
                        error: 'Failed to generate Excel report',
                        message: 'There was an error generating the Excel file. Please try again or contact support.'
                    });
                }

            default:
                return res.status(400).json({
                    error: 'Invalid format parameter',
                    message: 'Format must be either pdf or excel'
                });
        }
    }

    // ...existing code...

    /**
     * Handle different report formats (PDF, Excel)
     * @param {Object} res - Express response object
     * @param {Object} reportData - Report data
     * @param {String} format - Format type (pdf or excel)
     * @param {String} identifier - File identifier for naming
     */
    handleReportFormat = async (res, reportData, format, identifier) => {
        switch (format.toLowerCase()) {
            case 'pdf':
                try {
                    const pdfBuffer = await reportService.generatePdfReport(reportData);
                    const filename = `task-completion-report-${identifier}-${new Date().toISOString().split('T')[0]}.pdf`;
                    
                    res.setHeader('Content-Type', 'application/pdf');
                    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                    res.setHeader('Content-Length', pdfBuffer.length);
                    
                    return res.send(pdfBuffer);
                } catch (pdfError) {
                    return res.status(500).json({
                        error: 'Failed to generate PDF report',
                        message: 'There was an error generating the PDF. Please try again or contact support.'
                    });
                }

            case 'excel':
                try {
                    const excelBuffer = await reportService.generateExcelReport(reportData);
                    const filename = `task-completion-report-${identifier}-${new Date().toISOString().split('T')[0]}.xlsx`;
                    
                    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                    res.setHeader('Content-Length', excelBuffer.length);
                    
                    return res.send(excelBuffer);
                } catch (excelError) {
                    return res.status(500).json({
                        error: 'Failed to generate Excel report',
                        message: 'There was an error generating the Excel file. Please try again or contact support.'
                    });
                }

            default:
                return res.status(400).json({
                    error: 'Invalid format parameter',
                    message: 'Format must be either pdf or excel'
                });
        }
    }

    /**
     * Handle report generation errors
     * @param {Object} res - Express response object
     * @param {Error} error - Error object
     */
    handleReportError = (res, error) => {
        // Handle specific error messages
        if (error.message === 'Project not found' || error.message === 'User not found') {
            return res.status(404).json({
                error: 'Resource not found',
                message: error.message
            });
        }
        
        return res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to generate report. Please try again later.'
        });
    }
}

export default new ReportController();