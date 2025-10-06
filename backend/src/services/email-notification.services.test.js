import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import nodemailer from 'nodemailer';

// Mock nodemailer before importing the service
vi.mock('nodemailer');

describe('Email Notification Service - TDD', () => {
    let sendMailMock;
    let verifyMock;
    let sendEmail;

    beforeEach(async () => {
        // Reset all mocks before each test
        vi.clearAllMocks();

        // Setup nodemailer mocks
        sendMailMock = vi.fn();
        verifyMock = vi.fn((callback) => callback(null, true));

        nodemailer.createTransport.mockReturnValue({
            sendMail: sendMailMock,
            verify: verifyMock
        });

        // Set environment variables for testing
        process.env.SMTP_HOST = 'smtp-relay.brevo.com';
        process.env.SMTP_PORT = '587';
        process.env.SMTP_LOGIN = '98850b001@smtp-brevo.com';
        process.env.SMTP_KEY = 'test-key';

        // Dynamically import the module to ensure fresh instance with mocks
        const module = await import('./email-notification.services.js?update=' + Date.now());
        sendEmail = module.sendEmail;
    });

    afterEach(() => {
        vi.resetModules();
    });

    describe('sendEmail function', () => {
        it('should send an email with valid parameters', async () => {
            sendMailMock.mockResolvedValue({ messageId: 'test-message-id' });

            const result = await sendEmail(
                'recipient@example.com',
                'Test Subject',
                'Test plain text content',
                '<p>Test HTML content</p>'
            );

            expect(result.success).toBe(true);
            expect(result.messageId).toBe('test-message-id');
            expect(sendMailMock).toHaveBeenCalledTimes(1);
        });

        it('should send email with correct mail options structure', async () => {
            sendMailMock.mockResolvedValue({ messageId: 'test-id' });

            await sendEmail(
                'user@example.com',
                'Welcome Email',
                'Welcome to our platform',
                '<h1>Welcome</h1>'
            );

            expect(sendMailMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    from: expect.stringContaining('All-In-One STMS'),
                    to: 'user@example.com',
                    subject: 'Welcome Email',
                    text: 'Welcome to our platform',
                    html: '<h1>Welcome</h1>'
                })
            );
        });

        it('should use text content as HTML fallback when HTML is not provided', async () => {
            sendMailMock.mockResolvedValue({ messageId: 'test-id' });

            await sendEmail(
                'user@example.com',
                'Plain Text Only',
                'This is plain text'
            );

            expect(sendMailMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    text: 'This is plain text',
                    html: 'This is plain text'
                })
            );
        });

        it('should return error when recipient email is missing', async () => {
            const result = await sendEmail(
                '',
                'Test Subject',
                'Test Content'
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain('Missing required email parameters');
            expect(sendMailMock).not.toHaveBeenCalled();
        });

        it('should return error when subject is missing', async () => {
            const result = await sendEmail(
                'user@example.com',
                '',
                'Test Content'
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain('Missing required email parameters');
            expect(sendMailMock).not.toHaveBeenCalled();
        });

        it('should return error when text content is missing', async () => {
            const result = await sendEmail(
                'user@example.com',
                'Test Subject',
                ''
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain('Missing required email parameters');
            expect(sendMailMock).not.toHaveBeenCalled();
        });

        it('should handle SMTP errors gracefully', async () => {
            sendMailMock.mockRejectedValue(new Error('SMTP connection failed'));

            const result = await sendEmail(
                'user@example.com',
                'Test Subject',
                'Test Content'
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('SMTP connection failed');
        });

        it('should handle authentication errors', async () => {
            sendMailMock.mockRejectedValue(new Error('Invalid login credentials'));

            const result = await sendEmail(
                'user@example.com',
                'Test Subject',
                'Test Content'
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid login credentials');
        });

        it('should validate SMTP configuration exists', async () => {
            // Remove environment variables
            delete process.env.SMTP_HOST;

            const result = await sendEmail(
                'user@example.com',
                'Test Subject',
                'Test Content'
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain('SMTP configuration is incomplete');
        });

        it('should handle multiple recipients', async () => {
            sendMailMock.mockResolvedValue({ messageId: 'multi-id' });

            const result = await sendEmail(
                'user1@example.com, user2@example.com',
                'Team Update',
                'Important announcement',
                '<b>Important announcement</b>'
            );

            expect(result.success).toBe(true);
            expect(sendMailMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'user1@example.com, user2@example.com'
                })
            );
        });

        it('should handle network timeout errors', async () => {
            sendMailMock.mockRejectedValue(new Error('Connection timeout'));

            const result = await sendEmail(
                'user@example.com',
                'Test',
                'Content'
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('Connection timeout');
        });

        it('should send email with special characters in subject', async () => {
            sendMailMock.mockResolvedValue({ messageId: 'special-id' });

            await sendEmail(
                'user@example.com',
                'Test: Special & Characters!',
                'Content'
            );

            expect(sendMailMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    subject: 'Test: Special & Characters!'
                })
            );
        });

        it('should handle HTML with inline styles', async () => {
            sendMailMock.mockResolvedValue({ messageId: 'styled-id' });

            const htmlWithStyles = '<div style="color: red;"><p>Styled content</p></div>';

            await sendEmail(
                'user@example.com',
                'Styled Email',
                'Styled content',
                htmlWithStyles
            );

            expect(sendMailMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    html: htmlWithStyles
                })
            );
        });
    });

    describe('Transporter Configuration', () => {
        it('should create transporter with correct SMTP settings', () => {
            expect(nodemailer.createTransport).toHaveBeenCalledWith(
                expect.objectContaining({
                    host: 'smtp-relay.brevo.com',
                    port: '587',
                    secure: false,
                    auth: expect.objectContaining({
                        user: '98850b001@smtp-brevo.com',
                        pass: 'test-key'
                    })
                })
            );
        });

        it('should verify SMTP connection on initialization', () => {
            expect(verifyMock).toHaveBeenCalled();
        });
    });

    describe('Edge Cases', () => {
        it('should handle very long email content', async () => {
            sendMailMock.mockResolvedValue({ messageId: 'long-id' });

            const longContent = 'a'.repeat(10000);

            const result = await sendEmail(
                'user@example.com',
                'Long Email',
                longContent
            );

            expect(result.success).toBe(true);
        });

        it('should handle email addresses with plus addressing', async () => {
            sendMailMock.mockResolvedValue({ messageId: 'plus-id' });

            const result = await sendEmail(
                'user+test@example.com',
                'Test',
                'Content'
            );

            expect(result.success).toBe(true);
            expect(sendMailMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'user+test@example.com'
                })
            );
        });

        it('should handle null values gracefully', async () => {
            const result = await sendEmail(
                null,
                'Subject',
                'Content'
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain('Missing required email parameters');
        });

        it('should handle undefined values gracefully', async () => {
            const result = await sendEmail(
                undefined,
                undefined,
                undefined
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain('Missing required email parameters');
        });
    });
});
