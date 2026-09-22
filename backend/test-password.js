import sqlite3 from 'sqlite3';
import bcryptjs from 'bcryptjs';

const db = new sqlite3.Database('./evereco_dev.db');

console.log('Checking password hash...\n');

// Get admin user
db.get('SELECT * FROM users WHERE email = ?', ['admin@evereco.com'], async (err, user) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }

  if (!user) {
    console.log('❌ Admin user not found');
    db.close();
    return;
  }

  console.log('Admin user found:');
  console.log(`  Email: ${user.email}`);
  console.log(`  Role: ${user.role}`);
  console.log(`  Stored hash: ${user.password_hash}`);

  // Test password
  const testPassword = 'Change123!';
  console.log(`\nTesting password: "${testPassword}"`);

  try {
    const match = await bcryptjs.compare(testPassword, user.password_hash);
    console.log(`Password match result: ${match}`);

    if (!match) {
      console.log('\n❌ Password does not match! Creating new hash...');
      const newHash = await bcryptjs.hash(testPassword, 10);
      console.log(`New hash: ${newHash}`);

      // Update database
      db.run('UPDATE users SET password_hash = ? WHERE email = ?',
        [newHash, 'admin@evereco.com'],
        (err) => {
          if (err) {
            console.error('Error updating password:', err);
          } else {
            console.log('✅ Password updated in database!');
          }
          db.close();
        });
    } else {
      console.log('✅ Password is correct!');
      db.close();
    }
  } catch (error) {
    console.error('Error comparing password:', error);
    db.close();
  }
});
