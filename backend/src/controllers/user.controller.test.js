/**
 * Controller Layer Tests for User Account Creation
 * Tests HTTP request/response handling, status codes, error handling,
 * and proper delegation to service layer using mocked dependencies
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import userController from './user.controller.js';
import UserServices from '../services/user.services.js';

let registerSpy, loginSpy, getByIdSpy;

describe('User Controller - User Account Creation', () => {
	let mongoServer;
	let req, res, next;

	beforeAll(async () => {
		// Setup: Use the shared MongoDB connection from global test setup
		// Connection is already established by global test setup
		if (mongoose.connection.readyState !== 1) {
			throw new Error('Database connection not ready');
		}
	});

	afterAll(async () => {
		// Cleanup is handled by global test setup
	});

	beforeEach(() => {
		req = { 
			body: {},
			session: {
				save: vi.fn((callback) => callback(null))  // ✅ Mock the save method
			}
		};
		res = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn()
		};
		next = vi.fn();
	
		vi.clearAllMocks();
		registerSpy = vi.spyOn(UserServices, 'registerUser');
		loginSpy = vi.spyOn(UserServices, 'loginUser');
		getByIdSpy = vi.spyOn(UserServices, 'getUserById');
	});

	describe('Happy Path Tests', () => {
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

			registerSpy.mockResolvedValue(mockUser);

			await userController.register(req, res, next);

			expect(registerSpy).toHaveBeenCalledWith('testuser', ['staff'], 'it', 'plainpassword123');
			expect(res.status).toHaveBeenCalledWith(201);
			expect(res.json).toHaveBeenCalledWith({
				message: 'User registered successfully',
				data: mockUser
			});
		});

		it('should handle admin role creation', async () => {
			const mockUser = { username: 'admin1', roles: ['admin'], department: 'it' };
			req.body = { username: 'admin1', roles: ['admin'], department: 'it', hashed_password: 'adminpassword' };
			registerSpy.mockResolvedValue(mockUser);
			await userController.register(req, res, next);
			expect(res.status).toHaveBeenCalledWith(201);
			expect(res.json).toHaveBeenCalledWith({ message: 'User registered successfully', data: mockUser });
		});
	});

	describe('Negative Path Tests - Validation Errors (400)', () => {
		it('should return 500 when username is empty', async () => {
			req.body = { username: '', roles: ['staff'], department: 'it', hashed_password: 'password123' };
			registerSpy.mockRejectedValue(new Error('Failed to register user: username is required'));
			await userController.register(req, res, next);
			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.json).toHaveBeenCalledWith({ message: 'Error registering user', error: 'Failed to register user: username is required' });
		});

		it('should return 500 when password is empty', async () => {
			req.body = { username: 'testuser', roles: ['staff'], department: 'it', hashed_password: '' };
			registerSpy.mockRejectedValue(new Error('Failed to register user: hashed_password is required'));
			await userController.register(req, res, next);
			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.json).toHaveBeenCalledWith({ message: 'Error registering user', error: 'Failed to register user: hashed_password is required' });
		});

		it('should return 500 when roles array is empty', async () => {
			req.body = { username: 'testuser', roles: [], department: 'it', hashed_password: 'password123' };
			registerSpy.mockRejectedValue(new Error('Failed to register user: roles is required'));
			await userController.register(req, res, next);
			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.json).toHaveBeenCalledWith({ message: 'Error registering user', error: 'Failed to register user: roles is required' });
		});

		it('should return 500 for invalid data format', async () => {
			req.body = { username: 123, roles: ['staff'], department: 'it', hashed_password: 'password123' };
			registerSpy.mockRejectedValue(new Error('Failed to register user: username must be a string'));
			await userController.register(req, res, next);
			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.json).toHaveBeenCalledWith({ message: 'Error registering user', error: 'Failed to register user: username must be a string' });
		});
	});
});

describe('User Controller - User Authentication', () => {
	let mongoServer;
	let req, res, next;

	beforeAll(async () => {
		// Setup: Use the shared MongoDB connection from global test setup
		// Connection is already established by global test setup
		if (mongoose.connection.readyState !== 1) {
			throw new Error('Database connection not ready');
		}
	});

	afterAll(async () => {
		// Cleanup is handled by global test setup
	});

	beforeEach(() => {
		req = { 
			body: {}, 
			session: {
				save: vi.fn((callback) => callback(null))  // ✅ Add the save method
			}
		};
		res = { 
			status: vi.fn().mockReturnThis(), 
			json: vi.fn(), 
			clearCookie: vi.fn() 
		};
		next = vi.fn();
		vi.clearAllMocks();
		loginSpy = vi.spyOn(UserServices, 'loginUser');
		getByIdSpy = vi.spyOn(UserServices, 'getUserById');
	});

	describe('Happy Path Tests - Login', () => {
		it('should return 200 and set session for valid login', async () => {
			const mockUser = { id: 'mockid123', username: 'testuser', roles: ['staff'], department: 'it' };
			req.body = { username: 'testuser', password: 'password123' };
			loginSpy.mockResolvedValue(mockUser);
			await userController.login(req, res, next);
			expect(loginSpy).toHaveBeenCalledWith('testuser', 'password123');
			expect(req.session.userId).toBe('mockid123');
			expect(req.session.username).toBe('testuser');
			expect(req.session.userRoles).toEqual(['staff']);
			expect(req.session.userDepartment).toBe('it');
			expect(req.session.authenticated).toBe(true);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({ message: 'Login successful', user: mockUser });
		});
	});

	describe('Negative Path Tests - Login Validation Errors (400)', () => {
		it('should return 400 when username is missing', async () => {
			req.body = { password: 'password123' };
			await userController.login(req, res, next);
			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.json).toHaveBeenCalledWith({ message: 'Username and password are required' });
			expect(loginSpy).not.toHaveBeenCalled();
		});
	});

	describe('Happy Path Tests - Logout', () => {
		it('should return 200 and destroy session for valid logout', async () => {
			req.session = { destroy: vi.fn((cb) => cb(null)) };
			await userController.logout(req, res, next);
			expect(req.session.destroy).toHaveBeenCalled();
			expect(res.clearCookie).toHaveBeenCalledWith('connect.sid');
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({ message: 'Logout successful' });
		});
	});

	describe('Happy Path Tests - Get Profile', () => {
		it('should return 200 and user profile for authenticated user', async () => {
			req.session = { authenticated: true, userId: 'mockid123', username: 'testuser', userRoles: ['staff'], userDepartment: 'it' };
			await userController.getProfile(req, res, next);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({ user: { id: 'mockid123', username: 'testuser', roles: ['staff'], department: 'it' } });
		});
	});
});