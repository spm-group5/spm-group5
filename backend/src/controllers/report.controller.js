import reportService from '../services/report.services.js';

class ReportController {
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

            // Handle different formats
            return await this.handleReportFormat(res, reportData, format, `user-${userId}`);

        } catch (error) {
            return this.handleReportError(res, error);
        }
    }

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
                    console.error('PDF generation error:', pdfError);
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
                    console.error('Excel generation error:', excelError);
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
        console.error('Report generation error:', error);
        
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