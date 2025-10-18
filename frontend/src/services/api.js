const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiService {
    /**
     * Generic request handler for all API calls
     *
     * Purpose: Centralizes API request logic with proper error handling
     *
     * Key Features:
     * - Includes authentication credentials automatically
     * - Captures HTTP status codes for proper error handling
     * - Throws errors with status information for UI error displays
     *
     * Parameters:
     * - endpoint: API endpoint path
     * - options: Fetch options (method, body, headers, etc.)
     */
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            credentials: 'include',
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                const error = new Error(data.message || 'Something went wrong');
                error.status = response.status;
                error.data = data;
                throw error;
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            // Ensure error has status property even if JSON parsing fails
            if (!error.status && error instanceof TypeError) {
                error.status = 500;
            }
            throw error;
        }
    }

    async createTask(taskData) {
        return this.request('/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData)
        });
    }

    async updateTask(taskId, taskData) {
        return this.request(`/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(taskData)
        });
    }

    async getTasks(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        const endpoint = queryParams ? `/tasks?${queryParams}` : '/tasks';
        return this.request(endpoint);
    }

    async getTaskById(taskId) {
        return this.request(`/tasks/${taskId}`);
    }

    async archiveTask(taskId) {
        return this.request(`/tasks/${taskId}/archive`, {
            method: 'PATCH',
        });
    }

    async unarchiveTask(taskId) {
        return this.request(`/tasks/${taskId}/unarchive`, {
            method: 'PATCH',
        });
    }

    async deleteTask(taskId) {
        return this.request(`/tasks/${taskId}`, {
            method: 'DELETE',
        });
    }

    // Subtask Methods
    async createSubtask(subtaskData) {
        return this.request('/subtasks', {
            method: 'POST',
            body: JSON.stringify(subtaskData),
        });
    }

    async getSubtasksByParentTask(parentTaskId) {
        return this.request(`/tasks/${parentTaskId}/subtasks`);
    }

    async getSubtasksByProject(projectId) {
        return this.request(`/projects/${projectId}/subtasks`);
    }

    async getSubtaskById(subtaskId) {
        return this.request(`/subtasks/${subtaskId}`);
    }

    async updateSubtask(subtaskId, updateData) {
        return this.request(`/subtasks/${subtaskId}`, {
            method: 'PUT',
            body: JSON.stringify(updateData),
        });
    }

    async archiveSubtask(subtaskId) {
        return this.request(`/subtasks/${subtaskId}/archive`, {
            method: 'PUT',
        });
    }

    async getArchivedSubtasksByParentTask(parentTaskId) {
        return this.request(`/tasks/${parentTaskId}/subtasks/archived`);
    }

    async unarchiveSubtask(subtaskId) {
        return this.request(`/subtasks/${subtaskId}/unarchive`, {
            method: 'PUT',
        });
    }

    /**
     * Fetch all projects accessible to the current user
     *
     * Purpose: Retrieves all projects with canViewTasks metadata
     *
     * Key Features:
     * - Returns projects with access control metadata
     * - Backend includes canViewTasks flag for each project
     * - Used to determine UI clickability and navigation
     */
    async getProjects() {
        return this.request('/projects');
    }

    /**
     * Fetch tasks for a specific project
     *
     * Purpose: Retrieves all tasks belonging to a specific project
     *
     * Key Features:
     * - Returns tasks only if user has viewing permissions
     * - Throws 403 error if user lacks access to project tasks
     * - Throws 404 error if project doesn't exist
     * - Throws 400 error if projectId is invalid
     *
     * Parameters:
     * - projectId: The ID of the project to fetch tasks for
     */
    async getTasksByProject(projectId) {
        return this.request(`/projects/${projectId}/tasks`);
    }

    async createProject(projectData) {
        return this.request('/projects', {
            method: 'POST',
            body: JSON.stringify(projectData),
        });
    }

    // Auth Methods
    async register(userData) {
        return this.request('/register', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    }

    async login(credentials) {
        return this.request('/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });
    }

    async logout() {
        return this.request('/logout', {
            method: 'POST',
        });
    }

    async getProfile() {
        return this.request('/profile');
    }

    // Additional Project Methods
    async getProjectById(projectId) {
        return this.request(`/projects/${projectId}`);
    }

    async updateProject(projectId, projectData) {
        return this.request(`/projects/${projectId}`, {
            method: 'PUT',
            body: JSON.stringify(projectData),
        });
    }

    async deleteProject(projectId) {
        return this.request(`/projects/${projectId}`, {
            method: 'DELETE',
        });
    }

    // Admin-only Methods for Reports
    async getAllUsers() {
        return this.request('/users');
    }

    async getAllProjectsForAdmin() {
        return this.request('/projects/all');
    }

    async generateReport(reportType, targetId, startDate, endDate, format = 'pdf') {
        const params = new URLSearchParams({ startDate, endDate, format }).toString();
        const endpoint = reportType === 'user' 
            ? `/reports/task-completion/user/${targetId}?${params}`
            : `/reports/task-completion/project/${targetId}?${params}`;
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            credentials: 'include',
        });
        
        // Check if response is JSON (could be no-data case with 200 status)
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            if (data.type === 'NO_DATA_FOUND') {
                // This is a no-data scenario, not an error
                const err = new Error(data.message);
                err.type = 'NO_DATA_FOUND';
                throw err;
            } else if (!response.ok || !data.success) {
                // This is an actual error
                const err = new Error(data.message || 'Failed to generate report');
                err.type = data.type;
                err.errorCode = data.error;
                throw err;
            }
        }
        
        if (!response.ok) {
            throw new Error('Failed to generate report');
        }
        
        // Get filename from response headers or use a default
        const contentDisposition = response.headers.get('content-disposition');
        
        // Fix file extension for excel format
        const fileExtension = format === 'excel' ? 'xlsx' : format;
        let filename = `report_${targetId}_${new Date().toISOString().split('T')[0]}.${fileExtension}`;
        
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="(.+)"/);
            if (filenameMatch) {
                filename = filenameMatch[1];
            }
        }
        
        // Create blob and trigger download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        return { success: true, filename };
    }
}

export default new ApiService();