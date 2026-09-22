import { query } from './src/config/database.js';

async function checkSchema() {
  try {
    const result = await query('PRAGMA table_info(users)');
    const columns = result.rows || result;
    console.log('Users table columns:');
    columns.forEach(col => {
      console.log(`  ${col.name}: ${col.type}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit(0);
}

checkSchema();
