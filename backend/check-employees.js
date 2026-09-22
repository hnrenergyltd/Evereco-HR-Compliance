import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./evereco_dev.db');

db.all('SELECT rowid as id, first_name, surname FROM employees WHERE deleted_at IS NULL ORDER BY rowid', (err, rows) => {
  if (err) {
    console.error('❌ Error:', err);
  } else {
    console.log(`📊 Total employees: ${rows.length}\n`);
    rows.forEach(row => {
      console.log(`  ID ${row.id}: ${row.first_name} ${row.surname}`);
    });
  }
  db.close();
});
