import { describe, it, expect, beforeEach, vi } from 'vitest';
import { requireAuth, requireRole, requireDepartment, optionalAuth } from './auth.middleware.js';

/**
 * Authentication Middleware Tests
 * Tests the authentication middleware functions for proper access control,
 * session validation, role-based access, and department-based access
 */

describe('Authentication Middleware Tests', () => {
    let req, res, next;

    // Reset: Mock HTTP objects before each test
    beforeEach(() => {
        req = {
            session: {}
        };
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
        next = vi.fn();

        vi.clearAllMocks();
    });

    // Test Group: requireAuth middleware
    describe('requireAuth Middleware', () => {
        // Test: Authenticated user should pass through
        it('should call next() for authenticated user with valid session', () => {
            req.session = {
                authenticated: true,
                userId: 'mockid123',
                username: 'testuser',
                userRoles: ['staff'],
                userDepartment: 'it'
            };

            requireAuth(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
            expect(res.json).not.toHaveBeenCalled();
        });

        // Test: Unauthenticated user should be rejected
        it('should return 401 for unauthenticated user', () => {
            req.session = {};

            requireAuth(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Unauthorized',
                message: 'Authentication required to access this resource'
            });
            expect(next).not.toHaveBeenCalled();
        });

        // Test: Missing session should be rejected
        it('should return 401 for missing session', () => {
            req.session = null;

            requireAuth(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Unauthorized',
                message: 'Authentication required to access this resource'
            });
            expect(next).not.toHaveBeenCalled();
        });

        // Test: Session without authenticated flag should be rejected
        it('should return 401 for session without authenticated flag', () => {
            req.session = {
                userId: 'mockid123',
                username: 'testuser'
                // missing authenticated: true
            };

            requireAuth(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Unauthorized',
                message: 'Authentication required to access this resource'
            });
            expect(next).not.toHaveBeenCalled();
        });

        // Test: Session without userId should be rejected
        it('should return 401 for session without userId', () => {
            req.session = {
                authenticated: true,
                username: 'testuser'
                // missing userId
            };

            requireAuth(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Unauthorized',
                message: 'Authentication required to access this resource'
            });
            expect(next).not.toHaveBeenCalled();
        });

        // Test: Authenticated but false should be rejected
        it('should return 401 for session with authenticated: false', () => {
            req.session = {
                authenticated: false,
                userId: 'mockid123',
                username: 'testuser'
            };

            requireAuth(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Unauthorized',
                message: 'Authentication required to access this resource'
            });
            expect(next).not.toHaveBeenCalled();
        });
    });

    // Test Group: requireRole middleware
    describe('requireRole Middleware', () => {
        // Test: User with required role should pass through
        it('should call next() for user with required role', () => {
            req.session = {
                authenticated: true,
                userId: 'mockid123',
                username: 'testuser',
                userRoles: ['staff', 'manager'],
                userDepartment: 'it'
            };

            const middleware = requireRole('staff');
            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
            expect(res.json).not.toHaveBeenCalled();
        });

        // Test: User with one of multiple required roles should pass through
        it('should call next() for user with one of multiple required roles', () => {
            req.session = {
                authenticated: true,
                userId: 'mockid123',
                username: 'testuser',
                userRoles: ['staff'],
                userDepartment: 'it'
            };

            const middleware = requireRole(['staff', 'admin']);
            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
            expect(res.json).not.toHaveBeenCalled();
        });

        // Test: User without required role should be rejected
        it('should return 403 for user without required role', () => {
            req.session = {
                authenticated: true,
                userId: 'mockid123',
                username: 'testuser',
                userRoles: ['staff'],
                userDepartment: 'it'
            };

            const middleware = requireRole('admin');
            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Forbidden',
                message: 'Insufficient permissions to access this resource',
                requiredRoles: ['admin'],
                userRoles: ['staff']
            });
            expect(next).not.toHaveBeenCalled();
        });

        // Test: User without any of multiple required roles should be rejected
        it('should return 403 for user without any of multiple required roles', () => {
            req.session = {
                authenticated: true,
                userId: 'mockid123',
                username: 'testuser',
                userRoles: ['staff'],
                userDepartment: 'it'
            };

            const middleware = requireRole(['admin', 'manager']);
            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Forbidden',
                message: 'Insufficient permissions to access this resource',
                requiredRoles: ['admin', 'manager'],
                userRoles: ['staff']
            });
            expect(next).not.toHaveBeenCalled();
        });

        // Test: Unauthenticated user should be rejected
        it('should return 401 for unauthenticated user', () => {
            req.session = {};

            const middleware = requireRole('admin');
            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Unauthorized',
                message: 'Authentication required to access this resource'
            });
            expect(next).not.toHaveBeenCalled();
        });

        // Test: User with empty roles array should be rejected
        it('should return 403 for user with empty roles array', () => {
            req.session = {
                authenticated: true,
                userId: 'mockid123',
                username: 'testuser',
                userRoles: [],
                userDepartment: 'it'
            };

            const middleware = requireRole('admin');
            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Forbidden',
                message: 'Insufficient permissions to access this resource',
                requiredRoles: ['admin'],
                userRoles: []
            });
            expect(next).not.toHaveBeenCalled();
        });

        // Test: User with undefined roles should be rejected
        it('should return 403 for user with undefined roles', () => {
            req.session = {
                authenticated: true,
                userId: 'mockid123',
                username: 'testuser',
                userDepartment: 'it'
                // missing userRoles
            };

            const middleware = requireRole('admin');
            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Forbidden',
                message: 'Insufficient permissions to access this resource',
                requiredRoles: ['admin'],
                userRoles: []
            });
            expect(next).not.toHaveBeenCalled();
        });
    });

    // Test Group: requireDepartment middleware
    describe('requireDepartment Middleware', () => {
        // Test: User with required department should pass through
        it('should call next() for user with required department', () => {
            req.session = {
                authenticated: true,
                userId: 'mockid123',
                username: 'testuser',
                userRoles: ['staff'],
                userDepartment: 'it'
            };

            const middleware = requireDepartment('it');
            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
            expect(res.json).not.toHaveBeenCalled();
        });

        // Test: User with one of multiple required departments should pass through
        it('should call next() for user with one of multiple required departments', () => {
            req.session = {
                authenticated: true,
                userId: 'mockid123',
                username: 'testuser',
                userRoles: ['staff'],
                userDepartment: 'hr'
            };

            const middleware = requireDepartment(['hr', 'it']);
            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
            expect(res.json).not.toHaveBeenCalled();
        });

        // Test: User without required department should be rejected
        it('should return 403 for user without required department', () => {
            req.session = {
                authenticated: true,
                userId: 'mockid123',
                username: 'testuser',
                userRoles: ['staff'],
                userDepartment: 'it'
            };

            const middleware = requireDepartment('hr');
            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Forbidden',
                message: 'Insufficient department permissions to access this resource',
                requiredDepartments: ['hr'],
                userDepartment: 'it'
            });
            expect(next).not.toHaveBeenCalled();
        });

        // Test: User without any of multiple required departments should be rejected
        it('should return 403 for user without any of multiple required departments', () => {
            req.session = {
                authenticated: true,
                userId: 'mockid123',
                username: 'testuser',
                userRoles: ['staff'],
                userDepartment: 'sales'
            };

            const middleware = requireDepartment(['hr', 'it']);
            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Forbidden',
                message: 'Insufficient department permissions to access this resource',
                requiredDepartments: ['hr', 'it'],
                userDepartment: 'sales'
            });
            expect(next).not.toHaveBeenCalled();
        });

        // Test: Unauthenticated user should be rejected
        it('should return 401 for unauthenticated user', () => {
            req.session = {};

            const middleware = requireDepartment('it');
            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Unauthorized',
                message: 'Authentication required to access this resource'
            });
            expect(next).not.toHaveBeenCalled();
        });

        // Test: User with undefined department should be rejected
        it('should return 403 for user with undefined department', () => {
            req.session = {
                authenticated: true,
                userId: 'mockid123',
                username: 'testuser',
                userRoles: ['staff']
                // missing userDepartment
            };

            const middleware = requireDepartment('it');
            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Forbidden',
                message: 'Insufficient department permissions to access this resource',
                requiredDepartments: ['it'],
                userDepartment: undefined
            });
            expect(next).not.toHaveBeenCalled();
        });
    });

    // Test Group: optionalAuth middleware
    describe('optionalAuth Middleware', () => {
        // Test: Authenticated user should have req.user set
        it('should set req.user for authenticated user', () => {
            req.session = {
                authenticated: true,
                userId: 'mockid123',
                username: 'testuser',
                userRoles: ['staff'],
                userDepartment: 'it'
            };

            optionalAuth(req, res, next);

            expect(req.user).toBeDefined();
            expect(req.user.id).toBe('mockid123');
            expect(req.user.username).toBe('testuser');
            expect(req.user.roles).toEqual(['staff']);
            expect(req.user.department).toBe('it');
            expect(next).toHaveBeenCalled();
        });

        // Test: Unauthenticated user should not have req.user set
        it('should not set req.user for unauthenticated user', () => {
            req.session = {};

            optionalAuth(req, res, next);

            expect(req.user).toBeUndefined();
            expect(next).toHaveBeenCalled();
        });

        // Test: Missing session should not have req.user set
        it('should not set req.user for missing session', () => {
            req.session = null;

            optionalAuth(req, res, next);

            expect(req.user).toBeUndefined();
            expect(next).toHaveBeenCalled();
        });

        // Test: Session without authenticated flag should not have req.user set
        it('should not set req.user for session without authenticated flag', () => {
            req.session = {
                userId: 'mockid123',
                username: 'testuser'
                // missing authenticated: true
            };

            optionalAuth(req, res, next);

            expect(req.user).toBeUndefined();
            expect(next).toHaveBeenCalled();
        });

        // Test: Session without userId should not have req.user set
        it('should not set req.user for session without userId', () => {
            req.session = {
                authenticated: true,
                username: 'testuser'
                // missing userId
            };

            optionalAuth(req, res, next);

            expect(req.user).toBeUndefined();
            expect(next).toHaveBeenCalled();
        });

        // Test: User with multiple roles should have correct req.user
        it('should set req.user with multiple roles', () => {
            req.session = {
                authenticated: true,
                userId: 'mockid123',
                username: 'multiuser',
                userRoles: ['staff', 'manager'],
                userDepartment: 'hr'
            };

            optionalAuth(req, res, next);

            expect(req.user.roles).toEqual(['staff', 'manager']);
            expect(req.user.department).toBe('hr');
            expect(next).toHaveBeenCalled();
        });
    });

    // Test Group: Middleware chaining and edge cases
    describe('Edge Cases and Middleware Chaining', () => {
        // Test: Role middleware with empty required roles array
        it('should handle empty required roles array', () => {
            req.session = {
                authenticated: true,
                userId: 'mockid123',
                username: 'testuser',
                userRoles: ['staff'],
                userDepartment: 'it'
            };

            const middleware = requireRole([]);
            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Forbidden',
                message: 'Insufficient permissions to access this resource',
                requiredRoles: [],
                userRoles: ['staff']
            });
            expect(next).not.toHaveBeenCalled();
        });

        // Test: Department middleware with empty required departments array
        it('should handle empty required departments array', () => {
            req.session = {
                authenticated: true,
                userId: 'mockid123',
                username: 'testuser',
                userRoles: ['staff'],
                userDepartment: 'it'
            };

            const middleware = requireDepartment([]);
            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Forbidden',
                message: 'Insufficient department permissions to access this resource',
                requiredDepartments: [],
                userDepartment: 'it'
            });
            expect(next).not.toHaveBeenCalled();
        });

        // Test: Case sensitivity in role matching
        it('should be case-sensitive for role matching', () => {
            req.session = {
                authenticated: true,
                userId: 'mockid123',
                username: 'testuser',
                userRoles: ['Staff'], // Capital S
                userDepartment: 'it'
            };

            const middleware = requireRole('staff'); // lowercase s
            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Forbidden',
                message: 'Insufficient permissions to access this resource',
                requiredRoles: ['staff'],
                userRoles: ['Staff']
            });
            expect(next).not.toHaveBeenCalled();
        });

        // Test: Case sensitivity in department matching
        it('should be case-sensitive for department matching', () => {
            req.session = {
                authenticated: true,
                userId: 'mockid123',
                username: 'testuser',
                userRoles: ['staff'],
                userDepartment: 'IT' // Capital letters
            };

            const middleware = requireDepartment('it'); // lowercase
            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Forbidden',
                message: 'Insufficient department permissions to access this resource',
                requiredDepartments: ['it'],
                userDepartment: 'IT'
            });
            expect(next).not.toHaveBeenCalled();
        });
    });
});
