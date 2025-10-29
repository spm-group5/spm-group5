import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { TaskProvider } from "./context/TaskContext";
import { ProjectProvider } from "./context/ProjectContext";
import { NotificationProvider } from "./context/NotificationContext";
import { NotificationCenterProvider } from "./context/NotificationsCenterContext";
import { SubtaskProvider } from "./context/SubtaskContext";
import { ThemeProvider } from "./context/ThemeContext";
import { useSocket } from "./hooks/useSocket";
import NotificationContainer from "./components/common/Notifications/NotificationContainer";
import ProtectedRoute from "./router/ProtectedRoute";
import AdminRoute from "./router/AdminRoute";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import TasksPage from "./pages/TasksPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectTasksPage from "./pages/ProjectTasksPage";
import ReportsPage from "./pages/ReportsPage";
import NotificationsPage from "./pages/NotificationsPage.jsx";

function SocketManager() {
  useSocket(); // Start the socket connection
  return null;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <NotificationCenterProvider>
            <TaskProvider>
              <ProjectProvider>
                <SubtaskProvider>
                  <Router>
                    <SocketManager />
                    <Routes>
                      <Route path="/login" element={<LoginPage />} />
                      <Route
                        path="/dashboard"
                        element={
                          <ProtectedRoute>
                            <DashboardPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/tasks"
                        element={
                          <ProtectedRoute>
                            <TasksPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/projects"
                        element={
                          <ProtectedRoute>
                            <ProjectsPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/projects/:projectId/tasks"
                        element={
                          <ProtectedRoute>
                            <ProjectTasksPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/notifications"
                        element={
                          <ProtectedRoute>
                            <NotificationsPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/reports"
                        element={
                          <AdminRoute>
                            <ReportsPage />
                          </AdminRoute>
                        }
                      />
                      <Route
                        path="/"
                        element={<Navigate to="/dashboard" replace />}
                      />
                      <Route
                        path="*"
                        element={<Navigate to="/dashboard" replace />}
                      />
                    </Routes>
                    <NotificationContainer />
                  </Router>
                </SubtaskProvider>
              </ProjectProvider>
            </TaskProvider>
          </NotificationCenterProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
