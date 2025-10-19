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
      status: project?.status || 'Active',
    },
  });

  const onFormSubmit = async (data) => {
    await onSubmit(data);
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
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
              <option value="Archived">Archived</option>
            </select>
            {errors.status && (
              <div className={styles.errorMessage}>{errors.status.message}</div>
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