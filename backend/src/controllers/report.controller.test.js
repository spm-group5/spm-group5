import { describe, it, expect, beforeEach, vi } from 'vitest';
import reportController from './report.controller.js';
import reportService from '../services/report.services.js';

// Mock the report service
vi.mock('../services/report.services.js');

describe('Report Controller Test', () => {
    let req, res;
    const mockReportData = {
        data: {
            'To Do': [{
                id: '123',
                title: 'Test Task',
                deadline: '01-02-2024',
                priority: '8',
                tags: 'test',
                owner: 'testuser',
                assignee: 'testuser2',
                project: 'Test Project',
                createdAt: '15-01-2024',
                description: 'Test description'
            }],
            'In Progress': [],
            'Blocked': [],
            'Completed': []
        },
        aggregates: {
            'To Do': 1,
            'In Progress': 0,
            'Blocked': 0,
            'Completed': 0,
            total: 1
        },
        metadata: {
            type: 'project',
            projectName: 'Test Project',
            projectOwner: 'testuser',
            generatedAt: '15-01-2024 at 10:00',
            dateRange: {
                startDate: '01-01-2024',
                endDate: '28-02-2024'
            }
        }
    };

    beforeEach(() => {
        req = {
            params: {},
            query: {}
        };
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
            send: vi.fn().mockReturnThis(),
            setHeader: vi.fn().mockReturnThis()
        };
        vi.clearAllMocks();
    });

    describe('generateProjectTaskCompletionReport', () => {
        beforeEach(() => {
            req.params = { projectId: 'project123' };
            req.query = {
                startDate: '2024-01-01',
                endDate: '2024-02-28',
                format: 'pdf'
            };
        });

        // Test case ID: RGE-003
        it('should generate project report successfully for PDF format', async () => {
            const mockPdfBuffer = Buffer.from('mock-pdf-data');
            reportService.generateProjectTaskCompletionReportData.mockResolvedValue(mockReportData);
            reportService.generatePdfReport.mockResolvedValue(mockPdfBuffer);

            await reportController.generateProjectTaskCompletionReport(req, res);

            expect(reportService.generateProjectTaskCompletionReportData).toHaveBeenCalledWith(
                'project123',
                expect.any(Date),
                expect.any(Date)
            );
            expect(reportService.generatePdfReport).toHaveBeenCalledWith(mockReportData);
            expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
            expect(res.setHeader).toHaveBeenCalledWith(
                'Content-Disposition',
                expect.stringContaining('task-completion-report-project-project123')
            );
            expect(res.send).toHaveBeenCalledWith(mockPdfBuffer);
        });

        // Test case ID: RGE-004
        it('should generate project report successfully for Excel format', async () => {
            req.query.format = 'excel';
            const mockExcelBuffer = Buffer.from('mock-excel-data');
            reportService.generateProjectTaskCompletionReportData.mockResolvedValue(mockReportData);
            reportService.generateExcelReport.mockResolvedValue(mockExcelBuffer);

            await reportController.generateProjectTaskCompletionReport(req, res);

            expect(reportService.generateExcelReport).toHaveBeenCalledWith(mockReportData);
            expect(res.setHeader).toHaveBeenCalledWith(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            expect(res.send).toHaveBeenCalledWith(mockExcelBuffer);
        });

        // Test case ID: RGE-006
        it('should return 400 for missing startDate parameter', async () => {
            req.query.startDate = undefined;

            await reportController.generateProjectTaskCompletionReport(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Missing required parameters',
                message: 'startDate, endDate, and format are required parameters'
            });
        });

        // Test case ID: RGE-006
        it('should return 400 for missing endDate parameter', async () => {
            req.query.endDate = undefined;

            await reportController.generateProjectTaskCompletionReport(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Missing required parameters',
                message: 'startDate, endDate, and format are required parameters'
            });
        });

        // Test case ID: RGE-006
        it('should return 400 for missing format parameter', async () => {
            req.query.format = undefined;

            await reportController.generateProjectTaskCompletionReport(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Missing required parameters',
                message: 'startDate, endDate, and format are required parameters'
            });
        });

        it('should return 400 for missing projectId parameter', async () => {
            req.params.projectId = undefined;

            await reportController.generateProjectTaskCompletionReport(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Missing projectId',
                message: 'Project ID is required in the URL path'
            });
        });

        // Test case ID: RGE-007
        it('should return 400 for invalid format parameter (json not allowed)', async () => {
            req.query.format = 'json';

            await reportController.generateProjectTaskCompletionReport(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Invalid format parameter',
                message: 'Format must be either pdf or excel'
            });
        });

        // Test case ID: RGE-007
        it('should return 400 for invalid format parameter (unsupported format)', async () => {
            req.query.format = 'csv';

            await reportController.generateProjectTaskCompletionReport(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Invalid format parameter',
                message: 'Format must be either pdf or excel'
            });
        });

        // Test case ID: RGE-008
        it('should return 400 for invalid start date format', async () => {
            req.query.startDate = 'invalid-date';

            await reportController.generateProjectTaskCompletionReport(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Invalid start date format. Please use ISO format (YYYY-MM-DD)'
            });
        });

        // Test case ID: RGE-008
        it('should return 400 for invalid end date format', async () => {
            req.query.endDate = 'invalid-date';

            await reportController.generateProjectTaskCompletionReport(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Invalid end date format. Please use ISO format (YYYY-MM-DD)'
            });
        });

        // Test case ID: RGE-009
        it('should return 400 when start date is after end date', async () => {
            req.query.startDate = '2024-02-28';
            req.query.endDate = '2024-01-01';

            await reportController.generateProjectTaskCompletionReport(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Start date cannot be after end date'
            });
        });

        // Test case ID: RGE-010
        it('should return 404 for project not found error', async () => {
            reportService.generateProjectTaskCompletionReportData.mockRejectedValue(
                new Error('Project not found')
            );

            await reportController.generateProjectTaskCompletionReport(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Resource not found',
                message: 'Project not found'
            });
        });

        // Test case ID: RGE-022
        it('should return 500 for PDF generation error', async () => {
            reportService.generateProjectTaskCompletionReportData.mockResolvedValue(mockReportData);
            reportService.generatePdfReport.mockRejectedValue(new Error('PDF generation failed'));

            await reportController.generateProjectTaskCompletionReport(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Failed to generate PDF report',
                message: 'There was an error generating the PDF. Please try again or contact support.'
            });
        });

        // Test case ID: RGE-023
        it('should return 500 for Excel generation error', async () => {
            req.query.format = 'excel';
            reportService.generateProjectTaskCompletionReportData.mockResolvedValue(mockReportData);
            reportService.generateExcelReport.mockRejectedValue(new Error('Excel generation failed'));

            await reportController.generateProjectTaskCompletionReport(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Failed to generate Excel report',
                message: 'There was an error generating the Excel file. Please try again or contact support.'
            });
        });

        it('should return 500 for general service error', async () => {
            reportService.generateProjectTaskCompletionReportData.mockRejectedValue(
                new Error('Database connection failed')
            );

            await reportController.generateProjectTaskCompletionReport(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Internal server error',
                message: 'Failed to generate report. Please try again later.'
            });
        });
    });

    describe('generateUserTaskCompletionReport', () => {
        beforeEach(() => {
            req.params = { userId: 'user123' };
            req.query = {
                startDate: '2024-01-01',
                endDate: '2024-02-28',
                format: 'pdf'
            };
        });

        // Test case ID: RGE-005
        it('should generate user report successfully for PDF format', async () => {
            const mockPdfBuffer = Buffer.from('mock-pdf-data');
            const userReportData = {
                ...mockReportData,
                metadata: { ...mockReportData.metadata, type: 'user', username: 'testuser' }
            };
            reportService.generateUserTaskCompletionReportData.mockResolvedValue(userReportData);
            reportService.generatePdfReport.mockResolvedValue(mockPdfBuffer);

            await reportController.generateUserTaskCompletionReport(req, res);

            expect(reportService.generateUserTaskCompletionReportData).toHaveBeenCalledWith(
                'user123',
                expect.any(Date),
                expect.any(Date)
            );
            expect(reportService.generatePdfReport).toHaveBeenCalledWith(userReportData);
            expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
            expect(res.setHeader).toHaveBeenCalledWith(
                'Content-Disposition',
                expect.stringContaining('task-completion-report-user-user123')
            );
            expect(res.send).toHaveBeenCalledWith(mockPdfBuffer);
        });

        it('should generate user report successfully for Excel format', async () => {
            req.query.format = 'excel';
            const mockExcelBuffer = Buffer.from('mock-excel-data');
            const userReportData = {
                ...mockReportData,
                metadata: { ...mockReportData.metadata, type: 'user', username: 'testuser' }
            };
            reportService.generateUserTaskCompletionReportData.mockResolvedValue(userReportData);
            reportService.generateExcelReport.mockResolvedValue(mockExcelBuffer);

            await reportController.generateUserTaskCompletionReport(req, res);

            expect(reportService.generateExcelReport).toHaveBeenCalledWith(userReportData);
            expect(res.setHeader).toHaveBeenCalledWith(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            expect(res.send).toHaveBeenCalledWith(mockExcelBuffer);
        });

        it('should return 400 for missing userId parameter', async () => {
            req.params.userId = undefined;

            await reportController.generateUserTaskCompletionReport(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Missing userId',
                message: 'User ID is required in the URL path'
            });
        });

        // Test case ID: RGE-007
        it('should return 400 for invalid format parameter', async () => {
            req.query.format = 'json';

            await reportController.generateUserTaskCompletionReport(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Invalid format parameter',
                message: 'Format must be either pdf or excel'
            });
        });

        // Test case ID: RGE-011
        it('should return 404 for user not found error', async () => {
            reportService.generateUserTaskCompletionReportData.mockRejectedValue(
                new Error('User not found')
            );

            await reportController.generateUserTaskCompletionReport(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Resource not found',
                message: 'User not found'
            });
        });

        // Test case ID: RGE-009
        it('should validate dates correctly for user reports', async () => {
            req.query.startDate = '2024-02-01';
            req.query.endDate = '2024-01-01';

            await reportController.generateUserTaskCompletionReport(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Start date cannot be after end date'
            });
        });

        it('should set end date to end of day correctly', async () => {
            const mockPdfBuffer = Buffer.from('mock-pdf-data');
            const userReportData = {
                ...mockReportData,
                metadata: { ...mockReportData.metadata, type: 'user', username: 'testuser' }
            };
            reportService.generateUserTaskCompletionReportData.mockResolvedValue(userReportData);
            reportService.generatePdfReport.mockResolvedValue(mockPdfBuffer);

            await reportController.generateUserTaskCompletionReport(req, res);

            // Verify that the end date passed to the service has time set to 23:59:59.999
            const callArgs = reportService.generateUserTaskCompletionReportData.mock.calls[0];
            const endDate = callArgs[2];
            expect(endDate.getHours()).toBe(23);
            expect(endDate.getMinutes()).toBe(59);
            expect(endDate.getSeconds()).toBe(59);
            expect(endDate.getMilliseconds()).toBe(999);
        });
    });

    describe('handleReportFormat', () => {
        // Test case ID: RGE-021
        it('should handle PDF format correctly', async () => {
            const mockPdfBuffer = Buffer.from('mock-pdf-data');
            reportService.generatePdfReport.mockResolvedValue(mockPdfBuffer);

            await reportController.handleReportFormat(res, mockReportData, 'pdf', 'test-identifier');

            expect(reportService.generatePdfReport).toHaveBeenCalledWith(mockReportData);
            expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
            expect(res.setHeader).toHaveBeenCalledWith('Content-Length', mockPdfBuffer.length);
            expect(res.send).toHaveBeenCalledWith(mockPdfBuffer);
        });

        // Test case ID: RGE-021
        it('should handle Excel format correctly', async () => {
            const mockExcelBuffer = Buffer.from('mock-excel-data');
            reportService.generateExcelReport.mockResolvedValue(mockExcelBuffer);

            await reportController.handleReportFormat(res, mockReportData, 'excel', 'test-identifier');

            expect(reportService.generateExcelReport).toHaveBeenCalledWith(mockReportData);
            expect(res.setHeader).toHaveBeenCalledWith(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            expect(res.setHeader).toHaveBeenCalledWith('Content-Length', mockExcelBuffer.length);
            expect(res.send).toHaveBeenCalledWith(mockExcelBuffer);
        });

        it('should return 400 for unsupported format in switch default case', async () => {
            await reportController.handleReportFormat(res, mockReportData, 'unsupported', 'test-identifier');

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Invalid format parameter',
                message: 'Format must be either pdf or excel'
            });
        });

        // Test case ID: RGE-014
        it('should handle case-insensitive format', async () => {
            const mockPdfBuffer = Buffer.from('mock-pdf-data');
            reportService.generatePdfReport.mockResolvedValue(mockPdfBuffer);

            await reportController.handleReportFormat(res, mockReportData, 'PDF', 'test-identifier');

            expect(reportService.generatePdfReport).toHaveBeenCalledWith(mockReportData);
            expect(res.send).toHaveBeenCalledWith(mockPdfBuffer);
        });

        // Test case ID: RGE-021
        it('should generate filename with date for PDF', async () => {
            const mockPdfBuffer = Buffer.from('mock-pdf-data');
            reportService.generatePdfReport.mockResolvedValue(mockPdfBuffer);

            await reportController.handleReportFormat(res, mockReportData, 'pdf', 'project-123');

            expect(res.setHeader).toHaveBeenCalledWith(
                'Content-Disposition',
                expect.stringMatching(/attachment; filename="task-completion-report-project-123-\d{4}-\d{2}-\d{2}\.pdf"/)
            );
        });

        // Test case ID: RGE-021
        it('should generate filename with date for Excel', async () => {
            const mockExcelBuffer = Buffer.from('mock-excel-data');
            reportService.generateExcelReport.mockResolvedValue(mockExcelBuffer);

            await reportController.handleReportFormat(res, mockReportData, 'excel', 'user-456');

            expect(res.setHeader).toHaveBeenCalledWith(
                'Content-Disposition',
                expect.stringMatching(/attachment; filename="task-completion-report-user-456-\d{4}-\d{2}-\d{2}\.xlsx"/)
            );
        });
    });

    describe('handleReportError', () => {
        it('should handle "Project not found" error with 404', () => {
            const error = new Error('Project not found');

            reportController.handleReportError(res, error);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Resource not found',
                message: 'Project not found'
            });
        });

        it('should handle "User not found" error with 404', () => {
            const error = new Error('User not found');

            reportController.handleReportError(res, error);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Resource not found',
                message: 'User not found'
            });
        });

        it('should handle general errors with 500', () => {
            const error = new Error('Database connection failed');

            reportController.handleReportError(res, error);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Internal server error',
                message: 'Failed to generate report. Please try again later.'
            });
        });
    });
});