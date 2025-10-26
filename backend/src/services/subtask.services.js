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

      // Validate recurrence settings
      if (subtaskData.isRecurring) {
        if (!subtaskData.recurrenceInterval || subtaskData.recurrenceInterval <= 0) {
          throw new Error('Recurrence interval must be a positive number for recurring subtasks');
        }
        if (!subtaskData.dueDate) {
          throw new Error('Due date is required for recurring subtasks');
        }
      }

      // Validate time format if provided
      if (subtaskData.timeTaken && subtaskData.timeTaken.trim() !== '') {
        const tempSubtask = new Subtask();
        if (!tempSubtask.isValidTimeFormat(subtaskData.timeTaken)) {
          throw new Error('Time must be in 15-minute increments (e.g., "15 minutes", "1 hour", "1 hour 15 minutes")');
        }
      }

      const subtask = new Subtask({
        title: subtaskData.title,
        description: subtaskData.description,
        parentTaskId: subtaskData.parentTaskId,
        projectId: subtaskData.projectId,
        status: subtaskData.status || 'To Do',
        priority: subtaskData.priority || 5,
        assigneeId: subtaskData.assigneeId,
        ownerId: subtaskData.ownerId,
        dueDate: subtaskData.dueDate,
        isRecurring: subtaskData.isRecurring || false,
        recurrenceInterval: subtaskData.recurrenceInterval || null,
        timeTaken: subtaskData.timeTaken !== undefined ? subtaskData.timeTaken : ''
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
        archived: false
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
        archived: false
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

      // Validate time format if provided
      if (updateData.timeTaken !== undefined && updateData.timeTaken && updateData.timeTaken.trim() !== '') {
        if (!subtask.isValidTimeFormat(updateData.timeTaken)) {
          throw new Error('Time must be in 15-minute increments (e.g., "15 minutes", "1 hour", "1 hour 15 minutes")');
        }
      }

      // Update fields
      if (updateData.title !== undefined) subtask.title = updateData.title;
      if (updateData.description !== undefined) subtask.description = updateData.description;
      if (updateData.status !== undefined) subtask.status = updateData.status;
      if (updateData.priority !== undefined) subtask.priority = updateData.priority;
      if (updateData.assigneeId !== undefined) subtask.assigneeId = updateData.assigneeId;
      if (updateData.dueDate !== undefined) subtask.dueDate = updateData.dueDate;
      if (updateData.isRecurring !== undefined) subtask.isRecurring = updateData.isRecurring;
      if (updateData.recurrenceInterval !== undefined) subtask.recurrenceInterval = updateData.recurrenceInterval;
      if (updateData.timeTaken !== undefined) subtask.timeTaken = updateData.timeTaken;

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
   * Archive a subtask
   */
  async archiveSubtask(subtaskId) {
    try {
      const subtask = await Subtask.findById(subtaskId);
      
      if (!subtask) {
        throw new Error('Subtask not found');
      }

      // Archive the subtask
      subtask.archived = true;
      subtask.archivedAt = new Date();
      await subtask.save();
      
      return subtask;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get archived subtasks for a parent task
   */
  async getArchivedSubtasksByParentTask(parentTaskId) {
    try {
      const subtasks = await Subtask.find({
        parentTaskId,
        archived: true
      })
        .populate('assigneeId', 'username department')
        .populate('ownerId', 'username department')
        .sort({ archivedAt: -1 });
      
      return subtasks;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Unarchive a subtask
   */
  async unarchiveSubtask(subtaskId) {
    try {
      const subtask = await Subtask.findById(subtaskId);
      
      if (!subtask) {
        throw new Error('Subtask not found');
      }

      // Unarchive the subtask
      subtask.archived = false;
      subtask.archivedAt = null;
      await subtask.save();
      
      return subtask;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a recurring subtask based on the original recurring subtask
   */
  async createRecurringSubtask(originalSubtask) {
    try {
      // Create a new subtask based on the original recurring subtask
      if (!originalSubtask.isRecurring) {
        return null;
      }

      // Calculate new due date based on original due date + interval
      const newDueDate = new Date(originalSubtask.dueDate);
      newDueDate.setDate(newDueDate.getDate() + originalSubtask.recurrenceInterval);

      const newSubtaskData = {
        title: originalSubtask.title,
        description: originalSubtask.description,
        parentTaskId: originalSubtask.parentTaskId,
        projectId: originalSubtask.projectId,
        status: 'To Do',
        priority: originalSubtask.priority,
        assigneeId: originalSubtask.assigneeId,
        ownerId: originalSubtask.ownerId,
        dueDate: newDueDate,
        isRecurring: originalSubtask.isRecurring,
        recurrenceInterval: originalSubtask.recurrenceInterval,
        timeTaken: ''
      };

      const newSubtask = new Subtask(newSubtaskData);
      return await newSubtask.save();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Format minutes to hours and minutes string
   */
  formatTime(minutes) {
    if (!minutes || minutes === 0) {
      return '';
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours === 0) {
      return `${remainingMinutes} minutes`;
    } else if (remainingMinutes === 0) {
      return hours === 1 ? '1 hour' : `${hours} hours`;
    } else {
      const hourText = hours === 1 ? 'hour' : 'hours';
      return `${hours} ${hourText} ${remainingMinutes} minutes`;
    }
  }

  /**
   * Parse time string to minutes
   */
  parseTimeToMinutes(timeString) {
    if (!timeString || typeof timeString !== 'string') {
      return 0;
    }

    const trimmedTime = timeString.trim();
    
    // Pattern for "X minutes"
    const minutesPattern = /^(\d+)\s+minutes$/;
    const minutesMatch = trimmedTime.match(minutesPattern);
    if (minutesMatch) {
      return parseInt(minutesMatch[1]);
    }

    // Pattern for "X hour" or "X hours"
    const hoursPattern = /^(\d+)\s+hours?$/;
    const hoursMatch = trimmedTime.match(hoursPattern);
    if (hoursMatch) {
      return parseInt(hoursMatch[1]) * 60;
    }

    // Pattern for "X hour Y minutes" or "X hours Y minutes"
    const hoursMinutesPattern = /^(\d+)\s+hours?\s+(\d+)\s+minutes$/;
    const hoursMinutesMatch = trimmedTime.match(hoursMinutesPattern);
    if (hoursMinutesMatch) {
      const hours = parseInt(hoursMinutesMatch[1]);
      const minutes = parseInt(hoursMinutesMatch[2]);
      return hours * 60 + minutes;
    }

    return 0;
  }

  /**
   * Validate 15-minute increment time format
   */
  isValidTimeFormat(timeString) {
    if (!timeString || typeof timeString !== 'string') {
      return false;
    }

    const trimmedTime = timeString.trim();
    
    // Pattern for "X minutes" - only allow 15, 30, 45 (not 60+ which should be hours)
    const minutesPattern = /^(\d+)\s+minutes$/;
    const minutesMatch = trimmedTime.match(minutesPattern);
    if (minutesMatch) {
      const minutes = parseInt(minutesMatch[1]);
      return minutes === 15 || minutes === 30 || minutes === 45;
    }

    // Pattern for "X hour" or "X hours" - any number of hours is valid
    const hoursPattern = /^(\d+)\s+hours?$/;
    const hoursMatch = trimmedTime.match(hoursPattern);
    if (hoursMatch) {
      return true; // Any number of hours is valid
    }

    // Pattern for "X hour Y minutes" or "X hours Y minutes" - Y must be 15, 30, or 45
    const hoursMinutesPattern = /^(\d+)\s+hours?\s+(15|30|45)\s+minutes$/;
    const hoursMinutesMatch = trimmedTime.match(hoursMinutesPattern);
    if (hoursMinutesMatch) {
      return true; // This pattern already ensures 15-minute increments
    }

    return false;
  }
}

export default new SubtaskService();

