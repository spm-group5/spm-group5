import { useState, useEffect } from 'react';
import apiService from '../services/api';
import TaskForm from './TaskForm';
import TaskItem from './TaskItem';

const TaskList = () => {
    const [tasks, setTasks] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [filter, setFilter] = useState({
        status: '',
        project: '',
        view: 'all',
    });

    useEffect(() => {
        loadTasks();
        loadProjects();
    }, [filter]);

    const loadTasks = async () => {
        setLoading(true);
        setError(null);

        try {
            const filters = {};

            if (filter.status) {
                filters.status = filter.status;
            }

            if (filter.project) {
                filters.project = filter.project;
            } else if (filter.view === 'standalone') {
                filters.standalone = 'true';
            } else if (filter.view === 'mine') {
                filters.owner = 'me';
            }

            const response = await apiService.getTasks(filters);
            setTasks(response.data || []);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const loadProjects = async () => {
        try {
            const response = await apiService.getProjects();
            setProjects(response.data || []);
        } catch (error) {
            console.error('Failed to load projects:', error);
        }
    };

    const handleCreateTask = async (taskData) => {
        setShowCreateForm(false);
        await loadTasks();
    };

    const handleUpdateTask = async (taskData) => {
        setEditingTask(null);
        await loadTasks();
    };

    const handleDeleteTask = async (taskId) => {
        try {
            await apiService.deleteTask(taskId);
            await loadTasks();
        } catch (error) {
            setError(error.message);
        }
    };

    const handleStatusChange = async (taskId, newStatus) => {
        try {
            await apiService.updateTask(taskId, { status: newStatus });
            await loadTasks();
        } catch (error) {
            setError(error.message);
        }
    };

    return (
        <div className="task-list-container">
            <div className="task-list-header">
                <h2>Tasks</h2>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowCreateForm(true)}
                >
                    Create New Task
                </button>
            </div>

            <div className="filters">
                <div className="filter-group">
                    <label htmlFor="view-filter">View:</label>
                    <select
                        id="view-filter"
                        value={filter.view}
                        onChange={(e) => setFilter({ ...filter, view: e.target.value, project: '' })}
                    >
                        <option value="all">All Tasks</option>
                        <option value="mine">My Tasks</option>
                        <option value="standalone">Standalone Tasks</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label htmlFor="status-filter">Status:</label>
                    <select
                        id="status-filter"
                        value={filter.status}
                        onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                    >
                        <option value="">All</option>
                        <option value="To Do">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Done">Done</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label htmlFor="project-filter">Project:</label>
                    <select
                        id="project-filter"
                        value={filter.project}
                        onChange={(e) => setFilter({ ...filter, project: e.target.value, view: 'all' })}
                    >
                        <option value="">All Projects</option>
                        {projects.map(project => (
                            <option key={project._id} value={project._id}>
                                {project.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {showCreateForm && (
                <div className="task-form-modal">
                    <div className="modal-content">
                        <h3>Create New Task</h3>
                        <TaskForm
                            projects={projects}
                            onSubmit={handleCreateTask}
                            onCancel={() => setShowCreateForm(false)}
                        />
                    </div>
                </div>
            )}

            {editingTask && (
                <div className="task-form-modal">
                    <div className="modal-content">
                        <h3>Edit Task</h3>
                        <TaskForm
                            task={editingTask}
                            projects={projects}
                            onSubmit={handleUpdateTask}
                            onCancel={() => setEditingTask(null)}
                        />
                    </div>
                </div>
            )}

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="loading">Loading tasks...</div>
            ) : tasks.length === 0 ? (
                <div className="no-tasks">
                    No tasks found. Create your first task to get started!
                </div>
            ) : (
                <div className="task-items">
                    {tasks.map(task => (
                        <TaskItem
                            key={task._id}
                            task={task}
                            onEdit={() => setEditingTask(task)}
                            onDelete={() => handleDeleteTask(task._id)}
                            onStatusChange={(status) => handleStatusChange(task._id, status)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default TaskList;