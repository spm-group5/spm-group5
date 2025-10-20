import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { useProjects } from '../../../context/ProjectContext';
import { useAuth } from '../../../context/AuthContext';
import Button from '../../common/Button/Button';
import Input from '../../common/Input/Input';
import Card from '../../common/Card/Card';
import styles from './TaskForm.module.css';

function TaskForm({ task, onSubmit, onCancel }) {
  const { projects } = useProjects();
  const { user } = useAuth();
  const isEditing = !!task;
  const isManager = user?.roles?.includes('manager');

  const [projectMembers, setProjectMembers] = useState([]);
  const [currentAssignees, setCurrentAssignees] = useState([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      title: task?.title || '',
      description: task?.description || '',
      status: task?.status || 'To Do',
      priority: task?.priority || 5,
      dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      project: task?.project?._id || task?.project || '',
      assignee: task?.assignee?.map(a => a._id || a) || [],
      tags: task?.tags || '',
      isRecurring: task?.isRecurring || false,
      recurrenceInterval: task?.recurrenceInterval || '',
    },
  });

  const watchedProject = watch('project');
  const watchedAssignees = watch('assignee');
  const watchedIsRecurring = watch('isRecurring');

  useEffect(() => {
    if (watchedProject) {
      const project = projects.find(p => p._id === watchedProject);
      if (project?.members) {
        setProjectMembers(project.members);
      } else {
        setProjectMembers([]);
      }
    } else {
      setProjectMembers([]);
    }
  }, [watchedProject, projects]);

  // Track current assignees in edit mode
  useEffect(() => {
    if (isEditing && task?.assignee) {
      setCurrentAssignees(task.assignee.map(a => a._id || a));
    }
  }, [isEditing, task]);

  // In create mode, ensure creator is always included
  useEffect(() => {
    if (!isEditing && user?._id && watchedProject) {
      const currentSelection = watchedAssignees || [];
      // Always include creator if not present
      if (!currentSelection.includes(user._id)) {
        setValue('assignee', [user._id, ...currentSelection.filter(id => id !== user._id)].slice(0, 5), { shouldValidate: true });
      }
    }
  }, [isEditing, user, watchedProject, watchedAssignees, setValue]);

  const onFormSubmit = async (data) => {
    try {
        const formattedData = {
            ...data,
            priority: parseInt(data.priority, 10),
            dueDate: data.dueDate || null,
            // Ensure assignee is properly formatted as array
            assignee: (() => {
                if (!data.assignee) return [];
                if (Array.isArray(data.assignee)) {
                    return data.assignee.filter(id => id && id.trim() !== '');
                }
                return data.assignee.trim() !== '' ? [data.assignee] : [];
            })(),
            tags: data.tags || '',
            isRecurring: !!data.isRecurring,
            recurrenceInterval: data.isRecurring ? parseInt(data.recurrenceInterval, 10) || null : null,
        };

        // Remove project field when editing (project cannot be changed after creation)
        if (isEditing) {
            delete formattedData.project;
        }

        console.log('Submitting task data:', formattedData);
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
                <option value="Done">Done</option>
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
              {...register('priority', {
                required: 'Priority is required',
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
            <div className={styles.selectContainer}>
              <label className={styles.selectLabel} htmlFor="project-select">
                Project <span className={styles.required}>*</span>
              </label>
              <select
                id="project-select"
                className={styles.select}
                {...register('project', { required: 'Project is required' })}
                disabled={isEditing}
              >
                <option value="">Select Project</option>
                {projects
                  .filter(project => project.status === 'Active')
                  .map((project) => (
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

            <div className={styles.selectContainer}>
              <label className={styles.selectLabel} htmlFor="assignee-select">
                Assign To <span className={styles.required}>*</span>
              </label>
              <select
                id="assignee-select"
                className={styles.select}
                multiple // Enable multiple selection
                size="5" // Show 5 options at once
                {...register('assignee', {
                  validate: {
                    maxAssignees: (value) => {
                      if (Array.isArray(value) && value.length > 5) {
                        return 'Maximum 5 assignees allowed';
                      }
                      return true;
                    },
                    minAssignees: (value) => {
                      // In create mode, creator is auto-assigned, so no error
                      if (!isEditing) {
                        return true;
                      }
                      // In edit mode, check if there's at least one assignee
                      const arr = Array.isArray(value) ? value : value ? [value] : [];
                      if (arr.length === 0) {
                        return 'At least one assignee is required';
                      }
                      return true;
                    },
                    cannotRemove: (value) => {
                      if (isEditing && !isManager) {
                        const newAssignees = Array.isArray(value) ? value : [];
                        const removedAssignees = currentAssignees.filter(
                          id => !newAssignees.includes(id)
                        );
                        if (removedAssignees.length > 0) {
                          return 'Only managers can remove assignees';
                        }
                      }
                      return true;
                    }
                  }
                })}
              >
                {projectMembers?.map((member) => {
                  const isCreator = !isEditing && member._id === user?._id;
                  const label = isCreator ? `${member.username} (You - Creator)` : member.username;

                  return (
                    <option
                      key={member._id}
                      value={member._id}
                      disabled={isCreator}
                    >
                      {label}
                    </option>
                  );
                })}
              </select>
              {errors.assignee && (
                <div className={styles.errorMessage}>{errors.assignee.message}</div>
              )}
              <small className={styles.helpText}>
                {!isEditing
                  ? 'You (creator) will be automatically assigned. Select up to 4 more members (max 5 total).'
                  : isManager
                  ? 'Hold Ctrl/Cmd to select multiple. Max 5 assignees. You can add or remove assignees.'
                  : 'Hold Ctrl/Cmd to select multiple. Max 5 assignees. You can only add new assignees.'
                }
              </small>
            </div>
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

            <Input
              label="Tags"
              placeholder="e.g., bug#urgent#frontend"
              {...register('tags')}
            />
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