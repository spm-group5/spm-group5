import { useForm } from 'react-hook-form';
import { useProjects } from '../../../context/ProjectContext';
import Button from '../../common/Button/Button';
import Input from '../../common/Input/Input';
import Card from '../../common/Card/Card';
import styles from './TaskForm.module.css';

function TaskForm({ task, onSubmit, onCancel }) {
  const { projects } = useProjects();
  const isEditing = !!task;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      title: task?.title || '',
      description: task?.description || '',
      status: task?.status || 'To Do',
      priority: task?.priority || 5,
      dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      project: task?.project?._id || task?.project || '',
    },
  });

  const onFormSubmit = async (data) => {
    const formattedData = {
      ...data,
      priority: parseInt(data.priority, 10),
      dueDate: data.dueDate || null,
    };

    await onSubmit(formattedData);
  };

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
            <label className={styles.textareaLabel}>
              Description
            </label>
            <textarea
              className={styles.textarea}
              rows={4}
              {...register('description')}
              placeholder="Task description (optional)"
            />
          </div>

          <div className={styles.row}>
            <div className={styles.selectContainer}>
              <label className={styles.selectLabel}>
                Status <span className={styles.required}>*</span>
              </label>
              <select
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
            <Input
              label="Due Date"
              type="date"
              {...register('dueDate')}
            />

            <div className={styles.selectContainer}>
              <label className={styles.selectLabel}>Project</label>
              <select
                className={styles.select}
                {...register('project')}
              >
                <option value="">No Project</option>
                {projects.map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
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