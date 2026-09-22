import { query } from './src/config/database.js';
import bcrypt from 'bcryptjs';

async function fixPasswords() {
  try {
    console.log('🔐 FIXING EMPLOYEE PASSWORDS\n');
    console.log('Converting SHA256 hashes to bcrypt...\n');

    // Generate new temporary passwords for employees
    const tempPass1 = 'Evereco@2024';
    const tempPass2 = 'Nabeel@2024';

    // Hash with bcrypt
    const bcryptHash1 = await bcrypt.hash(tempPass1, 10);
    const bcryptHash2 = await bcrypt.hash(tempPass2, 10);

    console.log('1️⃣  Updating Sardar account:');
    console.log(`   New Password: ${tempPass1}`);
    await query('UPDATE users SET password_hash = ? WHERE email = ?', [bcryptHash1, 'sardar@everecoenergy.com']);
    console.log('   ✅ Updated\n');

    console.log('2️⃣  Updating Muhammad Nabeel account:');
    console.log(`   New Password: ${tempPass2}`);
    await query('UPDATE users SET password_hash = ? WHERE email = ?', [bcryptHash2, 'nabeel@everecoenergy.com']);
    console.log('   ✅ Updated\n');

    // Verify
    console.log('3️⃣  Verifying passwords:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const userResult = await query('SELECT email, password_hash FROM users WHERE email IN (?, ?)',
      ['sardar@everecoenergy.com', 'nabeel@everecoenergy.com']);
    const users = userResult.rows || userResult;

    for (const user of users) {
      console.log(`Email: ${user.email}`);
      console.log(`Hash Format: ${user.password_hash.startsWith('$2') ? '✅ bcrypt' : '❌ SHA256'}`);
    }

    console.log(`\n✅ PASSWORDS FIXED!\n`);
    console.log('🎯 NEW LOGIN CREDENTIALS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('EMPLOYEE 1:');
    console.log(`  Email: sardar@everecoenergy.com`);
    console.log(`  Password: ${tempPass1}\n`);

    console.log('EMPLOYEE 2:');
    console.log(`  Email: nabeel@everecoenergy.com`);
    console.log(`  Password: ${tempPass2}\n`);

    console.log('⚠️  Employees must change password on first login!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
}

fixPasswords();
