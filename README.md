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
│   ├── package.json   # Dependencies
│   ├── vitest.config.js # Test configuration
│   ├── src/           # Source code
│   │   ├── controllers/   # Route controllers
│   │   ├── models/        # Data models
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── middleware/    # Custom middleware
│   │   ├── config/        # Configuration files
│   │   └── utils/         # Utility functions
│   ├── tests/         # Test files
│   └── environments/  # Environment configs
└── frontend/          # React Vite application
    ├── README.md      # Frontend documentation
    ├── package.json   # Dependencies
    ├── vite.config.js # Vite configuration
    ├── eslint.config.js # Linting configuration
    ├── src/           # Source code
    │   ├── components/    # React components
    │   ├── services/      # API calls
    │   └── assets/        # Static assets
    └── public/        # Public assets
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

## Local GitHub Actions Testing with act

To run GitHub Actions workflows locally using nektos/act:

1. Install [act](https://github.com/nektos/act):
   ```sh
   brew install act

   ```
2. Create a .secrets file in repo root with:
   ```sh
   GITHUB_TOKEN=your_personal_access_token

   ```
3. To run github action workflow (e.g CI.yml) with secret
   ```sh
   act --workflows [ci.yml] --secret-file .secrets

   ```
4. To run a specific job (e.g., only the build job):
   ```sh
   act -j build --secret-file .secrets

   ```

5. By defualt, act uses local working directory of your repo, to use current working directory (use --bind flag):
    ```sh
    act --bind 

Note: Running act locally does not affect your real GitHub repository or production environment

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

Backend issues: oSee `backend/README.md`
Frontend issues: See `frontend/README.md`
