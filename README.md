# All-In-One Task Management System

## Table of Contents

- [Overview](#overview)
- [Core Features](#core-features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Prerequisites](#prerequisites)
- [Installation and Setup](#installation-and-setup)
- [Project Structure](#project-structure)
- [Development Guide](#development-guide)
- [Testing](#testing)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)

## Overview

All-In-One is a comprehensive task management system designed for team collaboration and project oversight. The platform enables organizations to manage projects, tasks, and subtasks with role-based access control, real-time notifications, time tracking, and administrative reporting capabilities.

Built with modern web technologies, the system provides a responsive single-page application frontend communicating with a RESTful API backend, supported by MongoDB for data persistence and Socket.IO for real-time features.

## Core Features

### Project Management
- Create and manage projects with owners and team members
- Project status tracking (To Do, In Progress, Completed, Blocked)
- Priority levels (1-10) and due date management
- Tag-based categorization and search
- Archive and restore functionality
- Access control based on project membership

### Task Management
- Comprehensive task lifecycle management
- Four status states: To Do, In Progress, Blocked, Completed
- Priority ranking from 1 (lowest) to 10 (highest)
- Multi-assignee support (up to 5 assignees per task)
- Task ownership with transfer capabilities (Manager/Admin only)
- Manual time logging for hours worked
- Recurring task automation with configurable intervals
- Comment system with full CRUD operations
- Archive and restoration capabilities

### Subtask Management
- Break down tasks into manageable subtasks
- Independent status, priority, and assignee management
- Time tracking at subtask level
- Subtask-specific commenting
- Automatic parent task association

### Real-Time Notifications
- WebSocket-based instant notifications using Socket.IO
- Task assignment and status change alerts
- Comment notifications
- Database-persisted notifications with read/unread states
- Notification center with filtering and management
- Email notifications via AWS Lambda integration

### User Management and Security
- Session-based authentication with secure password hashing (bcrypt)
- Three role levels: Staff, Manager, Admin
- Role-based access control (RBAC) for all endpoints
- Department-based organization (HR, IT, Sales, Consultancy, Systems, Engineering, Finance, Managing Director)
- MongoDB session storage with connect-mongo
- Automatic session expiration (15 minutes)

### Administrative Reporting
- Task completion reports by project or user
- Team summary reports with workload distribution
- Logged time reports by project or department
- Excel export functionality (XLSX format)
- Customizable date ranges and filtering

### User Interface
- Modern responsive design using CSS Modules
- Dark and light theme support
- Searchable dropdown components for user selection
- Modal-based forms for clean workflows
- Toast notifications for user feedback
- Real-time data updates across all views

## Technology Stack

### Frontend
- **Framework**: React 19.1.1
- **Build Tool**: Vite 7.1.2
- **Routing**: React Router DOM 7.9.3
- **HTTP Client**: Native Fetch API with custom service layer
- **Real-Time**: Socket.IO Client 4.8.1
- **Form Management**: React Hook Form 7.63.0
- **Date Utilities**: date-fns 4.1.0
- **Styling**: CSS Modules for component-scoped styles
- **Testing**: Vitest 1.0.4, React Testing Library 16.0.0, MSW 2.0.11

### Backend
- **Runtime**: Node.js 20.x (LTS)
- **Framework**: Express.js 5.1.0
- **Database**: MongoDB 6.19.0 with Mongoose ODM 8.18.1
- **Authentication**: bcryptjs 2.4.3
- **Session Management**: express-session 1.18.2 with connect-mongo 5.1.0
- **Real-Time**: Socket.IO 4.8.1
- **Email**: Nodemailer 7.0.6 (SMTP), AWS Lambda for production
- **Excel Generation**: xlsx 0.18.5
- **Validation**: validator 13.15.15
- **AWS Integration**: @aws-sdk/client-ssm 3.0.0
- **Testing**: Vitest 3.2.4, Supertest 7.1.4, mongodb-memory-server 10.2.1
- **Code Quality**: ESLint 9.17.0

### DevOps and Infrastructure
- **Containerization**: Docker (Node 20 Alpine-based images)
- **Cloud Platform**: AWS
  - S3 for frontend static hosting
  - CloudFront for CDN and HTTPS
  - ECR for Docker image registry
  - EC2 for backend application hosting
  - Lambda + SES for email notifications
  - VPC with public and private subnets
  - NAT Instance for private subnet internet access
- **Infrastructure as Code**: Terraform 1.0+
- **End-to-End Testing**: Playwright 1.56.1

### Development Tools
- **Package Management**: npm with workspaces
- **Version Control**: Git
- **Pre-commit Checks**: Custom scripts (check.sh, check.bat, check.js)
- **Linting**: ESLint for both frontend and backend
- **Code Coverage**: Vitest Coverage (80% minimum threshold)

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│                                                                  │
│   React 19 SPA (Vite)                                           │
│   - Context API for state management                            │
│   - Socket.IO client for WebSocket connections                  │
│   - Fetch API for HTTP requests                                 │
│   - React Router for client-side routing                        │
└─────────────────────────────────────────────────────────────────┘
                              ↕ HTTPS/WSS
┌─────────────────────────────────────────────────────────────────┐
│                       Application Layer                          │
│                                                                  │
│   Express.js 5.1.0 Server                                       │
│   - RESTful API endpoints                                        │
│   - Socket.IO server for real-time events                       │
│   - Session middleware (express-session + connect-mongo)        │
│   - Authentication and authorization middleware                  │
│   - Layered architecture (Routes → Controllers → Services)      │
└─────────────────────────────────────────────────────────────────┘
                          ↕ MongoDB Protocol
┌─────────────────────────────────────────────────────────────────┐
│                        Data Layer                                │
│                                                                  │
│   MongoDB Atlas                                                  │
│   Collections: users, tasks, subtasks, projects,               │
│                notifications, sessions                           │
│   Mongoose ODM for schema validation and relationships          │
└─────────────────────────────────────────────────────────────────┘
                          ↕ AWS SDK / SMTP
┌─────────────────────────────────────────────────────────────────┐
│                    External Services Layer                       │
│                                                                  │
│   AWS Lambda (Email Notifications)                              │
│   AWS SES (Email Delivery)                                      │
│   SMTP Server (Development Email)                               │
└─────────────────────────────────────────────────────────────────┘
```

### Production Deployment Architecture (AWS)

```
Internet
   │
   ↓
CloudFront Distribution (CDN + SSL/TLS)
   │
   ├─→ S3 Bucket (Static React Build)
   │
   ↓
Application Load Balancer (optional, future enhancement)
   │
   ↓
┌─────────────────────────────────────────────────────────────┐
│                           VPC                                │
│                                                              │
│  ┌───────────────────┐           ┌────────────────────────┐ │
│  │  Public Subnet    │           │   Private Subnet       │ │
│  │                   │           │                        │ │
│  │  ┌─────────────┐  │           │  ┌──────────────────┐ │ │
│  │  │ NAT Instance│◄─┼───────────┼──┤ EC2 Instance     │ │ │
│  │  └─────────────┘  │           │  │ (Docker Backend) │ │ │
│  │                   │           │  └──────────────────┘ │ │
│  └───────────────────┘           └────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
          │                                    │
          ↓                                    ↓
    Internet Gateway                   MongoDB Atlas
                                       (External)
```

### Request Flow

1. **Client Request**: Browser sends HTTPS request to CloudFront
2. **Static Assets**: CloudFront serves React app from S3
3. **API Calls**: React app makes API calls to backend (credentials included)
4. **Authentication**: Express session middleware validates session cookie
5. **Authorization**: Role-based middleware checks user permissions
6. **Business Logic**: Controllers delegate to service layer
7. **Data Access**: Services interact with MongoDB via Mongoose
8. **Real-Time**: Socket.IO emits events to connected clients
9. **Response**: Data flows back through layers to client

## Prerequisites

Before starting, ensure you have the following installed:

- **Node.js** 18.x or higher (20.x LTS recommended) - [Download](https://nodejs.org/)
- **npm** 9.x or higher (comes with Node.js)
- **MongoDB** - Local installation or MongoDB Atlas account - [MongoDB](https://www.mongodb.com/)
- **Git** - [Download](https://git-scm.com/)

### Optional for Deployment
- **Docker** - [Download](https://www.docker.com/)
- **AWS CLI** configured with credentials - [AWS CLI](https://aws.amazon.com/cli/)
- **Terraform** 1.0+ - [Download](https://www.terraform.io/)

### Recommended Development Tools
- **VS Code** with ESLint extension
- **MongoDB Compass** for database management
- **Postman** or **Thunder Client** for API testing

## Installation and Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-org/spm-group5.git
cd spm-group5
```

### Step 2: Install Dependencies

The project uses npm workspaces for monorepo management.

```bash
# Install all dependencies (root, frontend, and backend)
npm install
```

Alternatively, install individually:

```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

### Step 3: Configure Environment Variables

#### Backend Configuration

Create `backend/environments/.env.test` for local development:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/spm-db
# For MongoDB Atlas:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/spm-db?retryWrites=true&w=majority

# Session Secret (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
SESSION_SECRET=your-random-secret-key-min-32-characters

# Email Configuration (optional for local development)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# AWS Configuration (for production)
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

#### Frontend Configuration

Create `frontend/.env`:

```env
# Backend API URL
VITE_API_URL=http://localhost:3000/api

# Application Name
VITE_APP_NAME=All-In-One Task Manager
```

**Security Note**: Environment files are gitignored. Never commit credentials to version control.

### Step 4: Start MongoDB

#### Option A: Local MongoDB

```bash
# macOS (Homebrew)
brew services start mongodb-community

# Ubuntu/Debian
sudo systemctl start mongod

# Windows
net start MongoDB
```

#### Option B: MongoDB Atlas

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Whitelist your IP address
3. Create database user
4. Copy connection string to `MONGO_URI` in `.env.test`

### Step 5: Start Development Servers

Open two terminal windows:

#### Terminal 1: Backend Server

```bash
cd backend
node server.js
```

Expected output:
```
DB config - MONGO_URI found: Yes
DB config - Environment: test
Connected to MongoDB!
Server is running on port 3000
```

#### Terminal 2: Frontend Development Server

```bash
cd frontend
npm run dev
```

Expected output:
```
VITE v7.1.2  ready in 500 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### Step 6: Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000 (should return "Hello World!")

### Step 7: Create Initial User

Use the register endpoint to create your first user:

```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin@company.com",
    "hashed_password": "admin123",
    "roles": ["admin"],
    "department": "it"
  }'
```

Then login at http://localhost:5173/login

## Project Structure

```
spm-group5/
├── README.md                      # This comprehensive documentation
├── package.json                   # Root workspace configuration
├── package-lock.json              # Dependency lock file
├── playwright.config.js           # Playwright E2E test configuration
│
├── backend/                       # Backend Node.js application
│   ├── server.js                  # Application entry point
│   ├── package.json               # Backend dependencies
│   ├── dockerfile                 # Docker image configuration
│   ├── vitest.config.js           # Vitest configuration with 80% coverage threshold
│   ├── eslint.config.js           # ESLint rules for backend
│   ├── test-db-connections.js     # Database connection testing utility
│   │
│   ├── environments/              # Environment configuration files (gitignored)
│   │   └── .env.test              # Development environment variables
│   │
│   └── src/                       # Backend source code
│       ├── app.js                 # Express app configuration, middleware, Socket.IO setup
│       │
│       ├── config/                # Configuration modules
│       │   └── db.js              # MongoDB connection setup
│       │
│       ├── models/                # Mongoose schemas and models
│       │   ├── user.model.js          # User schema with bcrypt password hashing
│       │   ├── task.model.js          # Task schema with validation and relationships
│       │   ├── subtask.model.js       # Subtask schema
│       │   ├── project.model.js       # Project schema with member management
│       │   ├── notification.model.js  # Notification schema
│       │   └── *.model.test.js        # Model unit tests
│       │
│       ├── controllers/           # Request handlers
│       │   ├── user.controller.js         # Authentication and user management
│       │   ├── task.controller.js         # Task CRUD, comments, archiving, time tracking
│       │   ├── subtask.controller.js      # Subtask operations
│       │   ├── project.controller.js      # Project management with access control
│       │   ├── notification.controller.js # Notification management
│       │   ├── report.controller.js       # Report generation and Excel export
│       │   └── *.controller.test.js       # Controller unit tests
│       │
│       ├── services/              # Business logic layer
│       │   ├── user.services.js               # User operations
│       │   ├── task.services.js               # Task operations and validation
│       │   ├── subtask.services.js            # Subtask operations
│       │   ├── project.services.js            # Project operations
│       │   ├── report.services.js             # Report data aggregation and Excel generation
│       │   ├── email-notification.services.js # Email sending via SMTP/AWS
│       │   └── *.services.test.js             # Service unit tests
│       │
│       ├── routes/                # API endpoint definitions
│       │   ├── user.router.js                         # /api/register, /api/login, /api/users
│       │   ├── task.router.js                         # /api/tasks/* endpoints
│       │   ├── subtask.router.js                      # /api/subtasks/* endpoints
│       │   ├── project.router.js                      # /api/projects/* endpoints
│       │   ├── notification.router.js                 # /api/notifications/* endpoints
│       │   ├── report.router.js                       # /api/reports/* endpoints
│       │   ├── logged-time-report.router.js           # Logged time report routes
│       │   ├── department-logged-time-report.router.js # Department report routes
│       │   └── *.router.test.js                       # Router integration tests
│       │
│       ├── middleware/            # Custom Express middleware
│       │   ├── auth.middleware.js     # Session authentication and RBAC
│       │   └── *.middleware.test.js   # Middleware tests
│       │
│       ├── lambda/                # AWS Lambda functions
│       │   ├── email-notification-handler.js  # Lambda email handler
│       │   └── package.json       # Lambda-specific dependencies
│       │
│       └── test/                  # Test utilities
│           ├── setup.js           # Vitest global setup (MongoDB Memory Server)
│           └── integration_tests/ # Integration test suites
│
├── frontend/                      # Frontend React application
│   ├── index.html                 # HTML template
│   ├── package.json               # Frontend dependencies
│   ├── vite.config.js             # Vite build configuration
│   ├── vitest.config.js           # Vitest configuration for frontend
│   ├── eslint.config.js           # ESLint rules for React
│   │
│   ├── public/                    # Static assets
│   │   ├── All-In-One.png         # Application logo
│   │   └── All-In-One-favicon.png # Favicon
│   │
│   └── src/                       # Frontend source code
│       ├── main.jsx               # React application entry point
│       ├── App.jsx                # Root component with routing and providers
│       ├── App.css                # Global application styles
│       ├── index.css              # Base CSS styles and variables
│       │
│       ├── pages/                 # Page-level components
│       │   ├── LoginPage.jsx          # Login and authentication
│       │   ├── DashboardPage.jsx      # Main dashboard with overview
│       │   ├── TasksPage.jsx          # All tasks view with filtering
│       │   ├── ProjectsPage.jsx       # Projects list and management
│       │   ├── ProjectTasksPage.jsx   # Project-specific task view
│       │   ├── ReportsPage.jsx        # Admin reporting interface
│       │   ├── NotificationsPage.jsx  # Notification center
│       │   └── *.module.css           # Page-specific scoped styles
│       │
│       ├── components/            # Reusable React components
│       │   │
│       │   ├── common/            # Shared UI components
│       │   │   ├── Header/            # Navigation header
│       │   │   ├── Button/            # Button component
│       │   │   ├── Card/              # Card container
│       │   │   ├── Input/             # Form input
│       │   │   ├── Modal/             # Modal dialog
│       │   │   ├── Spinner/           # Loading spinner
│       │   │   ├── SearchableSelect/  # Searchable dropdown for user selection
│       │   │   ├── ThemeToggle/       # Dark/light theme switcher
│       │   │   └── Notifications/     # Toast notification system
│       │   │
│       │   ├── tasks/             # Task-specific components
│       │   │   ├── TaskCard/          # Individual task display
│       │   │   ├── TaskForm/          # Task creation/edit form
│       │   │   ├── TaskComment/       # Comment section with CRUD
│       │   │   ├── StatusUpdatePopup/ # Status change popup
│       │   │   ├── TimeLoggingInput/  # Manual time tracking input
│       │   │   ├── TimeDisplayBadge/  # Time display component
│       │   │   ├── SubtaskCard/       # Subtask display
│       │   │   ├── SubtaskForm/       # Subtask creation form
│       │   │   └── SubtaskList/       # Subtask list container
│       │   │
│       │   └── projects/          # Project-specific components
│       │       ├── ProjectCard/       # Project card display
│       │       ├── ProjectForm/       # Project creation/edit form
│       │       └── ProjectScheduleTimeline/ # Timeline visualization
│       │
│       ├── context/               # React Context providers for state management
│       │   ├── AuthContext.jsx            # Authentication state
│       │   ├── TaskContext.jsx            # Task state
│       │   ├── SubtaskContext.jsx         # Subtask state
│       │   ├── ProjectContext.jsx         # Project state
│       │   ├── NotificationContext.jsx    # Toast notifications
│       │   ├── NotificationsCenterContext.jsx # Notification center state
│       │   └── ThemeContext.jsx           # Theme (dark/light) state
│       │
│       ├── hooks/                 # Custom React hooks
│       │   ├── useSocket.js           # Socket.IO connection management
│       │   └── useNotifications.js    # Notification handling
│       │
│       ├── services/              # API client services
│       │   └── api.js                 # API service layer with Fetch wrapper
│       │
│       ├── router/                # Routing components
│       │   ├── ProtectedRoute.jsx     # Authentication guard
│       │   └── AdminRoute.jsx         # Admin-only route guard
│       │
│       └── styles/                # Global style utilities
│           └── *.css              # Utility CSS files
│
├── e2e/                           # End-to-end tests with Playwright
│   ├── tests/                     # E2E test suites
│   │   ├── auth.spec.js           # Authentication flow tests
│   │   └── reports.spec.js        # Reports functionality tests
│   │
│   ├── fixtures/                  # Test helpers and page objects
│   │   ├── auth-helpers.js        # Authentication utilities
│   │   └── pages/                 # Page Object Model
│   │       ├── login-page.js      # Login page interactions
│   │       └── reports-page.js    # Reports page interactions
│   │
│   └── utils/                     # E2E test utilities
│       ├── db-helpers.js          # Database setup for E2E
│       ├── reports-db-helpers.js  # Report test data
│       └── test-user-passwords.js # Test credentials
│
├── infrastructure/                # Terraform AWS infrastructure
│   ├── main.tf                    # Main Terraform configuration
│   ├── provider.tf                # AWS provider setup
│   ├── variables.tf               # Input variables
│   ├── output.tf                  # Output values (URLs, IDs)
│   ├── alb.tf                     # Application Load Balancer
│   ├── ec2-backend.tf             # EC2 instance configuration
│   ├── email-notifications.tf     # Lambda + SES setup
│   ├── README.md                  # Detailed deployment guide
│   │
│   └── modules/                   # Reusable Terraform modules
│       ├── vpc/                   # VPC with subnets
│       ├── s3/                    # S3 bucket for frontend
│       ├── cloudfront/            # CloudFront distribution
│       ├── ec2-instance/          # EC2 instance module
│       ├── ecr/                   # Container registry
│       ├── lambda/                # Lambda function module
│       ├── nat-instance/          # NAT instance for private subnet
│       ├── alb/                   # Load balancer module
│       └── security-group/        # Security group configurations
│
└── scripts/                       # Development utility scripts
    ├── README.md                  # Comprehensive script documentation
    ├── check.sh                   # Pre-commit checks (macOS/Linux)
    ├── check.bat                  # Pre-commit checks (Windows)
    ├── check.js                   # Pre-commit checks (Node.js)
    └── lambda.sh                  # Lambda deployment helper
```

## Development Guide

### Layered Architecture

The backend follows a strict layered architecture pattern:

1. **Routes Layer** (`src/routes/`) - Defines API endpoints and HTTP methods
2. **Controllers Layer** (`src/controllers/`) - Handles HTTP requests/responses
3. **Services Layer** (`src/services/`) - Contains business logic
4. **Models Layer** (`src/models/`) - Defines data schemas and validation

### Code Organization Principles

- Separation of concerns between layers
- Single responsibility principle for each module
- Dependency injection from controllers to services
- No direct database access from controllers
- Consistent error handling across layers

### Adding New Features

#### Backend: Adding a New API Feature

1. **Define the Model** (`src/models/feature.model.js`)

```javascript
import mongoose from 'mongoose';

const featureSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Feature', featureSchema);
```

2. **Create Service** (`src/services/feature.services.js`)

```javascript
import Feature from '../models/feature.model.js';

export const createFeature = async (data) => {
  if (!data.name) {
    throw new Error('Feature name is required');
  }
  
  const feature = new Feature(data);
  return await feature.save();
};

export const getFeatures = async () => {
  return await Feature.find({ status: 'active' });
};
```

3. **Create Controller** (`src/controllers/feature.controller.js`)

```javascript
import * as featureService from '../services/feature.services.js';

export const createFeature = async (req, res) => {
  try {
    const feature = await featureService.createFeature(req.body);
    res.status(201).json({ success: true, data: feature });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export default { createFeature };
```

4. **Define Routes** (`src/routes/feature.router.js`)

```javascript
import express from 'express';
import featureController from '../controllers/feature.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/features', requireAuth, featureController.createFeature);
router.get('/features', requireAuth, featureController.getFeatures);

export default router;
```

5. **Register Routes** (in `src/app.js`)

```javascript
import featureRouter from './routes/feature.router.js';
app.use('/api', featureRouter);
```

#### Frontend: Adding a New Component

1. **Create Component Structure**

```
src/components/feature/
├── FeatureCard/
│   ├── FeatureCard.jsx
│   └── FeatureCard.module.css
```

2. **Implement Component** (`FeatureCard.jsx`)

```javascript
import styles from './FeatureCard.module.css';

const FeatureCard = ({ feature, onUpdate }) => {
  return (
    <div className={styles.card}>
      <h3 className={styles.title}>{feature.name}</h3>
      <p className={styles.status}>{feature.status}</p>
    </div>
  );
};

export default FeatureCard;
```

3. **Create Scoped Styles** (`FeatureCard.module.css`)

```css
.card {
  padding: 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-background);
}

.title {
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
}
```

4. **Use in Page Component**

```javascript
import FeatureCard from '../components/feature/FeatureCard/FeatureCard';

const FeaturesPage = () => {
  const [features, setFeatures] = useState([]);
  
  return (
    <div>
      {features.map(feature => (
        <FeatureCard key={feature._id} feature={feature} />
      ))}
    </div>
  );
};
```

### Coding Standards

#### Backend (JavaScript/Node.js)

- Use ES6+ module syntax (`import`/`export`)
- Use `async`/`await` for asynchronous operations
- Naming conventions:
  - `camelCase` for variables and functions
  - `PascalCase` for classes and models
  - `UPPER_SNAKE_CASE` for constants
- Always handle errors with try-catch blocks
- Add JSDoc comments for complex functions
- Use meaningful variable and function names

#### Frontend (React/JSX)

- Use functional components with hooks
- Implement CSS Modules for component-scoped styles
- Destructure props in function parameters
- Use Context API for global state
- Keep components focused and under 200 lines
- Follow naming conventions:
  - `PascalCase` for component files and names
  - `camelCase` for functions and variables
  - `kebab-case` for CSS class names

### Git Workflow

#### Branch Naming

```
feature/feature-name       # New features
bugfix/issue-description   # Bug fixes
hotfix/critical-fix        # Urgent production fixes
refactor/component-name    # Code refactoring
docs/documentation-update  # Documentation changes
```

#### Commit Messages

Follow Conventional Commits specification:

```
feat: add recurring task functionality
fix: resolve notification duplicate issue
docs: update API documentation
style: format code with prettier
refactor: simplify task validation logic
test: add unit tests for project service
chore: update dependencies
```

## Testing

### Backend Testing

#### Running Tests

```bash
cd backend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test src/services/task.services.test.js
```

#### Coverage Requirements

The project maintains minimum 80% coverage for:
- Branch coverage
- Function coverage
- Line coverage
- Statement coverage

Coverage includes:
- `src/services/**/*.js`
- `src/controllers/**/*.js`
- `src/models/**/*.js`
- `src/routes/**/*.js`

#### Writing Unit Tests

Example test structure:

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTask, getTaskById } from './task.services.js';
import Task from '../models/task.model.js';

describe('Task Services', () => {
  beforeEach(async () => {
    // Setup test data
  });

  afterEach(async () => {
    // Cleanup
    await Task.deleteMany({});
  });

  it('should create a task with valid data', async () => {
    const taskData = {
      title: 'Test Task',
      priority: 5,
      project: projectId
    };
    
    const task = await createTask(taskData, userId);
    
    expect(task).toBeDefined();
    expect(task.title).toBe('Test Task');
    expect(task.priority).toBe(5);
  });

  it('should throw error for invalid priority', async () => {
    const taskData = {
      title: 'Test Task',
      priority: 15  // Invalid: max is 10
    };
    
    await expect(createTask(taskData, userId)).rejects.toThrow();
  });
});
```

### Frontend Testing

```bash
cd frontend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

### End-to-End Testing

```bash
# Run E2E tests (requires servers running)
npm run test:e2e

# Run with UI mode
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug tests
npm run test:e2e:debug

# View test report
npm run test:e2e:report
```

#### E2E Test Example

```javascript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login with valid credentials', async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    
    await page.fill('input[name="username"]', 'admin@company.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/.*dashboard/);
  });
});
```

### Pre-Commit Testing

Always run before committing:

```bash
# macOS/Linux
./scripts/check.sh

# Windows
scripts\check.bat

# Cross-platform
node scripts/check.js
```

This script performs:
1. Frontend linting
2. Backend linting
3. Backend unit tests
4. Git status check

## API Documentation

### Base URL

- Development: `http://localhost:3000/api`
- Production: `https://your-domain.com/api`

### Authentication

All protected endpoints require session-based authentication. Include credentials in requests:

```javascript
fetch('http://localhost:3000/api/tasks', {
  credentials: 'include'  // Required for session cookies
});
```

### User Endpoints

#### Register User

```
POST /api/register
```

Request Body:
```json
{
  "username": "user@company.com",
  "hashed_password": "password123",
  "roles": ["staff"],
  "department": "it"
}
```

Response: `201 Created`
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "username": "user@company.com",
  "roles": ["staff"],
  "department": "it"
}
```

#### Login

```
POST /api/login
```

Request Body:
```json
{
  "username": "user@company.com",
  "hashed_password": "password123"
}
```

Response: `200 OK`
```json
{
  "message": "Login successful",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "user@company.com",
    "roles": ["staff"],
    "department": "it"
  }
}
```

#### Logout

```
POST /api/logout
```

Response: `200 OK`

#### Get User Profile

```
GET /api/profile
```

Requires: Authentication

Response: `200 OK`

#### Get All Users

```
GET /api/users
```

Requires: Authentication

Response: `200 OK` with array of user objects

### Project Endpoints

#### Create Project

```
POST /api/projects
```

Requires: Authentication

Request Body:
```json
{
  "name": "Website Redesign",
  "description": "Complete website overhaul",
  "owner": "507f1f77bcf86cd799439011",
  "members": ["507f1f77bcf86cd799439012"],
  "status": "In Progress",
  "priority": 8,
  "dueDate": "2025-12-31",
  "tags": ["web", "design"]
}
```

#### Get All Projects

```
GET /api/projects
```

Requires: Authentication

Returns projects with `canViewTasks` metadata for access control.

#### Get Project by ID

```
GET /api/projects/:projectId
```

#### Update Project

```
PUT /api/projects/:projectId
```

#### Delete Project

```
DELETE /api/projects/:projectId
```

### Task Endpoints

#### Create Task

```
POST /api/tasks
```

Requires: Authentication

Request Body:
```json
{
  "title": "Implement authentication",
  "description": "Add login and registration",
  "priority": 9,
  "status": "To Do",
  "tags": "backend, security",
  "owner": "507f1f77bcf86cd799439011",
  "assignee": ["507f1f77bcf86cd799439012"],
  "project": "507f1f77bcf86cd799439020",
  "dueDate": "2025-02-15",
  "isRecurring": false
}
```

#### Get All Tasks

```
GET /api/tasks
```

Query parameters: `status`, `priority`, `assignee`, `project`

#### Get Task by ID

```
GET /api/tasks/:taskId
```

#### Update Task

```
PUT /api/tasks/:taskId
```

#### Archive Task

```
PATCH /api/tasks/:taskId/archive
```

#### Unarchive Task

```
PATCH /api/tasks/:taskId/unarchive
```

#### Add Comment

```
POST /api/tasks/:taskId/comments
```

Request Body:
```json
{
  "text": "Started working on this task"
}
```

#### Edit Comment

```
PUT /api/tasks/:taskId/comments/:commentId
```

#### Delete Comment

```
DELETE /api/tasks/:taskId/comments/:commentId
```

#### Update Time Taken

```
PATCH /api/tasks/:taskId/time-taken
```

Request Body:
```json
{
  "timeTaken": 3.5
}
```

#### Get Total Time

```
GET /api/tasks/:taskId/total-time
```

Response:
```json
{
  "taskTime": 3.5,
  "subtasksTime": 2.0,
  "totalTime": 5.5
}
```

#### Get Tasks by Project

```
GET /api/projects/:projectId/tasks
```

### Subtask Endpoints

#### Create Subtask

```
POST /api/subtasks
```

Request Body:
```json
{
  "title": "Design database schema",
  "description": "Create ERD",
  "parentTaskId": "507f1f77bcf86cd799439030",
  "projectId": "507f1f77bcf86cd799439020",
  "priority": 7,
  "status": "To Do",
  "ownerId": "507f1f77bcf86cd799439011",
  "assigneeId": ["507f1f77bcf86cd799439012"],
  "dueDate": "2025-02-10"
}
```

#### Get Subtasks by Task

```
GET /api/tasks/:parentTaskId/subtasks
```

#### Get Subtasks by Project

```
GET /api/projects/:projectId/subtasks
```

#### Update Subtask

```
PUT /api/subtasks/:subtaskId
```

#### Archive Subtask

```
PUT /api/subtasks/:subtaskId/archive
```

#### Unarchive Subtask

```
PUT /api/subtasks/:subtaskId/unarchive
```

#### Add Comment to Subtask

```
POST /api/subtasks/:subtaskId/comments
```

### Notification Endpoints

#### Get User Notifications

```
GET /api/notifications
```

Response:
```json
[
  {
    "_id": "507f1f77bcf86cd799439040",
    "user": "507f1f77bcf86cd799439011",
    "message": "You have been assigned to task 'Implement authentication'",
    "task": "507f1f77bcf86cd799439030",
    "project": "507f1f77bcf86cd799439020",
    "projectName": "Website Redesign",
    "read": false,
    "createdAt": "2025-01-20T14:30:00.000Z"
  }
]
```

#### Mark as Read

```
PATCH /api/notifications/:notificationId/read
```

#### Mark All as Read

```
PATCH /api/notifications/mark-all-read
```

#### Delete Notification

```
DELETE /api/notifications/:notificationId
```

### Report Endpoints (Admin Only)

#### Task Completion Report (Project)

```
GET /api/reports/task-completion/project/:projectId?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&format=excel
```

#### Task Completion Report (User)

```
GET /api/reports/task-completion/user/:userId?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&format=excel
```

#### Team Summary Report

```
GET /api/reports/team-summary/project/:projectId?startDate=YYYY-MM-DD&timeframe=week&format=excel
```

#### Logged Time Report (Project)

```
GET /api/reports/logged-time/project/:projectId?format=excel
```

#### Logged Time Report (Department)

```
GET /api/reports/logged-time/department/:department?format=excel
```

Valid departments: `hr`, `it`, `sales`, `consultancy`, `systems`, `engineering`, `finance`, `managing director`

All report endpoints return Excel files (.xlsx) for download.

## Deployment

### Docker Deployment (Backend)

#### Build and Run Locally

```bash
cd backend

# Build Docker image
docker build -t spm-backend:latest .

# Run container
docker run -d \
  --name spm-backend \
  -p 3000:3000 \
  --env-file ./environments/.env.prod \
  spm-backend:latest

# Check logs
docker logs -f spm-backend

# Stop and remove
docker stop spm-backend
docker rm spm-backend
```

### AWS Deployment

The project includes complete Terraform infrastructure for AWS deployment.

#### Prerequisites

- AWS account with appropriate permissions
- AWS CLI configured (`aws configure`)
- Terraform installed (v1.0+)
- Docker installed

#### Step 1: Deploy Infrastructure

```bash
cd infrastructure

# Initialize Terraform
terraform init

# Review infrastructure plan
terraform plan

# Apply infrastructure
terraform apply
```

This creates:
- VPC with public and private subnets
- S3 bucket for frontend hosting
- CloudFront distribution with HTTPS
- ECR repository for Docker images
- EC2 instance in private subnet
- NAT instance for outbound internet
- Security groups and routing

#### Step 2: Deploy Backend

```bash
cd backend

# Get ECR URL
ECR_URL=$(cd ../infrastructure && terraform output -raw ecr_repository_url)

# Login to ECR
aws ecr get-login-password --region ap-southeast-1 | \
  docker login --username AWS --password-stdin $ECR_URL

# Build and push image
docker build -t spm-backend:latest .
docker tag spm-backend:latest $ECR_URL:latest
docker push $ECR_URL:latest

# Connect to EC2 via SSM
INSTANCE_ID=$(cd ../infrastructure && terraform output -raw backend_instance_id)
aws ssm start-session --target $INSTANCE_ID

# Inside EC2 session, pull and run container
docker pull $ECR_URL:latest
docker run -d \
  --name spm-backend \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file /app/env/.env.prod \
  $ECR_URL:latest
```

#### Step 3: Deploy Frontend

```bash
cd frontend

# Build production bundle
npm run build

# Get S3 bucket name
BUCKET_NAME=$(cd ../infrastructure && terraform output -raw s3_bucket_name)

# Upload to S3
aws s3 sync dist/ s3://$BUCKET_NAME --delete

# Invalidate CloudFront cache
DISTRIBUTION_ID=$(cd ../infrastructure && terraform output -raw cloudfront_distribution_id)
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"

# Get CloudFront URL
cd ../infrastructure
terraform output cloudfront_url
```

#### Production Environment Variables

Create `backend/environments/.env.prod`:

```env
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://your-domain.com
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/spm-db
SESSION_SECRET=production-secret-min-64-chars
AWS_REGION=ap-southeast-1
```

For detailed deployment instructions, see [infrastructure/README.md](infrastructure/README.md).

## Contributing

### Before Committing

1. Run pre-commit checks:

```bash
./scripts/check.sh  # macOS/Linux
scripts\check.bat   # Windows
node scripts/check.js  # Cross-platform
```

2. Ensure all tests pass:

```bash
cd backend && npm test
cd ../frontend && npm test
```

3. Check code coverage:

```bash
cd backend && npm run test:coverage
```

### Contribution Workflow

1. Create a feature branch:

```bash
git checkout -b feature/your-feature-name
```

2. Make changes following coding standards

3. Write tests for new functionality

4. Run pre-commit checks

5. Commit with conventional commit message:

```bash
git add .
git commit -m "feat: add new feature description"
```

6. Push branch:

```bash
git push origin feature/your-feature-name
```

7. Create Pull Request on GitHub

### Pull Request Guidelines

- Provide clear description of changes
- Reference related issues if applicable
- Ensure all CI checks pass
- Request review from team members
- Update documentation for new features
- Include screenshots for UI changes

### Code Review Checklist

- Code follows project style guidelines
- Tests are included and passing
- Documentation is updated
- No hardcoded credentials or secrets
- Error handling is implemented
- Performance considerations addressed
- Security best practices followed

## Troubleshooting

### MongoDB Connection Issues

**Problem**: `MongoNetworkError: connect ECONNREFUSED`

**Solution**:
```bash
# Check if MongoDB is running
mongosh

# Start MongoDB (macOS)
brew services start mongodb-community

# Start MongoDB (Ubuntu)
sudo systemctl start mongod

# Verify connection string in .env.test
```

### Port Already in Use

**Problem**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solution**:
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in .env.test
PORT=3001
```

### Session Not Persisting

**Problem**: User gets logged out immediately

**Solution**:
- Verify `SESSION_SECRET` is set in `.env.test`
- Check `credentials: 'include'` in API service
- Verify CORS allows credentials in `app.js`
- Ensure MongoDB is running for session storage
- Check browser cookie settings

### WebSocket Connection Failed

**Problem**: Real-time notifications not working

**Solution**:
- Verify backend server is running
- Check Socket.IO connection URL in `useSocket.js`
- Inspect browser console for WebSocket errors
- Verify CORS settings allow Socket.IO handshake
- Check firewall isn't blocking WebSocket connections

### Frontend Build Fails

**Problem**: Vite build errors

**Solution**:
```bash
cd frontend

# Clear cache and reinstall
rm -rf node_modules package-lock.json .vite
npm install

# Rebuild
npm run build
```

### ESLint Errors

**Problem**: Pre-commit checks fail with linting errors

**Solution**:
```bash
# Auto-fix frontend
cd frontend && npm run lint -- --fix

# Auto-fix backend
cd backend && npm run lint:fix
```

### Docker Container Issues

**Problem**: Container exits immediately

**Solution**:
```bash
# Check logs
docker logs spm-backend

# Verify environment file exists
ls -la backend/environments/.env.prod

# Run interactively for debugging
docker run -it --entrypoint /bin/sh spm-backend:latest
```

### Test Failures with MongoDB Memory Server

**Problem**: Tests fail locally with AVX instruction errors

**Solution**:
- This is expected on some systems without AVX support
- Tests will pass in CI environment
- Alternative: Use MongoDB Atlas connection string for local testing
- Or skip problematic tests locally with `it.skip()`

## Additional Resources

### Documentation
- [Backend README](backend/README.md) - Detailed backend documentation
- [Frontend README](frontend/README.md) - Detailed frontend documentation
- [Infrastructure README](infrastructure/README.md) - AWS deployment guide
- [Scripts README](scripts/README.md) - Pre-commit scripts documentation

### External Resources
- [React Documentation](https://react.dev/)
- [Express.js Guide](https://expressjs.com/)
- [MongoDB Manual](https://docs.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [Socket.IO Documentation](https://socket.io/)
- [Vitest Guide](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)

### Best Practices
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Workflow](https://www.atlassian.com/git/tutorials/comparing-workflows)
- [REST API Design](https://restfulapi.net/)
- [React Patterns](https://react.dev/learn/thinking-in-react)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

**Project**: SPM Group 5 - Task Management System  
**License**: MIT  
**Last Updated**: November 2025
