import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./evereco_dev.db');

db.serialize(() => {
  // Delete existing employees
  db.run('DELETE FROM employees', (err) => {
    if (err) console.error('Error deleting:', err);
    else console.log('✅ Deleted old employees');
  });

  // Re-insert with proper syntax
  db.run(`
    INSERT INTO employees (first_name, surname, employment_status, created_by, created_at, updated_at)
    VALUES ('Sardar Muhammad Hassan', 'Zaman', 'active', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `, function(err) {
    if (err) console.error('Error insert 1:', err);
    else console.log('✅ Inserted: Sardar Muhammad Hassan Zaman (ID: ' + this.lastID + ')');
  });

  db.run(`
    INSERT INTO employees (first_name, surname, employment_status, created_by, created_at, updated_at)
    VALUES ('Muhammad', 'Nabeel', 'active', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `, function(err) {
    if (err) console.error('Error insert 2:', err);
    else console.log('✅ Inserted: Muhammad Nabeel (ID: ' + this.lastID + ')');
  });

  // Verify
  setTimeout(() => {
    db.all('SELECT rowid as id, first_name, surname FROM employees', (err, rows) => {
      if (err) console.error('Error:', err);
      else {
        console.log('\n✅ Verification:');
        rows.forEach(e => console.log(`  - ID: ${e.id}, Name: ${e.first_name} ${e.surname}`));
      }
      db.close();
    });
  }, 500);
});
