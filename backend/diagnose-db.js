import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./evereco_dev.db');

db.serialize(() => {
  console.log('📋 Checking employees table...');

  db.all("PRAGMA table_info(employees)", (err, cols) => {
    if (err) {
      console.error('❌ Error:', err);
    } else {
      console.log('\nColumns in employees table:');
      cols.forEach(col => {
        console.log(`  - ${col.name} (${col.type})`);
      });
    }
  });

  console.log('\n📊 Employee records:');
  db.all("SELECT rowid, first_name, surname, employment_status FROM employees", (err, rows) => {
    if (err) {
      console.error('❌ Error:', err);
    } else {
      console.log(`Found ${rows.length} employees:`);
      rows.forEach(e => {
        console.log(`  - rowid=${e.rowid}, name=${e.first_name} ${e.surname}, status=${e.employment_status}`);
      });
    }
    db.close();
  });
});
