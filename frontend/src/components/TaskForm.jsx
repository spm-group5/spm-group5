import { useState, useEffect } from 'react';
import apiService from '../services/api';

const TaskForm = ({ task, onSubmit, onCancel, projects = [] }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        project: '',
        dueDate: '',
        assignee: '',
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (task) {
            setFormData({
                title: task.title || '',
                description: task.description || '',
                project: task.project?._id || '',
                dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
                assignee: task.assignee?._id || '',
            });
        }
    }, [task]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.title.trim()) {
            newErrors.title = 'Task title is required';
        }

        if (formData.dueDate) {
            const selectedDate = new Date(formData.dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (selectedDate < today) {
                newErrors.dueDate = 'Due date cannot be in the past';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            const taskData = {
                title: formData.title.trim(),
                description: formData.description,
                project: formData.project || null,
                dueDate: formData.dueDate || null,
                assignee: formData.assignee || null,
            };

            let result;
            if (task?._id) {
                result = await apiService.updateTask(task._id, taskData);
            } else {
                result = await apiService.createTask(taskData);
            }

            if (onSubmit) {
                onSubmit(result.data);
            }

            if (!task) {
                setFormData({
                    title: '',
                    description: '',
                    project: '',
                    dueDate: '',
                    assignee: '',
                });
            }
        } catch (error) {
            setErrors({ submit: error.message });
        } finally {
            setLoading(false);
        }
    };

    const getTodayDate = () => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    };

    return (
        <form onSubmit={handleSubmit} className="task-form">
            <div className="form-group">
                <label htmlFor="title">
                    Task Title <span className="required">*</span>
                </label>
                <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Enter task title"
                    className={errors.title ? 'error' : ''}
                    disabled={loading}
                />
                {errors.title && (
                    <span className="error-message">{errors.title}</span>
                )}
            </div>

            <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Enter task description (optional)"
                    rows="4"
                    disabled={loading}
                />
            </div>

            <div className="form-group">
                <label htmlFor="project">Project</label>
                <select
                    id="project"
                    name="project"
                    value={formData.project}
                    onChange={handleChange}
                    disabled={loading}
                >
                    <option value="">Standalone Task</option>
                    {projects.map(project => (
                        <option key={project._id} value={project._id}>
                            {project.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="form-group">
                <label htmlFor="dueDate">Due Date</label>
                <input
                    type="date"
                    id="dueDate"
                    name="dueDate"
                    value={formData.dueDate}
                    onChange={handleChange}
                    min={getTodayDate()}
                    className={errors.dueDate ? 'error' : ''}
                    disabled={loading}
                />
                {errors.dueDate && (
                    <span className="error-message">{errors.dueDate}</span>
                )}
            </div>

            {errors.submit && (
                <div className="error-message submit-error">
                    {errors.submit}
                </div>
            )}

            <div className="form-actions">
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                >
                    {loading ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
                </button>
                {onCancel && (
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                )}
            </div>
        </form>
    );
};

export default TaskForm;