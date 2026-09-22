import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./evereco_dev.db');

db.serialize(() => {
  db.run('INSERT OR IGNORE INTO employees (first_name, surname, employment_status, created_by) VALUES (?, ?, ?, ?)',
    ['Sardar Muhammad Hassan', 'Zaman', 'active', 1],
    function(err) {
      if (err) console.error('Error:', err);
      else console.log('✅ Inserted: Sardar Muhammad Hassan Zaman');
    });

  db.run('INSERT OR IGNORE INTO employees (first_name, surname, employment_status, created_by) VALUES (?, ?, ?, ?)',
    ['Muhammad', 'Nabeel', 'active', 1],
    function(err) {
      if (err) console.error('Error:', err);
      else console.log('✅ Inserted: Muhammad Nabeel');
    });

  setTimeout(() => {
    db.all('SELECT id, first_name, surname FROM employees', (err, rows) => {
      if (err) console.error('Error:', err);
      else {
        console.log('\n✅ Total employees:', rows.length);
        rows.forEach(e => console.log(`  - ${e.first_name} ${e.surname} (ID: ${e.id})`));
      }
      db.close();
    });
  }, 200);
});
