import { query } from './src/config/database.js';
import bcrypt from 'bcryptjs';

async function cleanup() {
  try {
    console.log('🔍 Checking current employee count...\n');

    const allEmp = await query('SELECT rowid as id, first_name, surname FROM employees WHERE deleted_at IS NULL');
    const employees = allEmp.rows || allEmp;

    console.log(`Current employee count: ${employees.length}\n`);
    console.log('Employees:');
    employees.forEach(emp => {
      console.log(`  - ID ${emp.id}: ${emp.first_name} ${emp.surname}`);
    });

    if (employees.length > 2) {
      console.log(`\n⚠️  Found ${employees.length} employees, cleaning up to keep only 2...\n`);

      // Keep only IDs 1 and 2 (Sardar and Muhammad Nabeel)
      const toDelete = employees.filter(e => e.id !== 1 && e.id !== 2).map(e => e.id);

      if (toDelete.length > 0) {
        console.log(`Deleting employees: ${toDelete.join(', ')}\n`);

        for (const empId of toDelete) {
          try { await query('DELETE FROM attendance_records WHERE employee_id = ?', [empId]); } catch (e) {}
          try { await query('DELETE FROM absence_records WHERE employee_id = ?', [empId]); } catch (e) {}
          try { await query('DELETE FROM documents WHERE employee_id = ?', [empId]); } catch (e) {}
          try { await query('DELETE FROM sponsorship_records WHERE employee_id = ?', [empId]); } catch (e) {}
          try { await query('DELETE FROM salary_history WHERE employee_id = ?', [empId]); } catch (e) {}
          try { await query('DELETE FROM employment_history WHERE employee_id = ?', [empId]); } catch (e) {}
          try { await query('DELETE FROM personal_details WHERE employee_id = ?', [empId]); } catch (e) {}
          try { await query('DELETE FROM sensitive_information WHERE employee_id = ?', [empId]); } catch (e) {}
          try { await query('DELETE FROM emergency_contacts WHERE employee_id = ?', [empId]); } catch (e) {}
          await query('DELETE FROM employees WHERE rowid = ?', [empId]);
          console.log(`  ✓ Deleted employee ${empId}`);
        }
      }
    }

    console.log('\n✅ Cleanup complete\n');

    // Now ensure Muhammad Nabeel has a user account
    console.log('🔍 Checking employee #2 (Muhammad Nabeel)...\n');

    const emp2 = await query('SELECT rowid as id, first_name, surname, email FROM employees WHERE rowid = 2');
    const emp2Data = emp2.rows?.[0] || emp2[0];

    if (emp2Data) {
      console.log(`Employee #2: ${emp2Data.first_name} ${emp2Data.surname}`);
      console.log(`Email: ${emp2Data.email}\n`);

      // Check if user exists
      const userExists = await query('SELECT rowid as id FROM users WHERE email = ?', [emp2Data.email || 'nabeel@everecoenergy.com']);
      const user = userExists.rows?.[0] || (userExists[0] && userExists);

      if (!user || !user?.id) {
        console.log('📝 Creating user account for Muhammad Nabeel...\n');

        const email = emp2Data.email || 'nabeel@everecoenergy.com';
        const password = 'Nabeel@2024';
        const hashedPassword = await bcrypt.hash(password, 10);

        await query(
          `INSERT INTO users (email, name, password_hash, role, employee_id, created_at)
           VALUES (?, ?, ?, ?, ?, datetime("now"))`,
          [email, `${emp2Data.first_name} ${emp2Data.surname}`, hashedPassword, 'employee', 2]
        );

        console.log(`✅ User account created\n`);
        console.log('LOGIN CREDENTIALS FOR MUHAMMAD NABEEL:');
        console.log('═══════════════════════════════════════');
        console.log(`Email:    ${email}`);
        console.log(`Password: ${password}`);
        console.log('═══════════════════════════════════════\n');
      } else {
        console.log('✓ User account already exists\n');
      }
    } else {
      console.log('⚠️  Employee #2 not found in database!\n');
    }

    // Verify final count
    const finalEmp = await query('SELECT rowid as id, first_name, surname FROM employees WHERE deleted_at IS NULL');
    const finalEmployees = finalEmp.rows || finalEmp;
    console.log(`📊 FINAL EMPLOYEE COUNT: ${finalEmployees.length}\n`);
    console.log('Remaining employees:');
    finalEmployees.forEach(emp => {
      console.log(`  ✓ ID ${emp.id}: ${emp.first_name} ${emp.surname}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
}

cleanup();
