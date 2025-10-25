import taskService from '../services/task.services.js';
import notificationModel from '../models/notification.model.js';
import taskModel from '../models/task.model.js';
import mongoose from 'mongoose';

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

            // Check if task was just marked as Completed and is recurring
            if (originalStatus !== 'Completed' && updatedTask.status === 'Completed' && updatedTask.isRecurring) {
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
            const userId = req.user._id;
            const userRole = req.user.roles && req.user.roles[0];
            const filters = {};

            // CRITICAL: Non-admin users can ONLY see tasks where they are assigned (owner OR assignee)
            // Admin users can see all tasks OR query specific users' tasks
            const isAdmin = userRole === 'admin';

            if (!isAdmin) {
                // For non-admin users, ALWAYS restrict to their assigned tasks
                // They must be either owner OR in the assignee array
                filters.userId = userId;
            } else {
                // Admin can optionally filter by owner or assignee
                if (req.query.owner === 'me') {
                    filters.owner = userId;
                } else if (req.query.owner) {
                    filters.owner = req.query.owner;
                }

                if (req.query.assignee === 'me') {
                    filters.assignee = userId;
                } else if (req.query.assignee) {
                    filters.assignee = req.query.assignee;
                }
            }

            // Apply additional filters (project, status) - these work with the userId filter
            if (req.query.project) {
                filters.project = req.query.project;
            }

            if (req.query.status) {
                filters.status = req.query.status;
            }

            const tasks = await taskService.getTasks(filters, userId);

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
            const userId = req.user._id;
            const userRole = req.user.roles && req.user.roles[0];

            const task = await taskService.getTaskById(taskId);

            // Check if user has permission to view this task
            // Admin can view all tasks
            // Regular users can only view tasks they're assigned to (owner or assignee)
            if (userRole !== 'admin') {
                const isOwner = task.owner._id.toString() === userId.toString();
                const isAssignee = task.assignee && task.assignee.some(
                    assignee => (assignee._id || assignee).toString() === userId.toString()
                );

                if (!isOwner && !isAssignee) {
                    return res.status(403).json({
                        success: false,
                        message: 'You do not have permission to view this task'
                    });
                }
            }

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
            const userName = req.user.username;
    
            // Fetch task first to get details for notifications
            const task = await taskModel.findById(taskId);
            if (!task) {
                return res.status(404).json({ success: false, message: 'Task not found' });
            }

            // Now archive the task
            const archivedTask = await taskService.archiveTask(taskId, userId);
    
            // Get Socket.IO instance
            const io = req.app.get('io');
            const userSockets = req.app.get('userSockets');

            // ✅ NEW: Create notification for ALL users (including archiver)
            const usersToNotify = new Set(); // Use Set to avoid duplicates
            
            // Add all assignees (including the archiver if they're assigned)
            if (task.assignee && task.assignee.length > 0) {
                task.assignee.forEach(assigneeId => {
                    usersToNotify.add(assigneeId.toString());
                });
            }
            
            // Add owner
            if (task.owner) {
                usersToNotify.add(task.owner.toString());
            }

            // Create DB notifications for everyone
            if (usersToNotify.size > 0) {
                await Promise.all(Array.from(usersToNotify).map(userId =>
                    notificationModel.create({
                        user: userId,
                        message: `${userName} archived task: "${task.title}"`,
                        task: task._id
                    })
                ));

                // Send socket notifications to online users
                Array.from(usersToNotify).forEach(notifyUserId => {
                    const socketId = userSockets.get(notifyUserId);
                    if (socketId) {
                        io.to(socketId).emit('task-archived', {
                            message: `${userName} archived task: "${task.title}"`,
                            taskId: task._id,
                            timestamp: new Date()
                        });
                    }
                });
            }
    

    
            res.status(200).json({
                success: true,
                message: 'Task archived successfully and notifications sent',
                data: archivedTask
            });
        } catch (error) {
            console.error('Error archiving task:', error);
            
            const statusCode = error.message === 'Task not found' ? 404 :
            error.message.includes('permission') ? 403 : 500;
            
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error'
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
        const userRoles = req.user.roles || [];
        const userDepartment = req.user.department;

        if (!text || text.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Comment text is required'
            });
        }

        // Get the task with populated assignee details (need department info)
        const task = await taskModel.findById(taskId)
            .populate('assignee', 'username department');
            
        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // ✅ AUTHORIZATION CHECK
        let hasPermission = false;
        
        // 1. Admin can comment on all tasks (optional)
        if (userRoles.includes('admin')) {
            hasPermission = true;
        }
        // 2. Staff can only comment if they are assigned to the task
        else if (userRoles.includes('staff') && !userRoles.includes('manager')) {
            hasPermission = task.assignee.some(
                assignee => assignee._id.toString() === userId.toString()
            );
        }
        // 3. Manager can comment if ANY assignee is from their department
        else if (userRoles.includes('manager')) {
            hasPermission = task.assignee.some(assignee => {
                // Manager is assigned directly
                if (assignee._id.toString() === userId.toString()) {
                    return true;
                }
                // Manager's department has an assignee
                if (assignee.department === userDepartment) {
                    return true;
                }
                return false;
            });
        }

        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to comment on this task'
            });
        }

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
                .filter(assignee => assignee._id.toString() !== userId.toString())
                .map(assignee =>
                    notificationModel.create({
                        user: assignee._id,
                        message: `${userName} commented on task: "${task.title}"`,
                        task: task._id,
                        type: 'comment'
                    })
                );
            
            await Promise.all(notificationsToCreate);

            // Send socket notifications to online users
            if (io && userSockets) {
                task.assignee.forEach(assignee => {
                    if (assignee._id.toString() !== userId.toString()) {
                        const socketId = userSockets.get(assignee._id.toString());
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

    /**
     * Get tasks for a specific project with authorization
     * Validates input and delegates to service layer for business logic
     */
    async getTasksByProject(req, res) {
        try {
            const { projectId } = req.params;

            // Validate authentication
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Validate projectId format (PTV-013)
            // Empty or whitespace-only
            if (!projectId || projectId.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid project ID format'
                });
            }

            // MongoDB ObjectIds are 24-character hex strings OR 12-byte strings
            // For validation, we check if it's a valid ObjectId using mongoose
            // Strict validation applies to IDs that are clearly meant to be ObjectIds but are malformed

            // If it's exactly 24 chars, it should be a valid hex string
            if (projectId.length === 24) {
                if (!mongoose.Types.ObjectId.isValid(projectId)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid project ID format'
                    });
                }
            }
            // Reject IDs that are too short (< 12) or contain invalid characters for ObjectIds
            else if (projectId.length < 12 || projectId.includes('-') || projectId.includes(' ')) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid project ID format'
                });
            }

            // Extract user data
            const userId = req.user._id;
            const userRole = req.user.roles && req.user.roles[0]; // Get first role
            const userDepartment = req.user.department;

            // Call service layer
            const tasks = await taskService.getTasksByProject(
                projectId,
                userId,
                userRole,
                userDepartment
            );

            res.status(200).json({
                success: true,
                data: tasks
            });
        } catch (error) {
            // Map errors to appropriate HTTP status codes
            let statusCode = 500;

            if (error.message === 'Project not found') {
                statusCode = 404;
            } else if (error.message.includes('Access denied') || error.message.includes('not have permission')) {
                statusCode = 403;
            }

            res.status(statusCode).json({
                success: false,
                message: error.message
            });
        }
    }

    // ASSIGNEE-SCOPE: Post-creation assignment controller
    async assignOwner(req, res) {
        try {
            const { id: taskId } = req.params;
            const { assignee: assigneeInput } = req.body;
            const actingUser = req.user;

            // Debug logging
            console.log('🔍 Assignment request received:');
            console.log('  - taskId:', taskId);
            console.log('  - req.body:', req.body);
            console.log('  - assigneeInput:', assigneeInput);
            console.log('  - assigneeInput type:', typeof assigneeInput);
            console.log('  - assigneeInput truthiness:', !!assigneeInput);

            // Guard: check if assignee provided
            if (!assigneeInput) {
                console.log('❌ Assignment rejected: assigneeInput is falsy');
                return res.status(422).json({
                    success: false,
                    message: 'Every task or subtask must have an owner.'
                });
            }

            // Call service
            const task = await taskService.assignOwner({
                taskId,
                assigneeInput,
                actingUser
            });

            // Return 200 with populated task
            res.status(200).json({
                success: true,
                data: task
            });
        } catch (error) {
            console.error('❌ Error assigning owner:', error);

            // Map error messages to status codes
            let statusCode = 400;

            if (error.message === 'Task not found') {
                statusCode = 404;
            } else if (error.message.includes('Every task or subtask must have an owner')) {
                statusCode = 422;
            } else if (error.message.includes('access to this project')) {
                statusCode = 403;
            } else if (error.message.includes('Maximum of 5 assignees allowed')) {
                statusCode = 400;
            } else if (error.message === 'This task is no longer active') {
                statusCode = 400;
            }

            res.status(statusCode).json({
                success: false,
                message: error.message
            });
        }
    }

    // ASSIGNEE-SCOPE: List eligible assignees controller
    async listEligibleAssignees(req, res) {
        try {
            const { id: taskId } = req.params;
            const actingUser = req.user;

            const assignees = await taskService.getEligibleAssignees(taskId, actingUser);

            res.status(200).json({
                success: true,
                data: assignees
            });
        } catch (error) {
            console.error('❌ Error listing eligible assignees:', error);

            let statusCode = 400;
            if (error.message === 'Task not found') {
                statusCode = 404;
            }

            res.status(statusCode).json({
                success: false,
                message: error.message
            });
        }
    }

    // ASSIGNEE-SCOPE: Add assignee to task
    async addAssignee(req, res) {
        try {
            const { id: taskId } = req.params;
            const { assignee: newAssigneeInput } = req.body;
            const actingUser = req.user;

            // Guard: check if assignee provided
            if (!newAssigneeInput) {
                return res.status(422).json({
                    success: false,
                    message: 'Assignee email is required'
                });
            }

            // Call service
            const task = await taskService.addAssignee({
                taskId,
                newAssigneeInput,
                actingUser
            });

            // Return 200 with populated task
            res.status(200).json({
                success: true,
                data: task,
                message: 'Assignee added successfully'
            });
        } catch (error) {
            console.error('❌ Error adding assignee:', error);

            // Map error messages to status codes
            let statusCode = 400;

            if (error.message === 'Task not found') {
                statusCode = 404;
            } else if (error.message === 'User not found') {
                statusCode = 404;
            } else if (error.message.includes('already assigned')) {
                statusCode = 409;
            } else if (error.message.includes('Maximum of 5 assignees')) {
                statusCode = 422;
            } else if (error.message.includes('permission')) {
                statusCode = 403;
            } else if (error.message.includes('project member')) {
                statusCode = 422;
            }

            res.status(statusCode).json({
                success: false,
                message: error.message
            });
        }
    }

    // ASSIGNEE-SCOPE: Remove assignee from task
    async removeAssignee(req, res) {
        try {
            const { id: taskId } = req.params;
            const { assignee: assigneeToRemoveInput } = req.body;
            const actingUser = req.user;

            // Guard: check if assignee provided
            if (!assigneeToRemoveInput) {
                return res.status(422).json({
                    success: false,
                    message: 'Assignee email is required'
                });
            }

            // Call service
            const task = await taskService.removeAssignee({
                taskId,
                assigneeToRemoveInput,
                actingUser
            });

            // Return 200 with populated task
            res.status(200).json({
                success: true,
                data: task,
                message: 'Assignee removed successfully'
            });
        } catch (error) {
            console.error('❌ Error removing assignee:', error);

            // Map error messages to status codes
            let statusCode = 400;

            if (error.message === 'Task not found') {
                statusCode = 404;
            } else if (error.message === 'User not found') {
                statusCode = 404;
            } else if (error.message.includes('not assigned')) {
                statusCode = 404;
            } else if (error.message.includes('at least one assignee')) {
                statusCode = 422;
            } else if (error.message.includes('Only Manager, Admin')) {
                statusCode = 403;
            }

            res.status(statusCode).json({
                success: false,
                message: error.message
            });
        }
    }
}

export default new TaskController();