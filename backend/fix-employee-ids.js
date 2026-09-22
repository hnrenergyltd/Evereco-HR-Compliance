import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./evereco_dev.db');

db.serialize(() => {
  // Update employee ids to match rowid
  db.run(`
    UPDATE employees
    SET id = rowid
    WHERE id IS NULL
  `, function(err) {
    if (err) console.error('Error:', err);
    else console.log('✅ Updated ' + this.changes + ' employee IDs');
  });

  // Verify
  setTimeout(() => {
    db.all('SELECT id, first_name, surname FROM employees', (err, rows) => {
      if (err) console.error('Error:', err);
      else {
        console.log('\n✅ Employees after fix:');
        rows.forEach(e => console.log(`  - ID: ${e.id}, Name: ${e.first_name} ${e.surname}`));
      }
      db.close();
    });
  }, 500);
});
