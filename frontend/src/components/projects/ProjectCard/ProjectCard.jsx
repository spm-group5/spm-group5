import Button from '../../common/Button/Button';
import Card from '../../common/Card/Card';
import styles from './ProjectCard.module.css';

function ProjectCard({ project, onEdit, onDelete }) {
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

  return (
    <Card hoverable className={styles.projectCard}>
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