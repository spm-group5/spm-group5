import { useEffect } from "react";
import { useNotificationCenter } from "../context/NotificationsCenterContext"; 
import { useNotifications } from "../hooks/useNotifications.js"; // ← For toast errors only
import NotificationCard from "../components/common/Notifications/NotificationCard.jsx";
import Header from "../components/common/Header/Header";
import styles from "./NotificationsPage.module.css";

export default function NotificationsPage() {
    const { 
        notifications, 
        loading, 
        error,
        fetchNotifications,
        markRead, 
        markAllRead, 
        deleteNotification 
    } = useNotificationCenter();
    
    const { addNotification } = useNotifications(); // For toast errors

    // Fetch notifications when page loads
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Show error toast if there's an error
    useEffect(() => {
        if (error) {
            addNotification(error, "error", 5000);
        }
    }, [error, addNotification]);

    // Wrapper functions to show toast on errors
    const handleMarkRead = async (id) => {
        const result = await markRead(id);
        if (!result.success) {
            addNotification(result.error, "error", 4000);
        }
    };

    const handleMarkAllRead = async () => {
        const result = await markAllRead();
        if (!result.success) {
            addNotification(result.error, "error", 4000);
        }
    };

    const handleDelete = async (id) => {
        const result = await deleteNotification(id);
        if (!result.success) {
            addNotification(result.error, "error", 4000);
        }
    };

    // Filter for unread notifications
    const unreadNotifications = notifications.filter(n => !n.read);
    const readNotifications = notifications.filter(n => n.read);

    return (
        <>
            <Header />
            <div className={styles.page}>
                <div className={styles.header}>
                    <h1>Notifications</h1>
                    <div>
                        {unreadNotifications.length > 0 && (
                            <span className={styles.unreadCount}>
                                {unreadNotifications.length} unread
                            </span>
                        )}
                        <button
                            onClick={handleMarkAllRead}
                            className={styles.action}
                            aria-label="Mark all notifications as read"
                            disabled={unreadNotifications.length === 0}
                        >
                            Mark all read
                        </button>
                    </div>
                </div>

            {loading ? (
                <div className={styles.empty}>Loading…</div>
            ) : notifications.length === 0 ? (
                <div className={styles.empty}>
                    <div>No notifications</div>
                    <div>You currently have no notifications.</div>
                </div>
            ) : (
                <>
                    {/* Show unread notifications first */}
                    {unreadNotifications.length > 0 && (
                        <>
                            <h2 className={styles.sectionTitle}>Unread</h2>
                            <div className={styles.list}>
                                {unreadNotifications.map((n, idx) => (
                                    <NotificationCard
                                        key={n._id ?? `${n.createdAt ?? Date.now()}-${idx}`}
                                        notification={n}
                                        onMarkRead={() => handleMarkRead(n._id)}
                                        onDelete={() => handleDelete(n._id)}
                                    />
                                ))}
                            </div>
                        </>
                    )}

                    {/* Show read notifications */}
                    {readNotifications.length > 0 && (
                        <>
                            <h2 className={styles.sectionTitle}>Read</h2>
                            <div className={styles.list}>
                                {readNotifications.map((n, idx) => (
                                    <NotificationCard
                                        key={n._id ?? `${n.createdAt ?? Date.now()}-${idx}`}
                                        notification={n}
                                        onMarkRead={() => handleMarkRead(n._id)}
                                        onDelete={() => handleDelete(n._id)}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </>
            )}
            </div>
        </>
    );
}