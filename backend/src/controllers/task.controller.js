import taskService from '../services/task.services.js';
import notificationModel from '../models/notification.model.js';
import taskModel from '../models/task.model.js';

class TaskController {
    async createTask(req, res) {
        try {
            const userId = req.user._id;
        
        if (req.body.assignee === undefined || req.body.assignee === null) {
            req.body.assignee = [];
        } else if (typeof req.body.assignee === 'string') {
            req.body.assignee = [req.body.assignee];
        } else if (!Array.isArray(req.body.assignee)) {
            req.body.assignee = [req.body.assignee];
        }

        const task = await taskService.createTask(req.body, userId);

        const io = req.app.get('io');
        const userSockets = req.app.get('userSockets');

        if (task.assignee && task.assignee.length > 0) {
        // Send real-time notification if online
        if (io && userSockets) {
            task.assignee.forEach(assigneeId => {
                const assigneeSocketId = userSockets.get(assigneeId.toString());
                if (assigneeSocketId) {
                    io.to(assigneeSocketId).emit('task-assigned', {
                        message: `You have been assigned a new task: "${task.title}"`,
                        task: task,
                        timestamp: new Date()
                    });
                }
            });
        }
        // Always create a notification in the database
        await Promise.all(task.assignee.map(assigneeId =>
            notificationModel.create({
                user: assigneeId,
                message: `You have been assigned a new task: "${task.title}"`,
                assignor: userId,
                deadline: task.deadline
            })
        ));
        }

        res.status(201).json({
            success: true,
            message: 'Task created successfully and notifications sent',
            data: task
        });
    } catch (error) {
        console.error('❌ Error creating task:', error);
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
            // Will not be in notification controller because socket.io is directly related to task update.
            // Get original task to compare assignees and check recurrence
            const originalTask = await taskService.getTaskById(taskId);
            const originalAssignees = originalTask.assignee.map(a => a._id ? a._id.toString() : a.toString());
            const originalStatus = originalTask.status;

            const updatedTask = await taskService.updateTask(taskId, req.body, userId);
            const newAssignees = updatedTask.assignee.map(a => a._id ? a._id.toString() : a.toString());

            // Check if task was just marked as Done and is recurring
            if (originalStatus !== 'Done' && updatedTask.status === 'Done' && updatedTask.isRecurring) {
                console.log('Creating recurring task instance...');
                const newRecurringTask = await taskService.createRecurringTask(updatedTask);
                if (newRecurringTask) {
                    console.log(`✅ New recurring task created: ${newRecurringTask._id}`);
                }
            }

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

    async archiveTask(req, res) {
        try {
            const { taskId } = req.params;
            const userId = req.user._id;

            const archivedTask = await taskService.archiveTask(taskId, userId);

            res.status(200).json({
                success: true,
                message: 'Task archived successfully',
                data: archivedTask
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

    async unarchiveTask(req, res) {
        try {
            const { taskId } = req.params;
            const userId = req.user._id;

            const unarchivedTask = await taskService.unarchiveTask(taskId, userId);

            res.status(200).json({
                success: true,
                message: 'Task unarchived successfully',
                data: unarchivedTask
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

    // async deleteTask(req, res) {
    //     try {
    //         const { taskId } = req.params;
    //         const userId = req.user._id;

    //         const io = req.app.get('io');
    //         const userSockets = req.app.get('userSockets');

    //         // fetch task first so we can notify with details
    //         const task = await taskModel.findById(taskId);
    //         if (!task) {
    //             return res.status(404).json({ success: false, message: 'Task not found' });
    //         }

    //         // create DB notifications for assignees (or interested users)
    //         if (task.assignee && task.assignee.length > 0) {
    //             await Promise.all(task.assignee.map(assigneeId =>
    //                 notificationModel.create({
    //                     user: assigneeId,
    //                     message: `Task deleted: "${task.title}"`,
    //                     assignor: userId,
    //                     task: task._id
    //                 })
    //             ));
    //         }

    //         // emit socket event to online assignees
    //         if (io && userSockets && task.assignee && task.assignee.length > 0) {
    //             task.assignee.forEach(assigneeId => {
    //                 const socketId = userSockets.get(assigneeId.toString());
    //                 if (socketId) {
    //                     io.to(socketId).emit('task-deleted', {
    //                         message: `Task deleted: "${task.title}"`,
    //                         taskId: task._id,
    //                         timestamp: new Date()
    //                     });
    //                 }
    //             });
    //         }

    //         await taskService.deleteTask(taskId, userId);

    //         res.status(200).json({
    //             success: true,
    //             message: 'Task deleted successfully and notifications sent'
    //         });
    //     } catch (error) {
    //         const statusCode = error.message === 'Task not found' ? 404 :
    //         error.message.includes('permission') ? 403 : 500;
    //         res.status(statusCode).json({
    //             success: false,
    //             message: error.message
    //         });
    //     }
    // }

    async addComment(req, res) {
        try {
            const { taskId } = req.params;
            const { text } = req.body;
            const userId = req.user._id;
            const userName = req.user.username;
    
            if (!text || text.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Comment text is required'
                });
            }
    
            // Get the task
            const task = await taskService.getTaskById(taskId);
            
            // Add the comment
            const comment = {
                text: text.trim(),
                author: userId,
                authorName: userName,
                createdAt: new Date()
            };
    
            task.comments = task.comments || [];
            task.comments.push(comment);
            await task.save();
    
            // Get Socket.IO instance
            const io = req.app.get('io');
            const userSockets = req.app.get('userSockets');
    
            // Notify assignees (exclude the comment author)
            if (task.assignee && task.assignee.length > 0) {
                // Create DB notifications
                const notificationsToCreate = task.assignee
                    .filter(assigneeId => assigneeId.toString() !== userId.toString())
                    .map(assigneeId =>
                        notificationModel.create({
                            user: assigneeId,
                            message: `${userName} commented on task: "${task.title}"`,
                            task: task._id
                        })
                    );
                
                await Promise.all(notificationsToCreate);
    
                // Send socket notifications to online users
                if (io && userSockets) {
                    task.assignee.forEach(assigneeId => {
                        if (assigneeId.toString() !== userId.toString()) {
                            const socketId = userSockets.get(assigneeId.toString());
                            if (socketId) {
                                io.to(socketId).emit('task-comment', {
                                    message: `${userName} commented on task: "${task.title}"`,
                                    task: task,
                                    comment: comment,
                                    timestamp: new Date()
                                });
                            }
                        }
                    });
                }
            }
    
            res.status(200).json({
                success: true,
                message: 'Comment added successfully',
                data: task
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
}

export default new TaskController();