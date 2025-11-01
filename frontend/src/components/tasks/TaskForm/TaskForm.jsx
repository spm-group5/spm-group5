import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { useProjects } from '../../../context/ProjectContext';
import { useAuth } from '../../../context/AuthContext';
import Button from '../../common/Button/Button';
import Input from '../../common/Input/Input';
import Card from '../../common/Card/Card';
import apiService from '../../../services/api';
import styles from './TaskForm.module.css';

function TaskForm({ task, onSubmit, onCancel, initialProject }) {
  const { projects } = useProjects();
  const { user } = useAuth();
  const isEditing = !!task;

  // Check if user is manager or admin (needed for UI rendering)
  const isManagerOrAdmin = user?.roles?.includes('manager') || user?.roles?.includes('admin');

  // Debug logging for edit mode
  if (isEditing) {
    console.log('📝 TaskForm in EDIT mode');
    console.log('  Task:', task);
    console.log('  Task project:', task?.project);
    console.log('  Task project _id:', task?.project?._id);
  }

  const [eligibleAssignees, setEligibleAssignees] = useState([]);
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [selectedAssignee, setSelectedAssignee] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      title: task?.title || '',
      description: task?.description || '',
      status: task?.status || 'To Do',
      priority: task?.priority || 5,
      dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      project: task?.project?._id || task?.project || initialProject || '',
      assignee: task?.assignee?.map(a => a._id || a) || [],
      tags: task?.tags || '',
      isRecurring: task?.isRecurring || false,
      recurrenceInterval: task?.recurrenceInterval || '',
    },
  });

  const watchedProject = watch('project');
  const watchedIsRecurring = watch('isRecurring');

  // Fetch all users for managers/admins in create mode, or all users in edit mode
  useEffect(() => {
    const fetchEligibleAssignees = async () => {
      console.log('🔄 fetchEligibleAssignees called', { watchedProject, isEditing, user });

      if (!watchedProject) {
        setEligibleAssignees([]);
        setSelectedAssignees([]);
        return;
      }

      const project = projects.find(p => p._id === watchedProject);
      if (!project) {
        setEligibleAssignees([]);
        return;
      }

      console.log('👤 User role check:', { isManagerOrAdmin, roles: user?.roles });

      let fetchedUsers = [];

      try {
        // In create mode: fetch all users for everyone (Staff, Manager, Admin)
        if (!isEditing) {
          try {
            console.log('📡 Fetching all users from /users endpoint...');
            const response = await apiService.request('/users');
            console.log('✅ Received response:', response);

            if (response.data && Array.isArray(response.data)) {
              // Log first user to see structure
              if (response.data.length > 0) {
                console.log('📊 First user structure:', response.data[0]);
                console.log('📊 First user _id:', response.data[0]._id);
                console.log('📊 First user id:', response.data[0].id);
              }

              // Transform to match expected format
              fetchedUsers = response.data.map(u => ({
                _id: u._id || u.id,  // Try both _id and id
                username: u.username,
                email: u.username,
                role: u.roles && u.roles.length > 0 ? u.roles[0] : 'staff',
                department: u.department
              }));
              console.log('✅ Transformed users:', fetchedUsers);
              console.log('✅ First transformed user:', fetchedUsers[0]);
              setEligibleAssignees(fetchedUsers);
            } else {
              // Fallback to project members if API fails
              console.log('⚠️ No data in response, using project members');
              fetchedUsers = project.members || [];
              setEligibleAssignees(fetchedUsers);
            }
          } catch (error) {
            console.error('❌ Failed to fetch all users, falling back to project members:', error);
            // Fallback to project members
            fetchedUsers = project.members || [];
            setEligibleAssignees(fetchedUsers);
          }
        } else {
          // For edit mode, we fetch task-specific assignees later
          console.log('📝 Edit mode - will fetch task-specific assignees');
        }
      } catch (error) {
        console.error('❌ Error fetching eligible assignees:', error);
        setEligibleAssignees(project.members || []);
      }
    };

    fetchEligibleAssignees();
  }, [watchedProject, projects, isEditing, user?.roles, user?._id, user?.username]);

  // Separate effect to initialize creator when eligibleAssignees changes
  useEffect(() => {
    // Only run in create mode when we have eligible assignees but no selected assignees
    if (!isEditing && eligibleAssignees.length > 0 && selectedAssignees.length === 0 && user?._id) {
      console.log('🎯 Initializing creator from eligibleAssignees:', {
        eligibleCount: eligibleAssignees.length,
        userId: user._id
      });

      const creator = eligibleAssignees.find(m => String(m._id) === String(user._id));
      console.log('👤 Creator found:', creator);

      if (creator) {
        const creatorObj = {
          _id: creator._id,
          username: creator.username,
          email: creator.email || creator.username,
          role: creator.role || (creator.roles && creator.roles[0]) || 'staff',
          isCreator: true
        };
        console.log('✅ Setting creator:', creatorObj);
        setSelectedAssignees([creatorObj]);
      } else if (user) {
        // If creator not found in eligible list, add them manually
        const userObj = {
          _id: user._id,
          username: user.username,
          email: user.username,
          role: user.roles && user.roles[0] || 'staff',
          isCreator: true
        };
        console.log('⚠️ Creator not in eligible list, adding manually:', userObj);
        setSelectedAssignees([userObj]);
      }
    }
  }, [eligibleAssignees, isEditing, user?._id, user?.username, user?.roles, selectedAssignees.length]);

  // In edit mode, fetch eligible assignees and initialize selected assignees from task
  useEffect(() => {
    const fetchEditModeAssignees = async () => {
      if (isEditing && task?._id) {
        try {
          // Fetch eligible assignees using the task-specific endpoint
          const response = await apiService.request(`/tasks/${task._id}/assignees`);
          console.log('📝 Edit mode - Received eligible assignees:', response.data);

          if (response.data && Array.isArray(response.data)) {
            // Transform to ensure consistent property names
            const transformedAssignees = response.data.map(u => {
              console.log('📝 Edit mode - User:', u);
              return {
                _id: u._id,
                username: u.email || u.name || u.username,  // Backend returns 'email' as the username
                email: u.email || u.name || u.username,
                role: u.role,
                department: u.department
              };
            });
            console.log('📝 Edit mode - Transformed assignees:', transformedAssignees);
            setEligibleAssignees(transformedAssignees);
          }
        } catch (error) {
          console.error('Failed to fetch eligible assignees for edit mode:', error);
        }

        // Initialize selected assignees from task
        if (task.assignee) {
          setSelectedAssignees(task.assignee.map(a => ({
            _id: a._id || a,
            username: a.username || a.name || a,
            email: a.email || a.username || a,
            role: a.role,
            isOwner: task.owner?._id === (a._id || a)
          })));
        }
      }
    };

    fetchEditModeAssignees();
  }, [isEditing, task]);

  // Handler to add an assignee
  const handleAddAssignee = () => {
    console.log('🔘 handleAddAssignee called');
    console.log('  📋 selectedAssignee:', selectedAssignee);
    console.log('  📋 eligibleAssignees count:', eligibleAssignees.length);
    console.log('  📋 eligibleAssignees:', eligibleAssignees);
    console.log('  📋 selectedAssignees count:', selectedAssignees.length);

    if (!selectedAssignee || selectedAssignee.trim() === '') {
      console.log('❌ No assignee selected');
      return;
    }

    // Check if already at max capacity
    if (selectedAssignees.length >= 5) {
      alert('Maximum 5 assignees allowed');
      return;
    }

    // Find the assignee from eligible list - compare as strings
    console.log('🔍 Searching for assignee with ID:', selectedAssignee);
    console.log('🔍 Eligible IDs:', eligibleAssignees.map(a => ({ id: a._id, username: a.username })));

    const assigneeToAdd = eligibleAssignees.find(a => {
      const match = String(a._id) === String(selectedAssignee);
      console.log(`  Comparing ${a._id} === ${selectedAssignee}? ${match}`);
      return match;
    });

    console.log('✅ assigneeToAdd:', assigneeToAdd);

    if (!assigneeToAdd) {
      console.error('❌ Assignee not found in eligible list!');
      console.error('  Looking for ID:', selectedAssignee);
      console.error('  Available IDs:', eligibleAssignees.map(a => a._id));
      alert('Could not find the selected user. Please try again.');
      return;
    }

    // Check if already assigned
    if (selectedAssignees.some(a => String(a._id) === String(assigneeToAdd._id))) {
      alert('This user is already assigned');
      return;
    }

    console.log('Adding assignee:', assigneeToAdd);

    // Add to selected assignees
    setSelectedAssignees([...selectedAssignees, {
      _id: assigneeToAdd._id,
      username: assigneeToAdd.username || assigneeToAdd.email,
      email: assigneeToAdd.email || assigneeToAdd.username,
      role: assigneeToAdd.role
    }]);

    // Clear selection
    setSelectedAssignee('');
  };

  // Handler to remove an assignee
  const handleRemoveAssignee = (assigneeId) => {
    // In create mode, only Manager/Admin can remove assignees (Staff cannot remove)
    if (!isEditing) {
      if (!isManagerOrAdmin) {
        alert('Only Managers and Admins can remove assignees during task creation');
        return;
      }

      const assigneeToRemove = selectedAssignees.find(a => a._id === assigneeId);
      if (assigneeToRemove?.isCreator) {
        alert('Cannot remove the creator from the task');
        return;
      }
    }

    // Must have at least 1 assignee
    if (selectedAssignees.length <= 1) {
      alert('Task must have at least one assignee');
      return;
    }

    // Confirm removal
    if (!window.confirm('Remove this assignee?')) {
      return;
    }

    setSelectedAssignees(selectedAssignees.filter(a => a._id !== assigneeId));
  };

  const onFormSubmit = async (data) => {
    try {
        // Validate that there is at least one assignee
        if (selectedAssignees.length === 0) {
            alert('Please assign at least one member to the task');
            return;
        }

        console.log('🔵 Form data before processing:', data);
        console.log('🔵 isEditing:', isEditing);

        const formattedData = {
            ...data,
            priority: parseInt(data.priority, 10),
            dueDate: data.dueDate || null,
            // Use selectedAssignees state for assignee data
            assignee: selectedAssignees.map(a => a._id),
            tags: data.tags || '',
            isRecurring: !!data.isRecurring,
            recurrenceInterval: data.isRecurring ? parseInt(data.recurrenceInterval, 10) || null : null,
        };

        console.log('🔵 Formatted data before delete:', formattedData);

        // Remove project field when editing (project cannot be changed after creation)
        if (isEditing) {
            console.log('🔵 Deleting project field...');
            delete formattedData.project;
            console.log('🔵 After delete, formattedData.project:', formattedData.project);
        }

        console.log('🔵 Final data being submitted:', formattedData);
        console.log('🔵 Keys in formattedData:', Object.keys(formattedData));

        await onSubmit(formattedData);
    } catch (error) {
        console.error('Form submission error:', error);
    }
};

  // Add this before the return statement to get today's date in YYYY-MM-DD format
  const today = new Date();
  const minDate = today.toISOString().split('T')[0];

  return (
    <Card className={styles.formCard}>
      <Card.Header>
        <h2>{isEditing ? 'Edit Task' : 'Create New Task'}</h2>
      </Card.Header>
      <Card.Body>
        <form onSubmit={handleSubmit(onFormSubmit)} className={styles.form}>
          <Input
            label="Title"
            {...register('title', {
              required: 'Title is required',
              minLength: {
                value: 3,
                message: 'Title must be at least 3 characters long',
              },
            })}
            error={errors.title?.message}
            required
          />

          <div className={styles.textareaContainer}>
            <label className={styles.textareaLabel} htmlFor="description-textarea">
              Description
            </label>
            <textarea
              id="description-textarea"
              className={styles.textarea}
              rows={4}
              {...register('description')}
              placeholder="Task description (optional)"
            />
          </div>

          <div className={styles.row}>
            <div className={styles.selectContainer}>
              <label className={styles.selectLabel} htmlFor="status-select">
                Status <span className={styles.required}>*</span>
              </label>
              <select
                id="status-select"
                className={styles.select}
                {...register('status', { required: 'Status is required' })}
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Blocked">Blocked</option>
                <option value="Completed">Completed</option>
              </select>
              {errors.status && (
                <div className={styles.errorMessage}>{errors.status.message}</div>
              )}
            </div>

            <Input
              label="Priority"
              type="number"
              min="1"
              max="10"
              step="1"
              onKeyDown={(e) => {
                // Prevent decimal point, 'e', 'E', '+', '-' characters
                if (e.key === '.' || e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-') {
                  e.preventDefault();
                }
              }}
              {...register('priority', {
                required: 'Priority is required',
                validate: {
                  integer: (value) => {
                    const num = Number(value);
                    return Number.isInteger(num) || 'Priority must be a whole number';
                  },
                  range: (value) => {
                    const num = Number(value);
                    return (num >= 1 && num <= 10) || 'Priority must be between 1 and 10';
                  }
                },
                min: {
                  value: 1,
                  message: 'Priority must be between 1 and 10',
                },
                max: {
                  value: 10,
                  message: 'Priority must be between 1 and 10',
                },
              })}
              error={errors.priority?.message}
              required
            />
          </div>

          <div className={styles.row}>
            {!initialProject && (
              <div className={styles.selectContainer}>
                <label className={styles.selectLabel} htmlFor="project-select">
                  Project <span className={styles.required}>*</span>
                </label>
                <select
                  id="project-select"
                  className={styles.select}
                  {...register('project', {
                    required: isEditing ? false : 'Project is required'
                  })}
                  disabled={isEditing}
                >
                  <option value="">Select Project</option>
                  {projects.map((project) => (
                    <option key={project._id} value={project._id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                {errors.project && (
                  <div className={styles.errorMessage}>{errors.project.message}</div>
                )}
                {isEditing && (
                  <small className={styles.helpText}>
                    Project cannot be changed after creation
                  </small>
                )}
              </div>
            )}

            <Input
              label="Tags"
              placeholder="e.g., bug#urgent#frontend"
              {...register('tags')}
            />
          </div>

          <div className={styles.row}>
            <Input
              label="Due Date"
              type="date"
              min={minDate}
              {...register('dueDate', {
                validate: {
                  requiredForRecurring: (value) => {
                    if (watchedIsRecurring && !value) {
                      return 'Due date is required for recurring tasks';
                    }
                    return true;
                  }
                }
              })}
              error={errors.dueDate?.message}
            />
          </div>

          {/* Manage Assignees Section */}
          <div className={styles.assigneesSection}>
            <h3 className={styles.assigneesTitle}>
              Assignees <span className={styles.required}>*</span> ({selectedAssignees.length}/5)
            </h3>

            {/* Current Assignees List */}
            {selectedAssignees.length > 0 ? (
              <div className={styles.assigneesList}>
                {selectedAssignees.map((assignee) => (
                  <div
                    key={assignee._id}
                    className={styles.assigneeItem}
                  >
                    <span className={styles.assigneeInfo}>
                      {assignee.username || assignee.email}
                      {assignee.isCreator && !isEditing && (
                        <span className={styles.assigneeLabel}>
                          (You - Creator)
                        </span>
                      )}
                      {assignee.isOwner && isEditing && (
                        <span className={styles.assigneeLabel}>
                          (Owner)
                        </span>
                      )}
                    </span>
                    {/* Show remove button only if:
                        - In edit mode, OR
                        - In create mode AND user is Manager/Admin AND not the creator AND more than 1 assignee */}
                    {(isEditing || (isManagerOrAdmin && !assignee.isCreator)) && selectedAssignees.length > 1 && (
                      <Button
                        type="button"
                        variant="danger"
                        size="small"
                        onClick={() => handleRemoveAssignee(assignee._id)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.noAssignees}>No assignees selected</p>
            )}

            {/* Add Assignee Section */}
            {selectedAssignees.length < 5 && watchedProject && (
              <div className={styles.addAssigneeSection}>
                <h4 className={styles.addAssigneeTitle}>
                  Add Assignee
                </h4>
                <div className={styles.addAssigneeRow}>
                  <div className={styles.addAssigneeSelectWrapper}>
                    <label htmlFor="assignee-select" className={styles.addAssigneeLabel}>
                      Select User:
                    </label>
                    <select
                      id="assignee-select"
                      value={selectedAssignee}
                      onChange={(e) => setSelectedAssignee(e.target.value)}
                      className={styles.addAssigneeSelect}
                    >
                      <option value="">-- Select user --</option>
                      {eligibleAssignees
                        .filter(ea => !selectedAssignees.some(sa => sa._id === ea._id))
                        .map((assignee) => (
                          <option key={assignee._id} value={assignee._id}>
                            {assignee.username} ({assignee.role})
                          </option>
                        ))}
                    </select>
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleAddAssignee}
                    disabled={!selectedAssignee}
                  >
                    Add
                  </Button>
                </div>
              </div>
            )}

            {selectedAssignees.length >= 5 && (
              <p className={styles.maxAssigneesMessage}>
                Maximum of 5 assignees reached
              </p>
            )}

            {!watchedProject && (
              <p className={styles.projectWarning}>
                Please select a project first to assign users
              </p>
            )}
          </div>

          <div className={styles.row}>
            <div className={styles.selectContainer} style={{ minWidth: 200 }}>
              <label className={styles.selectLabel}>
                <input
                  type="checkbox"
                  style={{ marginRight: 8 }}
                  {...register('isRecurring')}
                />
                Recurring Task
              </label>
            </div>
            {watchedIsRecurring && (
              <div className={styles.selectContainer} style={{ minWidth: 200 }}>
                <Input
                  label="Recurrence Interval (days)"
                  type="number"
                  min="1"
                  required={watchedIsRecurring}
                  {...register('recurrenceInterval', {
                    required: watchedIsRecurring ? 'Interval is required' : false,
                    min: {
                      value: 1,
                      message: 'Interval must be at least 1 day',
                    },
                    validate: value =>
                      !watchedIsRecurring || (value && parseInt(value, 10) > 0) || 'Interval must be a positive number',
                  })}
                  error={errors.recurrenceInterval?.message}
                />
              </div>
            )}
          </div>

          <div className={styles.actions}>
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? isEditing
                  ? 'Updating...'
                  : 'Creating...'
                : isEditing
                ? 'Update Task'
                : 'Create Task'
              }
            </Button>
          </div>
        </form>
      </Card.Body>
    </Card>
  );
}

export default TaskForm;