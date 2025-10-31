import { useEffect, useState } from "react";
import { useNotificationCenter } from "../context/NotificationsCenterContext";
import { useNotifications } from "../hooks/useNotifications.js";
import NotificationCard from "../components/common/Notifications/NotificationCard.jsx";
import Header from "../components/common/Header/Header";
import Modal from "../components/common/Modal/Modal";
import styles from "./NotificationsPage.module.css";

export default function NotificationsPage() {
  const {
    notifications,
    loading,
    error,
    fetchNotifications,
    markRead,
    markAllRead,
    deleteNotification,
  } = useNotificationCenter();

  const { addNotification } = useNotifications();
  const [activeTab, setActiveTab] = useState("unread");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDeleteAllRead = () => {
    const readNotifications = notifications.filter(n => n.read);
    
    if (readNotifications.length === 0) {
      addNotification("No read notifications to delete", "info", 3000);
      return;
    }
    
    setShowDeleteModal(true);
  };

  const confirmDeleteAllRead = async () => {
    const readNotifications = notifications.filter(n => n.read);
    
    setIsDeleting(true);
    setShowDeleteModal(false); // Close modal immediately
    
    try {
      let successCount = 0;
      let failCount = 0;
      
      // Check result of each delete
      for (const notification of readNotifications) {
        const result = await deleteNotification(notification._id);
        if (result.success) {
          successCount++;
        } else {
          failCount++;
          console.error(`Failed to delete notification ${notification._id}:`, result.error);
        }
      }
      
      // Show appropriate message
      if (failCount === 0) {
        addNotification(
          `Deleted ${successCount} read notification${successCount > 1 ? 's' : ''}`,
          "success",
          3000
        );
      } else if (successCount > 0) {
        addNotification(
          `Deleted ${successCount} notification${successCount > 1 ? 's' : ''}, but ${failCount} failed`,
          "warning",
          4000
        );
      } else {
        addNotification("Failed to delete notifications. Please try again.", "error", 4000);
      }
    } catch (error) {
      console.error("Error during batch delete:", error);
      addNotification("Failed to delete some notifications", "error", 4000);
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDeleteAllRead = () => {
    setShowDeleteModal(false);
  };

  // Filter for unread notifications
  const unreadNotifications = notifications.filter((n) => !n.read);
  const unreadCount = unreadNotifications.length;
  const readNotifications = notifications.filter(n => n.read);
  
  const filteredNotifications =
    activeTab === "unread"
      ? unreadNotifications
      : notifications;

  const emptyTitle = activeTab === 'unread' ? 'unread ' : '';
  const emptyMessage = activeTab === 'unread' 
      ? "You have no unread notifications."
      : "You currently have no notifications.";

  return (
    <>
      <Header />
      <div className={styles.page}>
        <div className={styles.header}>
          <h1>Notifications</h1>
          <div>
            {unreadCount > 0 && (
              <span className={styles.unreadCount}>
                {unreadCount} unread
              </span>
            )}
            <button
              onClick={handleMarkAllRead}
              className={styles.action}
              aria-label="Mark all notifications as read"
              disabled={unreadCount === 0 || isDeleting}
            >
              Mark all read
            </button>
            <button
              onClick={handleDeleteAllRead}
              className={styles.action}
              aria-label="Delete all read notifications"
              disabled={readNotifications.length === 0 || isDeleting}
            >
              Delete all read
            </button>
          </div>
        </div>

        <div className={styles.tabContainer}>
          <button
            className={`${styles.tab} ${activeTab === "unread" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("unread")}
            disabled={isDeleting}
          >
            Unread ({unreadCount})
          </button>
          <button
            className={`${styles.tab} ${activeTab === "all" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("all")}
            disabled={isDeleting}
          >
            All ({notifications.length})
          </button>
        </div>

        <div className={styles.notificationsContainer}>
          {loading ? (
            <div className={styles.empty}>Loading…</div>
          ) : filteredNotifications.length === 0 ? (
            <div className={styles.empty}>
              <div>No {emptyTitle}notifications</div>
              <div>{emptyMessage}</div>
            </div>
          ) : (
            <div className={styles.list}>
              {filteredNotifications.map((n, idx) => (
                <NotificationCard
                  key={n._id ?? `${n.createdAt ?? Date.now()}-${idx}`}
                  notification={n}
                  onMarkRead={() => handleMarkRead(n._id)}
                  onDelete={() => handleDelete(n._id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ✅ Full page overlay that locks everything */}
      {isDeleting && (
        <div className={styles.fullPageOverlay}>
          <div className={styles.deletingSpinner}>
            <div className={styles.spinner}></div>
            <span>Deleting notifications...</span>
          </div>
        </div>
      )}

      {/* ✅ Keep modal simple - no changes */}
      <Modal
        isOpen={showDeleteModal}
        onClose={cancelDeleteAllRead}
        onConfirm={confirmDeleteAllRead}
        title="Delete All Read Notifications"
        message={`Are you sure you want to delete ${readNotifications.length} read notification${readNotifications.length > 1 ? 's' : ''}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );
}