import Task from '../models/task.model.js';
import Subtask from '../models/subtask.model.js';
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

        // Fetch subtasks with the same date range criteria (using projectId field)
        const subtaskQuery = {
            projectId: projectId,
            createdAt: {
                $gte: startDate,
                $lte: endDate
            }
        };

        const subtasks = await Subtask.find(subtaskQuery)
            .populate('ownerId', 'username')
            .populate('assigneeId', 'username')
            .sort({ createdAt: 1 });

        // Map subtasks to task-like structure for consistent processing
        const mappedSubtasks = subtasks.map(subtask => ({
            _id: subtask._id,
            title: subtask.title,
            dueDate: subtask.dueDate,
            priority: subtask.priority,
            tags: subtask.tags,
            description: subtask.description,
            owner: subtask.ownerId, // Map ownerId to owner
            assignee: subtask.assigneeId || [], // assigneeId is already an array
            project: project, // Use the already fetched project
            createdAt: subtask.createdAt,
            status: subtask.status
        }));

        // Combine tasks and subtasks
        const combinedItems = [...tasks, ...mappedSubtasks];

        return this.processTasksForReport(combinedItems, 'project', { 
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

        // Fetch subtasks where user is either owner (ownerId) or assignee (assigneeId)
        const subtaskQuery = {
            $or: [
                { ownerId: userId },
                { assigneeId: { $in: [userId] } } // Check if userId is in the assigneeId array
            ],
            createdAt: {
                $gte: startDate,
                $lte: endDate
            }
        };

        const subtasks = await Subtask.find(subtaskQuery)
            .populate('ownerId', 'username')
            .populate('assigneeId', 'username')
            .sort({ createdAt: 1 });

        // For each subtask, manually fetch and attach the project if needed
        // This avoids the "Schema not registered" issue in test environments
        const populatedSubtasks = await Promise.all(subtasks.map(async (subtask) => {
            if (subtask.projectId) {
                const project = await Project.findById(subtask.projectId).select('name');
                subtask.projectId = project;
            }
            return subtask;
        }));

        // Map subtasks to task-like structure for consistent processing
        const mappedSubtasks = populatedSubtasks.map(subtask => ({
            _id: subtask._id,
            title: subtask.title,
            dueDate: subtask.dueDate,
            priority: subtask.priority,
            tags: subtask.tags,
            description: subtask.description,
            owner: subtask.ownerId, // Map ownerId to owner
            assignee: subtask.assigneeId || [], // assigneeId is already an array
            project: subtask.projectId, // Map projectId to project
            createdAt: subtask.createdAt,
            status: subtask.status
        }));

        // Combine tasks and subtasks
        const combinedItems = [...tasks, ...mappedSubtasks];

        return this.processTasksForReport(combinedItems, 'user', { 
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
            'Completed': []
        };

        // Process each task
        tasks.forEach(task => {
            // Format assignees - handle array of assignees
            let assigneeStr = 'Unassigned';
            if (task.assignee && task.assignee.length > 0) {
                // Filter out null/undefined assignees and get usernames
                const validAssignees = task.assignee.filter(a => a && a.username);
                if (validAssignees.length > 0) {
                    assigneeStr = validAssignees.map(a => a.username).join(', ');
                }
            }

            const formattedTask = {
                id: task._id.toString(),
                title: task.title,
                deadline: task.dueDate ? this.formatDate(task.dueDate) : 'No deadline',
                priority: task.priority ? task.priority.toString() : 'Not set',
                tags: (task.tags && task.tags.trim()) || 'No tags',
                description: (task.description && task.description.trim()) || 'No description',
                owner: task.owner ? task.owner.username : 'No owner',
                assignee: assigneeStr,
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
            'Completed': groupedTasks['Completed'].length,
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
        const statuses = ['To Do', 'In Progress', 'Blocked', 'Completed'];
        
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
        summaryData.push(['Completed', reportData.aggregates['Completed']]);
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
        const statuses = ['To Do', 'In Progress', 'Blocked', 'Completed'];
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
            <h3>Completed</h3>
            <p>${reportData.aggregates['Completed']}</p>
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

    /**
     * Generate team summary report data for a specific project
     * @param {String} projectId - Project ID to filter tasks
     * @param {String} timeframe - 'week' or 'month'
     * @param {Date} startDate - Start date for the timeframe
     * @returns {Object} Team summary report data
     */
    async generateTeamSummaryReportData(projectId, timeframe, startDate) {
        // Verify project exists
        const project = await Project.findById(projectId).populate('owner', 'username department roles');
        if (!project) {
            throw new Error('Project not found');
        }

        // Calculate date range based on timeframe
        const { startDateRange, endDateRange } = this.calculateDateRange(timeframe, startDate);

        // Build query for tasks within date range and specific project
        // Exclude Blocked status tasks as per requirements
        const query = {
            project: projectId,
            createdAt: {
                $gte: startDateRange,
                $lte: endDateRange
            },
            status: { $in: ['To Do', 'In Progress', 'Completed'] } // Exclude Blocked
        };

        // Fetch tasks with populated references
        const tasks = await Task.find(query)
            .populate('owner', 'username department roles')
            .populate('assignee', 'username department roles')
            .populate('project', 'name')
            .sort({ status: 1, createdAt: 1 });

        // Fetch subtasks within same date range and project
        // Exclude Blocked status subtasks as per requirements
        const subtaskQuery = {
            projectId: projectId,
            createdAt: {
                $gte: startDateRange,
                $lte: endDateRange
            },
            status: { $in: ['To Do', 'In Progress', 'Completed'] } // Exclude Blocked
        };

        const subtasks = await Subtask.find(subtaskQuery)
            .populate('ownerId', 'username department roles')
            .populate('assigneeId', 'username department roles')
            .sort({ status: 1, createdAt: 1 });

        // Map subtasks to task-like structure for consistent processing
        const mappedSubtasks = subtasks.map(subtask => ({
            _id: subtask._id,
            title: subtask.title,
            dueDate: subtask.dueDate,
            priority: subtask.priority,
            tags: subtask.tags,
            description: subtask.description,
            owner: subtask.ownerId, // Map ownerId to owner
            assignee: subtask.assigneeId || [], // assigneeId is already an array
            project: project, // Use the already fetched project
            createdAt: subtask.createdAt,
            status: subtask.status
        }));

        // Combine tasks and subtasks
        const combinedItems = [...tasks, ...mappedSubtasks];

        // Identify team members (unique users who are owners or assignees)
        const teamMembers = this.identifyTeamMembers(combinedItems);

        // Group tasks by status
        const tasksByStatus = this.groupTasksByStatus(combinedItems);

        // Calculate summary statistics
        const summaryStats = this.calculateSummaryStatistics(combinedItems, teamMembers);

        return {
            metadata: {
                projectId,
                projectName: project.name,
                timeframe,
                dateRange: {
                    startDate: this.formatDate(startDateRange),
                    endDate: this.formatDate(endDateRange)
                },
                generatedAt: this.formatDateTime(new Date())
            },
            teamMembers,
            tasksByStatus,
            summaryStats,
            tasks: combinedItems // Keep full task list for reference (now includes subtasks)
        };
    }

    /**
     * Calculate date range based on timeframe
     * @param {String} timeframe - 'week' or 'month'
     * @param {Date} startDate - Start date
     * @returns {Object} Object with startDateRange and endDateRange
     */
    calculateDateRange(timeframe, startDate) {
        const startDateRange = new Date(startDate);
        startDateRange.setHours(0, 0, 0, 0);
        
        let endDateRange;
        
        if (timeframe === 'week') {
            // Week = 7 days starting from startDate
            endDateRange = new Date(startDateRange);
            endDateRange.setDate(endDateRange.getDate() + 6);
            endDateRange.setHours(23, 59, 59, 999);
        } else if (timeframe === 'month') {
            // Month = entire calendar month of startDate
            endDateRange = new Date(startDateRange.getFullYear(), startDateRange.getMonth() + 1, 0);
            endDateRange.setHours(23, 59, 59, 999);
        }
        
        return { startDateRange, endDateRange };
    }

    /**
     * Identify unique team members from tasks (owners and assignees)
     * @param {Array} tasks - Array of tasks
     * @returns {Array} Array of unique team members with their info
     */
    identifyTeamMembers(tasks) {
        const memberMap = new Map();
        
        tasks.forEach(task => {
            // Add owner
            if (task.owner && task.owner._id) {
                const ownerId = task.owner._id.toString();
                if (!memberMap.has(ownerId)) {
                    memberMap.set(ownerId, {
                        userId: ownerId,
                        username: task.owner.username,
                        department: task.owner.department || 'Not set',
                        role: task.owner.roles && task.owner.roles.length > 0 ? task.owner.roles[0] : 'Not set'
                    });
                }
            }
            
            // Add assignees
            if (task.assignee && Array.isArray(task.assignee)) {
                task.assignee.forEach(assignee => {
                    if (assignee && assignee._id) {
                        const assigneeId = assignee._id.toString();
                        if (!memberMap.has(assigneeId)) {
                            memberMap.set(assigneeId, {
                                userId: assigneeId,
                                username: assignee.username,
                                department: assignee.department || 'Not set',
                                role: assignee.roles && assignee.roles.length > 0 ? assignee.roles[0] : 'Not set'
                            });
                        }
                    }
                });
            }
        });
        
        return Array.from(memberMap.values());
    }

    /**
     * Group tasks by status
     * @param {Array} tasks - Array of tasks
     * @returns {Object} Tasks grouped by status
     */
    groupTasksByStatus(tasks) {
        const grouped = {
            'To Do': [],
            'In Progress': [],
            'Completed': []
        };
        
        tasks.forEach(task => {
            if (grouped[task.status]) {
                // Format assignees
                let assigneeStr = 'Unassigned';
                if (task.assignee && task.assignee.length > 0) {
                    assigneeStr = task.assignee.map(a => `${a.username} (${a.department || 'Not set'}, ${a.roles && a.roles.length > 0 ? a.roles[0] : 'Not set'})`).join('; ');
                }
                
                grouped[task.status].push({
                    id: task._id.toString(),
                    title: task.title,
                    owner: task.owner ? `${task.owner.username} (${task.owner.department || 'Not set'}, ${task.owner.roles && task.owner.roles.length > 0 ? task.owner.roles[0] : 'Not set'})` : 'No owner',
                    assignee: assigneeStr,
                    createdAt: this.formatDate(task.createdAt),
                    dueDate: task.dueDate ? this.formatDate(task.dueDate) : 'No deadline'
                });
            }
        });
        
        return grouped;
    }

    /**
     * Calculate summary statistics
     * @param {Array} tasks - Array of tasks
     * @param {Array} teamMembers - Array of team members
     * @returns {Object} Summary statistics
     */
    calculateSummaryStatistics(tasks, teamMembers) {
        const stats = {
            totalTasks: tasks.length,
            tasksByStatus: {
                'To Do': tasks.filter(t => t.status === 'To Do').length,
                'In Progress': tasks.filter(t => t.status === 'In Progress').length,
                'Completed': tasks.filter(t => t.status === 'Completed').length
            },
            teamMemberCount: teamMembers.length,
            tasksByMember: {}
        };
        
        // Calculate tasks per team member
        teamMembers.forEach(member => {
            const memberTasks = tasks.filter(task => {
                const isOwner = task.owner && task.owner._id.toString() === member.userId;
                const isAssignee = task.assignee && task.assignee.some(a => a._id.toString() === member.userId);
                return isOwner || isAssignee;
            });
            
            stats.tasksByMember[member.username] = memberTasks.length;
        });
        
        return stats;
    }

    /**
     * Generate Excel file for team summary report
     * @param {Object} reportData - Report data
     * @returns {Buffer} Excel file buffer
     */
    async generateTeamSummaryExcelReport(reportData) {
        const workbook = xlsx.utils.book_new();
        
        // Create worksheet for each status
        const statuses = ['To Do', 'In Progress', 'Completed'];
        
        statuses.forEach(status => {
            const tasks = reportData.tasksByStatus[status];
            
            // Convert tasks to worksheet format
            const worksheetData = [
                // Header row
                ['Task ID', 'Task Name', 'Owner', 'Assignee(s)', 'Created Date', 'Due Date']
            ];
            
            // Add task rows
            tasks.forEach(task => {
                worksheetData.push([
                    task.id,
                    task.title,
                    task.owner,
                    task.assignee,
                    task.createdAt,
                    task.dueDate
                ]);
            });
            
            // Create worksheet
            const worksheet = xlsx.utils.aoa_to_sheet(worksheetData);
            
            // Auto-size columns
            worksheet['!cols'] = [
                { wch: 25 }, // Task ID
                { wch: 30 }, // Task Name
                { wch: 40 }, // Owner
                { wch: 50 }, // Assignees
                { wch: 15 }, // Created Date
                { wch: 15 }  // Due Date
            ];
            
            // Add worksheet to workbook
            xlsx.utils.book_append_sheet(workbook, worksheet, status);
        });
        
        // Create Summary worksheet
        const summaryData = [
            ['Team Summary Report'],
            ['Project:', reportData.metadata.projectName],
            ['Timeframe:', reportData.metadata.timeframe],
            ['Date Range:', `${reportData.metadata.dateRange.startDate} to ${reportData.metadata.dateRange.endDate}`],
            ['Generated:', reportData.metadata.generatedAt],
            [],
            ['Task Statistics'],
            ['Total Tasks:', reportData.summaryStats.totalTasks],
            ['To Do:', reportData.summaryStats.tasksByStatus['To Do']],
            ['In Progress:', reportData.summaryStats.tasksByStatus['In Progress']],
            ['Completed:', reportData.summaryStats.tasksByStatus['Completed']],
            [],
            ['Team Members (' + reportData.summaryStats.teamMemberCount + ')'],
            ['Username', 'Department', 'Role', 'Task Count']
        ];
        
        // Add team member rows
        reportData.teamMembers.forEach(member => {
            summaryData.push([
                member.username,
                member.department,
                member.role,
                reportData.summaryStats.tasksByMember[member.username] || 0
            ]);
        });
        
        const summaryWorksheet = xlsx.utils.aoa_to_sheet(summaryData);
        summaryWorksheet['!cols'] = [
            { wch: 20 },
            { wch: 30 },
            { wch: 15 },
            { wch: 15 }
        ];
        
        xlsx.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');
        
        // Generate buffer
        return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    }

    /**
     * Generate PDF file for team summary report
     * @param {Object} reportData - Report data
     * @returns {Buffer} PDF file buffer
     */
    async generateTeamSummaryPdfReport(reportData) {
        const html = this.generateTeamSummaryHtml(reportData);
        
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setContent(html);
        
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20mm',
                right: '15mm',
                bottom: '20mm',
                left: '15mm'
            }
        });
        
        await browser.close();
        
        return pdfBuffer;
    }

    /**
     * Generate HTML for team summary report
     * @param {Object} reportData - Report data
     * @returns {String} HTML string
     */
    generateTeamSummaryHtml(reportData) {
        let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #2c3e50;
        }
        .header h1 {
            color: #2c3e50;
            margin: 0 0 10px 0;
        }
        .metadata {
            text-align: center;
            color: #666;
            margin-bottom: 20px;
        }
        .summary-box {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
        }
        .summary-label {
            font-weight: bold;
            color: #2c3e50;
        }
        .section-title {
            background: #2c3e50;
            color: white;
            padding: 10px 15px;
            margin: 20px 0 10px 0;
            border-radius: 5px;
            font-size: 18px;
            font-weight: bold;
        }
        .task-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .task-table th {
            background: #34495e;
            color: white;
            padding: 10px;
            text-align: left;
            font-weight: bold;
        }
        .task-table td {
            padding: 8px;
            border-bottom: 1px solid #ddd;
        }
        .task-table tr:hover {
            background: #f5f5f5;
        }
        .team-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        .team-table th {
            background: #34495e;
            color: white;
            padding: 10px;
            text-align: left;
        }
        .team-table td {
            padding: 8px;
            border-bottom: 1px solid #ddd;
        }
        .page-break {
            page-break-after: always;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Team Summary Report</h1>
        <div class="metadata">
            <strong>Project:</strong> ${reportData.metadata.projectName}<br>
            <strong>Timeframe:</strong> ${reportData.metadata.timeframe}<br>
            <strong>Date Range:</strong> ${reportData.metadata.dateRange.startDate} to ${reportData.metadata.dateRange.endDate}<br>
            <strong>Generated:</strong> ${reportData.metadata.generatedAt}
        </div>
    </div>

    <div class="summary-box">
        <h2>Summary Statistics</h2>
        <div class="summary-row">
            <span class="summary-label">Total Tasks:</span>
            <span>${reportData.summaryStats.totalTasks}</span>
        </div>
        <div class="summary-row">
            <span class="summary-label">To Do:</span>
            <span>${reportData.summaryStats.tasksByStatus['To Do']}</span>
        </div>
        <div class="summary-row">
            <span class="summary-label">In Progress:</span>
            <span>${reportData.summaryStats.tasksByStatus['In Progress']}</span>
        </div>
        <div class="summary-row">
            <span class="summary-label">Completed:</span>
            <span>${reportData.summaryStats.tasksByStatus['Completed']}</span>
        </div>
        <div class="summary-row">
            <span class="summary-label">Team Members:</span>
            <span>${reportData.summaryStats.teamMemberCount}</span>
        </div>
    </div>

    <h2 class="section-title">Team Members</h2>
    <table class="team-table">
        <thead>
            <tr>
                <th>Username</th>
                <th>Department</th>
                <th>Role</th>
                <th>Task Count</th>
            </tr>
        </thead>
        <tbody>`;

        reportData.teamMembers.forEach(member => {
            html += `
            <tr>
                <td>${member.username}</td>
                <td>${member.department}</td>
                <td>${member.role}</td>
                <td>${reportData.summaryStats.tasksByMember[member.username] || 0}</td>
            </tr>`;
        });

        html += `
        </tbody>
    </table>

    <div class="page-break"></div>`;

        // Add tasks by status
        const statuses = ['To Do', 'In Progress', 'Completed'];
        statuses.forEach(status => {
            const tasks = reportData.tasksByStatus[status];
            html += `
    <h2 class="section-title">${status} (${tasks.length})</h2>
    <table class="task-table">
        <thead>
            <tr>
                <th>Task Name</th>
                <th>Owner</th>
                <th>Assignee(s)</th>
                <th>Created</th>
                <th>Due Date</th>
            </tr>
        </thead>
        <tbody>`;

            tasks.forEach(task => {
                html += `
            <tr>
                <td>${task.title}</td>
                <td>${task.owner}</td>
                <td>${task.assignee}</td>
                <td>${task.createdAt}</td>
                <td>${task.dueDate}</td>
            </tr>`;
            });

            html += `
        </tbody>
    </table>`;
        });

        html += `
</body>
</html>`;

        return html;
    }
}

export default new ReportService();