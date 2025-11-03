import { connectToTestDB } from './reports-db-helpers.js';
import User from '../../backend/src/models/user.model.js';
import bcrypt from 'bcryptjs';

async function testUserPasswords() {
  await connectToTestDB();
  
  const users = await User.find({ email: /^e2e-reports/ });
  console.log('Found users:', users.length);
  console.log('');
  
  for (const u of users) {
    console.log('Email:', u.email);
    console.log('Dept:', u.dept);
    console.log('Role:', u.role);
    console.log('Password hash exists:', !!u.password);
    console.log('Password hash length:', u.password ? u.password.length : 0);
    
    const isValid = await bcrypt.compare('password123', u.password);
    console.log('Password "password123" valid:', isValid);
    console.log('');
  }
  
  process.exit(0);
}

testUserPasswords().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
