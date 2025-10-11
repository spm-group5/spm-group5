import { describe, it, test, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import userModel from './user.model.js';

/**
 * Model Layer Tests for User Account Creation
 * Tests Mongoose schema validation, constraints, data types, enums,
 * pre-save hooks, and database-level validations
 */

// Using Vitest globals - no need to import describe, it, expect, beforeAll, afterAll, beforeEach

describe('User Model - User Account Creation Validation', () => {
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

    // Test Group: Successful schema validation and document creation
    describe('Happy Path Tests', () => {
        // Test: Valid user data should pass schema validation and trigger password hashing
        it('should create user with valid data and hash password', async () => {
            const userData = {
                username: 'testuser',
                roles: ['staff'],
                department: 'it',
                hashed_password: 'plainpassword123'
            };

            const user = new userModel(userData);
            const savedUser = await user.save();

            expect(savedUser.username).toBe(userData.username);
            expect(savedUser.roles).toEqual(userData.roles);
            expect(savedUser.department).toBe(userData.department);
            expect(savedUser.hashed_password).not.toBe(userData.hashed_password);
            expect(savedUser.hashed_password).toMatch(/^\$2[aby]\$/);
        });

        // Test: Manager role should pass enum validation
        it('should create user with manager role', async () => {
            const userData = {
                username: 'manager1',
                roles: ['manager'],
                department: 'sales',
                hashed_password: 'managerpass123'
            };

            const user = new userModel(userData);
            const savedUser = await user.save();

            expect(savedUser.roles).toEqual(['manager']);
        });

        // Test: Admin role should pass enum validation
        it('should create user with admin role', async () => {
            const userData = {
                username: 'admin1',
                roles: ['admin'],
                department: 'it',
                hashed_password: 'adminpass123'
            };

            const user = new userModel(userData);
            const savedUser = await user.save();

            expect(savedUser.roles).toEqual(['admin']);
        });

        // Test: Multiple valid roles should pass array validation
        it('should create user with multiple valid roles', async () => {
            const userData = {
                username: 'multiuser',
                roles: ['staff', 'manager'],
                department: 'it',
                hashed_password: 'password123'
            };

            const user = new userModel(userData);
            const savedUser = await user.save();

            expect(savedUser.roles).toEqual(['staff', 'manager']);
        });

        // Test: Valid department enum should be accepted
        it('should create user with valid department enum', async () => {
            const userData = {
                username: 'testuser',
                roles: ['staff'],
                department: 'finance',
                hashed_password: 'password123'
            };

            const user = new userModel(userData);
            const savedUser = await user.save();

            expect(savedUser.department).toBe('finance');
        });

        // Test: All valid department enums should be accepted
        it('should create user with all valid department enums', async () => {
            const departments = ['hr','it','sales','consultancy','systems','engineering','finance','managing director'];

            for (let i = 0; i < departments.length; i++) {
                const userData = {
                    username: `testuser${i}`,
                    roles: ['staff'],
                    department: departments[i],
                    hashed_password: 'password123'
                };

                const user = new userModel(userData);
                const savedUser = await user.save();

                expect(savedUser.department).toBe(departments[i]);
            }
        });
    });

    // Test Group: Schema required field constraint violations
    describe('Negative Path Tests - Required Field Validation', () => {
        // Test: Missing username should fail required validation
        it('should throw error when username is missing', async () => {
            const userData = {
                roles: ['staff'],
                department: 'it',
                hashed_password: 'password123'
            };

            const user = new userModel(userData);

            await expect(user.save()).rejects.toThrow();
        });

        // Test: Empty username should fail required validation
        it('should throw error when username is empty string', async () => {
            const userData = {
                username: '',
                roles: ['staff'],
                department: 'it',
                hashed_password: 'password123'
            };

            const user = new userModel(userData);

            await expect(user.save()).rejects.toThrow();
        });

        // Test: Missing password should fail required validation
        it('should throw error when password is missing', async () => {
            const userData = {
                username: 'testuser',
                roles: ['staff'],
                department: 'it'
            };

            const user = new userModel(userData);

            await expect(user.save()).rejects.toThrow();
        });

        // Test: Empty password should fail required validation
        it('should throw error when password is empty string', async () => {
            const userData = {
                username: 'testuser',
                roles: ['staff'],
                department: 'it',
                hashed_password: ''
            };

            const user = new userModel(userData);

            await expect(user.save()).rejects.toThrow();
        });

        // Test: Missing roles should fail required validation
        it('should throw error when roles is missing', async () => {
            const userData = {
                username: 'testuser',
                department: 'it',
                hashed_password: 'password123'
            };

            const user = new userModel(userData);

            await expect(user.save()).rejects.toThrow();
        });

        // Test: Empty roles array should fail required validation
        it('should throw error when roles array is empty', async () => {
            const userData = {
                username: 'testuser',
                roles: [],
                department: 'it',
                hashed_password: 'password123'
            };

            const user = new userModel(userData);

            await expect(user.save()).rejects.toThrow();
        });

        // Test: Missing department should fail required validation
        it('should throw error when department is missing', async () => {
            const userData = {
                username: 'testuser',
                roles: ['staff'],
                hashed_password: 'password123'
            };

            const user = new userModel(userData);

            await expect(user.save()).rejects.toThrow();
        });

        // Test: Empty department should fail required validation
        it('should throw error when department is empty string', async () => {
            const userData = {
                username: 'testuser',
                roles: ['staff'],
                department: '',
                hashed_password: 'password123'
            };

            const user = new userModel(userData);

            await expect(user.save()).rejects.toThrow();
        });
    });

    // Test Group: Schema enum constraint violations
    describe('Negative Path Tests - Enum Validation', () => {
        // Test: Invalid role value should fail enum validation
        it('should throw error for invalid role not in enum', async () => {
            const userData = {
                username: 'testuser',
                roles: ['invalidrole'],
                department: 'it',
                hashed_password: 'password123'
            };

            const user = new userModel(userData);

            await expect(user.save()).rejects.toThrow();
        });

        // Test: Multiple invalid roles should fail enum validation
        it('should throw error for multiple invalid roles', async () => {
            const userData = {
                username: 'testuser',
                roles: ['user', 'superuser'],
                department: 'it',
                hashed_password: 'password123'
            };

            const user = new userModel(userData);

            await expect(user.save()).rejects.toThrow();
        });

        // Test: Mixed valid/invalid roles should fail enum validation
        it('should throw error for mixed valid and invalid roles', async () => {
            const userData = {
                username: 'testuser',
                roles: ['staff', 'invalidrole'],
                department: 'it',
                hashed_password: 'password123'
            };

            const user = new userModel(userData);

            await expect(user.save()).rejects.toThrow();
        });

        // Test: Case-sensitive role mismatch should fail enum validation
        it('should throw error for case-sensitive invalid role', async () => {
            const userData = {
                username: 'testuser',
                roles: ['STAFF'], // should be lowercase
                department: 'it',
                hashed_password: 'password123'
            };

            const user = new userModel(userData);

            await expect(user.save()).rejects.toThrow();
        });

        // Test: Invalid department value should fail enum validation
        it('should throw error for invalid department not in enum', async () => {
            const userData = {
                username: 'testuser',
                roles: ['staff'],
                department: 'invalidDept',
                hashed_password: 'password123'
            };

            const user = new userModel(userData);

            await expect(user.save()).rejects.toThrow();
        });

        // Test: Case-sensitive department mismatch should fail enum validation
        it('should throw error for case-sensitive invalid department', async () => {
            const userData = {
                username: 'testuser',
                roles: ['staff'],
                department: 'IT', // should be lowercase
                hashed_password: 'password123'
            };

            const user = new userModel(userData);

            await expect(user.save()).rejects.toThrow();
        });
    });

    // Test Group: Database unique constraint violations
    describe('Negative Path Tests - Unique Constraint', () => {
        // Test: Duplicate username should fail unique constraint
        it('should throw error when username already exists', async () => {
            const firstUserData = {
                username: 'duplicateuser',
                roles: ['staff'],
                department: 'it',
                hashed_password: 'password123'
            };

            const firstUser = new userModel(firstUserData);
            await firstUser.save();

            const duplicateUserData = {
                username: 'duplicateuser',
                roles: ['manager'],
                department: 'sales',
                hashed_password: 'differentpassword'
            };

            const duplicateUser = new userModel(duplicateUserData);

            await expect(duplicateUser.save()).rejects.toThrow();
        });

        // Test: Case-sensitive duplicate should fail unique constraint
        it('should throw error for case-sensitive duplicate username', async () => {
            const firstUserData = {
                username: 'TestUser',
                roles: ['staff'],
                department: 'it',
                hashed_password: 'password123'
            };

            const firstUser = new userModel(firstUserData);
            await firstUser.save();

            const duplicateUserData = {
                username: 'TestUser',
                roles: ['admin'],
                department: 'HR',
                hashed_password: 'password456'
            };

            const duplicateUser = new userModel(duplicateUserData);

            await expect(duplicateUser.save()).rejects.toThrow();
        });
    });

    // Test Group: Pre-save hook functionality and password hashing
    describe('Password Hashing Pre-save Hook', () => {
        // Test: Pre-save hook should hash password with bcrypt
        it('should hash password before saving', async () => {
            const plainPassword = 'myplainpassword123';
            const userData = {
                username: 'testuser',
                roles: ['staff'],
                department: 'it',
                hashed_password: plainPassword
            };

            const user = new userModel(userData);
            const savedUser = await user.save();

            expect(savedUser.hashed_password).not.toBe(plainPassword);
            expect(savedUser.hashed_password).toMatch(/^\$2[aby]\$/);
            expect(savedUser.hashed_password.length).toBeGreaterThan(50);
        });

        // Test: Salt should generate unique hashes for identical passwords
        it('should generate different hashes for same password', async () => {
            const plainPassword = 'samepassword123';

            const user1Data = {
                username: 'user1',
                roles: ['staff'],
                department: 'it',
                hashed_password: plainPassword
            };

            const user2Data = {
                username: 'user2',
                roles: ['staff'],
                department: 'it',
                hashed_password: plainPassword
            };

            const user1 = new userModel(user1Data);
            const user2 = new userModel(user2Data);

            const savedUser1 = await user1.save();
            const savedUser2 = await user2.save();

            expect(savedUser1.hashed_password).not.toBe(savedUser2.hashed_password);
            expect(savedUser1.hashed_password).not.toBe(plainPassword);
            expect(savedUser2.hashed_password).not.toBe(plainPassword);
        });
    });
});