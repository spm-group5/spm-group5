import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamically select the environment file based on ENV_FILE or NODE_ENV
const envFile =
    process.env.ENV_FILE
        ? process.env.ENV_FILE
        : `.env${process.env.NODE_ENV ? `.${process.env.NODE_ENV}` : ''}`;
dotenv.config({ path: path.join(__dirname, '../../environments', envFile) });

console.log('SMTP Config:');
console.log('Host:', process.env.SMTP_HOST);
console.log('Port:', process.env.SMTP_PORT);
console.log('User:', process.env.SMTP_LOGIN);

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_LOGIN,
        pass: process.env.SMTP_KEY
    }
});

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
if (import.meta.url === `file://${process.argv[1]}`) {
    (async() => {
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