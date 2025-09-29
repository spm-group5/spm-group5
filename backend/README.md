# Backend README

## Overview
Node.js Express server providing REST API endpoints for the application.

## Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js 5.1.0
- **Package Manager**: npm

## Prerequisites
- Node.js (v18 or higher recommended)
- npm

## Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

## Running the Server

Development Mode:
```bash
node server.js
```
The server will start on `http://localhost:3000`

## Project Structure
```bash
backend/
├── README.md                           # Backend documentation
├── server.js                           # Server entry point - handles startup and database connection
├── package.json                        # Dependencies and scripts
├── package-lock.json                   # Dependency lock file
├── vitest.config.js                    # Test configuration with coverage settings
├── .gitignore                          # Git ignore rules
├── test-db-connections.js              # Database connection testing utility
├── src/                                # Source code directory
│   ├── app.js                          # Express application configuration - middleware, routes setup
│   ├── controllers/                    # Route handlers - business logic for API endpoints
│   ├── models/                         # Database models - MongoDB/Mongoose schemas
│   ├── routes/                         # API route definitions - URL endpoints and HTTP methods
│   ├── services/                       # Business logic layer between controller and database
│   ├── middleware/                     # Authentication, validation, error handling
│   ├── config/                         # Configuration files - database connection, app settings
│   └── utils/                          # Helper functions - validation, formatting, common utilities
├── tests/                              # Test files - unit tests, integration tests, test setup
│   └── integration/                    # Integration tests
├── environments/                       # Environment configuration files
└── coverage/                           # Test coverage reports (generated, not committed)
└── node_modules/                       # Installed packages (not committed)
```

## Environment Variables
Create a `.env` file in the backend directory for environment-specific configurations:
```bash
PORT=3000
NODE_ENV=development
```

## API Endpoints

Base URL
- Development: `http://localhost:3000`

Available routes
```bash
GET  /               # Returns "Hello, Express.js Server!" message
```
Example Response:
```bash
<h1>Hello, Express.js Server!</h1>
```

## Development Guidelines

### Adding New Routes

Create route files in the `routes/` directory
Create corresponding controllers in the `controllers/` directory
Import and use routes in `server.js`
Update this README with new endpoint documentation

## Contributing
Create feature branches from `main`
Follow consistent code formatting
Update API documentation for new endpoints
Test thoroughly before creating pull requests

## Testing the Server

Start the server: `node server.js`
Open browser to `http://localhost:3000`
You should see "Hello, Express.js Server!" message

## Running Unit Tests
Change to `backend` directory: `cd backend`
Start the server: `node server.js`
Run the vitest framework: `npm test`

## Running Coverage Tests

To run tests with coverage analysis:

```bash
npm run test:coverage
```

### Expected Coverage Output

The coverage test will:
- Generate coverage reports in HTML, JSON, and text formats
- Create a `coverage/` directory with detailed HTML reports
- Display coverage statistics in the terminal

Expected coverage thresholds (configured in `vitest.config.js`):
- **Branches**: 80% minimum
- **Functions**: 80% minimum
- **Lines**: 80% minimum
- **Statements**: 80% minimum

Coverage includes:
- `src/services/**/*.js` - Business logic layer
- `src/controllers/**/*.js` - API route handlers
- `src/models/**/*.js` - Database models
- `src/routes/**/*.js` - Route definitions

To view detailed coverage reports, open `coverage/index.html` in your browser after running the coverage tests.
=======
## Building docker image and running locally 

```bash
cd backend

docker build -t spm-backend:<tag> .

docker run -d -p 80:3000 --env-file ./environments/.env.prod spm-backend:<tag>
```







