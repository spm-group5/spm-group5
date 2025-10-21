import { useForm } from 'react-hook-form';
import Button from '../../common/Button/Button';
import Input from '../../common/Input/Input';
import Card from '../../common/Card/Card';
import styles from './ProjectForm.module.css';

function ProjectForm({ project, onSubmit, onCancel }) {
  const isEditing = !!project;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: project?.name || '',
      description: project?.description || '',
      status: project?.status || 'To Do',
      priority: project?.priority || '',
      dueDate: project?.dueDate ? new Date(project.dueDate).toISOString().split('T')[0] : '',
      tags: project?.tags?.join(', ') || '',
    },
  });

  const onFormSubmit = async (data) => {
    // Convert tags from comma-separated string to array
    const formattedData = {
      ...data,
      tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
      priority: data.priority ? Number(data.priority) : undefined,
      dueDate: data.dueDate || undefined,
    };
    await onSubmit(formattedData);
  };

  return (
    <Card className={styles.formCard}>
      <Card.Header>
        <h2>{isEditing ? 'Edit Project' : 'Create New Project'}</h2>
      </Card.Header>
      <Card.Body>
        <form onSubmit={handleSubmit(onFormSubmit)} className={styles.form}>
          <Input
            label="Project Name"
            {...register('name', {
              required: 'Project name is required',
              minLength: {
                value: 3,
                message: 'Project name must be at least 3 characters long',
              },
            })}
            error={errors.name?.message}
            required
          />

          <div className={styles.textareaContainer}>
            <label className={styles.textareaLabel} htmlFor="project-description-textarea">
              Description
            </label>
            <textarea
              id="project-description-textarea"
              className={styles.textarea}
              rows={4}
              {...register('description')}
              placeholder="Project description (optional)"
            />
          </div>

          <div className={styles.selectContainer}>
            <label className={styles.selectLabel} htmlFor="project-status-select">
              Status <span className={styles.required}>*</span>
            </label>
            <select
              id="project-status-select"
              className={styles.select}
              {...register('status', { required: 'Status is required' })}
            >
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Blocked">Blocked</option>
            </select>
            {errors.status && (
              <div className={styles.errorMessage}>{errors.status.message}</div>
            )}
          </div>

          <Input
            label="Priority (1-10)"
            type="number"
            min="1"
            max="10"
            {...register('priority', {
              min: {
                value: 1,
                message: 'Priority must be at least 1',
              },
              max: {
                value: 10,
                message: 'Priority must be at most 10',
              },
              valueAsNumber: true,
            })}
            error={errors.priority?.message}
            placeholder="Optional"
          />

          <Input
            label="Due Date"
            type="date"
            {...register('dueDate', {
              validate: (value) => {
                if (!value) return true; // Optional field
                const selectedDate = new Date(value);
                selectedDate.setHours(0, 0, 0, 0);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return selectedDate >= today || 'Due date cannot be in the past';
              },
            })}
            error={errors.dueDate?.message}
            placeholder="Optional"
          />

          <Input
            label="Tags"
            {...register('tags')}
            error={errors.tags?.message}
            placeholder="#frontend,#urgent,#backend (hashtag-separated)"
          />

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
                ? 'Update Project'
                : 'Create Project'
              }
            </Button>
          </div>
        </form>
      </Card.Body>
    </Card>
  );
}

export default ProjectForm;