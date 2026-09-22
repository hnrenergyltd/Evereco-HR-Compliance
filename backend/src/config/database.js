import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';

dotenv.config();

const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL;

// Check if using SQLite or PostgreSQL
const isSQLite = DATABASE_URL && DATABASE_URL.startsWith('sqlite:');

let pool = null;
let sqliteDb = null;

if (isSQLite) {
  // SQLite setup
  const dbPath = DATABASE_URL.replace('sqlite:', '');
  sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('SQLite connection error:', err);
    } else {
      console.log('✅ SQLite database connected');
    }
  });

  // Enable foreign keys
  sqliteDb.run('PRAGMA foreign_keys = ON');
} else {
  // PostgreSQL setup
  pool = new Pool({
    connectionString: DATABASE_URL,
  });

  pool.on('error', (err) => {
    console.error('Unexpected pool error:', err);
  });
}

/*
 * Columns the application code depends on, per table.
 *
 * Two migration bugs leave real databases short of these:
 *   - 010 uses `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, which SQLite does
 *     not support, so every one of those statements fails.
 *   - 011 re-declares `documents` with `CREATE TABLE IF NOT EXISTS`, but 001
 *     already created a narrower version, so the statement is skipped and the
 *     newer columns never appear.
 *
 * Reconciling against PRAGMA table_info repairs existing databases on boot and
 * keeps fresh ones correct. SQLite rejects non-constant defaults in ADD COLUMN,
 * so timestamp columns are added without one.
 */
const REQUIRED_COLUMNS = {
  documents: [
    ['file_size', 'INTEGER'],
    ['file_mime_type', 'TEXT'],
    ['follow_up_date', 'TEXT'],
    ['notes', 'TEXT'],
    ['employee_visibility', 'BOOLEAN DEFAULT 0'],
    ['uploaded_at', 'TIMESTAMP'],
    ['is_deleted', 'BOOLEAN DEFAULT 0'],
    ['deleted_by', 'INTEGER'],
    ['archived', 'BOOLEAN DEFAULT 0'],
    ['updated_at', 'TIMESTAMP'],
  ],
  sponsorship_records: [
    ['visa_permission_type', 'TEXT'],
    ['visa_start_date', 'TEXT'],
    ['visa_expiry_date', 'TEXT'],
    ['immigration_status', 'TEXT'],
    ['passport_number', 'TEXT'],
    ['passport_country', 'TEXT'],
    ['passport_expiry_date', 'TEXT'],
    ['cos_notes', 'TEXT'],
    ['immigration_notes', 'TEXT'],
    ['updated_at', 'TIMESTAMP'],
  ],
  employees: [
    ['sponsored_worker', 'BOOLEAN DEFAULT 0'],
    ['deleted_at', 'TIMESTAMP'],
  ],
  users: [
    // Set when an admin creates the account with a temporary password; cleared
    // once the user chooses their own.
    ['must_change_password', 'BOOLEAN DEFAULT 0'],
    // Holds the SHA-256 digest of the emailed reset token, never the token.
    ['password_reset_token', 'TEXT'],
    ['password_reset_expires', 'TIMESTAMP'],
  ],
  // Legacy databases name these work_location / site_project_name. Adding the
  // current names preserves existing rows; 008 used to drop the whole table.
  attendance_records: [
    ['work_date', 'TEXT'],
    ['location', 'TEXT'],
    ['site_name', 'TEXT'],
    ['notes', 'TEXT'],
    ['updated_at', 'TIMESTAMP'],
  ],
};

function reconcileColumns() {
  const tables = Object.entries(REQUIRED_COLUMNS);

  return Promise.all(
    tables.map(
      ([table, columns]) =>
        new Promise((resolve) => {
          sqliteDb.all(`PRAGMA table_info(${table})`, [], (err, rows) => {
            if (err || !rows || rows.length === 0) return resolve();

            const existing = new Set(rows.map((r) => r.name));
            const missing = columns.filter(([name]) => !existing.has(name));
            if (missing.length === 0) return resolve();

            let pending = missing.length;
            missing.forEach(([name, type]) => {
              sqliteDb.run(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`, (addErr) => {
                if (addErr) {
                  if (!addErr.message.includes('duplicate column')) {
                    console.error(`  ✗ ${table}.${name}: ${addErr.message}`);
                  }
                } else {
                  console.log(`  ✓ Added missing column ${table}.${name}`);
                }
                if (--pending === 0) resolve();
              });
            });
          });
        })
    )
  );
}

export async function initializeDatabase() {
  try {
    if (isSQLite) {
      // Read and execute migrations for SQLite
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const migrationPath1 = path.join(__dirname, '../migrations/001_initial_schema.sql');
      const migrationPath2 = path.join(__dirname, '../migrations/002_stage2_tables.sql');
      const migrationPath3 = path.join(__dirname, '../migrations/003_employment_tables.sql');
      const migrationPath5 = path.join(__dirname, '../migrations/005_sensitive_information.sql');
      const migrationPath6 = path.join(__dirname, '../migrations/006_emergency_contacts.sql');
      const migrationPath7 = path.join(__dirname, '../migrations/007_attendance_system.sql');
      const migrationPath8 = path.join(__dirname, '../migrations/008_update_attendance_records.sql');
      const migrationPath9 = path.join(__dirname, '../migrations/009_update_absence_records.sql');
      const migrationPath10 = path.join(__dirname, '../migrations/010_sponsorship_schema.sql');
      const migrationPath11 = path.join(__dirname, '../migrations/011_documents_system.sql');
      const migrationSQL = fs.readFileSync(migrationPath1, 'utf8') + '\n' + fs.readFileSync(migrationPath2, 'utf8') + '\n' + fs.readFileSync(migrationPath3, 'utf8') + '\n' + fs.readFileSync(migrationPath5, 'utf8') + '\n' + fs.readFileSync(migrationPath6, 'utf8') + '\n' + fs.readFileSync(migrationPath7, 'utf8') + '\n' + fs.readFileSync(migrationPath8, 'utf8') + '\n' + fs.readFileSync(migrationPath9, 'utf8') + '\n' + fs.readFileSync(migrationPath10, 'utf8') + '\n' + fs.readFileSync(migrationPath11, 'utf8');

      // Execute migration SQL with proper SQLite syntax
      return new Promise((resolve, reject) => {
        sqliteDb.serialize(() => {
          // Strip `--` comments before splitting: a semicolon inside a comment
          // would otherwise cut a statement in half and execute the remainder
          // of the prose as SQL.
          const statements = migrationSQL
            .replace(/^\s*--.*$/gm, '')
            .split(';')
            .filter((stmt) => stmt.trim());

          statements.forEach((statement, index) => {
            if (statement.trim()) {
              sqliteDb.run(statement, (err) => {
                // Migrations re-run on every boot, so ALTER TABLE ADD COLUMN
                // legitimately reports a duplicate the second time around.
                // Suppressing that keeps genuine failures visible in the log.
                const benign =
                  err &&
                  (err.message.includes('already exists') ||
                    err.message.includes('duplicate column name'));
                if (err && !benign) {
                  console.error(`Error executing statement ${index + 1}:`, err.message);
                }
              });
            }
          });

          // After all statements, verify tables exist
          sqliteDb.all(
            "SELECT name FROM sqlite_master WHERE type='table'",
            async (err, tables) => {
              if (err) {
                console.error('Error checking tables:', err);
                reject(err);
              } else {
                try {
                  await reconcileColumns();
                } catch (reconErr) {
                  console.error('Schema reconciliation error:', reconErr.message);
                }
                console.log('✅ Database schema initialized');
                console.log(`✅ Tables created: ${tables.map(t => t.name).join(', ')}`);
                resolve();
              }
            }
          );
        });
      });
    } else {
      const client = await pool.connect();
      console.log('✅ PostgreSQL connected');

      // Read and execute migration
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const migrationPath = path.join(__dirname, '../migrations/001_initial_schema.sql');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

      // Split by semicolon and execute each statement
      const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
      for (const statement of statements) {
        if (statement.trim()) {
          await client.query(statement);
        }
      }

      console.log('✅ Database schema initialized');
      client.release();
    }
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

export async function query(text, params) {
  try {
    if (isSQLite) {
      return new Promise((resolve, reject) => {
        /*
         * node-sqlite3 only exposes lastID/changes on run(), never on all().
         * Routing every statement through all() meant `result.lastID` came
         * back undefined after an INSERT, which broke creating an employee and
         * uploading a document (the follow-up insert hit a NOT NULL
         * constraint on the missing id). Writes therefore go through run().
         */
        const isWrite = /^\s*(INSERT|UPDATE|DELETE|REPLACE)\b/i.test(text);

        if (isWrite) {
          sqliteDb.run(text, params || [], function (err) {
            if (err) {
              console.error('SQLite Query error:', err, 'Query:', text);
              reject(err);
            } else {
              resolve({ rows: [], lastID: this.lastID, changes: this.changes });
            }
          });
          return;
        }

        sqliteDb.all(text, params || [], (err, rows) => {
          if (err) {
            console.error('SQLite Query error:', err, 'Query:', text);
            reject(err);
          } else {
            resolve({ rows: rows || [] });
          }
        });
      });
    } else {
      const result = await pool.query(text, params);
      return result;
    }
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
}

export async function getClient() {
  if (isSQLite) {
    return sqliteDb;
  } else {
    return await pool.connect();
  }
}

export default pool || sqliteDb;
