import { query } from './src/config/database.js';

async function checkDatabase() {
  try {
    console.log('🔍 CURRENT DATABASE STATE\n');

    // Check employees
    const empResult = await query('SELECT rowid as id, first_name, surname, email, employment_status FROM employees ORDER BY rowid');
    const employees = empResult.rows || empResult;
    console.log(`📊 Total Employees: ${employees.length}`);
    if (employees.length > 0) {
      console.log('Employees:');
      employees.forEach(emp => {
        console.log(`  ${emp.id}. ${emp.first_name} ${emp.surname} (${emp.email || 'No email'}) - Status: ${emp.employment_status}`);
      });
    }

    // Check users
    const userResult = await query('SELECT rowid as id, email, role FROM users');
    const users = userResult.rows || userResult;
    console.log(`\n👥 Total Users: ${users.length}`);
    if (users.length > 0) {
      console.log('Users:');
      users.forEach(user => {
        console.log(`  ${user.id}. ${user.email} - Role: ${user.role || 'ADMIN'}`);
      });
    }

    // Check for duplicates
    const dupResult = await query(`
      SELECT first_name, surname, COUNT(*) as count
      FROM employees
      GROUP BY first_name, surname
      HAVING count > 1
    `);
    const duplicates = dupResult.rows || dupResult;

    if (duplicates.length > 0) {
      console.log(`\n⚠️  Duplicate Employees Found:`);
      duplicates.forEach(dup => {
        console.log(`  ${dup.first_name} ${dup.surname}: ${dup.count} records`);
      });
    } else {
      console.log(`\n✅ No duplicates found`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
}

checkDatabase();
