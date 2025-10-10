import { useState } from 'react';
import api from '../../../services/api';
import styles from './TaskCommentSection.module.css';

export default function CommentSection({ task, onCommentAdded }) {
    const [commentText, setCommentText] = useState('');
    const [loading, setLoading] = useState(false);

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

            {/* Add new comment */}
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
        </div>
    );
}