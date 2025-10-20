import { format } from "date-fns";
import { useState } from "react";
import Button from "../../common/Button/Button";
import Card from "../../common/Card/Card";
import CommentSection from "../TaskComment/TaskCommentSection";
import Modal from '../../common/Modal/Modal';
import SubtaskList from '../SubtaskList/SubtaskList';
import SubtaskForm from '../SubtaskForm/SubtaskForm';
import { useSubtasks } from '../../../context/SubtaskContext';
import { useNotifications } from '../../../hooks/useNotifications';
import { useAuth } from '../../../context/AuthContext';
import styles from "./TaskCard.module.css";

function TaskCard({
  task,
  onEdit,
  onArchive,
  onUnarchive,
  isArchived,
  onRefresh,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const [editingSubtask, setEditingSubtask] = useState(null);
  
  const { createSubtask, updateSubtask, archiveSubtask, unarchiveSubtask, fetchSubtasksByParentTask } = useSubtasks();
  const { addNotification } = useNotifications();
  const { user } = useAuth();
  const canArchive = user?.roles?.includes('manager') || user?.roles?.includes('admin');

  const canEdit = () => {
    if (!user) return false;
    
    // Admin can edit all tasks
    if (user.roles?.includes('admin')) {
      return true;
    }
    
    // Get userId - could be user.id or user._id depending on context
    const userId = user.id || user._id;
    
    // Staff can only edit if they are assigned
    if (user.roles?.includes('staff') && !user.roles?.includes('manager')) {
      return task.assignee?.some(assignee => {
        const assigneeId = assignee._id || assignee;
        return assigneeId === userId;
      });
    }
    
    // Manager can edit if any assignee is from their department
    if (user.roles?.includes('manager')) {
      // Check if manager is assigned directly
      const isAssigned = task.assignee?.some(assignee => {
        const assigneeId = assignee._id || assignee;
        return assigneeId === userId;
      });
      if (isAssigned) return true;
      
      // Check if any assignee is from manager's department
      return task.assignee?.some(assignee => 
        assignee?.department === user.department
      );
    }
    
    return false;
  };


  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "To Do":
        return styles.statusTodo;
      case "In Progress":
        return styles.statusInProgress;
      case "Done":
        return styles.statusDone;
      default:
        return styles.statusTodo;
    }
  };

  const getPriorityBadgeClass = (priority) => {
    if (priority >= 8) return styles.priorityHigh;
    if (priority >= 5) return styles.priorityMedium;
    return styles.priorityLow;
  };

  const isOverdue = (dateString, status) => {
    if (!dateString || status === 'Done') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dateString);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  const formatDueDate = (dateString) => {
    if (!dateString) return "No due date";
    try {
      const formatted = format(new Date(dateString), "MMM dd, yyyy");
      return formatted;
    } catch {
      return "Invalid date";
    }
  };

  const formatAssignee = (assignee) => {
    // Handle null, undefined, or empty cases
    if (!assignee) {
      return "Unassigned";
    }

    // Convert to array if it's not already an array
    const assigneeArray = Array.isArray(assignee) ? assignee : [assignee];

    // Handle empty array
    if (assigneeArray.length === 0) {
      return "Unassigned";
    }

    // Handle both populated and non-populated assignee data
    const names = assigneeArray.map((person) => {
      if (typeof person === "string") {
        return person; // If it's just an ID
      }
      return person.username || person.name || "Unknown";
    });

    if (names.length === 1) {
      return names[0];
    } else if (names.length === 2) {
      return `${names[0]} & ${names[1]}`;
    } else {
      return `${names[0]} & ${names.length - 1} others`;
    }
  };

  // Subtask handlers
  const handleShowSubtaskForm = (subtask = null) => {
    setEditingSubtask(subtask);
    setShowSubtaskForm(true);
  };

  const handleCloseSubtaskForm = () => {
    setShowSubtaskForm(false);
    setEditingSubtask(null);
  };

  const handleSubtaskSubmit = async (subtaskData) => {
    try {
      if (editingSubtask) {
        await updateSubtask(editingSubtask._id, subtaskData);
        addNotification('Subtask updated successfully', 'success');
      } else {
        await createSubtask(subtaskData);
        addNotification('Subtask created successfully', 'success');
      }
      handleCloseSubtaskForm();
      await fetchSubtasksByParentTask(task._id);
    } catch (error) {
      addNotification(error.message || 'Failed to save subtask', 'error');
    }
  };

  const handleArchiveSubtask = async (subtask) => {
    try {
      await archiveSubtask(subtask._id);
      addNotification('Subtask archived successfully', 'success');
      await fetchSubtasksByParentTask(task._id);
    } catch (error) {
      addNotification(error.message || 'Failed to archive subtask', 'error');
    }
  };

  const handleUnarchiveSubtask = async (subtask) => {
    try {
      await unarchiveSubtask(subtask._id);
      addNotification('Subtask unarchived successfully', 'success');
      await fetchSubtasksByParentTask(task._id);
    } catch (error) {
      addNotification(error.message || 'Failed to unarchive subtask', 'error');
    }
  };

  return (
    <>
      <Card
        hoverable
        className={`${styles.taskCard} ${isExpanded ? styles.expanded : styles.collapsed}`}
      >
        <Card.Body className={styles.cardBody}>
          {/* Compact header - always visible */}
          <div
            className={styles.compactHeader}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className={styles.headerLeft}>
              <button className={styles.expandButton} type="button">
                <span className={styles.expandIcon}>
                  {isExpanded ? "▼" : "▶"}
                </span>
              </button>
              <h3 className={styles.compactTitle}>{task.title}</h3>
            </div>
            <div className={styles.compactBadges}>
              {/* Show OVERDUE badge if task is overdue */}
              {isOverdue(task.dueDate, task.status) && (
                <span className={`${styles.statusBadge} ${styles.statusOverdue}`}>
                  ⚠️ OVERDUE
                </span>
              )}
              <span
                className={`${styles.statusBadge} ${getStatusBadgeClass(task.status)}`}
              >
                {task.status}
              </span>
              <span
                className={`${styles.priorityBadge} ${getPriorityBadgeClass(task.priority)}`}
              >
                P{task.priority}
              </span>
            </div>
          </div>

          {/* Compact info - always visible */}
          <div className={styles.compactInfo}>
            <div className={styles.compactMeta}>
              <span className={isOverdue(task.dueDate, task.status) ? styles.overdueMeta : ''}>
                <strong>Due:</strong> {formatDueDate(task.dueDate)}
                {isOverdue(task.dueDate, task.status) && ' ⚠️'}
              </span>
              <span>
                <strong>Project:</strong>{" "}
                {task.project?.name || task.project || "N/A"}
              </span>
            </div>
            <div className={styles.compactActions}>
              {!isArchived && canEdit() && (
                <Button
                  variant="secondary"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(task);
                  }}
                >
                  Edit
                </Button>
              )}
              {canArchive && (
                isArchived ? (
                  <Button
                    variant="primary"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnarchive(task._id);
                    }}
                  >
                    Unarchive
                  </Button>
                ) : (
                  <Button
                    variant="warning"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onArchive(task._id);
                    }}
                  >
                    Archive
                  </Button>
                )
              )}
            </div>
          </div>

          {/* Expandable details */}
          {isExpanded && (
            <div className={styles.expandedContent}>
              {task.description && (
                <div className={styles.descriptionSection}>
                  <p className={styles.description}>{task.description}</p>
                </div>
              )}

              <div className={styles.metadata}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Owner:</span>
                  <span className={styles.metaValue}>
                    {task.owner?.username || task.owner?.name || "Unknown"}
                  </span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Assigned:</span>
                  <span className={styles.metaValue}>
                    {formatAssignee(task.assignee)}
                  </span>
                </div>
                {task.tags && (
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Tags:</span>
                    <span className={styles.metaValue}>{task.tags}</span>
                  </div>
                )}
                {task.isRecurring && (
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Recurring:</span>
                    <span className={styles.metaValue}>
                      Every {task.recurrenceInterval} days
                    </span>
                  </div>
                )}
              </div>

              <CommentSection 
                task={task} 
                onCommentAdded={() => {
                  onRefresh();
                }} 
              />

              {/* Subtasks Section */}
              {!isArchived && canEdit() && (
                <div className={styles.subtasksSection}>
                  <div className={styles.subtasksHeader}>
                    <h4>Subtasks</h4>
                    <Button 
                      variant="secondary" 
                      size="small" 
                      onClick={() => setShowSubtasks(!showSubtasks)}
                    >
                      {showSubtasks ? 'Hide Subtasks' : 'Show Subtasks'}
                    </Button>
                  </div>
                  {showSubtasks && (
                    <div className={styles.subtasksContainer}>
                      <SubtaskList
                        parentTaskId={task._id}
                        projectId={task.project?._id || task.project}
                        ownerId={user?._id || user?.id}
                        onShowSubtaskForm={handleShowSubtaskForm}
                        onArchiveSubtask={handleArchiveSubtask}
                        onUnarchiveSubtask={handleUnarchiveSubtask}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Card.Body>
      </Card>

      {showSubtaskForm && (
        <Modal
          isOpen={showSubtaskForm}
          onClose={handleCloseSubtaskForm}
          size="large"
        >
          <SubtaskForm
            onSubmit={handleSubtaskSubmit}
            onCancel={handleCloseSubtaskForm}
            initialData={editingSubtask}
            parentTaskId={task._id}
            projectId={task.project?._id || task.project}
            ownerId={user?._id || user?.id}
          />
        </Modal>
      )}
    </>
  );
}

export default TaskCard;