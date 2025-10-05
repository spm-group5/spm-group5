import taskService from '../services/task.services.js';

class TaskController {
    async createTask(req, res) {
        try {
            const userId = req.user._id;
        
            if (req.body.assignee) {
                // If assignee is a string representation of an array, parse it
                if (typeof req.body.assignee === 'string') {
                    try {
                        // Try to parse JSON string like "['id1', 'id2']"
                        req.body.assignee = JSON.parse(req.body.assignee.replace(/'/g, '"'));
                    } catch (parseError) {
                        // If parsing fails, treat as single ID
                        req.body.assignee = [req.body.assignee];
                    }
                }
                
                // Ensure it's an array
                if (!Array.isArray(req.body.assignee)) {
                    req.body.assignee = [req.body.assignee];
                }
                
                // Clean the array - remove empty/invalid values
                req.body.assignee = req.body.assignee
                    .filter(id => id && typeof id === 'string' && id.trim() !== '')
                    .map(id => id.trim());
            }
            const task = await taskService.createTask(req.body, userId);

            const io = req.app.get('io');
            const userSockets = req.app.get('userSockets');

            // If task is created in a project
            if (task.assignee && task.assignee.length > 0) {
                task.assignee.forEach(assigneeId => {
                    const assigneeSocketId = userSockets.get(assigneeId.toString());
                    if (assigneeSocketId) {
                        io.to(assigneeSocketId).emit('task-assigned', {
                            message: `You have been assigned a new task: "${task.title}"`,
                            task: task,
                            timestamp: new Date()
                        });
                        console.log(`Notification sent to user ${assigneeId}`);
                    }
                });
            }

            res.status(201).json({
                success: true,
                message: 'Task created successfully',
                data: task
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async updateTask(req, res) {
        try {
            const { taskId } = req.params;
            const userId = req.user._id;

            console.log('Raw assignee received:', req.body.assignee, typeof req.body.assignee);

            if (req.body.assignee) {
                if (typeof req.body.assignee === 'string') {
                    try {
                        req.body.assignee = JSON.parse(req.body.assignee.replace(/'/g, '"'));
                    } catch (parseError) {
                        req.body.assignee = [req.body.assignee];
                    }
                }
                
                if (!Array.isArray(req.body.assignee)) {
                    req.body.assignee = [req.body.assignee];
                }
                
                req.body.assignee = req.body.assignee
                    .filter(id => id && typeof id === 'string' && id.trim() !== '')
                    .map(id => id.trim());

                console.log('Processed assignee:', req.body.assignee);
            }
            
            // Get original task to compare assignees
            const originalTask = await taskService.getTaskById(taskId);
            const originalAssignees = originalTask.assignee.map(a => a._id ? a._id.toString() : a.toString());
            
            const updatedTask = await taskService.updateTask(taskId, req.body, userId);
            const newAssignees = updatedTask.assignee.map(a => a._id ? a._id.toString() : a.toString());

            // Get Socket.IO instance
            const io = req.app.get('io');
            const userSockets = req.app.get('userSockets');

            // Check for newly added assignees
            const addedAssignees = newAssignees.filter(assignee => !originalAssignees.includes(assignee));
            
            // Notify newly added assignees
            if (addedAssignees.length > 0) {
                addedAssignees.forEach(assigneeId => {
                    // Don't notify the user who made the update
                    if (assigneeId !== userId.toString()) {
                        const assigneeSocketId = userSockets.get(assigneeId);
                        if (assigneeSocketId) {
                            io.to(assigneeSocketId).emit('task-assigned', {
                                message: `You have been assigned to task: "${updatedTask.title}"`,
                                task: updatedTask,
                                timestamp: new Date()
                            });
                            console.log(`✅ Assignment notification sent to user ${assigneeId}`);
                        }
                    }
                });
            }

            // Check for removed assignees (optional)
            const removedAssignees = originalAssignees.filter(assignee => !newAssignees.includes(assignee));
            
            if (removedAssignees.length > 0) {
                removedAssignees.forEach(assigneeId => {
                    if (assigneeId !== userId.toString()) {
                        const assigneeSocketId = userSockets.get(assigneeId);
                        if (assigneeSocketId) {
                            io.to(assigneeSocketId).emit('task-unassigned', {
                                message: `You have been removed from task: "${updatedTask.title}"`,
                                task: updatedTask,
                                timestamp: new Date()
                            });
                            console.log(`✅ Removal notification sent to user ${assigneeId}`);
                        }
                    }
                });
            }

            // Notify all current assignees about status changes (optional)
            if (req.body.status && req.body.status !== originalTask.status) {
                newAssignees.forEach(assigneeId => {
                    if (assigneeId !== userId.toString()) {
                        const assigneeSocketId = userSockets.get(assigneeId);
                        if (assigneeSocketId) {
                            io.to(assigneeSocketId).emit('task-updated', {
                                message: `Task "${updatedTask.title}" status changed to ${updatedTask.status}`,
                                task: updatedTask,
                                timestamp: new Date()
                            });
                        }
                    }
                });
            }

            res.status(200).json({
                success: true,
                message: 'Task updated successfully',
                data: updatedTask
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    // Default updateTask function
    // async updateTask(req, res) {
    //     try {
    //         const { taskId } = req.params;
    //         const userId = req.user._id;

    //         const updatedTask = await taskService.updateTask(taskId, req.body, userId);

    //         res.status(200).json({
    //             success: true,
    //             message: 'Task updated successfully',
    //             data: updatedTask
    //         });
    //     } catch (error) {
    //         res.status(400).json({
    //             success: false,
    //             message: error.message
    //         });
    //     }
    // }

    async getTasks(req, res) {
        try {
            const filters = {};

            if (req.query.owner === 'me') {
                filters.owner = req.user._id;
            } else if (req.query.owner) {
                filters.owner = req.query.owner;
            }

            if (req.query.assignee === 'me') {
                filters.assignee = req.user._id;
            } else if (req.query.assignee) {
                filters.assignee = req.query.assignee;
            }

            if (req.query.project) {
                filters.project = req.query.project;
            }

            if (req.query.standalone === 'true') {
                filters.standalone = true;
            }

            if (req.query.status) {
                filters.status = req.query.status;
            }

            const tasks = await taskService.getTasks(filters);

            res.status(200).json({
                success: true,
                data: tasks
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async getTaskById(req, res) {
        try {
            const { taskId } = req.params;
            const task = await taskService.getTaskById(taskId);

            res.status(200).json({
                success: true,
                data: task
            });
        } catch (error) {
            const statusCode = error.message === 'Task not found' ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message
            });
        }
    }

    async deleteTask(req, res) {
        try {
            const { taskId } = req.params;
            const userId = req.user._id;

            await taskService.deleteTask(taskId, userId);

            res.status(200).json({
                success: true,
                message: 'Task deleted successfully'
            });
        } catch (error) {
            const statusCode = error.message === 'Task not found' ? 404 :
            error.message.includes('permission') ? 403 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message
            });
        }
    }
}

export default new TaskController();