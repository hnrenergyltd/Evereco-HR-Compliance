import { query } from './src/config/database.js';

async function cleanupDuplicates() {
  try {
    console.log('🧹 CLEANING UP DUPLICATE EMPLOYEES\n');

    // Find employees with NULL emails (these are test duplicates)
    const result = await query('SELECT rowid as id FROM employees WHERE email IS NULL ORDER BY rowid');
    const duplicates = result.rows || result;

    if (duplicates.length === 0) {
      console.log('✅ No duplicate employees found. Database is clean!\n');
      process.exit(0);
    }

    console.log(`Found ${duplicates.length} duplicate employee records (NULL emails):\n`);

    // Delete the duplicates and their related data
    const dupIds = duplicates.map(d => d.id);
    const placeholders = dupIds.map(() => '?').join(',');

    console.log('Deleting related records...');
    await query(`DELETE FROM attendance_records WHERE employee_id IN (${placeholders})`, dupIds);
    await query(`DELETE FROM absence_records WHERE employee_id IN (${placeholders})`, dupIds);
    await query(`DELETE FROM documents WHERE employee_id IN (${placeholders})`, dupIds);
    await query(`DELETE FROM emergency_contacts WHERE employee_id IN (${placeholders})`, dupIds);
    await query(`DELETE FROM sponsorship_records WHERE employee_id IN (${placeholders})`, dupIds);
    await query(`DELETE FROM salary_history WHERE employee_id IN (${placeholders})`, dupIds);
    await query(`DELETE FROM employment_history WHERE employee_id IN (${placeholders})`, dupIds);

    console.log('Deleting duplicate employee records...');
    await query(`DELETE FROM employees WHERE email IS NULL`);

    console.log(`\n✅ Deleted ${dupIds.length} duplicate employee records!\n`);

    // Verify
    const finalResult = await query('SELECT COUNT(*) as count FROM employees');
    const finalCount = finalResult.rows ? finalResult.rows[0].count : finalResult[0].count;
    console.log(`📊 Final employee count: ${finalCount}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
}

cleanupDuplicates();
