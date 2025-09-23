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
const mockLoginUser = vi.fn();
const mockGetUserById = vi.fn();

UserServices.registerUser = mockRegisterUser;
UserServices.loginUser = mockLoginUser;
UserServices.getUserById = mockGetUserById;

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
        mockLoginUser.mockClear();
        mockGetUserById.mockClear();
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

describe('User Controller - User Authentication', () => {
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
            body: {},
            session: {}
        };
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
            clearCookie: vi.fn()
        };
        next = vi.fn();

        vi.clearAllMocks();
        mockLoginUser.mockClear();
        mockGetUserById.mockClear();
    });

    // Test Group: Successful login responses
    describe('Happy Path Tests - Login', () => {
        // Test: Valid login should return 200 and set session
        it('should return 200 and set session for valid login', async () => {
            const mockUser = {
                id: 'mockid123',
                username: 'testuser',
                roles: ['staff'],
                department: 'it'
            };

            req.body = {
                username: 'testuser',
                password: 'password123'
            };

            mockLoginUser.mockResolvedValue(mockUser);

            await userController.login(req, res, next);

            expect(mockLoginUser).toHaveBeenCalledWith('testuser', 'password123');
            expect(req.session.userId).toBe('mockid123');
            expect(req.session.username).toBe('testuser');
            expect(req.session.userRoles).toEqual(['staff']);
            expect(req.session.userDepartment).toBe('it');
            expect(req.session.authenticated).toBe(true);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                message: "Login successful",
                user: mockUser
            });
        });

        // Test: Login with admin role should set correct session data
        it('should handle admin role login', async () => {
            const mockUser = {
                id: 'adminid123',
                username: 'admin1',
                roles: ['admin'],
                department: 'it'
            };

            req.body = {
                username: 'admin1',
                password: 'adminpass123'
            };

            mockLoginUser.mockResolvedValue(mockUser);

            await userController.login(req, res, next);

            expect(req.session.userRoles).toEqual(['admin']);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        // Test: Login with multiple roles should set correct session data
        it('should handle multiple roles login', async () => {
            const mockUser = {
                id: 'multiuserid123',
                username: 'multiuser',
                roles: ['staff', 'manager'],
                department: 'hr'
            };

            req.body = {
                username: 'multiuser',
                password: 'password123'
            };

            mockLoginUser.mockResolvedValue(mockUser);

            await userController.login(req, res, next);

            expect(req.session.userRoles).toEqual(['staff', 'manager']);
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    // Test Group: Login validation errors
    describe('Negative Path Tests - Login Validation Errors (400)', () => {
        // Test: Missing username should return 400
        it('should return 400 when username is missing', async () => {
            req.body = {
                password: 'password123'
            };

            await userController.login(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: "Username and password are required"
            });
            expect(mockLoginUser).not.toHaveBeenCalled();
        });

        // Test: Missing password should return 400
        it('should return 400 when password is missing', async () => {
            req.body = {
                username: 'testuser'
            };

            await userController.login(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: "Username and password are required"
            });
            expect(mockLoginUser).not.toHaveBeenCalled();
        });

        // Test: Empty username should return 400
        it('should return 400 when username is empty', async () => {
            req.body = {
                username: '',
                password: 'password123'
            };

            await userController.login(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: "Username and password are required"
            });
        });

        // Test: Empty password should return 400
        it('should return 400 when password is empty', async () => {
            req.body = {
                username: 'testuser',
                password: ''
            };

            await userController.login(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: "Username and password are required"
            });
        });
    });

    // Test Group: Login authentication failures
    describe('Negative Path Tests - Login Authentication Failures (401)', () => {
        // Test: Invalid credentials should return 401
        it('should return 401 for invalid credentials', async () => {
            req.body = {
                username: 'testuser',
                password: 'wrongpassword'
            };

            mockLoginUser.mockRejectedValue(new Error('Login failed: Invalid username or password'));

            await userController.login(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                message: "Login failed",
                error: 'Login failed: Invalid username or password'
            });
            expect(req.session.authenticated).toBeUndefined();
        });

        // Test: Non-existent user should return 401
        it('should return 401 for non-existent user', async () => {
            req.body = {
                username: 'nonexistent',
                password: 'password123'
            };

            mockLoginUser.mockRejectedValue(new Error('Login failed: Invalid username or password'));

            await userController.login(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                message: "Login failed",
                error: 'Login failed: Invalid username or password'
            });
        });
    });

    // Test Group: Successful logout responses
    describe('Happy Path Tests - Logout', () => {
        // Test: Valid logout should destroy session and clear cookie
        it('should return 200 and destroy session for valid logout', async () => {
            req.session = {
                destroy: vi.fn((callback) => callback(null))
            };

            await userController.logout(req, res, next);

            expect(req.session.destroy).toHaveBeenCalled();
            expect(res.clearCookie).toHaveBeenCalledWith('connect.sid');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                message: "Logout successful"
            });
        });
    });

    // Test Group: Logout error handling
    describe('Negative Path Tests - Logout Errors (500)', () => {
        // Test: Session destruction error should return 500
        it('should return 500 when session destruction fails', async () => {
            req.session = {
                destroy: vi.fn((callback) => callback(new Error('Session destruction failed')))
            };

            await userController.logout(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: "Error during logout",
                error: 'Session destruction failed'
            });
        });
    });

    // Test Group: Successful profile retrieval
    describe('Happy Path Tests - Get Profile', () => {
        // Test: Authenticated user should get profile
        it('should return 200 and user profile for authenticated user', async () => {
            req.session = {
                authenticated: true,
                userId: 'mockid123',
                username: 'testuser',
                userRoles: ['staff'],
                userDepartment: 'it'
            };

            await userController.getProfile(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                user: {
                    id: 'mockid123',
                    username: 'testuser',
                    roles: ['staff'],
                    department: 'it'
                }
            });
        });

        // Test: Profile with multiple roles
        it('should return profile with multiple roles', async () => {
            req.session = {
                authenticated: true,
                userId: 'mockid123',
                username: 'multiuser',
                userRoles: ['staff', 'manager'],
                userDepartment: 'hr'
            };

            await userController.getProfile(req, res, next);

            expect(res.json).toHaveBeenCalledWith({
                user: {
                    id: 'mockid123',
                    username: 'multiuser',
                    roles: ['staff', 'manager'],
                    department: 'hr'
                }
            });
        });
    });

    // Test Group: Profile authentication errors
    describe('Negative Path Tests - Get Profile Authentication Errors (401)', () => {
        // Test: Unauthenticated user should return 401
        it('should return 401 when user is not authenticated', async () => {
            req.session = {};

            await userController.getProfile(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                message: "Not authenticated"
            });
        });

        // Test: Missing session should return 401
        it('should return 401 when session is missing', async () => {
            req.session = null;

            await userController.getProfile(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                message: "Not authenticated"
            });
        });

        // Test: Session without authenticated flag should return 401
        it('should return 401 when session exists but not authenticated', async () => {
            req.session = {
                userId: 'mockid123',
                username: 'testuser'
                // missing authenticated: true
            };

            await userController.getProfile(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                message: "Not authenticated"
            });
        });
    });
});