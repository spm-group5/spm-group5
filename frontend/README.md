# Frontend README

## Overview
React application built with Vite for fast development and optimized production builds.

## Tech Stack
- **Framework**: React 18
- **Build Tool**: Vite 7.1.5
- **Package Manager**: npm
- **Language**: JavaScript

## Prerequisites
- Node.js (v18 or higher recommended)
- npm

## Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```
2. Install dependencies:
```bash
npm install    
```

## Running the application
Development mode:
```bash
npm run dev
```
The application will start on `http://localhost:5173`

Production Build:
```bash
npm run build
```

Preview Production Build:
```bash
npm run preview
```


## Project Structure
```bash
frontend/
├── .gitignore
├── README.md          # This file
├── eslint.config.js   # ESLint configuration
├── index.html         # Main HTML template
├── package.json       # Dependencies and scripts
├── package-lock.json  # Locked dependency versions
├── vite.config.js     # Vite configuration
├── node_modules/      # Dependencies (auto-generated)
├── public/            # Static assets
│   └── vite.svg
└── src/               # Source code
    ├── App.css        # App component styles
    ├── App.jsx        # Main app component
    ├── index.css      # Global styles
    ├── main.jsx       # Entry point
    └── assets/        # App assets
        └── react.svg
```

## Environment Variables
Create a `.env` file in the backend directory for environment-specific configurations:
```bash
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=Your App Name
```

## API Endpoints

Base Configuration
Configure API base URL in your environment variables:
```bash
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
```

Available routes
```bash
GET  /               # Returns "Hello, Express.js Server!" message
```
Example Response:
```bash
<h1>Hello, Express.js Server!</h1>
```

## Development Guidelines

### Adding New Components

Create component files in `src/components/` directory
Use PascalCase for component files: `UserProfile.jsx`
Use camelCase for utility files: `apiHelpers.js`
Import and use components in `App.jsx` or other components

### Component Structure
```bash
import React from 'react';
import './ComponentName.css';

const ComponentName = ({ prop1, prop2 }) => {
  return (
    <div className="component-name">
      {/* Component content */}
    </div>
  );
};

export default ComponentName;
```

## Contributing
Create feature branches from main
Follow component and styling guidelines
Test changes across different browsers
Update documentation for new features

## Testing the Server

Start the development server: `npm run dev`
Open browser to `http://localhost:5173`
You should see the default React + Vite application

