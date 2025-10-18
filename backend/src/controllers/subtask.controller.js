import subtaskService from '../services/subtask.services.js';

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
      
      // Get original subtask to check recurrence
      const originalSubtask = await subtaskService.getSubtaskById(subtaskId);
      const originalStatus = originalSubtask.status;
      
      const subtask = await subtaskService.updateSubtask(subtaskId, updateData);
      
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
}

export default new SubtaskController();

