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