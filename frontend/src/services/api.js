const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiService {
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
                throw new Error(data.message || 'Something went wrong');
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
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

    async deleteSubtask(subtaskId) {
        return this.request(`/subtasks/${subtaskId}`, {
            method: 'DELETE',
        });
    }

    async getProjects() {
        return this.request('/projects');
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

    // Notifications API
    async getNotifications(filters = {}) {
        const query = new URLSearchParams(filters).toString();
        const endpoint = query ? `/notifications?${query}` : '/notifications';
        return this.request(endpoint);
    }

    async markNotificationRead(notificationId) {
        return this.request(`/notifications/${notificationId}/read`, {
            method: 'PATCH',
        });
    }

    async markAllNotificationsRead() {
        return this.request('/notifications/mark-all-read', {
            method: 'PATCH',
        });
    }

    async deleteNotification(notificationId) {
        return this.request(`/notifications/${notificationId}`, {
            method: 'DELETE',
        });
    }

    async addTaskComment(taskId, text) {
        return this.request(`/tasks/${taskId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ text })
        });
    }
}

export default new ApiService();