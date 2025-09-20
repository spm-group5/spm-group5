/**
 * Service Layer Tests for User Account Creation
 * Tests the UserServices.registerUser() method for business logic validation,
 * data processing, and database interactions using in-memory MongoDB
 */

// Using Vitest globals - no need to import describe, it, expect, beforeAll, afterAll, beforeEach
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const UserServices = require('./user.services');
const userModel = require('../models/user.model');

describe('UserServices - User Account Creation', () => {
    let mongoServer;

    // Setup: Create in-memory MongoDB instance for isolated testing
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

    // Test Group: Successful user creation scenarios
    describe('Happy Path Tests', () => {
        // Test: Valid user creation with all required fields populated
        it('should successfully create a new user account with valid data', async () => {
            const userData = {
                username: 'testuser',
                roles: ['staff'],
                department: 'it',
                hashed_password: 'plainpassword123'
            };

            const result = await UserServices.registerUser(
                userData.username,
                userData.roles,
                userData.department,
                userData.hashed_password
            );

            expect(result).toBeDefined();
            expect(result.username).toBe(userData.username);
            expect(result.roles).toEqual(userData.roles);
            expect(result.department).toBe(userData.department);
            expect(result.hashed_password).not.toBe(userData.hashed_password);
        });

        // Test: User creation with manager role from enum
        it('should create user with manager role', async () => {
            const result = await UserServices.registerUser('manager1', ['manager'], 'sales', 'password123');

            expect(result.roles).toEqual(['manager']);
        });

        // Test: User creation with admin role from enum
        it('should create user with admin role', async () => {
            const result = await UserServices.registerUser('admin1', ['admin'], 'it', 'password123');

            expect(result.roles).toEqual(['admin']);
        });
    });

    // Test Group: Required field validation failures
    describe('Negative Path Tests - Validation Errors', () => {
        // Test: Empty username should trigger validation error
        it('should throw error when username is missing', async () => {
            await expect(
                UserServices.registerUser('', ['staff'], 'it', 'password123')
            ).rejects.toThrow('Failed to register user');
        });

        // Test: Null username should trigger validation error
        it('should throw error when username is null', async () => {
            await expect(
                UserServices.registerUser(null, ['staff'], 'it', 'password123')
            ).rejects.toThrow('Failed to register user');
        });

        // Test: Empty password should trigger validation error
        it('should throw error when password is missing', async () => {
            await expect(
                UserServices.registerUser('testuser', ['staff'], 'it', '')
            ).rejects.toThrow('Failed to register user');
        });

        // Test: Null password should trigger validation error
        it('should throw error when password is null', async () => {
            await expect(
                UserServices.registerUser('testuser', ['staff'], 'it', null)
            ).rejects.toThrow('Failed to register user');
        });

        // Test: Empty roles array should trigger validation error
        it('should throw error when roles array is empty', async () => {
            await expect(
                UserServices.registerUser('testuser', [], 'it', 'password123')
            ).rejects.toThrow('Failed to register user');
        });

        // Test: Null roles should trigger validation error
        it('should throw error when roles is null', async () => {
            await expect(
                UserServices.registerUser('testuser', null, 'it', 'password123')
            ).rejects.toThrow('Failed to register user');
        });

        // Test: Missing department should trigger validation error
        it('should throw error when department is missing', async () => {
            await expect(
                UserServices.registerUser('testuser', ['staff'], null, 'password123')
            ).rejects.toThrow('Failed to register user');
        });
    });

    // Test Group: Business rule validation failures
    describe('Negative Path Tests - Business Logic Errors', () => {
        // Test: Role not in allowed enum values should be rejected
        it('should throw error for invalid role not in enum', async () => {
            await expect(
                UserServices.registerUser('testuser', ['invalidrole'], 'it', 'password123')
            ).rejects.toThrow('Failed to register user');
        });

        // Test: Multiple invalid roles should be rejected
        it('should throw error for multiple invalid roles', async () => {
            await expect(
                UserServices.registerUser('testuser', ['user', 'superuser'], 'it', 'password123')
            ).rejects.toThrow('Failed to register user');
        });

        // Test: Mix of valid and invalid roles should be rejected
        it('should throw error for mixed valid and invalid roles', async () => {
            await expect(
                UserServices.registerUser('testuser', ['staff', 'invalidrole'], 'it', 'password123')
            ).rejects.toThrow('Failed to register user');
        });
    });

    // Test Group: Username uniqueness constraint violations
    describe('Negative Path Tests - Duplicate Username', () => {
        // Test: Duplicate username should trigger unique constraint error
        it('should throw error when username already exists', async () => {
            const userData = {
                username: 'duplicateuser',
                roles: ['staff'],
                department: 'it',
                hashed_password: 'password123'
            };

            await UserServices.registerUser(
                userData.username,
                userData.roles,
                userData.department,
                userData.hashed_password
            );

            await expect(
                UserServices.registerUser(
                    userData.username,
                    ['manager'],
                    'sales',
                    'differentpassword'
                )
            ).rejects.toThrow('Failed to register user');
        });

        // Test: Case-sensitive duplicate username should be rejected
        it('should throw error for case-sensitive duplicate username', async () => {
            await UserServices.registerUser('TestUser', ['staff'], 'it', 'password123');

            await expect(
                UserServices.registerUser('TestUser', ['admin'], 'hr', 'password456')
            ).rejects.toThrow('Failed to register user');
        });
    });

    // Test Group: Boundary conditions and optional field handling
    describe('Edge Cases', () => {
        // Test: Missing department should trigger validation error
        it('should throw error when department is missing', async () => {
            await expect(
                UserServices.registerUser('testuser', ['staff'], '', 'password123')
            ).rejects.toThrow('Failed to register user');
        });

        // Test: Undefined department should trigger validation error
        it('should throw error when department is undefined', async () => {
            await expect(
                UserServices.registerUser('testuser', ['staff'], undefined, 'password123')
            ).rejects.toThrow('Failed to register user');
        });

        // Test: Invalid department enum value should be rejected
        it('should throw error for invalid department enum', async () => {
            await expect(
                UserServices.registerUser('testuser', ['staff'], 'invalidDept', 'password123')
            ).rejects.toThrow('Failed to register user');
        });

        // Test: Multiple valid roles should be accepted
        it('should handle multiple roles from enum', async () => {
            const result = await UserServices.registerUser('testuser', ['staff', 'manager'], 'it', 'password123');

            expect(result.roles).toEqual(['staff', 'manager']);
        });
    });
});