import Subtask from '../models/subtask.model.js';
import Task from '../models/task.model.js';
import Project from '../models/project.model.js';
import User from '../models/user.model.js';

class SubtaskService {
  /**
   * Create a new subtask
   */
  async createSubtask(subtaskData) {
    try {
      // Verify parent task exists
      const parentTask = await Task.findById(subtaskData.parentTaskId);
      if (!parentTask) {
        throw new Error('Parent task not found');
      }

      // Verify project exists
      const project = await Project.findById(subtaskData.projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      const subtask = new Subtask({
        title: subtaskData.title,
        description: subtaskData.description,
        parentTaskId: subtaskData.parentTaskId,
        projectId: subtaskData.projectId,
        status: subtaskData.status || 'To Do',
        priority: subtaskData.priority || 'Medium',
        assigneeId: subtaskData.assigneeId,
        ownerId: subtaskData.ownerId,
        dueDate: subtaskData.dueDate
      });

      await subtask.save();
      return subtask;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all subtasks for a parent task (excluding archived)
   */
  async getSubtasksByParentTask(parentTaskId) {
    try {
      const subtasks = await Subtask.find({
        parentTaskId,
        status: { $ne: 'Archived' }
      })
        .populate('assigneeId', 'username department')
        .populate('ownerId', 'username department')
        .sort({ createdAt: -1 });
      
      return subtasks;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all subtasks for a project (excluding archived)
   */
  async getSubtasksByProject(projectId) {
    try {
      const subtasks = await Subtask.find({
        projectId,
        status: { $ne: 'Archived' }
      })
        .populate('assigneeId', 'username department')
        .populate('ownerId', 'username department')
        .populate('parentTaskId', 'title')
        .sort({ createdAt: -1 });
      
      return subtasks;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a subtask by ID
   */
  async getSubtaskById(subtaskId) {
    try {
      const subtask = await Subtask.findById(subtaskId)
        .populate('assigneeId', 'username department')
        .populate('ownerId', 'username department')
        .populate('parentTaskId', 'title');
      
      if (!subtask) {
        throw new Error('Subtask not found');
      }
      
      return subtask;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update a subtask
   */
  async updateSubtask(subtaskId, updateData) {
    try {
      const subtask = await Subtask.findById(subtaskId);
      
      if (!subtask) {
        throw new Error('Subtask not found');
      }

      // Update fields
      if (updateData.title !== undefined) subtask.title = updateData.title;
      if (updateData.description !== undefined) subtask.description = updateData.description;
      if (updateData.status !== undefined) subtask.status = updateData.status;
      if (updateData.priority !== undefined) subtask.priority = updateData.priority;
      if (updateData.assigneeId !== undefined) subtask.assigneeId = updateData.assigneeId;
      if (updateData.dueDate !== undefined) subtask.dueDate = updateData.dueDate;

      await subtask.save();
      
      // Populate before returning
      await subtask.populate('assigneeId', 'username department');
      await subtask.populate('ownerId', 'username department');
      await subtask.populate('parentTaskId', 'title');
      
      return subtask;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Soft delete a subtask (mark as Archived)
   */
  async deleteSubtask(subtaskId) {
    try {
      const subtask = await Subtask.findById(subtaskId);
      
      if (!subtask) {
        throw new Error('Subtask not found');
      }

      // Soft delete by changing status to Archived
      subtask.status = 'Archived';
      await subtask.save();
      
      return subtask;
    } catch (error) {
      throw error;
    }
  }
}

export default new SubtaskService();

