import Task from '../models/task.model.js';
import Project from '../models/project.model.js';
import User from '../models/user.model.js';
import xlsx from 'xlsx';
import puppeteer from 'puppeteer';

class ReportService {
    /**
     * Generate task completion report data for a specific project
     * @param {String} projectId - Project ID to filter tasks
     * @param {Date} startDate - Start date for filtering tasks (based on createdAt)
     * @param {Date} endDate - End date for filtering tasks (based on createdAt)
     * @returns {Object} Report data grouped by status
     */
    async generateProjectTaskCompletionReportData(projectId, startDate, endDate) {
        // Build query for tasks within date range and specific project
        const query = {
            project: projectId,
            createdAt: {
                $gte: startDate,
                $lte: endDate
            }
        };

        // Verify project exists
        const project = await Project.findById(projectId).populate('owner', 'username');
        if (!project) {
            throw new Error('Project not found');
        }

        // Fetch tasks with populated references
        const tasks = await Task.find(query)
            .populate('owner', 'username')
            .populate('assignee', 'username')
            .populate('project', 'name')
            .sort({ dueDate: 1, createdAt: 1 }); // Sort by deadline, then creation date

        return this.processTasksForReport(tasks, 'project', { 
            projectId, 
            projectName: project.name,
            projectOwner: project.owner.username,
            startDate, 
            endDate 
        });
    }

    /**
     * Generate task completion report data for a specific user
     * @param {String} userId - User ID to filter tasks (owner or assignee)
     * @param {Date} startDate - Start date for filtering tasks (based on createdAt)
     * @param {Date} endDate - End date for filtering tasks (based on createdAt)
     * @returns {Object} Report data grouped by status
     */
    async generateUserTaskCompletionReportData(userId, startDate, endDate) {
        // Build query for tasks where user is either owner or assignee, within date range
        const query = {
            $or: [
                { owner: userId },
                { assignee: userId }
            ],
            createdAt: {
                $gte: startDate,
                $lte: endDate
            }
        };

        // Verify user exists
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Fetch tasks with populated references
        const tasks = await Task.find(query)
            .populate('owner', 'username')
            .populate('assignee', 'username')
            .populate('project', 'name')
            .sort({ dueDate: 1, createdAt: 1 }); // Sort by deadline, then creation date

        return this.processTasksForReport(tasks, 'user', { 
            userId, 
            username: user.username,
            startDate, 
            endDate 
        });
    }

    /**
     * Process tasks and group them by status for report
     * @param {Array} tasks - Array of tasks
     * @param {String} reportType - 'project' or 'user'
     * @param {Object} metadata - Additional metadata for the report
     * @returns {Object} Processed report data
     */
    processTasksForReport(tasks, reportType, metadata) {
        // Group tasks by status
        const groupedTasks = {
            'To Do': [],
            'In Progress': [],
            'Blocked': [],
            'Done': []
        };

        // Process each task
        tasks.forEach(task => {
            const formattedTask = {
                id: task._id.toString(),
                title: task.title,
                deadline: task.dueDate ? this.formatDate(task.dueDate) : 'No deadline',
                priority: task.priority || 'Not set',
                tags: task.tags || 'No tags',
                description: task.description || 'No description',
                owner: task.owner ? task.owner.username : 'No owner',
                assignee: task.assignee ? task.assignee.username : 'Unassigned',
                project: task.project ? task.project.name : 'No project',
                createdAt: this.formatDate(task.createdAt)
            };

            if (groupedTasks[task.status]) {
                groupedTasks[task.status].push(formattedTask);
            }
        });

        // Calculate aggregate counts
        const aggregateCounts = {
            'To Do': groupedTasks['To Do'].length,
            'In Progress': groupedTasks['In Progress'].length,
            'Blocked': groupedTasks['Blocked'].length,
            'Done': groupedTasks['Done'].length,
            total: tasks.length
        };

        // Build report metadata
        const reportMetadata = {
            type: reportType,
            dateRange: {
                startDate: this.formatDate(metadata.startDate),
                endDate: this.formatDate(metadata.endDate)
            },
            generatedAt: this.formatDateTime(new Date()),
            ...metadata
        };

        return {
            data: groupedTasks,
            aggregates: aggregateCounts,
            metadata: reportMetadata
        };
    }

    /**
     * Generate Excel file from report data
     * @param {Object} reportData - Report data from report generation methods
     * @returns {Buffer} Excel file buffer
     */
    async generateExcelReport(reportData) {
        const workbook = xlsx.utils.book_new();
        
        // Create worksheets for each status
        const statuses = ['To Do', 'In Progress', 'Blocked', 'Done'];
        
        statuses.forEach(status => {
            const tasks = reportData.data[status];
            
            // Convert tasks to worksheet format
            const worksheetData = [
                // Header row
                ['Task ID', 'Task Name', 'Deadline', 'Priority', 'Tags', 'Owner', 'Assignee', 'Project', 'Created At', 'Description']
            ];
            
            // Add task rows
            tasks.forEach(task => {
                worksheetData.push([
                    task.id,
                    task.title,
                    task.deadline,
                    task.priority,
                    task.tags,
                    task.owner,
                    task.assignee,
                    task.project,
                    task.createdAt,
                    task.description
                ]);
            });
            
            // Create worksheet
            const worksheet = xlsx.utils.aoa_to_sheet(worksheetData);
            
            // Auto-size columns
            const colWidths = [
                { wch: 25 }, // Task ID
                { wch: 30 }, // Task Name
                { wch: 15 }, // Deadline
                { wch: 10 }, // Priority
                { wch: 20 }, // Tags
                { wch: 15 }, // Owner
                { wch: 15 }, // Assignee
                { wch: 20 }, // Project
                { wch: 15 }, // Created At
                { wch: 40 }  // Description
            ];
            worksheet['!cols'] = colWidths;
            
            // Add worksheet to workbook
            xlsx.utils.book_append_sheet(workbook, worksheet, status);
        });
        
        // Add summary worksheet
        const summaryData = [
            ['Task Completion Report Summary'],
            ['Generated At', reportData.metadata.generatedAt],
            ['Date Range', `${reportData.metadata.dateRange.startDate} to ${reportData.metadata.dateRange.endDate}`],
            ['Report Type', reportData.metadata.type.toUpperCase()]
        ];

        // Add specific metadata based on report type
        if (reportData.metadata.type === 'project') {
            summaryData.push(['Project Name', reportData.metadata.projectName]);
            summaryData.push(['Project Owner', reportData.metadata.projectOwner]);
        } else if (reportData.metadata.type === 'user') {
            summaryData.push(['Username', reportData.metadata.username]);
        }

        summaryData.push(['']);
        summaryData.push(['Status', 'Count']);
        summaryData.push(['To Do', reportData.aggregates['To Do']]);
        summaryData.push(['In Progress', reportData.aggregates['In Progress']]);
        summaryData.push(['Blocked', reportData.aggregates['Blocked']]);
        summaryData.push(['Done', reportData.aggregates['Done']]);
        summaryData.push(['Total Tasks', reportData.aggregates.total]);
        
        const summaryWorksheet = xlsx.utils.aoa_to_sheet(summaryData);
        summaryWorksheet['!cols'] = [{ wch: 25 }, { wch: 15 }];
        xlsx.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary', 0);
        
        // Generate buffer
        return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    }

    /**
     * Generate PDF file from report data
     * @param {Object} reportData - Report data from report generation methods
     * @returns {Buffer} PDF file buffer
     */
    async generatePdfReport(reportData) {
        const html = this.generateReportHTML(reportData);
        
        const browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        try {
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });
            
            const pdfBuffer = await page.pdf({
                format: 'A4',
                margin: {
                    top: '20mm',
                    right: '15mm',
                    bottom: '20mm',
                    left: '15mm'
                },
                printBackground: true
            });
            
            return pdfBuffer;
        } finally {
            await browser.close();
        }
    }

    /**
     * Generate HTML for PDF report
     * @param {Object} reportData - Report data
     * @returns {string} HTML string
     */
    generateReportHTML(reportData) {
        const statuses = ['To Do', 'In Progress', 'Blocked', 'Done'];
        const reportTitle = reportData.metadata.type === 'project' 
            ? `Task Completion Report - Project: ${reportData.metadata.projectName}`
            : `Task Completion Report - User: ${reportData.metadata.username}`;
        
        let html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${reportTitle}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px;
            font-size: 12px;
        }
        h1 { 
            color: #333; 
            text-align: center; 
            margin-bottom: 20px;
        }
        .report-info {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .summary {
            display: flex;
            justify-content: space-around;
            margin-bottom: 20px;
            background: #e8f4f8;
            padding: 10px;
            border-radius: 5px;
        }
        .summary-item {
            text-align: center;
        }
        .summary-item h3 {
            margin: 0;
            font-size: 18px;
        }
        .summary-item p {
            margin: 5px 0 0 0;
            font-size: 14px;
            font-weight: bold;
        }
        .status-section {
            margin-bottom: 30px;
            page-break-inside: avoid;
        }
        .status-header {
            background: #333;
            color: white;
            padding: 10px;
            font-size: 16px;
            font-weight: bold;
        }
        .task-card {
            border: 1px solid #ddd;
            margin: 10px 0;
            padding: 15px;
            background: white;
            border-radius: 3px;
            page-break-inside: avoid;
        }
        .task-field {
            margin: 5px 0;
            padding: 2px 0;
        }
        .field-label {
            font-weight: bold;
            display: inline-block;
            width: 90px;
            color: #555;
        }
        .no-tasks {
            text-align: center;
            padding: 20px;
            color: #666;
            font-style: italic;
        }
        @page {
            margin: 20mm;
        }
        @media print {
            body { font-size: 11px; }
            .status-section { page-break-before: auto; }
        }
    </style>
</head>
<body>
    <h1>${reportTitle}</h1>
    
    <div class="report-info">
        <p><strong>Generated At:</strong> ${reportData.metadata.generatedAt}</p>
        <p><strong>Date Range:</strong> ${reportData.metadata.dateRange.startDate} to ${reportData.metadata.dateRange.endDate}</p>
        <p><strong>Report Type:</strong> ${reportData.metadata.type.toUpperCase()}</p>`;

        // Add specific metadata based on report type
        if (reportData.metadata.type === 'project') {
            html += `
        <p><strong>Project:</strong> ${reportData.metadata.projectName}</p>
        <p><strong>Project Owner:</strong> ${reportData.metadata.projectOwner}</p>`;
        } else if (reportData.metadata.type === 'user') {
            html += `
        <p><strong>Username:</strong> ${reportData.metadata.username}</p>`;
        }

        html += `
        <p><strong>Total Tasks:</strong> ${reportData.aggregates.total}</p>
    </div>
    
    <div class="summary">
        <div class="summary-item">
            <h3>To Do</h3>
            <p>${reportData.aggregates['To Do']}</p>
        </div>
        <div class="summary-item">
            <h3>In Progress</h3>
            <p>${reportData.aggregates['In Progress']}</p>
        </div>
        <div class="summary-item">
            <h3>Blocked</h3>
            <p>${reportData.aggregates['Blocked']}</p>
        </div>
        <div class="summary-item">
            <h3>Done</h3>
            <p>${reportData.aggregates['Done']}</p>
        </div>
    </div>`;
        
        // Add sections for each status
        statuses.forEach(status => {
            const tasks = reportData.data[status];
            html += `
    <div class="status-section">
        <div class="status-header">${status} (${tasks.length} tasks)</div>`;
            
            if (tasks.length === 0) {
                html += `
        <div class="no-tasks">No tasks in this status</div>`;
            } else {
                tasks.forEach(task => {
                    html += `
        <div class="task-card">
            <div class="task-field">
                <span class="field-label">Task ID:</span> ${task.id}
            </div>
            <div class="task-field">
                <span class="field-label">Task Name:</span> ${task.title}
            </div>
            <div class="task-field">
                <span class="field-label">Deadline:</span> ${task.deadline}
            </div>
            <div class="task-field">
                <span class="field-label">Priority:</span> ${task.priority}
            </div>
            <div class="task-field">
                <span class="field-label">Tags:</span> ${task.tags}
            </div>
            <div class="task-field">
                <span class="field-label">Owner:</span> ${task.owner}
            </div>
            <div class="task-field">
                <span class="field-label">Assignee:</span> ${task.assignee}
            </div>
            <div class="task-field">
                <span class="field-label">Project:</span> ${task.project}
            </div>
            <div class="task-field">
                <span class="field-label">Created:</span> ${task.createdAt}
            </div>
            <div class="task-field">
                <span class="field-label">Description:</span> ${task.description || 'No description'}
            </div>
        </div>`;
                });
            }
            
            html += `
    </div>`;
        });
        
        html += `
</body>
</html>`;
        return html;
    }

    /**
     * Format date to DD-MM-YYYY
     * @param {Date} date - Date to format
     * @returns {string} Formatted date
     */
    formatDate(date) {
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    }

    /**
     * Format date and time
     * @param {Date} date - Date to format
     * @returns {string} Formatted date and time
     */
    formatDateTime(date) {
        const d = new Date(date);
        return `${this.formatDate(d)} at ${d.toLocaleTimeString('en-GB', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit' 
        })}`;
    }
}

export default new ReportService();