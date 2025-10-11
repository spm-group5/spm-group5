import { describe, it, test, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import UserServices from './user.services.js';
import userModel from '../models/user.model.js';
/**
 * Service Layer Tests for User Account Creation
 * Tests the UserServices.registerUser() method for business logic validation,
 * data processing, and database interactions using in-memory MongoDB
 */

describe('UserServices - User Account Creation', () => {
    let mongoServer;

    // Setup: Use the shared MongoDB connection from global test setup
    beforeAll(async () => {
        // Connection is already established by global test setup
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

describe('UserServices - User Authentication', () => {
    let mongoServer;

    // Setup: Use the shared MongoDB connection from global test setup
    beforeAll(async () => {
        // Connection is already established by global test setup
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

    // Test Group: Successful user authentication scenarios
    describe('Happy Path Tests - Login', () => {
        // Test: Valid login with correct credentials
        it('should successfully authenticate user with valid credentials', async () => {
            // First create a user
            const userData = {
                username: 'testuser',
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

            // Now test login
            const result = await UserServices.loginUser('testuser', 'password123');

            expect(result).toBeDefined();
            expect(result.username).toBe('testuser');
            expect(result.roles).toEqual(['staff']);
            expect(result.department).toBe('it');
            expect(result.id).toBeDefined();
            expect(result.hashed_password).toBeUndefined(); // Password should not be returned
        });

        // Test: Login with manager role
        it('should authenticate user with manager role', async () => {
            await UserServices.registerUser('manager1', ['manager'], 'sales', 'managerpass123');

            const result = await UserServices.loginUser('manager1', 'managerpass123');

            expect(result.roles).toEqual(['manager']);
            expect(result.department).toBe('sales');
        });

        // Test: Login with admin role
        it('should authenticate user with admin role', async () => {
            await UserServices.registerUser('admin1', ['admin'], 'it', 'adminpass123');

            const result = await UserServices.loginUser('admin1', 'adminpass123');

            expect(result.roles).toEqual(['admin']);
        });

        // Test: Login with multiple roles
        it('should authenticate user with multiple roles', async () => {
            await UserServices.registerUser('multiuser', ['staff', 'manager'], 'hr', 'password123');

            const result = await UserServices.loginUser('multiuser', 'password123');

            expect(result.roles).toEqual(['staff', 'manager']);
        });
    });

    // Test Group: Authentication failure scenarios
    describe('Negative Path Tests - Login Failures', () => {
        // Test: Invalid username should fail authentication
        it('should throw error for non-existent username', async () => {
            await expect(
                UserServices.loginUser('nonexistent', 'password123')
            ).rejects.toThrow('Login failed: Invalid username or password');
        });

        // Test: Wrong password should fail authentication
        it('should throw error for incorrect password', async () => {
            await UserServices.registerUser('testuser', ['staff'], 'it', 'correctpassword');

            await expect(
                UserServices.loginUser('testuser', 'wrongpassword')
            ).rejects.toThrow('Login failed: Invalid username or password');
        });

        // Test: Empty username should fail authentication
        it('should throw error for empty username', async () => {
            await expect(
                UserServices.loginUser('', 'password123')
            ).rejects.toThrow('Login failed: Username must be a string');
        });

        // Test: Empty password should fail authentication
        it('should throw error for empty password', async () => {
            await expect(
                UserServices.loginUser('testuser', '')
            ).rejects.toThrow('Login failed: Password must be a string');
        });

        // Test: Non-string username should fail authentication
        it('should throw error for non-string username', async () => {
            await expect(
                UserServices.loginUser(123, 'password123')
            ).rejects.toThrow('Login failed: Username must be a string');
        });

        // Test: Non-string password should fail authentication
        it('should throw error for non-string password', async () => {
            await expect(
                UserServices.loginUser('testuser', 123)
            ).rejects.toThrow('Login failed: Password must be a string');
        });

        // Test: Null username should fail authentication
        it('should throw error for null username', async () => {
            await expect(
                UserServices.loginUser(null, 'password123')
            ).rejects.toThrow('Login failed: Username must be a string');
        });

        // Test: Null password should fail authentication
        it('should throw error for null password', async () => {
            await expect(
                UserServices.loginUser('testuser', null)
            ).rejects.toThrow('Login failed: Password must be a string');
        });
    });

    // Test Group: User lookup by ID scenarios
    describe('Happy Path Tests - Get User By ID', () => {
        // Test: Valid user ID should return user data
        it('should successfully get user by valid ID', async () => {
            const userData = {
                username: 'testuser',
                roles: ['staff'],
                department: 'it',
                hashed_password: 'password123'
            };

            const createdUser = await UserServices.registerUser(
                userData.username,
                userData.roles,
                userData.department,
                userData.hashed_password
            );

            const result = await UserServices.getUserById(createdUser._id);

            expect(result).toBeDefined();
            expect(result.username).toBe('testuser');
            expect(result.roles).toEqual(['staff']);
            expect(result.department).toBe('it');
            expect(result.id).toBeDefined();
            expect(result.hashed_password).toBeUndefined(); // Password should not be returned
        });

        // Test: Get user with multiple roles
        it('should get user with multiple roles by ID', async () => {
            const createdUser = await UserServices.registerUser('multiuser', ['staff', 'manager'], 'hr', 'password123');

            const result = await UserServices.getUserById(createdUser._id);

            expect(result.roles).toEqual(['staff', 'manager']);
        });
    });

    // Test Group: User lookup failure scenarios
    describe('Negative Path Tests - Get User By ID Failures', () => {
        // Test: Non-existent user ID should fail
        it('should throw error for non-existent user ID', async () => {
            const fakeId = new mongoose.Types.ObjectId();

            await expect(
                UserServices.getUserById(fakeId)
            ).rejects.toThrow('Failed to get user: User not found');
        });

        // Test: Invalid ObjectId format should fail
        it('should throw error for invalid ObjectId format', async () => {
            await expect(
                UserServices.getUserById('invalid-id')
            ).rejects.toThrow('Failed to get user');
        });

        // Test: Null ID should fail
        it('should throw error for null ID', async () => {
            await expect(
                UserServices.getUserById(null)
            ).rejects.toThrow('Failed to get user');
        });

        // Test: Undefined ID should fail
        it('should throw error for undefined ID', async () => {
            await expect(
                UserServices.getUserById(undefined)
            ).rejects.toThrow('Failed to get user');
        });
    });

    // Test Group: Edge cases and boundary conditions
    describe('Edge Cases', () => {
        // Test: Username with whitespace should be trimmed for lookup
        it('should handle username with leading/trailing whitespace', async () => {
            await UserServices.registerUser('  testuser  ', ['staff'], 'it', 'password123');

            // Login should work with trimmed username (database lookup trims)
            const result = await UserServices.loginUser('  testuser  ', 'password123');

            expect(result.username).toBe('  testuser  '); // Original stored username (with whitespace)
            expect(result.roles).toEqual(['staff']);
            expect(result.department).toBe('it');
        });

        // Test: Case-sensitive username matching
        it('should be case-sensitive for username matching', async () => {
            await UserServices.registerUser('TestUser', ['staff'], 'it', 'password123');

            await expect(
                UserServices.loginUser('testuser', 'password123')
            ).rejects.toThrow('Login failed: Invalid username or password');
        });

        // Test: Case-sensitive password matching
        it('should be case-sensitive for password matching', async () => {
            await UserServices.registerUser('testuser', ['staff'], 'it', 'Password123');

            await expect(
                UserServices.loginUser('testuser', 'password123')
            ).rejects.toThrow('Login failed: Invalid username or password');
        });
    });
});