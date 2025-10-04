# Frontend API Documentation

This document outlines the frontend API client structure and available methods for interacting with the backend.

## API Service Location
- **File**: `frontend/src/services/api.js`
- **Service Class**: `ApiService`
- **Export**: Default export as singleton instance

## Configuration
- **Base URL**: Configured via `VITE_API_URL` environment variable or defaults to `http://localhost:3000/api`
- **Authentication**: Uses HTTP cookies with `credentials: 'include'`
- **Headers**: Automatically sets `Content-Type: application/json`

---

## Available Methods

### User/Authentication Methods (Missing - Need Implementation)

#### `register(userData)`
Register a new user account.
- **Status**: ❌ Not implemented
- **Backend Endpoint**: `POST /register`
- **Parameters**: `userData` - User registration data
- **Returns**: Promise with registration response

#### `login(credentials)`
Authenticate user and create session.
- **Status**: ❌ Not implemented
- **Backend Endpoint**: `POST /login`
- **Parameters**: `credentials` - Login credentials (email/username, password)
- **Returns**: Promise with authentication response

#### `logout()`
End user session.
- **Status**: ❌ Not implemented
- **Backend Endpoint**: `POST /logout`
- **Returns**: Promise with logout confirmation

#### `getProfile()`
Get current user's profile information.
- **Status**: ❌ Not implemented
- **Backend Endpoint**: `GET /profile`
- **Returns**: Promise with user profile data

### Task Methods (Partially Implemented)

#### `createTask(taskData)` ✅
Create a new task.
- **Status**: ✅ Implemented
- **File**: `frontend/src/services/api.js:30`
- **Backend Endpoint**: `POST /tasks`
- **Parameters**: `taskData` - Task object with title, description, status, etc.
- **Returns**: Promise with created task object

#### `updateTask(taskId, taskData)` ✅
Update an existing task.
- **Status**: ✅ Implemented
- **File**: `frontend/src/services/api.js:37`
- **Backend Endpoint**: `PUT /tasks/:taskId`
- **Parameters**:
  - `taskId` - Task ID to update
  - `taskData` - Updated task data
- **Returns**: Promise with updated task object

#### `getTasks(filters)` ✅
Get all tasks with optional filtering.
- **Status**: ✅ Implemented
- **File**: `frontend/src/services/api.js:44`
- **Backend Endpoint**: `GET /tasks`
- **Parameters**: `filters` - Optional query parameters for filtering
- **Returns**: Promise with array of task objects

#### `getTaskById(taskId)` ✅
Get a specific task by ID.
- **Status**: ✅ Implemented
- **File**: `frontend/src/services/api.js:50`
- **Backend Endpoint**: `GET /tasks/:taskId`
- **Parameters**: `taskId` - Task ID to retrieve
- **Returns**: Promise with task object

#### `deleteTask(taskId)` ✅
Delete a specific task.
- **Status**: ✅ Implemented
- **File**: `frontend/src/services/api.js:54`
- **Backend Endpoint**: `DELETE /tasks/:taskId`
- **Parameters**: `taskId` - Task ID to delete
- **Returns**: Promise with deletion confirmation

### Project Methods (Partially Implemented)

#### `createProject(projectData)` ✅
Create a new project.
- **Status**: ✅ Implemented
- **File**: `frontend/src/services/api.js:64`
- **Backend Endpoint**: `POST /projects`
- **Parameters**: `projectData` - Project object with name, description, etc.
- **Returns**: Promise with created project object

#### `getProjects()` ✅
Get all projects.
- **Status**: ✅ Implemented
- **File**: `frontend/src/services/api.js:60`
- **Backend Endpoint**: `GET /projects`
- **Returns**: Promise with array of project objects

#### `getProjectById(projectId)`
Get a specific project by ID.
- **Status**: ❌ Not implemented
- **Backend Endpoint**: `GET /projects/:projectId`
- **Parameters**: `projectId` - Project ID to retrieve
- **Returns**: Promise with project object

#### `updateProject(projectId, projectData)`
Update an existing project.
- **Status**: ❌ Not implemented
- **Backend Endpoint**: `PUT /projects/:projectId`
- **Parameters**:
  - `projectId` - Project ID to update
  - `projectData` - Updated project data
- **Returns**: Promise with updated project object

#### `deleteProject(projectId)`
Delete a specific project.
- **Status**: ❌ Not implemented
- **Backend Endpoint**: `DELETE /projects/:projectId`
- **Parameters**: `projectId` - Project ID to delete
- **Returns**: Promise with deletion confirmation

---

## Data Types

### Task Object
```javascript
{
  _id: string,                      // Task ID
  title: string,                    // Required
  description: string,              // Optional, defaults to empty string
  status: 'To Do' | 'In Progress' | 'Done',  // Default: 'To Do'
  owner: string,                    // User ID (required)
  assignee?: string,                // User ID (optional)
  project?: string,                 // Project ID (optional)
  dueDate?: Date,                   // Optional, must not be in past
  createdAt: Date,                  // Auto-generated
  updatedAt: Date                   // Auto-updated
}
```

### Project Object
```javascript
{
  _id: string,                      // Project ID
  name: string,                     // Required, non-empty
  description: string,              // Optional, defaults to empty string
  owner: string,                    // User ID (required)
  members: string[],                // Array of User IDs
  status: 'Active' | 'Completed' | 'Archived',  // Default: 'Active'
  createdAt: Date,                  // Auto-generated
  updatedAt: Date                   // Auto-updated
}
```

### User Object (Structure based on backend references)
```javascript
{
  _id: string,                      // User ID
  // Additional fields depend on User model implementation
}
```

---

## Error Handling

The API service includes built-in error handling:
- Automatically parses JSON responses
- Throws errors for non-200 status codes
- Logs errors to console
- Preserves error messages from backend responses

## Usage Example

```javascript
import api from './services/api.js';

// Create a task
try {
  const newTask = await api.createTask({
    title: 'Complete API documentation',
    description: 'Document all API endpoints and methods',
    status: 'To Do',
    dueDate: new Date('2024-01-15')
  });
  console.log('Task created:', newTask);
} catch (error) {
  console.error('Failed to create task:', error.message);
}

// Get all tasks
const tasks = await api.getTasks();

// Filter tasks
const inProgressTasks = await api.getTasks({ status: 'In Progress' });
```

## Missing Implementations

The following methods need to be added to complete the API service:

### User/Auth Methods
- `register(userData)`
- `login(credentials)`
- `logout()`
- `getProfile()`

### Project Methods
- `getProjectById(projectId)`
- `updateProject(projectId, projectData)`
- `deleteProject(projectId)`