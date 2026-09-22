import { query } from './src/config/database.js';

async function test() {
  console.log('Testing query wrapper...\n');

  try {
    const result = await query(
      `SELECT rowid as id, first_name FROM employees WHERE rowid = ? AND deleted_at IS NULL`,
      [1]
    );

    console.log('Result:', result);
    console.log('Rows:', result.rows);
  } catch (error) {
    console.error('Error:', error);
  }

  process.exit(0);
}

test();
