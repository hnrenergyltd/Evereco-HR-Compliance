import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dbPath = './evereco_dev.db';
const db = new sqlite3.Database(dbPath);

console.log('Testing database...\n');

// Check if tables exist
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log(`Tables found: ${tables.length}`);
    tables.forEach(t => console.log(`  - ${t.name}`));

    if (tables.length === 0) {
      console.log('\n❌ No tables! Running migration...');
      runMigration();
    } else {
      console.log('\n✅ Tables exist. Checking users table...');
      checkUsers();
    }
  }
});

function runMigration() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const migrationPath = path.join(__dirname, './src/migrations/001_initial_schema.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  db.serialize(() => {
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
    console.log(`\nRunning ${statements.length} statements...`);

    statements.forEach((statement, index) => {
      if (statement.trim()) {
        db.run(statement, (err) => {
          if (err && !err.message.includes('already exists')) {
            console.error(`Statement ${index + 1} error:`, err.message);
          } else if (!err) {
            console.log(`✅ Statement ${index + 1}`);
          }
        });
      }
    });

    setTimeout(() => {
      checkUsers();
      db.close();
    }, 1000);
  });
}

function checkUsers() {
  db.all('SELECT * FROM users', (err, rows) => {
    if (err) {
      console.error('❌ Error querying users:', err.message);
    } else {
      console.log(`\nUsers found: ${rows.length}`);
      rows.forEach(u => console.log(`  - ${u.email} (${u.role})`));
    }
    db.close();
  });
}
