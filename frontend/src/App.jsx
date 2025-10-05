import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { TaskProvider } from './context/TaskContext';
import { ProjectProvider } from './context/ProjectContext';
import { NotificationProvider } from './context/NotificationContext';
import { useSocket } from './hooks/useSocket';
import NotificationContainer from './components/common/Notifications/NotificationContainer';
import ProtectedRoute from './router/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TasksPage from './pages/TasksPage';
import ProjectsPage from './pages/ProjectsPage';

function SocketManager() {
  useSocket(); //Start the socket connection
  return null;
}


function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <TaskProvider>
          <ProjectProvider>
            <Router>
              <SocketManager />
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                } />
                <Route path="/tasks" element={
                  <ProtectedRoute>
                    <TasksPage />
                  </ProtectedRoute>
                } />
                <Route path="/projects" element={
                  <ProtectedRoute>
                    <ProjectsPage />
                  </ProtectedRoute>
                } />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
              <NotificationContainer />
            </Router>
          </ProjectProvider>
        </TaskProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App
