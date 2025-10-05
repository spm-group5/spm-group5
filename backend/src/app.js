import express from 'express'; //for Express.js framework
import session from 'express-session'; //for session management
import cors from 'cors'; //for handling CORS
import { createServer } from 'http'; //for HTTP server
import { Server } from 'socket.io'; //for WebSocket support

const app = express(); //create the Express application

// Create HTTP server and Socket.IO server
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        credentials: true,
        methods: ["GET", "POST"]
    }
});

// Store user socket connections (in-memory for project)
const userSockets = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // When user authenticates, store their socket connection
    socket.on('user-authenticate', (userId) => {
        userSockets.set(userId, socket.id);
        socket.userId = userId;
        console.log(`User ${userId} authenticated with socket ${socket.id}`);
    });

    socket.on('disconnect', () => {
        if (socket.userId) {
            userSockets.delete(socket.userId);
            console.log(`User ${socket.userId} disconnected`);
        }
    });
});

// Make io and userSockets available to controllers
app.set('io', io);
app.set('userSockets', userSockets);

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));

app.use(express.json()); //middleware to parse JSON request bodies
app.use(express.urlencoded({extended: true})) //middleware to parse URL-encoded request bodies

// Session middleware configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true in production with HTTPS
        httpOnly: true, // Prevents client-side JavaScript from accessing the cookie
        maxAge: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
    }
}));

import userRouter from './routes/user.router.js'; //import user router for user-related routes
import taskRouter from './routes/task.router.js'; //import task router for task-related routes
import projectRouter from './routes/project.router.js'; //import project router for project-related routes
import reportRouter from './routes/report.router.js'; //import report router for report-related routes

//Test route to verify server is running
app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.use('/api', userRouter); //use the user router for routes starting with '/api'
app.use('/api', taskRouter); //use the task router for task-related routes
app.use('/api', projectRouter); //use the project router for project-related routes
app.use('/api', reportRouter); //use the report router for report-related routes

export { app as default, server }; //export both app and server