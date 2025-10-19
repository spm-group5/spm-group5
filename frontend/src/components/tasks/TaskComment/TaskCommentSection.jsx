import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';
import styles from './TaskCommentSection.module.css';

export default function CommentSection({ task, onCommentAdded }) {
    const [commentText, setCommentText] = useState('');
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();

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
            await api.addTaskComment(task._id, commentText);
            setCommentText('');
            onCommentAdded?.(); // Refresh task data
        } catch (error) {
            console.error('Error adding comment:', error);
            alert(error.response?.data?.message || 'Failed to add comment');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.commentSection}>
            <h4>Comments</h4>
            
            {/* Display existing comments */}
            <div className={styles.commentsList}>
                {task.comments && task.comments.length > 0 ? (
                    task.comments.map((comment, idx) => (
                        <div key={idx} className={styles.comment}>
                            <strong>{comment.authorName}</strong>
                            <p>{comment.text}</p>
                            <small>{new Date(comment.createdAt).toLocaleString()}</small>
                        </div>
                    ))
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
        </div>
    );
}