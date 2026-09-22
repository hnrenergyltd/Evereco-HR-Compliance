import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./evereco_dev.db');

const duplicateIds = [97, 98];

console.log('🧹 Cleaning up duplicate employees...\n');

db.serialize(() => {
  for (const empId of duplicateIds) {
    console.log(`Deleting employee ID ${empId}...`);
    
    // Delete related records first
    db.run('DELETE FROM attendance_records WHERE employee_id = ?', [empId], (err) => {
      if (!err) console.log(`  ✓ Deleted attendance records`);
    });
    
    db.run('DELETE FROM absence_records WHERE employee_id = ?', [empId], (err) => {
      if (!err) console.log(`  ✓ Deleted absence records`);
    });
    
    db.run('DELETE FROM documents WHERE employee_id = ?', [empId], (err) => {
      if (!err) console.log(`  ✓ Deleted documents`);
    });
    
    db.run('DELETE FROM sponsorship_records WHERE employee_id = ?', [empId], (err) => {
      if (!err) console.log(`  ✓ Deleted sponsorship records`);
    });
    
    db.run('DELETE FROM salary_history WHERE employee_id = ?', [empId], (err) => {
      if (!err) console.log(`  ✓ Deleted salary history`);
    });
    
    db.run('DELETE FROM employment_history WHERE employee_id = ?', [empId], (err) => {
      if (!err) console.log(`  ✓ Deleted employment history`);
    });
    
    db.run('DELETE FROM personal_details WHERE employee_id = ?', [empId], (err) => {
      if (!err) console.log(`  ✓ Deleted personal details`);
    });
    
    db.run('DELETE FROM sensitive_information WHERE employee_id = ?', [empId], (err) => {
      if (!err) console.log(`  ✓ Deleted sensitive information`);
    });
    
    db.run('DELETE FROM emergency_contacts WHERE employee_id = ?', [empId], (err) => {
      if (!err) console.log(`  ✓ Deleted emergency contacts`);
    });
    
    // Finally delete the employee
    db.run('DELETE FROM employees WHERE rowid = ?', [empId], (err) => {
      if (err) {
        console.error(`  ❌ Error deleting employee: ${err.message}`);
      } else {
        console.log(`  ✓ Deleted employee record\n`);
      }
    });
  }

  // Check final count after 2 seconds
  setTimeout(() => {
    db.all('SELECT rowid as id, first_name, surname FROM employees WHERE deleted_at IS NULL ORDER BY rowid', (err, rows) => {
      console.log('═══════════════════════════════════');
      console.log(`✅ CLEANUP COMPLETE`);
      console.log('═══════════════════════════════════');
      console.log(`\n📊 Final employee count: ${rows.length}\n`);
      rows.forEach(row => {
        console.log(`  ✓ ID ${row.id}: ${row.first_name} ${row.surname}`);
      });
      db.close();
    });
  }, 1000);
});
