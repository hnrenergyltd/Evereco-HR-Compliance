import { query } from './src/config/database.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

async function checkEmployeeLogin() {
  try {
    console.log('🔍 CHECKING EMPLOYEE LOGIN FLOW\n');

    // Check what's in the users table for the employee
    console.log('1️⃣  Checking user data in database:');
    const userResult = await query(
      'SELECT rowid as id, email, name, role, employee_id, password_hash FROM users WHERE email = ?',
      ['sardar@everecoenergy.com']
    );
    const users = userResult.rows || userResult;

    if (users.length === 0) {
      console.log('❌ Employee user not found!');
      process.exit(0);
    }

    const user = users[0];
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.name}`);
    console.log(`Role: ${user.role}`);
    console.log(`Employee ID: ${user.employee_id}`);
    console.log(`Password Hash: ${user.password_hash.substring(0, 30)}...`);

    // Test login with password
    console.log('\n2️⃣  Testing password verification:');
    const testPassword = 'Evereco@2024';
    const passwordMatch = await bcrypt.compare(testPassword, user.password_hash);
    console.log(`Password matches: ${passwordMatch ? '✅ YES' : '❌ NO'}`);

    if (!passwordMatch) {
      console.log('❌ Password does not match!');
      process.exit(0);
    }

    // Simulate login response
    console.log('\n3️⃣  Simulating JWT token creation:');
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, employee_id: user.employee_id },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' }
    );

    const decoded = jwt.decode(token);
    console.log('JWT Payload:');
    console.log(`  id: ${decoded.id}`);
    console.log(`  email: ${decoded.email}`);
    console.log(`  role: ${decoded.role}`);
    console.log(`  employee_id: ${decoded.employee_id}`);

    // Check the response that would be sent
    console.log('\n4️⃣  Login response would be:');
    const response = {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        employee_id: user.employee_id,
      },
    };
    console.log(JSON.stringify(response.user, null, 2));

    console.log('\n✅ Everything looks correct!');
    console.log('\n💡 What should appear in localStorage:');
    console.log(`{`);
    console.log(`  "id": ${response.user.id},`);
    console.log(`  "email": "${response.user.email}",`);
    console.log(`  "role": "${response.user.role}",`);
    console.log(`  "name": "${response.user.name}",`);
    console.log(`  "employee_id": ${response.user.employee_id}`);
    console.log(`}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
}

checkEmployeeLogin();
