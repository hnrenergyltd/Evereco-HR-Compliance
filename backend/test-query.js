import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./evereco_dev.db');

console.log('Testing queries...\n');

// Test 1: Simple all query
db.all("SELECT rowid as id, first_name FROM employees", (err, rows) => {
  console.log('Test 1 - Simple SELECT rowid:');
  if (err) console.error('Error:', err);
  else rows.forEach(r => console.log(`  id=${r.id}, name=${r.first_name}`));
});

// Test 2: WHERE rowid = ? with parameter
db.all("SELECT rowid as id, first_name FROM employees WHERE rowid = ?", [1], (err, rows) => {
  console.log('\nTest 2 - WHERE rowid = ? [1]:');
  if (err) console.error('Error:', err);
  else console.log(`  Found ${rows.length} rows:`, rows);
});

// Test 3: Deleted_at filter
db.all("SELECT rowid as id, first_name FROM employees WHERE deleted_at IS NULL", (err, rows) => {
  console.log('\nTest 3 - WHERE deleted_at IS NULL:');
  if (err) console.error('Error:', err);
  else console.log(`  Found ${rows.length} rows`);
});

// Test 4: Combined WHERE
db.all("SELECT rowid as id, first_name FROM employees WHERE rowid = ? AND deleted_at IS NULL", [1], (err, rows) => {
  console.log('\nTest 4 - WHERE rowid = ? AND deleted_at IS NULL [1]:');
  if (err) console.error('Error:', err);
  else console.log(`  Found ${rows.length} rows:`, rows);

  setTimeout(() => db.close(), 500);
});
