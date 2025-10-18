/**
 * Component: ProjectCard
 *
 * Purpose: Displays a single project with access-controlled navigation to tasks
 *
 * Key Features:
 * - Shows project information (name, description, status, members, owner)
 * - Implements visual indicators for task viewing permissions
 * - Prevents navigation to tasks when user lacks access (canViewTasks = false)
 * - Provides edit and delete actions for project management
 * - Uses ARIA attributes for accessibility
 *
 * Props:
 * - project: Object - Project data including name, description, status, etc.
 * - canViewTasks: Boolean - Whether user can view tasks in this project
 * - onEdit: Function - Callback to edit the project
 * - onDelete: Function - Callback to delete the project
 */

import { useNavigate } from 'react-router-dom';
import Button from '../../common/Button/Button';
import Card from '../../common/Card/Card';
import styles from './ProjectCard.module.css';

function ProjectCard({ project, canViewTasks = true, onEdit, onDelete }) {
  const navigate = useNavigate();

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Active':
        return styles.statusActive;
      case 'Completed':
        return styles.statusCompleted;
      case 'Archived':
        return styles.statusArchived;
      default:
        return styles.statusActive;
    }
  };

  const handleCardClick = (e) => {
    // Don't navigate if clicking on action buttons
    if (e.target.closest('button')) {
      return;
    }

    // Only navigate if user has permission to view tasks
    if (canViewTasks) {
      navigate(`/projects/${project._id}/tasks`);
    }
  };

  const cardClassName = `${styles.projectCard} ${
    canViewTasks ? styles.accessible : styles.notAccessible
  }`;

  return (
    <Card
      hoverable={canViewTasks}
      className={cardClassName}
      onClick={handleCardClick}
      aria-disabled={!canViewTasks}
      aria-label={
        canViewTasks
          ? `${project.name} - Click to view tasks`
          : `${project.name} - No access to view tasks`
      }
    >
      <Card.Body>
        <div className={styles.header}>
          <h3 className={styles.title}>{project.name}</h3>
          <span className={`${styles.statusBadge} ${getStatusBadgeClass(project.status)}`}>
            {project.status}
          </span>
        </div>

        {project.description && (
          <p className={styles.description}>{project.description}</p>
        )}

        <div className={styles.metadata}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Members:</span>
            <span className={styles.metaValue}>{project.members?.length || 0}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Owner:</span>
            <span className={styles.metaValue}>{project.owner?.name || project.owner?.email || 'Unknown'}</span>
          </div>
        </div>

        {!canViewTasks && (
          <div className={styles.accessMessage}>
            <span>No Task Access</span>
          </div>
        )}

        <div className={styles.actions}>
          <Button variant="secondary" size="small" onClick={() => onEdit(project)}>
            Edit
          </Button>
          <Button variant="danger" size="small" onClick={() => onDelete(project._id)}>
            Delete
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}

export default ProjectCard;