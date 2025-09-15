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
├── .gitignore
├── README.md          # This file
├── package.json       # Dependencies and scripts
├── package-lock.json  # Locked dependency versions
├── server.js          # Main server file
├── node_modules/      # Dependencies (auto-generated)
├── controllers/       # Route controllers 
├── models/           # Data models 
└── routes/           # API routes 
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






