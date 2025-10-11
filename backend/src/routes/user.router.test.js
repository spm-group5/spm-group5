import { describe, it, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../app.js';
import userModel from '../models/user.model.js';
/**
 * Router Integration Tests for User Account Creation
 * Tests full HTTP request/response cycle including routing, middleware,
 * controllers, services, and database interactions using real MongoDB
 */



describe('User Router - POST /api/register Integration Tests', () => {
    // Setup: Use the shared MongoDB connection from global test setup
    beforeAll(async () => {
        // Connection is already established by global test setup
        // Just ensure we're connected
        if (mongoose.connection.readyState !== 1) {
            throw new Error('Database connection not ready');
        }
    });

    // Cleanup: Don't disconnect - let global setup handle it
    afterAll(async () => {
        // Cleanup is handled by global test setup
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
                .post('/api/register')
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
                .post('/api/register')
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
                .post('/api/register')
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
                .post('/api/register')
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
                .post('/api/register')
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
                .post('/api/register')
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
                .post('/api/register')
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
                .post('/api/register')
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
                .post('/api/register')
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
                .post('/api/register')
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
                .post('/api/register')
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
                .post('/api/register')
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
                .post('/api/register')
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
                .post('/api/register')
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
                .post('/api/register')
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
                .post('/api/register')
                .send(firstUser)
                .expect(201);

            const duplicateUser = {
                username: 'duplicateuser',
                roles: ['manager'],
                department: 'sales',
                hashed_password: 'differentpassword'
            };

            const response = await request(app)
                .post('/api/register')
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
                .post('/api/register')
                .send(firstUser)
                .expect(201);

            const duplicateUser = {
                username: 'TestUser',
                roles: ['admin'],
                department: 'hr',
                hashed_password: 'password456'
            };

            const response = await request(app)
                .post('/api/register')
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
                .post('/api/register')
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
                .post('/api/register')
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
                .post('/api/register')
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
                .post('/api/register')
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
                .post('/api/register')
                .send(userData)
                .expect(500);

            expect(response.body.message).toBe('Error registering user');
        });
    });
});

describe('User Router - Authentication Integration Tests', () => {
    // Setup: Use the shared MongoDB connection from global test setup
    beforeAll(async () => {
        // Connection is already established by global test setup
        // Just ensure we're connected
        if (mongoose.connection.readyState !== 1) {
            throw new Error('Database connection not ready');
        }
    });

    // Cleanup: Don't disconnect - let global setup handle it
    afterAll(async () => {
        // Cleanup is handled by global test setup
    });

    // Reset: Clear all users before each test for test isolation
    beforeEach(async () => {
        await userModel.deleteMany({});
    });

    // Test Group: Successful login flows
    describe('Happy Path Tests - Login', () => {
        // Test: Valid login should return 200 and set session cookie
        it('should return 200 and set session for valid login', async () => {
            // First create a user
            const userData = {
                username: 'testuser',
                roles: ['staff'],
                department: 'it',
                hashed_password: 'password123'
            };

            await request(app)
                .post('/api/register')
                .send(userData)
                .expect(201);

            // Now test login
            const response = await request(app)
                .post('/api/login')
                .send({
                    username: 'testuser',
                    password: 'password123'
                })
                .expect(200);

            expect(response.body.message).toBe('Login successful');
            expect(response.body.user).toBeDefined();
            expect(response.body.user.username).toBe('testuser');
            expect(response.body.user.roles).toEqual(['staff']);
            expect(response.body.user.department).toBe('it');
            expect(response.body.user.hashed_password).toBeUndefined();

            // Check that session cookie is set
            expect(response.headers['set-cookie']).toBeDefined();
            expect(response.headers['set-cookie'][0]).toContain('connect.sid');
        });

        // Test: Login with admin role
        it('should login user with admin role', async () => {
            const userData = {
                username: 'admin1',
                roles: ['admin'],
                department: 'it',
                hashed_password: 'adminpass123'
            };

            await request(app)
                .post('/api/register')
                .send(userData)
                .expect(201);

            const response = await request(app)
                .post('/api/login')
                .send({
                    username: 'admin1',
                    password: 'adminpass123'
                })
                .expect(200);

            expect(response.body.user.roles).toEqual(['admin']);
        });

        // Test: Login with multiple roles
        it('should login user with multiple roles', async () => {
            const userData = {
                username: 'multiuser',
                roles: ['staff', 'manager'],
                department: 'hr',
                hashed_password: 'password123'
            };

            await request(app)
                .post('/api/register')
                .send(userData)
                .expect(201);

            const response = await request(app)
                .post('/api/login')
                .send({
                    username: 'multiuser',
                    password: 'password123'
                })
                .expect(200);

            expect(response.body.user.roles).toEqual(['staff', 'manager']);
        });
    });

    // Test Group: Login validation errors
    describe('Negative Path Tests - Login Validation Errors (400)', () => {
        // Test: Missing username should return 400
        it('should return 400 when username is missing', async () => {
            const response = await request(app)
                .post('/api/login')
                .send({
                    password: 'password123'
                })
                .expect(400);

            expect(response.body.message).toBe('Username and password are required');
        });

        // Test: Missing password should return 400
        it('should return 400 when password is missing', async () => {
            const response = await request(app)
                .post('/api/login')
                .send({
                    username: 'testuser'
                })
                .expect(400);

            expect(response.body.message).toBe('Username and password are required');
        });

        // Test: Empty username should return 400
        it('should return 400 when username is empty', async () => {
            const response = await request(app)
                .post('/api/login')
                .send({
                    username: '',
                    password: 'password123'
                })
                .expect(400);

            expect(response.body.message).toBe('Username and password are required');
        });

        // Test: Empty password should return 400
        it('should return 400 when password is empty', async () => {
            const response = await request(app)
                .post('/api/login')
                .send({
                    username: 'testuser',
                    password: ''
                })
                .expect(400);

            expect(response.body.message).toBe('Username and password are required');
        });
    });

    // Test Group: Login authentication failures
    describe('Negative Path Tests - Login Authentication Failures (401)', () => {
        // Test: Invalid credentials should return 401
        it('should return 401 for invalid credentials', async () => {
            const userData = {
                username: 'testuser',
                roles: ['staff'],
                department: 'it',
                hashed_password: 'correctpassword'
            };

            await request(app)
                .post('/api/register')
                .send(userData)
                .expect(201);

            const response = await request(app)
                .post('/api/login')
                .send({
                    username: 'testuser',
                    password: 'wrongpassword'
                })
                .expect(401);

            expect(response.body.message).toBe('Login failed');
            expect(response.body.error).toContain('Invalid username or password');
        });

        // Test: Non-existent user should return 401
        it('should return 401 for non-existent user', async () => {
            const response = await request(app)
                .post('/api/login')
                .send({
                    username: 'nonexistent',
                    password: 'password123'
                })
                .expect(401);

            expect(response.body.message).toBe('Login failed');
            expect(response.body.error).toContain('Invalid username or password');
        });
    });

    // Test Group: Successful logout flows
    describe('Happy Path Tests - Logout', () => {
        // Test: Valid logout should return 200
        it('should return 200 for valid logout', async () => {
            const response = await request(app)
                .post('/api/logout')
                .expect(200);

            expect(response.body.message).toBe('Logout successful');
        });
    });

    // Test Group: Profile access with authentication
    describe('Profile Access Tests', () => {
        let agent;

        beforeEach(() => {
            agent = request.agent(app); // Create agent to maintain session
        });

        // Test: Authenticated user should access profile
        it('should return 200 and user profile for authenticated user', async () => {
            // First create and login a user
            const userData = {
                username: 'testuser',
                roles: ['staff'],
                department: 'it',
                hashed_password: 'password123'
            };

            await agent
                .post('/api/register')
                .send(userData)
                .expect(201);

            await agent
                .post('/api/login')
                .send({
                    username: 'testuser',
                    password: 'password123'
                })
                .expect(200);

            // Now access profile
            const response = await agent
                .get('/api/profile')
                .expect(200);

            expect(response.body.user).toBeDefined();
            expect(response.body.user.username).toBe('testuser');
            expect(response.body.user.roles).toEqual(['staff']);
            expect(response.body.user.department).toBe('it');
        });

        // Test: Unauthenticated user should not access profile
        it('should return 401 for unauthenticated profile access', async () => {
            const response = await request(app)
                .get('/api/profile')
                .expect(401);

            expect(response.body.error).toBe('Unauthorized');
            expect(response.body.message).toBe('Authentication required to access this resource');
        });

        // Test: Profile access after logout should fail
        it('should return 401 for profile access after logout', async () => {
            // First create and login a user
            const userData = {
                username: 'testuser',
                roles: ['staff'],
                department: 'it',
                hashed_password: 'password123'
            };

            await agent
                .post('/api/register')
                .send(userData)
                .expect(201);

            await agent
                .post('/api/login')
                .send({
                    username: 'testuser',
                    password: 'password123'
                })
                .expect(200);

            // Logout
            await agent
                .post('/api/logout')
                .expect(200);

            // Try to access profile after logout
            const response = await agent
                .get('/api/profile')
                .expect(401);

            expect(response.body.error).toBe('Unauthorized');
        });
    });

    // Test Group: Session management
    describe('Session Management Tests', () => {
        let agent;

        beforeEach(() => {
            agent = request.agent(app); // Create agent to maintain session
        });

        // Test: Session should persist across requests
        it('should maintain session across multiple requests', async () => {
            // Create and login user
            const userData = {
                username: 'testuser',
                roles: ['staff'],
                department: 'it',
                hashed_password: 'password123'
            };

            await agent
                .post('/api/register')
                .send(userData)
                .expect(201);

            await agent
                .post('/api/login')
                .send({
                    username: 'testuser',
                    password: 'password123'
                })
                .expect(200);

            // Make multiple profile requests
            const response1 = await agent
                .get('/api/profile')
                .expect(200);

            const response2 = await agent
                .get('/api/profile')
                .expect(200);

            expect(response1.body.user.username).toBe('testuser');
            expect(response2.body.user.username).toBe('testuser');
        });

        // Test: Different agents should have separate sessions
        it('should maintain separate sessions for different agents', async () => {
            const agent1 = request.agent(app);
            const agent2 = request.agent(app);

            // Create users
            const user1Data = {
                username: 'user1',
                roles: ['staff'],
                department: 'it',
                hashed_password: 'password123'
            };

            const user2Data = {
                username: 'user2',
                roles: ['manager'],
                department: 'hr',
                hashed_password: 'password456'
            };

            await agent1
                .post('/api/register')
                .send(user1Data)
                .expect(201);

            await agent2
                .post('/api/register')
                .send(user2Data)
                .expect(201);

            // Login with different agents
            await agent1
                .post('/api/login')
                .send({
                    username: 'user1',
                    password: 'password123'
                })
                .expect(200);

            await agent2
                .post('/api/login')
                .send({
                    username: 'user2',
                    password: 'password456'
                })
                .expect(200);

            // Check that each agent has their own session
            const response1 = await agent1
                .get('/api/profile')
                .expect(200);

            const response2 = await agent2
                .get('/api/profile')
                .expect(200);

            expect(response1.body.user.username).toBe('user1');
            expect(response2.body.user.username).toBe('user2');
            expect(response1.body.user.roles).toEqual(['staff']);
            expect(response2.body.user.roles).toEqual(['manager']);
        });
    });
});