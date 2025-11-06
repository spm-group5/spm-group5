import subtaskService from '../services/subtask.services.js';
import Subtask from '../models/subtask.model.js';
import notificationModel from '../models/notification.model.js';
import User from '../models/user.model.js';
import { normalizeAssigneeIds, findAddedAssignees } from '../utils/assignee.utils.js';

class SubtaskController {
  /**
   * Create a new subtask
   */
  async createSubtask(req, res) {
    try {
      const subtaskData = {
        ...req.body,
        ownerId: req.user._id // From auth middleware
      };

      const subtask = await subtaskService.createSubtask(subtaskData);
      
      res.status(201).json({
        success: true,
        message: 'Subtask created successfully',
        data: subtask
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create subtask'
      });
    }
  }

  /**
   * Get all subtasks for a parent task
   */
  async getSubtasksByParentTask(req, res) {
    try {
      const { parentTaskId } = req.params;
      const subtasks = await subtaskService.getSubtasksByParentTask(parentTaskId);
      
      res.status(200).json({
        success: true,
        data: subtasks
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to fetch subtasks'
      });
    }
  }

  /**
   * Get all subtasks for a project
   */
  async getSubtasksByProject(req, res) {
    try {
      const { projectId } = req.params;
      const subtasks = await subtaskService.getSubtasksByProject(projectId);
      
      res.status(200).json({
        success: true,
        data: subtasks
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to fetch subtasks'
      });
    }
  }

  /**
   * Get a subtask by ID
   */
  async getSubtaskById(req, res) {
    try {
      const { subtaskId } = req.params;
      const subtask = await subtaskService.getSubtaskById(subtaskId);
      
      res.status(200).json({
        success: true,
        data: subtask
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message || 'Subtask not found'
      });
    }
  }

  /**
   * Update a subtask
   */
  async updateSubtask(req, res) {
    try {
      const { subtaskId } = req.params;
      const updateData = req.body;
      const userId = req.user._id; // Get userId from authenticated user
      const actingUser = req.user; // Store user object for notifications

      // Get original subtask to check recurrence AND track assignee changes
      const originalSubtask = await subtaskService.getSubtaskById(subtaskId);
      const originalStatus = originalSubtask.status;

      // Track old assignees for notification logic
      const oldAssignees = normalizeAssigneeIds(originalSubtask.assigneeId);

      const subtask = await subtaskService.updateSubtask(subtaskId, updateData, userId);

      // Detect newly added assignees and create notifications
      if (updateData.assigneeId !== undefined) {
        const newAssignees = normalizeAssigneeIds(updateData.assigneeId);

        // Find assignees who weren't previously assigned
        const addedAssignees = findAddedAssignees(oldAssignees, newAssignees);

        // Create in-app notifications for newly added assignees
        if (addedAssignees.length > 0) {
          try {
            await Promise.all(
              addedAssignees.map(assigneeId =>
                notificationModel.create({
                  user: assigneeId,
                  message: `You have been assigned to subtask: "${subtask.title}"`,
                  assignor: actingUser._id,
                  deadline: subtask.dueDate
                })
              )
            );
          } catch (notifError) {
            console.error('Failed to create subtask assignment notifications:', notifError);
            // Don't fail the update if notification fails
          }
        }
      }

      // Check if subtask was just marked as Completed and is recurring
      if (originalStatus !== 'Completed' && subtask.status === 'Completed' && subtask.isRecurring) {
        console.log('Creating recurring subtask instance...');
        const newRecurringSubtask = await subtaskService.createRecurringSubtask(subtask);
        if (newRecurringSubtask) {
          console.log(`✅ New recurring subtask created: ${newRecurringSubtask._id}`);
        }
      }

      res.status(200).json({
        success: true,
        message: 'Subtask updated successfully',
        data: subtask
      });
    } catch (error) {
      // Check if it's a permission error
      if (error.message === 'You do not have permission to modify this subtask') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update subtask'
      });
    }
  }

  /**
   * Archive a subtask
   */
  async archiveSubtask(req, res) {
    try {
      const { subtaskId } = req.params;
      await subtaskService.archiveSubtask(subtaskId);
      
      res.status(200).json({
        success: true,
        message: 'Subtask archived successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to archive subtask'
      });
    }
  }

  /**
   * Get archived subtasks for a parent task
   */
  async getArchivedSubtasksByParentTask(req, res) {
    try {
      const { parentTaskId } = req.params;
      const subtasks = await subtaskService.getArchivedSubtasksByParentTask(parentTaskId);
      
      res.status(200).json({
        success: true,
        data: subtasks
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to fetch archived subtasks'
      });
    }
  }

  /**
   * Unarchive a subtask
   */
  async unarchiveSubtask(req, res) {
    try {
      const { subtaskId } = req.params;
      await subtaskService.unarchiveSubtask(subtaskId);
      
      res.status(200).json({
        success: true,
        message: 'Subtask unarchived successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to unarchive subtask'
      });
    }
  }

  async addComment(req, res) {
    try {
      const { subtaskId } = req.params;
      const { text } = req.body;
      const userId = req.user._id;
      const userName = req.user.username;

      if (!text || text.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Comment text is required'
        });
      }

      const subtask = await Subtask.findById(subtaskId);

      if (!subtask) {
        return res.status(404).json({
          success: false,
          message: 'Subtask not found'
        });
      }

      // Add the comment
      const comment = {
        text: text.trim(),
        author: userId,
        authorName: userName,
        createdAt: new Date()
      };

      subtask.comments = subtask.comments || [];
      subtask.comments.push(comment);
      await subtask.save();

      res.status(200).json({
        success: true,
        message: 'Comment added successfully',
        data: subtask
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async editComment(req, res) {
    try {
      const { subtaskId, commentId } = req.params;
      const { text } = req.body;
      const userId = req.user._id;

      // Validate comment text
      if (!text || text.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Comment text is required'
        });
      }

      const subtask = await Subtask.findById(subtaskId);

      if (!subtask) {
        return res.status(404).json({
          success: false,
          message: 'Subtask not found'
        });
      }

      // Find the comment
      const comment = subtask.comments.id(commentId);

      if (!comment) {
        return res.status(404).json({
          success: false,
          message: 'Comment not found'
        });
      }

      // Check if the user is the author of the comment
      if (comment.author.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only edit your own comments'
        });
      }

      // Update the comment text
      comment.text = text.trim();
      await subtask.save();

      // Fetch the updated subtask without populated fields to avoid circular references
      const updatedSubtask = await Subtask.findById(subtaskId).lean();

      res.status(200).json({
        success: true,
        message: 'Comment updated successfully',
        data: updatedSubtask
      });
    } catch (error) {
      console.error('Error editing comment:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async deleteComment(req, res) {
    try {
      const { subtaskId, commentId } = req.params;
      const userId = req.user._id;
      const userRoles = req.user.roles || [];

      // Check if user is an admin - only admins can delete comments
      if (!userRoles.includes('admin')) {
        return res.status(403).json({
          success: false,
          message: 'Only admins can delete comments'
        });
      }

      const subtask = await Subtask.findById(subtaskId);

      if (!subtask) {
        return res.status(404).json({
          success: false,
          message: 'Subtask not found'
        });
      }

      // Find the comment
      const comment = subtask.comments.id(commentId);

      if (!comment) {
        return res.status(404).json({
          success: false,
          message: 'Comment not found'
        });
      }

      // Admin can delete any comment (no ownership check needed)
      // Remove the comment
      comment.deleteOne();
      await subtask.save();

      res.status(200).json({
        success: true,
        message: 'Comment deleted successfully',
        data: subtask
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Manual Time Logging: Update subtask time taken
   */
  async updateSubtaskTimeTaken(req, res) {
    try {
      const { subtaskId } = req.params;
      const { timeTaken } = req.body;

      const subtask = await subtaskService.updateSubtaskTimeTaken(subtaskId, timeTaken);

      res.status(200).json({
        success: true,
        message: 'Subtask time logged successfully',
        data: subtask
      });
    } catch (error) {
      console.error('❌ Error logging subtask time:', error);

      let statusCode = 400;
      if (error.message === 'Subtask not found') {
        statusCode = 404;
      } else if (error.message === 'Time taken cannot be blank') {
        statusCode = 400;
      } else if (error.message.includes('positive number')) {
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Manual Time Logging: Get subtask total time
   */
  async getSubtaskTotalTime(req, res) {
    try {
      const { subtaskId } = req.params;

      const subtask = await subtaskService.getSubtaskById(subtaskId);
      
      res.status(200).json({
        success: true,
        data: {
          subtaskId: subtaskId,
          timeTaken: subtask.timeTaken || 0
        }
      });
    } catch (error) {
      console.error('❌ Error getting subtask time:', error);

      let statusCode = 400;
      if (error.message === 'Subtask not found') {
        statusCode = 404;
      }

      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }
}

export default new SubtaskController();

