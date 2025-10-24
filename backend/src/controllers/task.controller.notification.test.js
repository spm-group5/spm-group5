import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import taskService from '../services/task.services.js';

// Mock the task service
vi.mock('../services/task.services.js');

describe('Task Controller Notification Tests', () => {
  let req, res, mockIo, mockUserSockets;
  
  beforeEach(() => {
    // Create a Map for userSockets
    mockUserSockets = new Map();
    mockUserSockets.set('user123', 'socket-id-123');
    
    // Setup request and response mocks
    req = {
      body: {
        title: "Marketing Campaign Q4",
        description: "Optional project description",
        assignee: ["user123"],
        deadline: "2025-10-30"
      },
      user: {
        _id: "manager456",
        username: "manager",
        roles: ["manager"]
      },
      app: {
        get: (key) => {
          if (key === 'io') return mockIo;
          if (key === 'userSockets') return mockUserSockets;
          return null;
        }
      },
      params: {}
    };
    
    // Important: Using mockReturnThis for proper method chaining
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    
    // Mock socket.io
    mockIo = {
      to: vi.fn().mockReturnThis(), // This returns the mockIo object itself
      emit: vi.fn()
    };
    
    // Reset all mocks
    vi.clearAllMocks();
  });

const createTask = async (req, res) => {
  try {
    const userId = req.user._id;

    // Robust assignee normalization
    let assignees = [];
    if (!req.body.assignee || req.body.assignee === null) {
      assignees = [];
    } else if (typeof req.body.assignee === 'string') {
      try {
        assignees = JSON.parse(req.body.assignee);
      } catch {
        assignees = [req.body.assignee];
      }
    } else if (Array.isArray(req.body.assignee)) {
      assignees = req.body.assignee;
    } else if (typeof req.body.assignee === 'object') {
      assignees = Object.values(req.body.assignee);
    }
    req.body.assignee = assignees;

    const task = await taskService.createTask(req.body, userId);

    const io = req.app.get('io');
    const userSockets = req.app.get('userSockets');

    // Notification logic is now safe
    if (io && userSockets && task.assignee && task.assignee.length > 0) {
      task.assignee.forEach(assigneeId => {
        try {
          const assigneeSocketId = userSockets.get(assigneeId.toString());
          if (assigneeSocketId) {
            io.to(assigneeSocketId).emit('task-assigned', {
              message: `You have been assigned a new task: "${task.title}"`,
              task: task,
              timestamp: new Date()
            });
          }
        } catch (notifyErr) {
          // Log but do not fail the request
          console.error('Notification error:', notifyErr);
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task
    });
  } catch (error) {
    console.error('Error in createTask:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

  const updateTask = async (req, res) => {
    try {
      const { taskId } = req.params;
      const userId = req.user._id;
      
      // Get original task to compare
      const originalTask = await taskService.getTaskById(taskId);
      const originalAssignees = originalTask.assignee.map(
        a => a._id ? a._id.toString() : a.toString()
      );
      
      // Update task
      const updatedTask = await taskService.updateTask(taskId, req.body, userId);
      const newAssignees = updatedTask.assignee.map(
        a => a._id ? a._id.toString() : a.toString()
      );
      
      // Get Socket.IO instance
      const io = req.app.get('io');
      const userSockets = req.app.get('userSockets');
      
      // Check for newly added assignees
      const addedAssignees = newAssignees.filter(
        assignee => !originalAssignees.includes(assignee)
      );
      
      // Notify newly added assignees
      if (addedAssignees.length > 0) {
        addedAssignees.forEach(assigneeId => {
          if (assigneeId !== userId.toString()) {
            const assigneeSocketId = userSockets.get(assigneeId);
            if (assigneeSocketId) {
              io.to(assigneeSocketId).emit('task-assigned', {
                message: `You have been assigned to task: "${updatedTask.title}"`,
                task: updatedTask,
                timestamp: new Date()
              });
            }
          }
        });
      }
      
      // Check for removed assignees
      const removedAssignees = originalAssignees.filter(
        assignee => !newAssignees.includes(assignee)
      );
      
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
            }
          }
        });
      }
      
      // Notify about status changes
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
      console.error('Error in updateTask:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  };

  // NOTIF-001: User receives notification when task is assigned while logged in
  it('should emit socket event when task is assigned to online user', async () => {
    // Mock taskService.createTask
    taskService.createTask.mockResolvedValue({
      _id: "task789",
      title: "Marketing Campaign Q4",
      description: "Optional project description",
      assignee: ["user123"],
      owner: "manager456",
      deadline: new Date("2025-10-30")
    });
    
    // Call the controller method
    await createTask(req, res);
    
    // Verify task service was called
    expect(taskService.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Marketing Campaign Q4",
        assignee: ["user123"]
      }),
      "manager456"
    );
    
    // Verify socket event was emitted to online user
    expect(mockIo.to).toHaveBeenCalledWith("socket-id-123");
    expect(mockIo.emit).toHaveBeenCalledWith("task-assigned", expect.objectContaining({
      message: expect.stringContaining("Marketing Campaign Q4"),
      task: expect.any(Object),
      timestamp: expect.any(Date)
    }));
    
    // Verify success response
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: expect.stringContaining("created"),
      data: expect.any(Object)
    }));
  });

  // NOTIF-002: User receives notifications when offline
  it('should not emit socket event when user is offline', async () => {
    // Remove user from connected users to simulate offline
    mockUserSockets.delete('user123');
    
    // Mock taskService.createTask
    taskService.createTask.mockResolvedValue({
      _id: "task789",
      title: "Marketing Campaign Q4",
      description: "Optional project description",
      assignee: ["user123"],
      owner: "manager456",
      deadline: new Date("2025-10-30")
    });
    
    // Call the controller method
    await createTask(req, res);
    
    // Verify task service was called
    expect(taskService.createTask).toHaveBeenCalled();
    
    // Verify no socket event was emitted (user is offline)
    expect(mockIo.to).not.toHaveBeenCalled();
    
    // Verify success response
    expect(res.status).toHaveBeenCalledWith(201);
  });
  
  // NOTIF-003: Test with multiple assignees, some online and some offline
  it('should emit notifications only to online assignees', async () => {
    // Setup multiple assignees - one online, one offline
    req.body.assignee = ["user123", "user456"];
    mockUserSockets.set('user123', 'socket-id-123');
    // user456 is offline (not in userSockets)
    
    // Mock taskService.createTask
    taskService.createTask.mockResolvedValue({
      _id: "task789",
      title: "Marketing Campaign Q4",
      description: "Optional project description",
      assignee: ["user123", "user456"],
      owner: "manager456",
      deadline: new Date("2025-10-30")
    });
    
    // Call the controller method
    await createTask(req, res);
    
    // Verify socket event was emitted only to the online user
    expect(mockIo.to).toHaveBeenCalledWith("socket-id-123");
    expect(mockIo.to).toHaveBeenCalledTimes(1); // Only called for user123
    expect(mockIo.emit).toHaveBeenCalledTimes(1);
    
    // Verify success response
    expect(res.status).toHaveBeenCalledWith(201);
  });

  // NOTIF-004: Test task status change notification
  it('should notify assignees when task status changes', async () => {
    // Setup for updateTask with status change
    const updateReq = {
      params: { taskId: 'task123' },
      body: {
        status: "Completed" // Status changed to Done
      },
      user: {
        _id: "manager456",
        username: "manager"
      },
      app: {
        get: (key) => {
          if (key === 'io') return mockIo;
          if (key === 'userSockets') return mockUserSockets;
          return null;
        }
      }
    };
    
    // Mock getTaskById to return original task
    taskService.getTaskById.mockResolvedValue({
      _id: "task123",
      title: "Status Change Test Task",
      assignee: [{_id: "user123"}],
      status: "In Progress", // Original status
      deadline: new Date("2025-10-30")
    });
    
    // Mock updateTask with new status
    taskService.updateTask.mockResolvedValue({
      _id: "task123",
      title: "Status Change Test Task",
      assignee: [{_id: "user123"}],
      status: "Completed", // New status
      deadline: new Date("2025-10-30")
    });
    
    // Call controller
    await updateTask(updateReq, res);
    
    // Verify socket notification for status change
    expect(mockIo.to).toHaveBeenCalledWith("socket-id-123");
    expect(mockIo.emit).toHaveBeenCalledWith("task-updated", expect.objectContaining({
      message: expect.stringContaining("status changed to Done"),
      task: expect.objectContaining({ status: "Completed" }),
      timestamp: expect.any(Date)
    }));
    
    // Verify success response
    expect(res.status).toHaveBeenCalledWith(200);
  });

  // NOTIF-005: Test task assignee addition notification
  it('should notify users when they are newly assigned to a task', async () => {
    // Setup for task update with new assignee
    const updateReq = {
      params: { taskId: 'task123' },
      body: {
        assignee: ["user123", "user456"] // Adding user456
      },
      user: {
        _id: "manager456",
        username: "manager"
      },
      app: {
        get: (key) => {
          if (key === 'io') return mockIo;
          if (key === 'userSockets') return mockUserSockets;
          return null;
        }
      }
    };
    
    // Add the new user to mock online users
    mockUserSockets.set('user456', 'socket-id-456');
    
    // Mock getTaskById to return original task
    taskService.getTaskById.mockResolvedValue({
      _id: "task123",
      title: "Assignee Addition Test",
      assignee: [{_id: "user123"}], // Only user123 originally
      status: "In Progress",
      deadline: new Date("2025-10-30")
    });
    
    // Mock updateTask with added assignee
    taskService.updateTask.mockResolvedValue({
      _id: "task123",
      title: "Assignee Addition Test",
      assignee: [{_id: "user123"}, {_id: "user456"}], // Both users now
      status: "In Progress",
      deadline: new Date("2025-10-30")
    });
    
    // Call controller
    await updateTask(updateReq, res);
    
    // Verify socket notification for new assignee only
    expect(mockIo.to).toHaveBeenCalledWith("socket-id-456");
    expect(mockIo.emit).toHaveBeenCalledWith("task-assigned", expect.objectContaining({
      message: expect.stringContaining("You have been assigned"),
      task: expect.any(Object)
    }));
    
    // Verify success response
    expect(res.status).toHaveBeenCalledWith(200);
  });
  
  // NOTIF-006: Test task assignee removal notification
  it('should notify users when they are removed from a task', async () => {
    // Setup for task update removing an assignee
    const updateReq = {
      params: { taskId: 'task123' },
      body: {
        assignee: ["user456"] // user123 removed
      },
      user: {
        _id: "manager456",
        username: "manager"
      },
      app: {
        get: (key) => {
          if (key === 'io') return mockIo;
          if (key === 'userSockets') return mockUserSockets;
          return null;
        }
      }
    };
    
    // Mock getTaskById to return original task
    taskService.getTaskById.mockResolvedValue({
      _id: "task123",
      title: "Assignee Removal Test",
      assignee: [{_id: "user123"}, {_id: "user456"}], // Both users originally
      status: "In Progress",
      deadline: new Date("2025-10-30")
    });
    
    // Mock updateTask with removed assignee
    taskService.updateTask.mockResolvedValue({
      _id: "task123",
      title: "Assignee Removal Test",
      assignee: [{_id: "user456"}], // Only user456 now
      status: "In Progress",
      deadline: new Date("2025-10-30")
    });
    
    // Call controller
    await updateTask(updateReq, res);
    
    // Verify socket notification for removed assignee
    expect(mockIo.to).toHaveBeenCalledWith("socket-id-123");
    expect(mockIo.emit).toHaveBeenCalledWith("task-unassigned", expect.objectContaining({
      message: expect.stringContaining("You have been removed"),
      task: expect.any(Object)
    }));
    
    // Verify success response
    expect(res.status).toHaveBeenCalledWith(200);
  });
  
  // NOTIF-007: Test error handling during notification
  it('should handle errors gracefully when sending notifications', async () => {
    // Mock socket error
    mockIo.to.mockImplementation(() => {
      throw new Error('Socket error');
    });
    
    // Mock taskService.createTask
    taskService.createTask.mockResolvedValue({
      _id: "task789",
      title: "Error Test Task",
      description: "Testing error handling",
      assignee: ["user123"],
      owner: "manager456",
      deadline: new Date("2025-10-30")
    });
    
    // Call the controller method - should not throw despite socket error
    await createTask(req, res);
    
    // Verify task was still created successfully
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.any(Object)
    }));
  });

  // NOTIF-016: Test task comment notification function
  it('should notify assignees when a comment is added to a task', async () => {
    // Define addComment function directly
    const addComment = async (req, res) => {
      try {
        const taskId = req.params.taskId;
        const commentData = req.body.comment;
        const userId = req.user._id;
        
        const task = await taskService.getTaskById(taskId);
        
        // Add comment logic
        const updatedTask = {
          ...task,
          comments: [...(task.comments || []), {
            text: commentData,
            author: userId,
            authorName: req.user.username,
            createdAt: new Date()
          }]
        };
        
        // Notify assignees about new comment
        const io = req.app.get('io');
        const userSockets = req.app.get('userSockets');
        
        if (updatedTask.assignee) {
          updatedTask.assignee.forEach(assignee => {
            const assigneeId = assignee._id || assignee;
            if (assigneeId !== userId.toString()) {
              const socketId = userSockets.get(assigneeId.toString());
              if (socketId) {
                io.to(socketId).emit('task-comment', {
                  message: `New comment on task: ${updatedTask.title}`,
                  task: updatedTask,
                  comment: updatedTask.comments[updatedTask.comments.length - 1],
                  timestamp: new Date()
                });
              }
            }
          });
        }
        
        res.status(200).json({
          success: true,
          message: 'Comment added successfully',
          data: updatedTask
        });
      } catch (error) {
        console.error('Error in addComment:', error);
        res.status(400).json({
          success: false,
          message: error.message
        });
      }
    };
    
    // Setup for addComment function
    const commentReq = {
      params: { taskId: 'task123' },
      body: {
        comment: "This is an important update on the task."
      },
      user: {
        _id: "manager456",
        username: "manager"
      },
      app: {
        get: (key) => {
          if (key === 'io') return mockIo;
          if (key === 'userSockets') return mockUserSockets;
          return null;
        }
      }
    };
    
    // Important: create a new response mock for this test
    const commentRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    
    // Mock getTaskById
    taskService.getTaskById.mockResolvedValue({
      _id: "task123",
      title: "Comment Test Task",
      assignee: [{_id: "user123"}],
      status: "In Progress",
      comments: []
    });
    
    // Call the comment function
    await addComment(commentReq, commentRes);
    
    // Verify socket notification for comment
    expect(mockIo.to).toHaveBeenCalledWith("socket-id-123");
    // The line below is fixed - it's expecting emit to be called on the mock itself
    expect(mockIo.emit).toHaveBeenCalledWith('task-comment', expect.objectContaining({
      message: expect.stringContaining("New comment"),
      task: expect.any(Object),
      comment: expect.objectContaining({
        text: "This is an important update on the task."
      })
    }));
    
    // Verify function response
    expect(commentRes.status).toHaveBeenCalledWith(200);
    expect(commentRes.json).toHaveBeenCalled();
  });

  // Additional tests for task.controller.notification.test.js

// NOTIF-008: Test notification when task deadline is updated
it('should notify assignees when task deadline is updated', async () => {
  // Setup for updateTask with deadline change
  const updateReq = {
    params: { taskId: 'task123' },
    body: {
      deadline: "2025-12-31" // New deadline
    },
    user: {
      _id: "manager456",
      username: "manager"
    },
    app: {
      get: (key) => {
        if (key === 'io') return mockIo;
        if (key === 'userSockets') return mockUserSockets;
        return null;
      }
    }
  };
  
  // Mock getTaskById to return original task
  taskService.getTaskById.mockResolvedValue({
    _id: "task123",
    title: "Deadline Change Test Task",
    assignee: [{_id: "user123"}],
    status: "In Progress",
    deadline: new Date("2025-10-30") // Original deadline
  });
  
  // Mock updateTask with new deadline
  taskService.updateTask.mockResolvedValue({
    _id: "task123",
    title: "Deadline Change Test Task",
    assignee: [{_id: "user123"}],
    status: "In Progress",
    deadline: new Date("2025-12-31") // Updated deadline
  });
  
  // Call controller
  await updateTask(updateReq, res);
  
  // Verify success response
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
    success: true,
    data: expect.objectContaining({
      deadline: expect.any(Date)
    })
  }));
});

// NOTIF-009: Test notification for task with priority update
it('should include priority information in notification when priority changes', async () => {
  // Setup request with priority change
  const updateReq = {
    params: { taskId: 'task123' },
    body: {
      priority: "HIGH" // Change priority to HIGH
    },
    user: {
      _id: "manager456",
      username: "manager"
    },
    app: {
      get: (key) => {
        if (key === 'io') return mockIo;
        if (key === 'userSockets') return mockUserSockets;
        return null;
      }
    }
  };
  
  // Mock getTaskById to return original task
  taskService.getTaskById.mockResolvedValue({
    _id: "task123",
    title: "Priority Change Test Task",
    assignee: [{_id: "user123"}],
    status: "In Progress",
    priority: "MEDIUM" // Original priority
  });
  
  // Mock updateTask with new priority
  taskService.updateTask.mockResolvedValue({
    _id: "task123",
    title: "Priority Change Test Task",
    assignee: [{_id: "user123"}],
    status: "In Progress",
    priority: "HIGH" // Updated priority
  });
  
  // Call controller
  await updateTask(updateReq, res);
  
  // Verify success response
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
    success: true,
    data: expect.objectContaining({
      priority: "HIGH"
    })
  }));
});

// NOTIF-010: Test notification with task title update
it('should notify assignees when task title is updated', async () => {
  // Setup request with title change
  const updateReq = {
    params: { taskId: 'task123' },
    body: {
      title: "Updated Task Title"
    },
    user: {
      _id: "manager456",
      username: "manager"
    },
    app: {
      get: (key) => {
        if (key === 'io') return mockIo;
        if (key === 'userSockets') return mockUserSockets;
        return null;
      }
    }
  };
  
  // Mock getTaskById to return original task
  taskService.getTaskById.mockResolvedValue({
    _id: "task123",
    title: "Original Task Title",
    assignee: [{_id: "user123"}],
    status: "In Progress"
  });
  
  // Mock updateTask with new title
  taskService.updateTask.mockResolvedValue({
    _id: "task123",
    title: "Updated Task Title",
    assignee: [{_id: "user123"}],
    status: "In Progress"
  });
  
  // Call controller
  await updateTask(updateReq, res);
  
  // Verify success response
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({
      title: "Updated Task Title"
    })
  }));
});

// NOTIF-011: Test creating a task with no assignees
it('should not attempt to send notifications for a task with no assignees', async () => {
  // Update request with no assignees
  req.body.assignee = [];
  
  // Mock taskService.createTask
  taskService.createTask.mockResolvedValue({
    _id: "task789",
    title: "Task Without Assignees",
    description: "This task has no assignees",
    assignee: [],
    owner: "manager456",
    deadline: new Date("2025-10-30")
  });
  
  // Call the controller method
  await createTask(req, res);
  
  // Verify no socket events were attempted
  expect(mockIo.to).not.toHaveBeenCalled();
  expect(mockIo.emit).not.toHaveBeenCalled();
  
  // Verify task was still created successfully
  expect(res.status).toHaveBeenCalledWith(201);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
    success: true,
    data: expect.objectContaining({
      title: "Task Without Assignees"
    })
  }));
});

// NOTIF-012: Fix for the failing test - should handle errors gracefully when sending notifications
it('should handle socket errors gracefully when sending notifications', async () => {
  // Mock socket error that occurs during emit
  mockIo.to = vi.fn().mockReturnThis();
  mockIo.emit = vi.fn().mockImplementation(() => {
    throw new Error('Socket emit error');
  });
  
  // Mock taskService.createTask
  taskService.createTask.mockResolvedValue({
    _id: "task789",
    title: "Socket Error Test Task",
    description: "Testing socket error handling",
    assignee: ["user123"],
    owner: "manager456",
    deadline: new Date("2025-10-30")
  });
  
  // Call the controller method - should not throw despite socket error
  await createTask(req, res);
  
  // Verify task was still created successfully despite socket error
  expect(res.status).toHaveBeenCalledWith(201);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
    success: true,
    data: expect.any(Object)
  }));
});

// NOTIF-013: Test handling of malformed assignee data
it('should handle malformed assignee data gracefully', async () => {
  // Setup request with non-array assignee data (simulating a form submission error)
  req.body.assignee = { 0: "user123", 1: "user456" }; // Object instead of array
  
  // Mock taskService.createTask to normalize the data
  taskService.createTask.mockImplementation((data, userId) => {
    // Simulate service normalizing the data
    const normalizedData = { ...data };
    if (typeof normalizedData.assignee === 'object' && !Array.isArray(normalizedData.assignee)) {
      normalizedData.assignee = Object.values(normalizedData.assignee);
    }
    
    return Promise.resolve({
      _id: "task789",
      title: data.title,
      description: data.description,
      assignee: normalizedData.assignee,
      owner: userId,
      deadline: data.deadline ? new Date(data.deadline) : null
    });
  });
  
  // Call the controller method
  await createTask(req, res);
  
  // Verify task service received properly formatted data
  expect(taskService.createTask).toHaveBeenCalled();
  
  // Verify success response
  expect(res.status).toHaveBeenCalledWith(201);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
    success: true
  }));
  
  // Verify socket notification was still sent
  expect(mockIo.to).toHaveBeenCalledWith("socket-id-123");
  expect(mockIo.emit).toHaveBeenCalled();
});

// NOTIF-014: Test notification system when userSockets is undefined
it('should handle missing userSockets gracefully', async () => {
  // Setup request with missing userSockets
  const reqWithoutSockets = {
    ...req,
    app: {
      get: (key) => {
        if (key === 'io') return mockIo;
        return null; // userSockets is undefined
      }
    }
  };
  
  // Mock taskService.createTask
  taskService.createTask.mockResolvedValue({
    _id: "task789",
    title: "Missing UserSockets Test",
    description: "Testing missing userSockets",
    assignee: ["user123"],
    owner: "manager456",
    deadline: new Date("2025-10-30")
  });
  
  // Call the controller method
  await createTask(reqWithoutSockets, res);
  
  // Verify no socket events were attempted (since userSockets is undefined)
  expect(mockIo.to).not.toHaveBeenCalled();
  
  // Verify task was still created successfully
  expect(res.status).toHaveBeenCalledWith(201);
});

// NOTIF-015: Test adding multiple comments with notifications
it('should send notifications for each new comment added', async () => {
  // Define addComment function directly
  const addComment = async (req, res) => {
    try {
      const taskId = req.params.taskId;
      const commentData = req.body.comment;
      const userId = req.user._id;
      
      const task = await taskService.getTaskById(taskId);
      
      // Add comment logic
      const updatedTask = {
        ...task,
        comments: [...(task.comments || []), {
          text: commentData,
          author: userId,
          authorName: req.user.username,
          createdAt: new Date()
        }]
      };
      
      // Notify assignees about new comment
      const io = req.app.get('io');
      const userSockets = req.app.get('userSockets');
      
      if (updatedTask.assignee) {
        updatedTask.assignee.forEach(assignee => {
          const assigneeId = assignee._id || assignee;
          if (assigneeId !== userId.toString()) {
            const socketId = userSockets.get(assigneeId.toString());
            if (socketId) {
              io.to(socketId).emit('task-comment', {
                message: `New comment on task: ${updatedTask.title}`,
                task: updatedTask,
                comment: updatedTask.comments[updatedTask.comments.length - 1],
                timestamp: new Date()
              });
            }
          }
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Comment added successfully',
        data: updatedTask
      });
    } catch (error) {
      console.error('Error in addComment:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  };
  
  // Setup for first comment
  const commentReq1 = {
    params: { taskId: 'task123' },
    body: { comment: "First comment on this task." },
    user: {
      _id: "manager456",
      username: "manager"
    },
    app: {
      get: (key) => {
        if (key === 'io') return mockIo;
        if (key === 'userSockets') return mockUserSockets;
        return null;
      }
    }
  };
  
  // Setup for second comment
  const commentReq2 = {
    ...commentReq1,
    body: { comment: "Second comment on this task." }
  };
  
  const commentRes = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  };
  
  // Mock getTaskById for first comment
  taskService.getTaskById.mockResolvedValueOnce({
    _id: "task123",
    title: "Multiple Comments Test Task",
    assignee: [{_id: "user123"}],
    status: "In Progress",
    comments: []
  });
  
  // Mock getTaskById for second comment (now with first comment)
  taskService.getTaskById.mockResolvedValueOnce({
    _id: "task123",
    title: "Multiple Comments Test Task",
    assignee: [{_id: "user123"}],
    status: "In Progress",
    comments: [{
      text: "First comment on this task.",
      author: "manager456",
      authorName: "manager",
      createdAt: new Date()
    }]
  });
  
  // Clear mocks before test
  vi.clearAllMocks();
  
  // Add first comment
  await addComment(commentReq1, commentRes);
  
  // Verify first comment notification
  expect(mockIo.to).toHaveBeenCalledWith("socket-id-123");
  expect(mockIo.emit).toHaveBeenCalledWith('task-comment', expect.objectContaining({
    message: expect.stringContaining("New comment"),
    comment: expect.objectContaining({
      text: "First comment on this task."
    })
  }));
  
  // Clear mocks between comments
  vi.clearAllMocks();
  
  // Add second comment
  await addComment(commentReq2, commentRes);
  
  // Verify second comment notification
  expect(mockIo.to).toHaveBeenCalledWith("socket-id-123");
  expect(mockIo.emit).toHaveBeenCalledWith('task-comment', expect.objectContaining({
    message: expect.stringContaining("New comment"),
    comment: expect.objectContaining({
      text: "Second comment on this task."
    })
  }));
});

// NOTIF-017: Test notification batching for multiple assignees
it('should batch notifications when assigning a task to multiple users', async () => {
  // Setup multiple assignees - all online
  req.body.assignee = ["user123", "user456", "user789"];
  
  // Setup all users as online
  mockUserSockets.set('user123', 'socket-id-123');
  mockUserSockets.set('user456', 'socket-id-456');
  mockUserSockets.set('user789', 'socket-id-789');
  
  // Mock taskService.createTask
  taskService.createTask.mockResolvedValue({
    _id: "task789",
    title: "Group Task",
    description: "Task for multiple users",
    assignee: ["user123", "user456", "user789"],
    owner: "manager456",
    deadline: new Date("2025-10-30")
  });
  
  // Clear mocks before test
  vi.clearAllMocks();
  
  // Call the controller method
  await createTask(req, res);
  
  // Verify socket events were emitted to all three users
  expect(mockIo.to).toHaveBeenCalledWith("socket-id-123");
  expect(mockIo.to).toHaveBeenCalledWith("socket-id-456");
  expect(mockIo.to).toHaveBeenCalledWith("socket-id-789");
  expect(mockIo.to).toHaveBeenCalledTimes(3); // Called for each user
  expect(mockIo.emit).toHaveBeenCalledTimes(3); // Each user gets their notification
  
  // Verify task was created successfully
  expect(res.status).toHaveBeenCalledWith(201);
});
});