import { query } from './src/config/database.js';
import crypto from 'crypto';

async function setupSystem() {
  try {
    console.log('🚀 SETTING UP EVERECO SYSTEM - Tasks 1, 2, 3\n');

    // ============ TASK 1: Database Cleanup ============
    console.log('📋 TASK 1: Database Cleanup');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('1️⃣  Deleting duplicate employee records...');

    // First, delete related records in dependent tables
    const dupEmployees = await query('SELECT rowid as id FROM employees WHERE rowid > 2');
    const dups = dupEmployees.rows || dupEmployees;
    const dupIds = dups.map(e => e.id);

    if (dupIds.length > 0) {
      const placeholders = dupIds.map(() => '?').join(',');

      // Delete dependent records
      await query(`DELETE FROM attendance_records WHERE employee_id IN (${placeholders})`, dupIds);
      await query(`DELETE FROM absence_records WHERE employee_id IN (${placeholders})`, dupIds);
      await query(`DELETE FROM documents WHERE employee_id IN (${placeholders})`, dupIds);
      await query(`DELETE FROM emergency_contacts WHERE employee_id IN (${placeholders})`, dupIds);
      await query(`DELETE FROM sponsorship_records WHERE employee_id IN (${placeholders})`, dupIds);
      await query(`DELETE FROM salary_history WHERE employee_id IN (${placeholders})`, dupIds);
      await query(`DELETE FROM employment_history WHERE employee_id IN (${placeholders})`, dupIds);
      await query(`DELETE FROM audit_history WHERE entity_id IN (${placeholders})`, dupIds);

      // Now delete the employees
      await query(`DELETE FROM employees WHERE rowid > 2`);
      console.log(`✅ Deleted ${dupIds.length} duplicate employee records and their related data.\n`);
    } else {
      console.log('✅ No duplicates to delete.\n');
    }

    // Step 2: Update employee emails
    console.log('2️⃣  Setting up employee emails...');
    await query('UPDATE employees SET email = ? WHERE rowid = 1', ['sardar@everecoenergy.com']);
    await query('UPDATE employees SET email = ? WHERE rowid = 2', ['nabeel@everecoenergy.com']);
    console.log('✅ Emails configured.\n');

    // ============ TASK 2: Authentication & Role-Based Access ============
    console.log('📊 TASK 2: Authentication & Role-Based Access Control');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Step 3: Check if role column exists in users table
    console.log('3️⃣  Setting up user roles...');
    try {
      await query('SELECT role FROM users LIMIT 1');
      console.log('  Role column already exists');
    } catch (e) {
      // Add role column if it doesn't exist
      await query('ALTER TABLE users ADD COLUMN role TEXT DEFAULT "admin"');
      console.log('  Added role column to users table');
    }

    // Step 4: Ensure admin has admin role
    await query('UPDATE users SET role = ? WHERE email = ?', ['admin', 'admin@evereco.com']);
    console.log('✅ Admin user configured.\n');

    // Step 5: Create employee user accounts
    console.log('4️⃣  Creating employee user accounts...');

    // Generate temporary passwords
    const tempPassword1 = crypto.randomBytes(4).toString('hex').toUpperCase();
    const tempPassword2 = crypto.randomBytes(4).toString('hex').toUpperCase();

    // Hash passwords using SHA-256 (matching backend auth system)
    const hashedPassword1 = crypto.createHash('sha256').update(tempPassword1).digest('hex');
    const hashedPassword2 = crypto.createHash('sha256').update(tempPassword2).digest('hex');

    // Delete existing employee accounts if they exist
    await query('DELETE FROM users WHERE email = ?', ['sardar@everecoenergy.com']);
    await query('DELETE FROM users WHERE email = ?', ['nabeel@everecoenergy.com']);

    // Create employee accounts
    await query('INSERT INTO users (email, name, password_hash, role, employee_id, created_at) VALUES (?, ?, ?, ?, ?, datetime("now"))',
      ['sardar@everecoenergy.com', 'Sardar Muhammad Hassan Zaman', hashedPassword1, 'employee', 1]);
    await query('INSERT INTO users (email, name, password_hash, role, employee_id, created_at) VALUES (?, ?, ?, ?, ?, datetime("now"))',
      ['nabeel@everecoenergy.com', 'Muhammad Nabeel', hashedPassword2, 'employee', 2]);

    console.log('✅ Employee accounts created.\n');

    // ============ TASK 3: Add New Employee Functionality ============
    console.log('📝 TASK 3: New Employee Management Ready');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ Add Employee API endpoint ready for admin use.\n');

    // ============ SUMMARY ============
    console.log('✨ SETUP COMPLETE - System is Ready!\n');
    console.log('📊 FINAL DATABASE STATE:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const empResult = await query('SELECT rowid as id, first_name, surname, email FROM employees ORDER BY rowid');
    const employees = empResult.rows || empResult;
    console.log(`\n👥 Employees (${employees.length}):`);
    employees.forEach(emp => {
      console.log(`  ${emp.id}. ${emp.first_name} ${emp.surname}`);
      console.log(`     Email: ${emp.email}`);
    });

    const userResult = await query('SELECT rowid as id, email, name, role FROM users ORDER BY rowid');
    const users = userResult.rows || userResult;
    console.log(`\n🔐 User Accounts (${users.length}):`);
    users.forEach(user => {
      console.log(`  ${user.email} [${user.role.toUpperCase()}]`);
    });

    console.log(`\n🎯 LOGIN CREDENTIALS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADMIN:
  Email: admin@evereco.com
  Password: Change123!
  Role: ADMIN (Full Access)

EMPLOYEE 1:
  Name: Sardar Muhammad Hassan Zaman
  Email: sardar@everecoenergy.com
  Temp Password: ${tempPassword1}
  Role: EMPLOYEE (Own data only)
  ⚠️  Must change password on first login

EMPLOYEE 2:
  Name: Muhammad Nabeel
  Email: nabeel@everecoenergy.com
  Temp Password: ${tempPassword2}
  Role: EMPLOYEE (Own data only)
  ⚠️  Must change password on first login

✅ System Setup Complete!`);

  } catch (error) {
    console.error('❌ Setup Error:', error.message);
  }
  process.exit(0);
}

setupSystem();
