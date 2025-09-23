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
project-root/
├── README.md          # This file
├── backend/           
   ├── README.md      # Backend documentation
   ├── server.js      # Server entry point - handles startup and database connection
   ├── src/           # Source code directory
   │   ├── app.js     # Express application configuration - middleware, routes setup
   │   ├── controllers/ # Route handlers - business logic for API endpoints
   │   ├── models/    # Database models - MongoDB/Mongoose schemas
   │   ├── routes/    # API route definitions - URL endpoints and HTTP methods
   │   ├── middleware/ # Authentication, validation, error handling
   │   ├── services/  # Business logic layer between controller and database, handle database interactions
   │   ├── config/    # Configuration files - database connection, app settings
   │   └── utils/     # Helper functions - validation, formatting, common utilities
   ├── tests/         # Test files - unit tests, integration tests, test setup
   ├── environments/  # Environment configuration files
   │   └── .env       # Environment variables (development settings)│   ├── package.json   # Dependencies and scripts
   └── node_modules/  # Installed packages
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






