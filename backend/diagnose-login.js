import { query } from './src/config/database.js';
import crypto from 'crypto';

async function diagnoseLogin() {
  try {
    console.log('🔍 DIAGNOSING LOGIN ISSUE\n');

    // Check all users in database
    console.log('1️⃣  Checking all users in database:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const userResult = await query('SELECT rowid as id, email, name, password_hash, role, employee_id FROM users ORDER BY rowid');
    const users = userResult.rows || userResult;

    if (users.length === 0) {
      console.log('❌ No users found in database!\n');
    } else {
      users.forEach(user => {
        console.log(`ID: ${user.id}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Name: ${user.name}`);
        console.log(`  Role: ${user.role}`);
        console.log(`  Employee ID: ${user.employee_id}`);
        console.log(`  Password Hash: ${user.password_hash ? user.password_hash.substring(0, 20) + '...' : 'NULL'}`);
        console.log('');
      });
    }

    // Check employees
    console.log('2️⃣  Checking employees in database:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const empResult = await query('SELECT rowid as id, first_name, surname, email FROM employees ORDER BY rowid');
    const employees = empResult.rows || empResult;

    employees.forEach(emp => {
      console.log(`ID: ${emp.id} - ${emp.first_name} ${emp.surname} (${emp.email})`);
    });

    console.log('\n3️⃣  Testing password hashing:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const testPassword = '31350B93';
    const hashedTest = crypto.createHash('sha256').update(testPassword).digest('hex');
    console.log(`Test password: ${testPassword}`);
    console.log(`Hashed version: ${hashedTest}`);
    console.log(`Length: ${hashedTest.length} characters`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
}

diagnoseLogin();
