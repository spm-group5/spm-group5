# spm-group5

# Project Name

## Overview
Full-stack web application with React frontend and Node.js backend.

## Tech Stack
- **Frontend**: React 18 + Vite 7.1.5
- **Backend**: Node.js + Express.js 5.1.0
- **Package Manager**: npm

## Prerequisites
- Node.js (v18 or higher recommended)
- npm

## Quick Start

1. Clone the repository:
```bash
git clone <repository-url>
cd <project-name>
```
2. Start the backend:
```bash
cd backend
npm install
node server.js
```
3. Start the frontend (in new terminal):
```bash
cd frontend
npm install
npm run dev
```
4. Access the application:

Frontend:  `http://localhost:5173`
Backend: `http://localhost:3000`

## Project Structure
```bash
project-root/
├── README.md          # This file
├── backend/           # Node.js Express API
│   ├── README.md      # Backend documentation
│   ├── server.js      # Main server file
│   ├── controllers/   # Route controllers
│   ├── models/        # Data models
│   └── routes/        # API routes
└── frontend/          # React Vite application
    ├── README.md      # Frontend documentation
    ├── src/           # Source code
    ├── public/        # Static assets
    └── vite.config.js # Vite configuration
```

Architecture
This is a traditional client-server architecture:

Frontend: React SPA that communicates with the backend via REST API
Backend: Express.js server providing REST API endpoints

## Development Workflow
### Backend Development 
Navigate to `backend/` directory See `backend/README.md` for detailed setup and API documentation

### Frontend Development:
Navigate to `frontend/` directory
See `frontend/README.md` for detailed setup and component guidelines

## Environment Setup
Both frontend and backend use .env files for configuration:

Backend:`backend/.env`
Frontend: `frontend/.env`

## Contributing
Create feature branches from `main`
Follow the guidelines in individual README files 
Test both frontend and backend before creating pull requests 
Update documentation for new features

## Getting Help
Check individual README files for detailed documentation:

Backend issues: oSee`backend/README.md`
Frontend issues: See `frontend/README.md`
