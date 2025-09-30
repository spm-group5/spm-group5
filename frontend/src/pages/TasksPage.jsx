import { useState, useEffect } from 'react';
import { useTasks } from '../context/TaskContext';
import { useProjects } from '../context/ProjectContext';
import Header from '../components/common/Header/Header';
import Button from '../components/common/Button/Button';
import Spinner from '../components/common/Spinner/Spinner';
import TaskCard from '../components/tasks/TaskCard/TaskCard';
import TaskForm from '../components/tasks/TaskForm/TaskForm';
import styles from './TasksPage.module.css';

function TasksPage() {
  const { tasks, loading, error, fetchTasks, createTask, updateTask, deleteTask } = useTasks();
  const { fetchProjects } = useProjects();
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  useEffect(() => {
    fetchTasks();
    fetchProjects();
  }, [fetchTasks, fetchProjects]);

  const handleCreateTask = () => {
    setEditingTask(null);
    setShowForm(true);
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      await deleteTask(taskId);
    }
  };

  const handleFormSubmit = async (formData) => {
    try {
      if (editingTask) {
        await updateTask(editingTask._id, formData);
      } else {
        await createTask(formData);
      }
      setShowForm(false);
      setEditingTask(null);
    } catch (err) {
      console.error('Error saving task:', err);
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingTask(null);
  };

  if (loading && tasks.length === 0) {
    return (
      <div>
        <Header />
        <div className="container flex justify-center items-center" style={{ minHeight: '400px' }}>
          <Spinner size="large" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className={`container ${styles.page}`}>
        {showForm ? (
          <TaskForm
            task={editingTask}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
          />
        ) : (
          <>
            <div className={styles.header}>
              <h1>Tasks</h1>
              <Button variant="primary" onClick={handleCreateTask}>
                New Task
              </Button>
            </div>

            {error && (
              <div className={styles.error}>
                Error: {error}
              </div>
            )}

            {tasks.length === 0 ? (
              <div className={styles.emptyState}>
                <h3>No tasks yet</h3>
                <p>Create your first task to get started!</p>
                <Button variant="primary" onClick={handleCreateTask}>
                  Create Task
                </Button>
              </div>
            ) : (
              <div className={styles.taskGrid}>
                {tasks.map((task) => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default TasksPage;