import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import { promisify } from 'util';

const db = new sqlite3.Database('./evereco_dev.db');
const dbRun = promisify(db.run.bind(db));

async function seedAdmin() {
  try {
    const hashedPassword = await bcrypt.hash('Change123!', 10);

    await dbRun(
      `INSERT INTO users (email, name, password_hash, role)
       VALUES (?, ?, ?, ?)`,
      ['admin@evereco.com', 'Admin User', hashedPassword, 'admin']
    );

    console.log('✅ Admin user created: admin@evereco.com / Change123!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  }
}

seedAdmin();
