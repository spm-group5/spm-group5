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

function ProjectCard({ project, canViewTasks = true, onEdit, onArchive, onUnarchive }) {
  const navigate = useNavigate();

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'To Do':
        return styles.statusToDo;
      case 'In Progress':
        return styles.statusInProgress;
      case 'Completed':
        return styles.statusCompleted;
      case 'Blocked':
        return styles.statusBlocked;
      default:
        return styles.statusToDo;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
          <div className={styles.badges}>
            <span className={`${styles.statusBadge} ${getStatusBadgeClass(project.status)}`}>
              {project.status}
            </span>
            {project.archived && (
              <span className={styles.archivedBadge}>
                Archived
              </span>
            )}
          </div>
        </div>

        {project.description && (
          <p className={styles.description}>{project.description}</p>
        )}

        <div className={styles.metadata}>
          {project.priority && (
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Priority:</span>
              <span className={`${styles.priorityBadge} ${styles['priority' + project.priority]}`}>
                {project.priority}
              </span>
            </div>
          )}
          {project.dueDate && (
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Due:</span>
              <span className={styles.metaValue}>{formatDate(project.dueDate)}</span>
            </div>
          )}
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Members:</span>
            <span className={styles.metaValue}>{project.members?.length || 0}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Owner:</span>
            <span className={styles.metaValue}>{project.owner?.username || project.owner?.email || 'Unknown'}</span>
          </div>
        </div>

        {project.tags && project.tags.length > 0 && (
          <div className={styles.tags}>
            {project.tags.map((tag, index) => (
              <span key={index} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {!canViewTasks && (
          <div className={styles.accessMessage}>
            <span>No Task Access</span>
          </div>
        )}

        <div className={styles.actions}>
          <Button variant="secondary" size="small" onClick={(e) => { e.stopPropagation(); onEdit(project); }}>
            Edit
          </Button>
          {!project.archived ? (
            <Button variant="warning" size="small" onClick={(e) => { e.stopPropagation(); onArchive(project._id); }}>
              Archive
            </Button>
          ) : (
            <Button variant="secondary" size="small" onClick={(e) => { e.stopPropagation(); onUnarchive(project._id); }}>
              Unarchive
            </Button>
          )}
        </div>
      </Card.Body>
    </Card>
  );
}

export default ProjectCard;