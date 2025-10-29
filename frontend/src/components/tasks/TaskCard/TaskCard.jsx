import { format } from "date-fns";
import { useState, useRef } from "react";
import Button from "../../common/Button/Button";
import Card from "../../common/Card/Card";
import CommentSection from "../TaskComment/TaskCommentSection";
import Modal from '../../common/Modal/Modal';
import SubtaskList from '../SubtaskList/SubtaskList';
import SubtaskForm from '../SubtaskForm/SubtaskForm';
import StatusUpdatePopup from '../StatusUpdatePopup/StatusUpdatePopup';
import { useSubtasks } from '../../../context/SubtaskContext';
import { useNotifications } from '../../../hooks/useNotifications';
import { useAuth } from '../../../context/AuthContext';
import apiService from '../../../services/api';
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
  // ASSIGNEE-SCOPE: Assignment modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [eligibleAssignees, setEligibleAssignees] = useState([]);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [isLoadingAssignees, setIsLoadingAssignees] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  // OWNERSHIP-TRANSFER: Change owner modal state
  const [showChangeOwnerModal, setShowChangeOwnerModal] = useState(false);
  const [selectedNewOwner, setSelectedNewOwner] = useState('');
  const [isChangingOwner, setIsChangingOwner] = useState(false);
  // Status update popup state
  const [showStatusPopup, setShowStatusPopup] = useState(false);
  const [statusPopupPosition, setStatusPopupPosition] = useState({ top: 0, left: 0 });
  const statusBadgeRef = useRef(null);

  const { createSubtask, updateSubtask, archiveSubtask, unarchiveSubtask, fetchSubtasksByParentTask } = useSubtasks();
  const { addNotification } = useNotifications();
  const { user } = useAuth();
  const canArchive = user?.roles?.includes('manager') || user?.roles?.includes('admin');
  // ASSIGNEE-SCOPE: Only managers/admins can assign
  const canAssign = user?.roles?.includes('manager') || user?.roles?.includes('admin');
  // OWNERSHIP-TRANSFER: Only managers/admins can transfer ownership
  const canTransferOwnership = user?.roles?.includes('manager') || user?.roles?.includes('admin');

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
      case "Completed":
        return styles.statusDone;
      case "Blocked":
        return styles.statusBlocked;
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

  // ASSIGNEE-SCOPE: Assignment handlers
  const handleShowAssignModal = async (e) => {
    e?.stopPropagation();
    setShowAssignModal(true);
    setIsLoadingAssignees(true);
    setSelectedAssignee('');

    try {
      const data = await apiService.request(`/tasks/${task._id}/assignees`);
      console.log('✅ Eligible assignees fetched:', data.data); // Debug log
      console.log('✅ Number of assignees:', data.data?.length);
      if (data.data && data.data.length > 0) {
        console.log('✅ First assignee:', data.data[0]);
        console.log('✅ First assignee email:', data.data[0].email);
      }
      setEligibleAssignees(data.data || []);
    } catch (error) {
      console.error('Failed to fetch assignees:', error); // Debug log
      addNotification(error.message || 'Failed to load assignees', 'error');
      setEligibleAssignees([]);
    } finally {
      setIsLoadingAssignees(false);
    }
  };

  const handleCloseAssignModal = () => {
    setShowAssignModal(false);
    setSelectedAssignee('');
    setEligibleAssignees([]);
  };

  // ASSIGNEE-SCOPE: Add assignee to task
  const handleAddAssignee = async () => {
    if (!selectedAssignee || selectedAssignee.trim() === '') {
      addNotification('Please select an assignee', 'error');
      return;
    }

    setIsAssigning(true);

    try {
      const data = await apiService.request(`/tasks/${task._id}/assignees`, {
        method: 'POST',
        body: JSON.stringify({ assignee: selectedAssignee })
      });

      addNotification(data.message || 'Assignee added successfully', 'success');
      setSelectedAssignee(''); // Clear selection

      // Refresh task data
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      addNotification(error.message || 'Failed to add assignee', 'error');
    } finally {
      setIsAssigning(false);
    }
  };

  // ASSIGNEE-SCOPE: Remove assignee from task
  const handleRemoveAssignee = async (assigneeEmail) => {
    if (!assigneeEmail) return;

    // Confirm before removing
    if (!window.confirm(`Remove ${assigneeEmail} from this task?`)) {
      return;
    }

    setIsRemoving(true);

    try {
      const data = await apiService.request(`/tasks/${task._id}/assignees`, {
        method: 'DELETE',
        body: JSON.stringify({ assignee: assigneeEmail })
      });

      addNotification(data.message || 'Assignee removed successfully', 'success');

      // Refresh task data
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      addNotification(error.message || 'Failed to remove assignee', 'error');
    } finally {
      setIsRemoving(false);
    }
  };

  // OWNERSHIP-TRANSFER: Change owner handlers
  const handleShowChangeOwnerModal = async (e) => {
    e?.stopPropagation();
    setShowChangeOwnerModal(true);

    // Reuse the same eligible assignees list
    if (eligibleAssignees.length === 0) {
      setIsLoadingAssignees(true);
      try {
        const data = await apiService.request(`/tasks/${task._id}/assignees`);
        setEligibleAssignees(data.data || []);
      } catch (error) {
        addNotification(error.message || 'Failed to load eligible members', 'error');
      } finally {
        setIsLoadingAssignees(false);
      }
    }
  };

  const handleCloseChangeOwnerModal = () => {
    setShowChangeOwnerModal(false);
    setSelectedNewOwner('');
  };

  const handleChangeOwner = async () => {
    if (!selectedNewOwner) {
      addNotification('Please select a new owner', 'error');
      return;
    }

    if (!window.confirm(`Are you sure you want to transfer ownership of this task? The current owner will become a collaborator.`)) {
      return;
    }

    setIsChangingOwner(true);

    try {
      // const data = await apiService.request(`/tasks/${task._id}/assign`, {
      //   method: 'POST',
      //   body: JSON.stringify({ assignee: selectedNewOwner })
      // });

      addNotification('Task ownership transferred successfully', 'success');
      handleCloseChangeOwnerModal();

      // Refresh task data
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      // Provide more specific error messages
      if (error.status === 401) {
        addNotification('Session expired. Please log in again.', 'error');
      } else if (error.status === 403) {
        addNotification('You do not have permission to transfer task ownership. Only managers and admins can perform this action.', 'error');
      } else if (error.status === 422) {
        addNotification('Invalid request. Please select a valid user.', 'error');
      } else {
        addNotification(error.message || 'Failed to transfer ownership', 'error');
      }
    } finally {
      setIsChangingOwner(false);
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

  // Status update handlers
  const handleStatusBadgeClick = (e) => {
    e.stopPropagation();
    if (isArchived || !canEdit()) return;

    const rect = statusBadgeRef.current.getBoundingClientRect();
    setStatusPopupPosition({
      top: rect.bottom + window.scrollY + 5,
      left: rect.left + window.scrollX,
    });
    setShowStatusPopup(true);
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await apiService.request(`/tasks/${task._id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });

      addNotification(`Task status updated to "${newStatus}"`, 'success');

      // Refresh task data
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      addNotification(error.message || 'Failed to update task status', 'error');
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
                ref={statusBadgeRef}
                className={`${styles.statusBadge} ${getStatusBadgeClass(task.status)} ${!isArchived && canEdit() ? styles.clickable : ''}`}
                onClick={handleStatusBadgeClick}
                style={{ cursor: !isArchived && canEdit() ? 'pointer' : 'default', position: 'relative' }}
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
              {/* ASSIGNEE-SCOPE: Manage Assignees button visible to all assignees, Manager, Admin, Owner */}
              {!isArchived && (user?.roles?.includes('manager') || user?.roles?.includes('admin') ||
                task.assignee?.some(a => (a._id || a) === (user?._id || user?.id)) ||
                (task.owner?._id || task.owner) === (user?._id || user?.id)) && (
                <Button
                  variant="primary"
                  size="small"
                  onClick={handleShowAssignModal}
                  aria-label="Manage Assignees"
                >
                  Manage Assignees
                </Button>
              )}
              {/* OWNERSHIP-TRANSFER: Change Owner button visible only to managers/admins */}
              {!isArchived && canTransferOwnership && (
                <Button
                  variant="secondary"
                  size="small"
                  onClick={handleShowChangeOwnerModal}
                  aria-label="Change Owner"
                >
                  Change Owner
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
                // onCommentAdded={(updatedTask) => {
                //   // Comments are now handled locally in CommentSection
                //   // No need to refresh the entire page
                //   // The updatedTask can be used for other updates if needed
                // }}
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

      {/* ASSIGNEE-SCOPE: Assignment modal */}
      {showAssignModal && (
        <Modal
          isOpen={showAssignModal}
          onClose={handleCloseAssignModal}
          size="medium"
        >
          <div style={{ padding: '20px' }}>
            <h2 style={{ marginBottom: '20px' }}>Manage Assignees</h2>

            {isLoadingAssignees ? (
              <p>Loading...</p>
            ) : (
              <>
                {/* Current Assignees Section */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', marginBottom: '12px', fontWeight: 'bold' }}>
                    Current Assignees ({task.assignee?.length || 0}/5)
                  </h3>
                  {task.assignee && task.assignee.length > 0 ? (
                    <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '8px' }}>
                      {task.assignee.map((assignee) => (
                        <div
                          key={assignee._id || assignee}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px',
                            borderBottom: '1px solid #f0f0f0'
                          }}
                        >
                          <span>
                            {assignee.username || assignee.name || assignee}
                            {task.owner?._id === assignee._id && (
                              <span style={{ marginLeft: '8px', color: '#666', fontSize: '12px' }}>
                                (Owner)
                              </span>
                            )}
                          </span>
                          {canAssign && task.assignee.length > 1 && (
                            <Button
                              variant="danger"
                              size="small"
                              onClick={() => handleRemoveAssignee(assignee.username || assignee.email || assignee)}
                              disabled={isRemoving}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: '#666', fontSize: '14px' }}>No assignees</p>
                  )}
                </div>

                {/* Add Assignee Section */}
                {task.assignee && task.assignee.length < 5 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '16px', marginBottom: '12px', fontWeight: 'bold' }}>
                      Add Assignee
                    </h3>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                      <div style={{ flex: 1 }}>
                        <label htmlFor="assignee-select" style={{ display: 'block', marginBottom: '8px' }}>
                          Select Member:
                        </label>
                        <select
                          id="assignee-select"
                          value={selectedAssignee}
                          onChange={(e) => setSelectedAssignee(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px',
                            fontSize: '14px',
                            border: '1px solid #ddd',
                            borderRadius: '4px'
                          }}
                        >
                          <option value="">-- Select member --</option>
                          {eligibleAssignees
                            .filter(ea => !task.assignee?.some(ta =>
                              (ta._id || ta) === (ea._id || ea) ||
                              (ta.username || ta) === (ea.email || ea)
                            ))
                            .map((assignee) => (
                              <option key={assignee._id} value={assignee.email}>
                                {assignee.email} ({assignee.role})
                              </option>
                            ))}
                        </select>
                      </div>
                      <Button
                        variant="primary"
                        onClick={handleAddAssignee}
                        disabled={isAssigning || !selectedAssignee}
                      >
                        {isAssigning ? 'Adding...' : 'Add'}
                      </Button>
                    </div>
                  </div>
                )}

                {task.assignee && task.assignee.length >= 5 && (
                  <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
                    Maximum of 5 assignees reached
                  </p>
                )}

                {eligibleAssignees.length === 0 && (
                  <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
                    No eligible members found. Users must be project members to be assigned.
                  </p>
                )}

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <Button
                    variant="secondary"
                    onClick={handleCloseAssignModal}
                    disabled={isAssigning || isRemoving}
                  >
                    Close
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* OWNERSHIP-TRANSFER: Change Owner Modal */}
      {showChangeOwnerModal && (
        <Modal
          isOpen={showChangeOwnerModal}
          onClose={handleCloseChangeOwnerModal}
          size="medium"
        >
          <div style={{ padding: '20px' }}>
            <h2 style={{ marginBottom: '20px' }}>Transfer Task Ownership</h2>

            {isLoadingAssignees ? (
              <p>Loading...</p>
            ) : (
              <>
                <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#fff3cd', borderRadius: '4px', border: '1px solid #ffc107' }}>
                  <p style={{ margin: 0, fontSize: '14px', color: '#856404' }}>
                    <strong>Note:</strong> When you transfer ownership, the current owner will automatically become a collaborator on this task.
                  </p>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <p style={{ marginBottom: '8px', fontSize: '14px' }}>
                    <strong>Current Owner:</strong> {task.owner?.username || task.owner?.name || 'Unknown'}
                  </p>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label htmlFor="new-owner-select" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    Select New Owner:
                  </label>
                  <select
                    id="new-owner-select"
                    value={selectedNewOwner}
                    onChange={(e) => setSelectedNewOwner(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      fontSize: '14px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  >
                    <option value="">-- Select new owner --</option>
                    {eligibleAssignees
                      .filter(member => {
                        const currentOwnerId = task.owner?._id || task.owner;
                        const memberId = member._id;
                        return String(memberId) !== String(currentOwnerId);
                      })
                      .map((member) => (
                        <option key={member._id} value={member.email}>
                          {member.email} ({member.role})
                        </option>
                      ))}
                  </select>
                  <small style={{ display: 'block', marginTop: '8px', color: '#666', fontSize: '12px' }}>
                    Only project members can own tasks
                  </small>
                </div>

                {eligibleAssignees.length === 0 && (
                  <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
                    No eligible members found. Users must be project members to own tasks.
                  </p>
                )}

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <Button
                    variant="secondary"
                    onClick={handleCloseChangeOwnerModal}
                    disabled={isChangingOwner}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleChangeOwner}
                    disabled={isChangingOwner || !selectedNewOwner}
                  >
                    {isChangingOwner ? 'Transferring...' : 'Transfer Ownership'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Status Update Popup */}
      {showStatusPopup && (
        <StatusUpdatePopup
          currentStatus={task.status}
          onStatusChange={handleStatusChange}
          onClose={() => setShowStatusPopup(false)}
          position={statusPopupPosition}
        />
      )}
    </>
  );
}

export default TaskCard;