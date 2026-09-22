/**
 * Complete seed script: Create employees + populate employment data via API
 * Usage: node backend/seed-complete.js
 */

import sqlite3 from 'sqlite3';
import { promisify } from 'util';

const db = new sqlite3.Database('./evereco_dev.db');
const dbRun = promisify(db.run.bind(db));
const dbAll = promisify(db.all.bind(db));

const API_URL = 'http://localhost:5000/api';
const ADMIN_EMAIL = 'admin@evereco.com';
const ADMIN_PASSWORD = 'Change123!';

const employeeData = {
  'Sardar Muhammad Hassan': {
    surname: 'Zaman',
    employment_type: 'Full-time',
    job_title: 'Operations Executive',
    department: 'Operations',
    employment_start_date: '2023-01-15',
    employment_end_date: '',
    contracted_weekly_hours: 37.5,
    normal_working_days: 'Mon-Fri',
    normal_working_hours: '09:00-17:30',
    annual_leave_entitlement: 28,
    probation_period: '3 months',
    notice_period: '1 month',
    normal_place_of_work: 'Head Office',
    employment_status: 'Active',
    job_description: 'Responsible for operational management and day-to-day business activities.',
    annual_salary: 34000,
    hourly_rate: '',
    payment_frequency: 'Monthly',
    salary_effective_date: '2023-01-15'
  },
  'Muhammad': {
    surname: 'Nabeel',
    employment_type: 'Full-time',
    job_title: 'Compliance Coordinator',
    department: 'HR & Compliance',
    employment_start_date: '2023-03-20',
    employment_end_date: '',
    contracted_weekly_hours: 37.5,
    normal_working_days: 'Mon-Fri',
    normal_working_hours: '09:00-17:30',
    annual_leave_entitlement: 28,
    probation_period: '3 months',
    notice_period: '1 month',
    normal_place_of_work: 'Head Office',
    employment_status: 'Active',
    job_description: 'Manages HR compliance and regulatory requirements across the organization.',
    annual_salary: 36000,
    hourly_rate: '',
    payment_frequency: 'Monthly',
    salary_effective_date: '2023-03-20'
  }
};

async function insertEmployeesInDB() {
  console.log('📝 Inserting employees into database...');

  for (const [firstName, details] of Object.entries(employeeData)) {
    try {
      await dbRun(
        `INSERT INTO employees (first_name, surname, employment_status, created_by, created_at, updated_at)
         VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [firstName, details.surname, 'Active']
      );
      console.log(`  ✅ Inserted ${firstName} ${details.surname}`);
    } catch (error) {
      console.error(`  ❌ Error inserting ${firstName}: ${error.message}`);
    }
  }
}

async function login() {
  console.log('\n📝 Logging in as admin...');
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`);
  }

  const data = await response.json();
  console.log('  ✅ Login successful');
  return data.token;
}

async function getEmployees(token) {
  console.log('🔍 Fetching employees from API...');
  const response = await fetch(`${API_URL}/employees`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }

  const employees = await response.json();
  console.log(`  ✅ Found ${employees.length} employees`);
  return employees;
}

async function updateEmploymentData(employeeId, data, token) {
  const response = await fetch(`${API_URL}/employees/${employeeId}/employment`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`API error: ${error.error || response.statusText}`);
  }

  return response.json();
}

async function main() {
  try {
    console.log('🚀 Complete seed process...\n');

    // Step 1: Insert employees into DB
    await insertEmployeesInDB();

    // Step 2: Wait a bit for API to pick up DB changes
    console.log('\n⏳ Waiting 2 seconds...');
    await new Promise(r => setTimeout(r, 2000));

    // Step 3: Login
    const token = await login();

    // Step 4: Fetch employees from API
    const employees = await getEmployees(token);

    // Step 5: Update employment data for each
    console.log('\n📊 Updating employment data...');
    for (const [firstName, details] of Object.entries(employeeData)) {
      const employee = employees.find(e => e.first_name === firstName && e.surname === details.surname);

      if (!employee || !employee.id) {
        console.log(`  ⚠️  Employee ${firstName} ${details.surname} not found or no ID`);
        continue;
      }

      try {
        await updateEmploymentData(employee.id, details, token);
        console.log(`  ✅ Updated ${firstName} ${details.surname} (ID: ${employee.id})`);
      } catch (error) {
        console.error(`  ❌ Error updating ${firstName}: ${error.message}`);
      }
    }

    console.log('\n🎉 Seed completed!');
    db.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    db.close();
    process.exit(1);
  }
}

main();
