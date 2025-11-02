import User from '../../models/user.model.js';

export async function createTestUser(overrides = {}) {
  const defaultUser = {
    username: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`,
    roles: ['staff'],
    department: 'it',
    hashed_password: 'password123'
  };

  const userData = { ...defaultUser, ...overrides };
  const user = await User.create(userData);

  return {
    ...user.toObject(),
    password: userData.hashed_password
  };
}

export async function authenticateAs(agent, user) {
  const password = user.password || 'password123';

  const response = await agent
    .post('/api/login')
    .send({
      username: user.username,
      password: password
    });

  if (response.status !== 200) {
    throw new Error(
      `Authentication failed for user ${user.username}: ${response.status} - ${response.body.message || 'Unknown error'}`
    );
  }

  return response.body.user || response.body.data;
}

export async function createAndAuthenticateUser(agent, userData = {}) {
  const user = await createTestUser(userData);
  await authenticateAs(agent, user);
  return user;
}
