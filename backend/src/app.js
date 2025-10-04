import express from 'express'; //for Express.js framework
import session from 'express-session'; //for session management
import cors from 'cors'; //for handling CORS

const app = express(); //create the Express application

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

//Test route to verify server is running
app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.use('/api', userRouter); //use the user router for routes starting with '/api'
app.use('/api', taskRouter); //use the task router for task-related routes
app.use('/api', projectRouter); //use the project router for project-related routes

export default app; //export the Express application for use in server.js