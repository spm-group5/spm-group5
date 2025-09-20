/**
 * Router Integration Tests for User Account Creation
 * Tests full HTTP request/response cycle including routing, middleware,
 * controllers, services, and database interactions using real MongoDB
 */

// Using Vitest globals - no need to import describe, it, expect, beforeAll, afterAll, beforeEach
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const app = require('../app');
const userModel = require('../models/user.model');

describe('User Router - POST /users/register Integration Tests', () => {
    let mongoServer;

    // Setup: Create in-memory MongoDB instance for integration testing
    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
    });

    // Cleanup: Disconnect from database and stop MongoDB server
    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    // Reset: Clear all users before each test for test isolation
    beforeEach(async () => {
        await userModel.deleteMany({});
    });

    // Test Group: Successful end-to-end user creation flows
    describe('Happy Path Tests', () => {
        // Test: Valid HTTP request should create user and return 201
        it('should return 201 and create user with valid data', async () => {
            const userData = {
                username: 'testuser',
                roles: ['staff'],
                department: 'it',
                hashed_password: 'password123'
            };

            const response = await request(app)
                .post('/users/register')
                .send(userData)
                .expect(201);

            expect(response.body.message).toBe('User registered successfully');
            expect(response.body.data).toBeDefined();
            expect(response.body.data.username).toBe(userData.username);
            expect(response.body.data.roles).toEqual(userData.roles);
            expect(response.body.data.department).toBe(userData.department);

            const savedUser = await userModel.findOne({ username: userData.username });
            expect(savedUser).toBeDefined();
            expect(savedUser.hashed_password).not.toBe(userData.hashed_password);
        });

        // Test: Manager role user creation via HTTP request
        it('should create user with manager role', async () => {
            const userData = {
                username: 'manager1',
                roles: ['manager'],
                department: 'sales',
                hashed_password: 'managerpass123'
            };

            const response = await request(app)
                .post('/users/register')
                .send(userData)
                .expect(201);

            expect(response.body.data.roles).toEqual(['manager']);
        });

        // Test: Admin role user creation via HTTP request
        it('should create user with admin role', async () => {
            const userData = {
                username: 'admin1',
                roles: ['admin'],
                department: 'it',
                hashed_password: 'adminpass123'
            };

            const response = await request(app)
                .post('/users/register')
                .send(userData)
                .expect(201);

            expect(response.body.data.roles).toEqual(['admin']);
        });

        // Test: Multiple roles user creation via HTTP request
        it('should create user with multiple valid roles', async () => {
            const userData = {
                username: 'multiuser',
                roles: ['staff', 'manager'],
                department: 'it',
                hashed_password: 'password123'
            };

            const response = await request(app)
                .post('/users/register')
                .send(userData)
                .expect(201);

            expect(response.body.data.roles).toEqual(['staff', 'manager']);
        });
    });

    // Test Group: HTTP validation error responses
    describe('Negative Path Tests - Validation Errors (400/500)', () => {
        // Test: Missing username field should return HTTP 500
        it('should return 500 when username is missing', async () => {
            const userData = {
                roles: ['staff'],
                department: 'it',
                hashed_password: 'password123'
            };

            const response = await request(app)
                .post('/users/register')
                .send(userData)
                .expect(500);

            expect(response.body.message).toBe('Error registering user');
            expect(response.body.error).toContain('Failed to register user');
        });

        // Test: Empty username string should return HTTP 500
        it('should return 500 when username is empty string', async () => {
            const userData = {
                username: '',
                roles: ['staff'],
                department: 'it',
                hashed_password: 'password123'
            };

            const response = await request(app)
                .post('/users/register')
                .send(userData)
                .expect(500);

            expect(response.body.message).toBe('Error registering user');
        });

        // Test: Missing password field should return HTTP 500
        it('should return 500 when password is missing', async () => {
            const userData = {
                username: 'testuser',
                roles: ['staff'],
                department: 'it'
            };

            const response = await request(app)
                .post('/users/register')
                .send(userData)
                .expect(500);

            expect(response.body.message).toBe('Error registering user');
        });

        // Test: Empty password string should return HTTP 500
        it('should return 500 when password is empty string', async () => {
            const userData = {
                username: 'testuser',
                roles: ['staff'],
                department: 'it',
                hashed_password: ''
            };

            const response = await request(app)
                .post('/users/register')
                .send(userData)
                .expect(500);

            expect(response.body.message).toBe('Error registering user');
        });

        // Test: Empty roles array should return HTTP 500
        it('should return 500 when roles array is empty', async () => {
            const userData = {
                username: 'testuser',
                roles: [],
                department: 'it',
                hashed_password: 'password123'
            };

            const response = await request(app)
                .post('/users/register')
                .send(userData)
                .expect(500);

            expect(response.body.message).toBe('Error registering user');
        });

        // Test: Missing roles field should return HTTP 500
        it('should return 500 when roles is missing', async () => {
            const userData = {
                username: 'testuser',
                department: 'it',
                hashed_password: 'password123'
            };

            const response = await request(app)
                .post('/users/register')
                .send(userData)
                .expect(500);

            expect(response.body.message).toBe('Error registering user');
        });

        // Test: Non-string username should return HTTP 500
        it('should return 500 for invalid data format - non-string username', async () => {
            const userData = {
                username: 123,
                roles: ['staff'],
                department: 'it',
                hashed_password: 'password123'
            };

            const response = await request(app)
                .post('/users/register')
                .send(userData)
                .expect(500);

            expect(response.body.message).toBe('Error registering user');
        });

        // Test: Non-string department should return HTTP 500
        it('should return 500 for invalid data format - non-string department', async () => {
            const userData = {
                username: 'testuser',
                roles: ['staff'],
                department: 123,
                hashed_password: 'password123'
            };

            const response = await request(app)
                .post('/users/register')
                .send(userData)
                .expect(500);

            expect(response.body.message).toBe('Error registering user');
        });
    });

    // Test Group: HTTP business rule violation responses
    describe('Negative Path Tests - Business Logic Errors (400/500)', () => {
        // Test: Invalid enum role should return HTTP 500
        it('should return 500 for invalid role not in enum', async () => {
            const userData = {
                username: 'testuser',
                roles: ['invalidrole'],
                department: 'it',
                hashed_password: 'password123'
            };

            const response = await request(app)
                .post('/users/register')
                .send(userData)
                .expect(500);

            expect(response.body.message).toBe('Error registering user');
            expect(response.body.error).toContain('Failed to register user');
        });

        // Test: Multiple invalid roles should return HTTP 500
        it('should return 500 for multiple invalid roles', async () => {
            const userData = {
                username: 'testuser',
                roles: ['user', 'superuser'],
                department: 'it',
                hashed_password: 'password123'
            };

            const response = await request(app)
                .post('/users/register')
                .send(userData)
                .expect(500);

            expect(response.body.message).toBe('Error registering user');
        });

        // Test: Mixed valid/invalid roles should return HTTP 500
        it('should return 500 for mixed valid and invalid roles', async () => {
            const userData = {
                username: 'testuser',
                roles: ['staff', 'invalidrole'],
                department: 'it',
                hashed_password: 'password123'
            };

            const response = await request(app)
                .post('/users/register')
                .send(userData)
                .expect(500);

            expect(response.body.message).toBe('Error registering user');
        });
    });

    // Test Group: HTTP duplicate username error responses
    describe('Negative Path Tests - Duplicate Username (409/500)', () => {
        // Test: Duplicate username should return HTTP 500
        it('should return 500 when username already exists', async () => {
            const firstUser = {
                username: 'duplicateuser',
                roles: ['staff'],
                department: 'it',
                hashed_password: 'password123'
            };

            await request(app)
                .post('/users/register')
                .send(firstUser)
                .expect(201);

            const duplicateUser = {
                username: 'duplicateuser',
                roles: ['manager'],
                department: 'sales',
                hashed_password: 'differentpassword'
            };

            const response = await request(app)
                .post('/users/register')
                .send(duplicateUser)
                .expect(500);

            expect(response.body.message).toBe('Error registering user');
            expect(response.body.error).toContain('Failed to register user');
        });

        // Test: Case-sensitive duplicate username should return HTTP 500
        it('should return 500 for case-sensitive duplicate username', async () => {
            const firstUser = {
                username: 'TestUser',
                roles: ['staff'],
                department: 'it',
                hashed_password: 'password123'
            };

            await request(app)
                .post('/users/register')
                .send(firstUser)
                .expect(201);

            const duplicateUser = {
                username: 'TestUser',
                roles: ['admin'],
                department: 'hr',
                hashed_password: 'password456'
            };

            const response = await request(app)
                .post('/users/register')
                .send(duplicateUser)
                .expect(500);

            expect(response.body.message).toBe('Error registering user');
        });
    });

    // Test Group: HTTP content parsing and malformed request handling
    describe('Content-Type and Malformed JSON Tests', () => {
        // Test: Malformed JSON should return HTTP 400
        it('should handle malformed JSON', async () => {
            const response = await request(app)
                .post('/users/register')
                .set('Content-Type', 'application/json')
                .send('{"username": "test", invalid json}')
                .expect(400);
        });

        // Test: Missing Content-Type should still process request
        it('should handle missing Content-Type header', async () => {
            const userData = {
                username: 'testuser',
                roles: ['staff'],
                department: 'it',
                hashed_password: 'password123'
            };

            const response = await request(app)
                .post('/users/register')
                .send(userData)
                .expect(201);

            expect(response.body.message).toBe('User registered successfully');
        });
    });

    // Test Group: HTTP boundary conditions and optional field handling
    describe('Edge Cases', () => {
        // Test: Empty department string should return HTTP 500
        it('should return 500 for empty department string', async () => {
            const userData = {
                username: 'testuser',
                roles: ['staff'],
                department: '',
                hashed_password: 'password123'
            };

            const response = await request(app)
                .post('/users/register')
                .send(userData)
                .expect(500);

            expect(response.body.message).toBe('Error registering user');
        });

        // Test: Missing department field should return HTTP 500
        it('should return 500 for missing department field', async () => {
            const userData = {
                username: 'testuser',
                roles: ['staff'],
                hashed_password: 'password123'
            };

            const response = await request(app)
                .post('/users/register')
                .send(userData)
                .expect(500);

            expect(response.body.message).toBe('Error registering user');
        });

        // Test: Invalid department enum should return HTTP 500
        it('should return 500 for invalid department enum', async () => {
            const userData = {
                username: 'testuser',
                roles: ['staff'],
                department: 'invalidDept',
                hashed_password: 'password123'
            };

            const response = await request(app)
                .post('/users/register')
                .send(userData)
                .expect(500);

            expect(response.body.message).toBe('Error registering user');
        });
    });
});