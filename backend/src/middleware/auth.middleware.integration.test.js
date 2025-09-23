// Integration tests for session cookies and requireRole protected routes

import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import session from 'express-session';
import request from 'supertest';
import { requireAuth, requireRole } from './auth.middleware.js';

// Helper to build a minimal app for testing
function buildTestApp() {
	const app = express();
	app.use(express.json());

	app.use(session({
		secret: 'test-secret',
		resave: false,
		saveUninitialized: false,
		cookie: {
			secure: false,
			httpOnly: true,
			maxAge: 60 * 1000
		}
	}));

	// Test login endpoint to seed session
	app.post('/login', (req, res) => {
		const { userId = 'u1', username = 'user', roles = ['staff'] } = req.body || {};
		req.session.userId = userId;
		req.session.username = username;
		req.session.userRoles = roles;
		req.session.userDepartment = req.body?.department || 'it';
		req.session.authenticated = true;
		res.json({ ok: true });
	});

	// Test logout endpoint
	app.post('/logout', (req, res) => {
		req.session.destroy(() => {
			res.clearCookie('connect.sid');
			res.json({ ok: true });
		});
	});

	// Protected routes
	app.get('/protected', requireAuth, (req, res) => {
		res.json({ message: 'protected', user: { id: req.session.userId, roles: req.session.userRoles } });
	});

	app.get('/admin', requireAuth, requireRole('admin'), (req, res) => {
		res.json({ message: 'admin ok' });
	});

	app.get('/manager-or-admin', requireAuth, requireRole(['manager', 'admin']), (req, res) => {
		res.json({ message: 'manager or admin ok' });
	});

	return app;
}

describe('Session + requireRole integration', () => {
	let app;
	let agent;

	beforeEach(() => {
		app = buildTestApp();
		agent = request.agent(app);
	});

	it('rejects unauthenticated access with 401', async () => {
		const res = await agent.get('/protected').expect(401);
		expect(res.body.error).toBe('Unauthorized');
	});

	it('allows access to protected after login (session cookie persisted)', async () => {
		await agent.post('/login').send({ userId: 'u-staff', username: 'staff1', roles: ['staff'] }).expect(200);
		const res = await agent.get('/protected').expect(200);
		expect(res.body.user.id).toBe('u-staff');
		expect(res.body.user.roles).toEqual(['staff']);
	});

	it('returns 403 for admin route when logged in as staff', async () => {
		await agent.post('/login').send({ roles: ['staff'] }).expect(200);
		const res = await agent.get('/admin').expect(403);
		expect(res.body.error).toBe('Forbidden');
		expect(res.body.requiredRoles).toEqual(['admin']);
		expect(res.body.userRoles).toEqual(['staff']);
	});

	it('allows admin to access /admin route', async () => {
		await agent.post('/login').send({ roles: ['admin'] }).expect(200);
		await agent.get('/admin').expect(200);
	});

	it('allows manager or admin to access combined route', async () => {
		await agent.post('/login').send({ roles: ['manager'] }).expect(200);
		await agent.get('/manager-or-admin').expect(200);
	});

	it('separates sessions between different agents', async () => {
		const agent2 = request.agent(app);
		await agent.post('/login').send({ userId: 'u1', roles: ['staff'] }).expect(200);
		await agent2.post('/login').send({ userId: 'u2', roles: ['admin'] }).expect(200);

		const r1 = await agent.get('/protected').expect(200);
		const r2 = await agent2.get('/admin').expect(200);
		expect(r1.body.user.id).toBe('u1');
		expect(r2.body.message).toBe('admin ok');
	});

	it('clears session on logout and blocks afterwards', async () => {
		await agent.post('/login').send({ roles: ['admin'] }).expect(200);
		await agent.get('/admin').expect(200);
		await agent.post('/logout').expect(200);
		await agent.get('/protected').expect(401);
	});
});
