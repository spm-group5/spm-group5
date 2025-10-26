import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';
import Modal from '../../common/Modal/Modal';
import styles from './TaskCommentSection.module.css';

export default function CommentSection({ task, onCommentAdded }) {
    const [commentText, setCommentText] = useState('');
    const [loading, setLoading] = useState(false);
    const [comments, setComments] = useState(task.comments || []);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [commentToDelete, setCommentToDelete] = useState(null);
    const { user } = useAuth();

    // Update local comments when task prop changes
    useEffect(() => {
        setComments(task.comments || []);
    }, [task.comments]);

    // Check if user can comment based on roles
    const canComment = () => {
        if (!user) return false;
        
        // Admin can comment on all
        if (user.roles?.includes('admin')) {
            return true;
        }
        
        // Get userId - could be user.id or user._id depending on context
        const userId = user.id || user._id;
        
        // Staff can only comment if assigned
        if (user.roles?.includes('staff') && !user.roles?.includes('manager')) {
            return task.assignee?.some(assignee => {
                const assigneeId = assignee._id || assignee;
                return assigneeId === userId;
            });
        }
        
        // Manager can comment if any assignee is from their department
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!commentText.trim()) return;

        try {
            setLoading(true);
            const response = await api.addTaskComment(task._id, commentText);

            // Get the updated task from the response
            const updatedTask = response.data || response;

            // Update local comments state immediately for seamless UI
            if (updatedTask.comments) {
                setComments(updatedTask.comments);
            }

            setCommentText('');

            // Optionally notify parent component (but don't trigger full page refresh)
            onCommentAdded?.(updatedTask);
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
            const response = await api.deleteTaskComment(task._id, commentToDelete);

            // Get the updated task from the response
            const updatedTask = response.data || response;

            // Update local comments state immediately for seamless UI
            if (updatedTask.comments) {
                setComments(updatedTask.comments);
            }

            // Optionally notify parent component
            onCommentAdded?.(updatedTask);

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

                        return (
                            <div key={comment._id} className={styles.comment}>
                                <div className={styles.commentHeader}>
                                    <strong>{comment.authorName}</strong>
                                    {isOwnComment && (
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
                                    )}
                                </div>
                                <p>{comment.text}</p>
                                <small>{new Date(comment.createdAt).toLocaleString()}</small>
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
                    You don't have permission to comment on this task
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