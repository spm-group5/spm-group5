import { useState } from 'react';

const TaskItem = ({ task, onEdit, onDelete, onStatusChange }) => {
    const [showActions, setShowActions] = useState(false);

    const formatDate = (dateString) => {
        if (!dateString) return null;
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getDueDateClass = () => {
        if (!task.dueDate) return '';

        const dueDate = new Date(task.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);

        const diffDays = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'overdue';
        if (diffDays === 0) return 'due-today';
        if (diffDays <= 3) return 'due-soon';
        return '';
    };

    const getStatusClass = () => {
        switch (task.status) {
            case 'Done':
                return 'status-done';
            case 'In Progress':
                return 'status-in-progress';
            case 'To Do':
            default:
                return 'status-todo';
        }
    };

    const handleStatusChange = (e) => {
        if (onStatusChange) {
            onStatusChange(e.target.value);
        }
    };

    return (
        <div
            className={`task-item ${getStatusClass()}`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            <div className="task-header">
                <h3 className="task-title">{task.title}</h3>
                {showActions && (
                    <div className="task-actions">
                        <button
                            className="btn-icon edit"
                            onClick={onEdit}
                            title="Edit task"
                        >
                            ✏️
                        </button>
                        <button
                            className="btn-icon delete"
                            onClick={() => {
                                if (window.confirm('Are you sure you want to delete this task?')) {
                                    onDelete();
                                }
                            }}
                            title="Delete task"
                        >
                            🗑️
                        </button>
                    </div>
                )}
            </div>

            {task.description && (
                <p className="task-description">{task.description}</p>
            )}

            <div className="task-meta">
                <div className="task-status">
                    <label htmlFor={`status-${task._id}`}>Status:</label>
                    <select
                        id={`status-${task._id}`}
                        value={task.status}
                        onChange={handleStatusChange}
                        className="status-select"
                    >
                        <option value="To Do">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Done">Done</option>
                    </select>
                </div>

                {task.project && (
                    <div className="task-project">
                        <span className="label">Project:</span>
                        <span className="value">{task.project.name}</span>
                    </div>
                )}

                <div className="task-owner">
                    <span className="label">Owner:</span>
                    <span className="value">{task.owner?.username || 'Unknown'}</span>
                </div>

                {task.assignee && task.assignee._id !== task.owner._id && (
                    <div className="task-assignee">
                        <span className="label">Assignee:</span>
                        <span className="value">{task.assignee.username}</span>
                    </div>
                )}

                {task.dueDate && (
                    <div className={`task-due-date ${getDueDateClass()}`}>
                        <span className="label">Due:</span>
                        <span className="value">{formatDate(task.dueDate)}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TaskItem;