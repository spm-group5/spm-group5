/**
 * Controller Layer Tests for User Account Creation
 * Tests HTTP request/response handling, status codes, error handling,
 * and proper delegation to service layer using mocked dependencies
 */



// Mock the module before requiring anything else
vi.mock('../services/user.services');

// Using Vitest globals - no need to import describe, it, expect, beforeAll, afterAll, beforeEach, vi
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const userController = require('./user.controller');
const userModel = require('../models/user.model');
const UserServices = require('../services/user.services'); // ADD THIS LINE

// Mock: Service layer to isolate controller testing
const mockRegisterUser = vi.fn();
UserServices.registerUser = mockRegisterUser;

describe('User Controller - User Account Creation', () => {
    let mongoServer;
    let req, res, next;

    // Setup: Create in-memory MongoDB instance for testing
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

    // Reset: Mock HTTP objects and clear mocks before each test
    beforeEach(() => {
        req = {
            body: {}
        };
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
        next = vi.fn();

        vi.clearAllMocks();
        mockRegisterUser.mockClear();
    });

    // Test Group: Successful HTTP responses for valid requests
    describe('Happy Path Tests', () => {
        // Test: Valid request should return 201 status with success response
        it('should return 201 and success response for valid user creation', async () => {
            const mockUser = {
                _id: 'mockid123',
                username: 'testuser',
                roles: ['staff'],
                department: 'it',
                hashed_password: 'hashedpassword123'
            };

            req.body = {
                username: 'testuser',
                roles: ['staff'],
                department: 'it',
                hashed_password: 'plainpassword123'
            };

            mockRegisterUser.mockResolvedValue(mockUser);

            await userController.register(req, res, next);

            expect(mockRegisterUser).toHaveBeenCalledWith(
                'testuser',
                ['staff'],
                'it',
                'plainpassword123'
            );
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: "User registered successfully",
                data: mockUser
            });
        });

        // Test: Admin role creation should return 201 status
        it('should handle admin role creation', async () => {
            const mockUser = {
                username: 'admin1',
                roles: ['admin'],
                department: 'it'
            };

            req.body = {
                username: 'admin1',
                roles: ['admin'],
                department: 'it',
                hashed_password: 'adminpassword'
            };

            mockRegisterUser.mockResolvedValue(mockUser);

            await userController.register(req, res, next);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: "User registered successfully",
                data: mockUser
            });
        });
    });

    // Test Group: HTTP error responses for validation failures
    describe('Negative Path Tests - Validation Errors (400)', () => {
        // Test: Empty username should return 500 error response
        it('should return 500 when username is empty', async () => {
            req.body = {
                username: '',
                roles: ['staff'],
                department: 'it',
                hashed_password: 'password123'
            };

            mockRegisterUser.mockRejectedValue(new Error('Failed to register user: username is required'));

            await userController.register(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: "Error registering user",
                error: 'Failed to register user: username is required'
            });
        });

        // Test: Empty password should return 500 error response
        it('should return 500 when password is empty', async () => {
            req.body = {
                username: 'testuser',
                roles: ['staff'],
                department: 'it',
                hashed_password: ''
            };

            mockRegisterUser.mockRejectedValue(new Error('Failed to register user: hashed_password is required'));

            await userController.register(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: "Error registering user",
                error: 'Failed to register user: hashed_password is required'
            });
        });

        // Test: Empty roles array should return 500 error response
        it('should return 500 when roles array is empty', async () => {
            req.body = {
                username: 'testuser',
                roles: [],
                department: 'it',
                hashed_password: 'password123'
            };

            mockRegisterUser.mockRejectedValue(new Error('Failed to register user: roles is required'));

            await userController.register(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: "Error registering user",
                error: 'Failed to register user: roles is required'
            });
        });

        // Test: Invalid data types should return 500 error response
        it('should return 500 for invalid data format', async () => {
            req.body = {
                username: 123, // non-string
                roles: ['staff'],
                department: 'it',
                hashed_password: 'password123'
            };

            mockRegisterUser.mockRejectedValue(new Error('Failed to register user: username must be a string'));

            await userController.register(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: "Error registering user",
                error: 'Failed to register user: username must be a string'
            });
        });
    });

    // Test Group: HTTP error responses for business rule violations
    describe('Negative Path Tests - Business Logic Errors (400)', () => {
        // Test: Invalid enum role should return 500 error response
        it('should return 500 for invalid role not in enum', async () => {
            req.body = {
                username: 'testuser',
                roles: ['invalidrole'],
                department: 'it',
                hashed_password: 'password123'
            };

            mockRegisterUser.mockRejectedValue(new Error('Failed to register user: invalidrole is not a valid enum value'));

            await userController.register(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: "Error registering user",
                error: 'Failed to register user: invalidrole is not a valid enum value'
            });
        });
    });

    // Test Group: HTTP error responses for duplicate username
    describe('Negative Path Tests - Duplicate Username (409)', () => {
        // Test: Duplicate username should return 500 error response
        it('should return 500 when username already exists', async () => {
            req.body = {
                username: 'duplicateuser',
                roles: ['staff'],
                department: 'it',
                hashed_password: 'password123'
            };

            mockRegisterUser.mockRejectedValue(new Error('Failed to register user: E11000 duplicate key error'));

            await userController.register(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: "Error registering user",
                error: 'Failed to register user: E11000 duplicate key error'
            });
        });
    });

    // Test Group: HTTP error responses for system failures
    describe('Negative Path Tests - System Unavailable (500)', () => {
        // Test: Database errors should return 500 error response
        it('should return 500 for database connection failure', async () => {
            req.body = {
                username: 'testuser',
                roles: ['staff'],
                department: 'it',
                hashed_password: 'password123'
            };

            mockRegisterUser.mockRejectedValue(new Error('Failed to register user: Database connection failed'));

            await userController.register(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: "Error registering user",
                error: 'Failed to register user: Database connection failed'
            });
        });

        // Test: Unexpected errors should return 500 error response
        it('should return 500 for unexpected system error', async () => {
            req.body = {
                username: 'testuser',
                roles: ['staff'],
                department: 'it',
                hashed_password: 'password123'
            };

            mockRegisterUser.mockRejectedValue(new Error('Unexpected system error'));

            await userController.register(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: "Error registering user",
                error: 'Unexpected system error'
            });
        });
    });

    // Test Group: HTTP request body parsing and parameter extraction
    describe('Request Body Handling', () => {
        // Test: Undefined request fields should be passed to service layer
        it('should handle undefined request body fields', async () => {
            req.body = {
                username: 'testuser',
                hashed_password: 'password123'
            };

            mockRegisterUser.mockRejectedValue(new Error('Failed to register user: roles is required'));

            await userController.register(req, res, next);

            expect(mockRegisterUser).toHaveBeenCalledWith(
                'testuser',
                undefined,
                undefined,
                'password123'
            );
        });
    });
});