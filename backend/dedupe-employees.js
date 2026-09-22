/*
 * Removes duplicate employee rows created by the non-idempotent seed in
 * 001_initial_schema.sql (fixed separately). Keeps the lowest id for each
 * (first_name, surname) pair, since that is the original record holding the
 * real data, and deletes the later copies along with their child rows.
 */
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new sqlite3.Database(path.join(__dirname, 'evereco_dev.db'));

const all = (sql, p = []) => new Promise((res, rej) => db.all(sql, p, (e, r) => (e ? rej(e) : res(r))));
const run = (sql, p = []) =>
  new Promise((res, rej) =>
    db.run(sql, p, function (e) {
      e ? rej(e) : res(this.changes);
    })
  );

const CHILD_TABLES = [
  'attendance_records', 'attendance_corrections', 'absence_records', 'documents',
  'emergency_contacts', 'salary_history', 'employment_history', 'personal_details',
  'sensitive_information', 'sponsorship_records', 'immigration_records',
  'right_to_work_checks', 'compliance_alerts', 'annual_leave_entitlements',
];

const dupes = await all(`
  SELECT id, first_name, surname FROM employees
  WHERE id NOT IN (SELECT MIN(id) FROM employees GROUP BY first_name, surname)
  ORDER BY id
`);

if (dupes.length === 0) {
  console.log('No duplicate employees found.');
} else {
  console.log(`Found ${dupes.length} duplicate employee row(s):`);
  for (const d of dupes) {
    let childRows = 0;
    for (const t of CHILD_TABLES) {
      try {
        childRows += await run(`DELETE FROM ${t} WHERE employee_id = ?`, [d.id]);
      } catch {
        /* table may not exist or lack employee_id */
      }
    }
    await run(`DELETE FROM employees WHERE id = ?`, [d.id]);
    console.log(`  removed id ${d.id} (${d.first_name} ${d.surname}) + ${childRows} child row(s)`);
  }
}

const remaining = await all(`SELECT id, first_name, surname, deleted_at FROM employees ORDER BY id`);
console.log(`\nRemaining employees: ${remaining.length}`);
remaining.forEach((e) =>
  console.log(`  id ${e.id}: ${e.first_name} ${e.surname}${e.deleted_at ? ' [soft-deleted]' : ''}`)
);
process.exit(0);
