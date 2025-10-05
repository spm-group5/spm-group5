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

## Report Endpoints

### Admin Routes (Authentication + Admin Role Required)

#### GET `/reports/task-completion/project/:projectId`
Generate task completion report for a specific project. Only accessible by users with 'admin' role.
- **File**: `backend/src/routes/report.router.js:7`
- **Controller**: `reportController.generateProjectTaskCompletionReport`
- **Authentication**: Required (`requireAuth` + `requireRole(['admin'])` middleware)
- **URL Parameters**: 
  - `projectId` (required): MongoDB ObjectId of the project
- **Query Parameters** (ALL REQUIRED): 
  - `startDate`: Start date for filtering tasks by creation date (ISO format: YYYY-MM-DD)
  - `endDate`: End date for filtering tasks by creation date (ISO format: YYYY-MM-DD)
  - `format`: Output format - 'json', 'pdf', or 'excel'
- **Response**: 
  - `format=json`: JSON object with report data
  - `format=pdf`: PDF file download
  - `format=excel`: Excel (.xlsx) file download

#### GET `/reports/task-completion/user/:userId`
Generate task completion report for a specific user (tasks where user is owner or assignee). Only accessible by users with 'admin' role.
- **File**: `backend/src/routes/report.router.js:13`
- **Controller**: `reportController.generateUserTaskCompletionReport`
- **Authentication**: Required (`requireAuth` + `requireRole(['admin'])` middleware)
- **URL Parameters**: 
  - `userId` (required): MongoDB ObjectId of the user
- **Query Parameters** (ALL REQUIRED): 
  - `startDate`: Start date for filtering tasks by creation date (ISO format: YYYY-MM-DD)
  - `endDate`: End date for filtering tasks by creation date (ISO format: YYYY-MM-DD)
  - `format`: Output format - 'json', 'pdf', or 'excel'
- **Response**: 
  - `format=json`: JSON object with report data
  - `format=pdf`: PDF file download
  - `format=excel`: Excel (.xlsx) file download

**Example Usage:**
```
GET /api/reports/task-completion/project/64abc123def456789?startDate=2024-01-01&endDate=2024-12-31&format=pdf
GET /api/reports/task-completion/user/64xyz789abc123def?startDate=2024-10-01&endDate=2024-10-31&format=excel
GET /api/reports/task-completion/project/64abc123def456789?startDate=2024-01-01&endDate=2024-12-31&format=json
```

**JSON Response Structure:**
```javascript
{
  "success": true,
  "data": {
    "data": {
      "To Do": [array of tasks],
      "In Progress": [array of tasks], 
      "Blocked": [array of tasks],
      "Done": [array of tasks]
    },
    "aggregates": {
      "To Do": number,
      "In Progress": number,
      "Blocked": number,
      "Done": number,
      "total": number
    },
    "metadata": {
      "type": "project" | "user",
      "dateRange": {
        "startDate": "DD-MM-YYYY",
        "endDate": "DD-MM-YYYY"
      },
      "generatedAt": "DD-MM-YYYY at HH:MM",
      // Project-specific metadata (if type="project")
      "projectId": "project_id",
      "projectName": "project_name",
      "projectOwner": "owner_username",
      // User-specific metadata (if type="user")
      "userId": "user_id",
      "username": "username"
    }
  }
}
```

**Task Object in Report:**
```javascript
{
  "id": "task_id",
  "title": "task_title",
  "deadline": "DD-MM-YYYY or 'No deadline'",
  "priority": number,
  "tags": "comma,separated,tags or 'No tags'",
  "description": "task_description or 'No description'",
  "owner": "owner_username or 'No owner'",
  "assignee": "assignee_username or 'Unassigned'",
  "project": "project_name or 'No project'",
  "createdAt": "DD-MM-YYYY"
}
```

**Filtering Logic:**
- **Project Reports**: Include tasks where `task.project = projectId` and `task.createdAt` falls within the date range
- **User Reports**: Include tasks where user is either `task.owner` OR `task.assignee` and `task.createdAt` falls within the date range
- **Date Filtering**: Based on `task.createdAt` field (when the task was created)
- **Sorting**: Tasks are sorted by `dueDate` first (earliest to latest), then by `createdAt`

**Error Responses:**
- `400 Bad Request`: Missing required parameters or invalid date format
- `404 Not Found`: Project or user not found
- `403 Forbidden`: User doesn't have admin role
- `500 Internal Server Error`: PDF/Excel generation failure or server error

---

## Data Schemas

### Task Schema
**File**: `backend/src/models/task.model.js`

```javascript
{
  _id: ObjectId,                    // MongoDB document ID
  title: String,                    // Required, non-empty string
  description: String,              // Optional, defaults to empty string
  priority: Number,                 // Required, integer 1-10, default: 5
  status: String,                   // Enum: ['To Do', 'In Progress', 'Blocked', 'Done'], default: 'To Do'
  tags: String,                     // Optional, comma-separated tags, defaults to empty string
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
- `priority`: Must be a number between 1 and 10 (inclusive)
- `status`: Must be one of: 'To Do', 'In Progress', 'Blocked', 'Done'
- `tags`: Must be a string (can be empty)
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