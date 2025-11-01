import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';
import Modal from '../../common/Modal/Modal';
import styles from './TaskCommentSection.module.css';

export default function CommentSection({ task, subtask, onCommentAdded, type = 'task' }) {
    const item = type === 'subtask' ? subtask : task;
    const [commentText, setCommentText] = useState('');
    const [loading, setLoading] = useState(false);
    const [comments, setComments] = useState(item?.comments || []);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [commentToDelete, setCommentToDelete] = useState(null);
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editText, setEditText] = useState('');
    const { user } = useAuth();

    // Update local comments when task/subtask prop changes
    useEffect(() => {
        setComments(item?.comments || []);
    }, [item?.comments]);

    // Check if user can comment based on roles
    const canComment = () => {
        if (!user) return false;

        // Admin can comment on all
        if (user.roles?.includes('admin')) {
            return true;
        }

        // Get userId - could be user.id or user._id depending on context
        const userId = user.id || user._id;

        if (type === 'subtask') {
            // For subtasks: owner or assignee can comment
            const ownerId = item.ownerId?._id || item.ownerId;
            const assigneeId = item.assigneeId?._id || item.assigneeId;
            return ownerId === userId || assigneeId === userId;
        } else {
            // For tasks: existing logic
            // Staff can only comment if assigned
            if (user.roles?.includes('staff') && !user.roles?.includes('manager')) {
                return item.assignee?.some(assignee => {
                    const assigneeId = assignee._id || assignee;
                    return assigneeId === userId;
                });
            }

            // Manager can comment if any assignee is from their department
            if (user.roles?.includes('manager')) {
                // Check if manager is assigned directly
                const isAssigned = item.assignee?.some(assignee => {
                    const assigneeId = assignee._id || assignee;
                    return assigneeId === userId;
                });
                if (isAssigned) return true;

                // Check if any assignee is from manager's department
                return item.assignee?.some(assignee =>
                    assignee?.department === user.department
                );
            }
        }

        return false;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!commentText.trim()) return;

        try {
            setLoading(true);
            const response = type === 'subtask'
                ? await api.addSubtaskComment(item._id, commentText)
                : await api.addTaskComment(item._id, commentText);

            // Get the updated item from the response
            const updatedItem = response.data || response;

            // Update local comments state immediately for seamless UI
            if (updatedItem.comments) {
                setComments(updatedItem.comments);
            }

            setCommentText('');

            // Optionally notify parent component (but don't trigger full page refresh)
            onCommentAdded?.(updatedItem);
        } catch (error) {
            console.error('Error adding comment:', error);
            alert(error.response?.data?.message || 'Failed to add comment');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (commentId) => {
        setCommentToDelete(commentId);
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        if (!commentToDelete) return;

        try {
            const response = type === 'subtask'
                ? await api.deleteSubtaskComment(item._id, commentToDelete)
                : await api.deleteTaskComment(item._id, commentToDelete);

            // Get the updated item from the response
            const updatedItem = response.data || response;

            // Update local comments state immediately for seamless UI
            if (updatedItem.comments) {
                setComments(updatedItem.comments);
            }

            // Optionally notify parent component
            onCommentAdded?.(updatedItem);

            // Close modal and reset
            setShowDeleteModal(false);
            setCommentToDelete(null);
        } catch (error) {
            console.error('Error deleting comment:', error);
            alert(error.response?.data?.message || 'Failed to delete comment');
            setShowDeleteModal(false);
            setCommentToDelete(null);
        }
    };

    const handleCancelDelete = () => {
        setShowDeleteModal(false);
        setCommentToDelete(null);
    };

    const handleEditClick = (comment) => {
        setEditingCommentId(comment._id);
        setEditText(comment.text);
    };

    const handleCancelEdit = () => {
        setEditingCommentId(null);
        setEditText('');
    };

    const handleSaveEdit = async (commentId) => {
        if (!editText.trim()) return;

        try {
            const response = type === 'subtask'
                ? await api.editSubtaskComment(item._id, commentId, editText)
                : await api.editTaskComment(item._id, commentId, editText);

            // Get the updated item from the response
            const updatedItem = response.data || response;

            // Update local comments state immediately for seamless UI
            if (updatedItem.comments) {
                setComments(updatedItem.comments);
            }

            // Reset edit state
            setEditingCommentId(null);
            setEditText('');

            // Optionally notify parent component
            onCommentAdded?.(updatedItem);
        } catch (error) {
            console.error('Error editing comment:', error);
            alert(error.response?.data?.message || 'Failed to edit comment');
        }
    };

    return (
        <div className={styles.commentSection}>
            <h4>Comments</h4>
            
            {/* Display existing comments */}
            <div className={styles.commentsList}>
                {comments && comments.length > 0 ? (
                    comments.map((comment) => {
                        const userId = user?.id || user?._id;
                        const commentAuthorId = comment.author?._id || comment.author;
                        const isOwnComment = userId && commentAuthorId && commentAuthorId.toString() === userId.toString();
                        const isEditing = editingCommentId === comment._id;

                        return (
                            <div key={comment._id} className={styles.comment}>
                                <div className={styles.commentHeader}>
                                    <strong>{comment.authorName}</strong>
                                    {isOwnComment && !isEditing && (
                                        <div className={styles.commentActions}>
                                            <button
                                                className={styles.editButton}
                                                onClick={() => handleEditClick(comment)}
                                                title="Edit comment"
                                            >
                                                <svg
                                                    width="16"
                                                    height="16"
                                                    viewBox="0 0 16 16"
                                                    fill="currentColor"
                                                >
                                                    <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                                                </svg>
                                            </button>
                                            <button
                                                className={styles.deleteButton}
                                                onClick={() => handleDeleteClick(comment._id)}
                                                title="Delete comment"
                                            >
                                                <svg
                                                    width="16"
                                                    height="16"
                                                    viewBox="0 0 16 16"
                                                    fill="currentColor"
                                                >
                                                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                                    <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                                                </svg>
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {isEditing ? (
                                    <div className={styles.editForm}>
                                        <textarea
                                            value={editText}
                                            onChange={(e) => setEditText(e.target.value)}
                                            rows={3}
                                            className={styles.editTextarea}
                                        />
                                        <div className={styles.editActions}>
                                            <button
                                                className={styles.saveButton}
                                                onClick={() => handleSaveEdit(comment._id)}
                                                disabled={!editText.trim()}
                                            >
                                                Save
                                            </button>
                                            <button
                                                className={styles.cancelButton}
                                                onClick={handleCancelEdit}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <p>{comment.text}</p>
                                        <small>{new Date(comment.createdAt).toLocaleString()}</small>
                                    </>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <p className={styles.noComments}>No comments yet</p>
                )}
            </div>

            {/* Add new comment - only show if user has permission */}
            {canComment() ? (
                <form onSubmit={handleSubmit} className={styles.commentForm}>
                    <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Add a comment..."
                        rows={3}
                        disabled={loading}
                    />
                    <button type="submit" disabled={loading || !commentText.trim()}>
                        {loading ? 'Posting...' : 'Post Comment'}
                    </button>
                </form>
            ) : (
                <p className={styles.noPermission} style={{ color: '#666', fontStyle: 'italic', marginTop: '10px' }}>
                    You don't have permission to comment on this {type}
                </p>
            )}

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={handleCancelDelete}
                onConfirm={handleConfirmDelete}
                title="Delete Comment"
                message="Are you sure you want to delete this comment? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
            />
        </div>
    );
}