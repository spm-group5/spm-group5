# Backend API Documentation

This document outlines all available API endpoints and data schemas based on the backend implementation.

## Base URL
- Development: `http://localhost:3000/api`
- Production: Set via environment configuration

## Authentication
All protected endpoints require authentication. Authentication is handled via the `requireAuth` middleware.

---

## User/Authentication Endpoints

### Public Routes (No Authentication Required)

#### POST `/register`
Register a new user account.
- **File**: `backend/src/routes/user.router.js:7`
- **Controller**: `userController.register`
- **Authentication**: Not required
- **Request Body**: User registration data
- **Response**: User registration confirmation

#### POST `/login`
Authenticate user and create session.
- **File**: `backend/src/routes/user.router.js:8`
- **Controller**: `userController.login`
- **Authentication**: Not required
- **Request Body**: Login credentials (email/username, password)
- **Response**: Authentication token/session

#### POST `/logout`
End user session.
- **File**: `backend/src/routes/user.router.js:9`
- **Controller**: `userController.logout`
- **Authentication**: Not required
- **Response**: Logout confirmation

### Protected Routes (Authentication Required)

#### GET `/profile`
Get current user's profile information.
- **File**: `backend/src/routes/user.router.js:12`
- **Controller**: `userController.getProfile`
- **Authentication**: Required (`requireAuth` middleware)
- **Response**: User profile data

---

## Task Endpoints
All task endpoints require authentication (`requireAuth` middleware).

#### POST `/tasks`
Create a new task.
- **File**: `backend/src/routes/task.router.js:6`
- **Controller**: `taskController.createTask`
- **Authentication**: Required
- **Request Body**: Task data (see Task Schema below)
- **Response**: Created task object

#### PUT `/tasks/:taskId`
Update an existing task.
- **File**: `backend/src/routes/task.router.js:7`
- **Controller**: `taskController.updateTask`
- **Authentication**: Required
- **URL Parameters**: `taskId` - Task ID to update
- **Request Body**: Updated task data
- **Response**: Updated task object

#### GET `/tasks`
Get all tasks (with optional filtering).
- **File**: `backend/src/routes/task.router.js:8`
- **Controller**: `taskController.getTasks`
- **Authentication**: Required
- **Query Parameters**: Optional filters
- **Response**: Array of task objects

#### GET `/tasks/:taskId`
Get a specific task by ID.
- **File**: `backend/src/routes/task.router.js:9`
- **Controller**: `taskController.getTaskById`
- **Authentication**: Required
- **URL Parameters**: `taskId` - Task ID to retrieve
- **Response**: Task object

#### DELETE `/tasks/:taskId`
Delete a specific task.
- **File**: `backend/src/routes/task.router.js:10`
- **Controller**: `taskController.deleteTask`
- **Authentication**: Required
- **URL Parameters**: `taskId` - Task ID to delete
- **Response**: Deletion confirmation

---

## Project Endpoints
All project endpoints require authentication (`requireAuth` middleware).

#### POST `/projects`
Create a new project.
- **File**: `backend/src/routes/project.router.js:6`
- **Controller**: `projectController.createProject`
- **Authentication**: Required
- **Request Body**: Project data (see Project Schema below)
- **Response**: Created project object

#### GET `/projects`
Get all projects.
- **File**: `backend/src/routes/project.router.js:7`
- **Controller**: `projectController.getProjects`
- **Authentication**: Required
- **Response**: Array of project objects

#### GET `/projects/:projectId`
Get a specific project by ID.
- **File**: `backend/src/routes/project.router.js:8`
- **Controller**: `projectController.getProjectById`
- **Authentication**: Required
- **URL Parameters**: `projectId` - Project ID to retrieve
- **Response**: Project object

#### PUT `/projects/:projectId`
Update an existing project.
- **File**: `backend/src/routes/project.router.js:9`
- **Controller**: `projectController.updateProject`
- **Authentication**: Required
- **URL Parameters**: `projectId` - Project ID to update
- **Request Body**: Updated project data
- **Response**: Updated project object

#### DELETE `/projects/:projectId`
Delete a specific project.
- **File**: `backend/src/routes/project.router.js:10`
- **Controller**: `projectController.deleteProject`
- **Authentication**: Required
- **URL Parameters**: `projectId` - Project ID to delete
- **Response**: Deletion confirmation

---

## Data Schemas

### Task Schema
**File**: `backend/src/models/task.model.js`

```javascript
{
  _id: ObjectId,                    // MongoDB document ID
  title: String,                    // Required, non-empty string
  description: String,              // Optional, defaults to empty string
  status: String,                   // Enum: ['To Do', 'In Progress', 'Done'], default: 'To Do'
  owner: ObjectId,                  // Required, references User document
  assignee: ObjectId,               // Optional, references User document, defaults to null
  project: ObjectId,                // Optional, references Project document, defaults to null
  dueDate: Date,                    // Optional, must not be in the past, defaults to null
  createdAt: Date,                  // Auto-generated timestamp
  updatedAt: Date                   // Auto-updated timestamp
}
```

#### Task Validation Rules
- `title`: Must be a non-empty string after trimming
- `status`: Must be one of: 'To Do', 'In Progress', 'Done'
- `dueDate`: Cannot be in the past (if provided)
- `owner`: Must be a valid User ObjectId
- `assignee`: Must be a valid User ObjectId (if provided)
- `project`: Must be a valid Project ObjectId (if provided)

### Project Schema
**File**: `backend/src/models/project.model.js`

```javascript
{
  _id: ObjectId,                    // MongoDB document ID
  name: String,                     // Required, non-empty string, trimmed
  description: String,              // Optional, defaults to empty string, trimmed
  owner: ObjectId,                  // Required, references User document
  members: [ObjectId],              // Array of User ObjectIds
  status: String,                   // Enum: ['Active', 'Completed', 'Archived'], default: 'Active'
  createdAt: Date,                  // Auto-generated timestamp
  updatedAt: Date                   // Auto-updated timestamp
}
```

#### Project Validation Rules
- `name`: Must be a non-empty string after trimming
- `status`: Must be one of: 'Active', 'Completed', 'Archived'
- `owner`: Must be a valid User ObjectId
- `members`: Array of valid User ObjectIds

---

## Notes

### Referenced Collections
- Tasks reference `users` collection for `owner` and `assignee` fields
- Tasks reference `projects` collection for `project` field
- Projects reference `users` collection for `owner` and `members` fields

### Middleware
- `requireAuth`: Authentication middleware that protects routes requiring user authentication
- Pre-save hooks: Both Task and Project models automatically update `updatedAt` timestamp on save

### Model Names
- Task model: `Task`
- Project model: `projects` (note the lowercase and plural form)
- User model: `users` (referenced in populate operations)