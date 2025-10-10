import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Task from '../models/task.model.js';
import User from '../models/user.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set NODE_ENV to 'test' if not already set
if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'test';
}

// Dynamically select the environment file based on ENV_FILE or NODE_ENV
const envFile =
    process.env.ENV_FILE
        ? process.env.ENV_FILE
        : `.env${process.env.NODE_ENV ? `.${process.env.NODE_ENV}` : ''}`;
dotenv.config({ path: path.join(__dirname, '../../environments', envFile) });

if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    console.log('SMTP Config:');
    console.log('Host:', process.env.SMTP_HOST);
    console.log('Port:', process.env.SMTP_PORT);
    console.log('User:', process.env.SMTP_LOGIN);
}

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_LOGIN,
        pass: process.env.SMTP_KEY
    }
});


//checkd if deadline if within 24 hours
function checkIfUpcomingDeadline(dueDate){
    const now = new Date();
    const timeDiff = dueDate - now;
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    return hoursDiff <= 24 && hoursDiff >= 0;
}

// Check if the task is overdue (24 or more hours past due date)
function checkIfOverdue(dueDate){
    const now = new Date();
    const timeDiff = now - dueDate;
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    return hoursDiff >= 24;
}

// Function to check if any tasks are nearing their deadlines or overdue
export async function checkTasksAndNotify() {
    try {
        const taskList = await Task.find({ status: {$in: ['In Progress', 'To Do', 'Blocked']} });
        for (const task of taskList) {
            if (task.dueDate) {
                const isUpcoming = await checkIfUpcomingDeadline(task.dueDate);
                const isOverdue = await checkIfOverdue(task.dueDate);
                if (isUpcoming){
                    // Notify assignees about upcoming deadline
                    for (const assigneeId of task.assignee) {
                        // Fetch assignee email from User model (not shown here)
                        const assignee = await User.findById(assigneeId);
                        if (assignee?.username && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(assignee.username)) {
                            // Only send if username looks like an email
                            await sendEmail(
                                assignee.username,
                                'REMINDER: Task Deadline Approaching',
                                `The deadline for task "${task.title}" is within the next 24 hours. Please ensure it is completed on time.`
                            );
                        } else {
                            console.warn(`Skipped ${assignee?.username} — not a valid email.`);
                        }

                    }
                }
            
            if (isOverdue){
                // Notify assignees about overdue task
                for (const assigneeId of task.assignee) {
                    // Fetch assignee email from User model (not shown here)
                    const assignee = await User.findById(assigneeId);

                    if (assignee?.username && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(assignee.username)) {
                        // Only send if username looks like an email
                        await sendEmail(
                            assignee.username,
                            'URGENT: Task Overdue',
                            `The task "${task.title}" is overdue by more than 24 hours. Please complete it as soon as possible.`
                        );
                    } else {
                        console.warn(`Assignee with ID ${assigneeId} not found or has no email.`);
                    }
                }
            }
        }
    }

    } catch (error) {
            console.error('Error checking tasks for notifications:', error);
    }

}



/**
 * Send an email notification
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} textContent - Plain text content
 * @param {string} htmlContent - HTML content
 * @returns {Promise<Object>} - Email info object
 */
export async function sendEmail(to, subject, textContent, htmlContent) {
    try {
        // Validate inputs
        if (!to || !subject || !textContent) {
            throw new Error('Missing required email parameters: to, subject, and textContent are required');
        }

        // Verify SMTP configuration
        if (!process.env.SMTP_HOST || !process.env.SMTP_LOGIN || !process.env.SMTP_KEY) {
            throw new Error('SMTP configuration is incomplete. Check environment variables.');
        }

        const mailOptions = {
            from: '"All-In-One STMS" <smuspmg4t5@gmail.com>',
            to: to,
            subject: subject,
            text: textContent,
            html: htmlContent || textContent, // Fallback to text if no HTML provided
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully to %s: %s', to, info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Failed to send email to %s:', to, error.message);
        return { success: false, error: error.message };
    }
}

// Verify SMTP connection on startup
transporter.verify(function(error, success) {
    if (error) {
        console.error('SMTP connection error:', error);
    } else {
        console.log('SMTP server is ready to send emails');
    }
});

// Test function - only runs if this file is executed directly
import { pathToFileURL } from 'url';
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    (async () => {
        console.log('Sending test email...');
        const result = await sendEmail(
            process.env.TEST_EMAIL_TO,
            'Test Email from All-In-One STMS',
            'This is a test email sent using Nodemailer.',
            '<b>This is a test email sent using Nodemailer.</b>'
        );
        console.log('Test result:', result);
    })();
}
