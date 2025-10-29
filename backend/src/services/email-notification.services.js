import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Task from '../models/task.model.js';
import User from '../models/user.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Only load dotenv if NOT in Lambda (Lambda gets env vars from SSM via handler)
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
    if (!process.env.NODE_ENV) {
        process.env.NODE_ENV = 'test';
    }
    
    const envFile = process.env.ENV_FILE || `.env${process.env.NODE_ENV ? `.${process.env.NODE_ENV}` : ''}`;
    dotenv.config({ path: path.join(__dirname, '../../environments', envFile) });
    
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        console.log('SMTP Config:');
        console.log('Host:', process.env.SMTP_HOST);
        console.log('Port:', process.env.SMTP_PORT);
        console.log('User:', process.env.SMTP_LOGIN);
    }
}

// Lazy transporter creation - only create when needed (after env vars are set)
let transporter = null;

function getTransporter() {
    if (!transporter) {
        console.log('Creating SMTP transporter with:', {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            user: process.env.SMTP_LOGIN
        });
        
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: false,
            auth: {
                user: process.env.SMTP_LOGIN,
                pass: process.env.SMTP_KEY
            }
        });
    }
    return transporter;
}


/**
 * Generate a HTML email format for upcoming/overdue tasks
 */
function generateTaskEmail({ taskTitle, taskId, deadline, type }) {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const taskUrl = `${baseUrl}/tasks`;
    const subject =
        type === 'upcoming'
            ? `REMINDER: Task "${taskTitle}" Deadline Approaching`
            : `URGENT: Task "${taskTitle}" Overdue`;

    const html = `
    <div style="font-family: Arial, sans-serif; line-height:1.6; color:#333;">
        <h2 style="color:#2E86DE;">${type === 'upcoming' ? 'Reminder!' : 'Urgent!'}</h2>
        <p>The task "<strong>${taskTitle}</strong>" is ${type === 'upcoming' ? 'approaching its deadline' : 'overdue'}.</p>
        <p>Deadline: <strong>${new Date(deadline).toLocaleString()}</strong></p>
        <p>Please take the necessary action.</p>
        <p>
            <a href="${taskUrl}" style="display:inline-block;padding:10px 15px;background-color:#2E86DE;color:#fff;text-decoration:none;border-radius:5px;">
                Open Task in All-In-One Task Management System
            </a>
        </p>
        <hr style="border:none;border-top:1px solid #ccc;">
        <p style="font-size:0.85em;color:#555;">This is an automated notification. Please do not reply.</p>
    </div>
    `;
    return { subject, html };
}


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
        const tasks = await Task.find({ status: { $in: ['To Do', 'In Progress', 'Blocked'] } });

        // For parallel email sending, collect all promises
        const emailPromises = [];

        for (const task of tasks) {
            if (!task.dueDate) continue;

            const isUpcoming = checkIfUpcomingDeadline(task.dueDate);
            const isOverdue = checkIfOverdue(task.dueDate);

            if (!isUpcoming && !isOverdue) continue;

            for (const assigneeId of task.assignee) {
                const assignee = await User.findById(assigneeId);

                if (!assignee?.username || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(assignee.username)) {
                    console.warn(`Skipped ${assignee?.username || assigneeId} — not a valid email.`);
                    continue;
                }

                const emailContent = generateTaskEmail({
                    taskTitle: task.title,
                    taskId: task._id,
                    deadline: task.dueDate,
                    type: isUpcoming ? 'upcoming' : 'overdue'
                });

                emailPromises.push(
                    sendEmail(
                        assignee.username,
                        emailContent.subject,
                        emailContent.html, // fallback text
                        emailContent.html
                    )
                );
            }
        }

        // Send all emails in parallel
        const results = await Promise.allSettled(emailPromises);
        results.forEach((r, i) => {
            if (r.status === 'fulfilled') {
                console.log(`Email #${i + 1} sent successfully.`);
            } else {
                console.error(`Email #${i + 1} failed:`, r.reason);
            }
        });

        console.log('✅ Notification check completed.');
    } catch (error) {
        console.error('❌ Error checking tasks for notifications:', error);
    }
};


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

        const transporter = getTransporter(); // Get transporter here, after env vars are set
        
        const mailOptions = {
            from: '"All-In-One STMS" <smuspmg4t5@gmail.com>',
            to: to,
            subject: subject,
            text: textContent,
            html: htmlContent || textContent,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully to %s: %s', to, info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Failed to send email to %s:', to, error.message);
        return { success: false, error: error.message };
    }
}

// // Test function - only runs if this file is executed directly
// import { pathToFileURL } from 'url';
// if (import.meta.url === pathToFileURL(process.argv[1]).href) {
//     (async () => {
//         console.log('Sending test email...');
//         const result = await sendEmail(
//             process.env.TEST_EMAIL_TO,
//             'Test Email from All-In-One STMS',
//             'This is a test email sent using Nodemailer.',
//             '<b>This is a test email sent using Nodemailer.</b>'
//         );
//         console.log('Test result:', result);
//     })();
// }
