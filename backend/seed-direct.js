/**
 * Direct seed script using known rowids
 * Usage: node backend/seed-direct.js
 */

const API_URL = 'http://localhost:5000/api';
const ADMIN_EMAIL = 'admin@evereco.com';
const ADMIN_PASSWORD = 'Change123!';

// Employee IDs (rowids from database)
const EMPLOYEES = {
  1: {
    name: 'Sardar Muhammad Hassan Zaman',
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
  2: {
    name: 'Muhammad Nabeel',
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

async function login() {
  console.log(`📝 Logging in as ${ADMIN_EMAIL}...`);
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`);
  }

  const data = await response.json();
  console.log('✅ Login successful\n');
  return data.token;
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
    console.log('🚀 Seeding employment data...\n');

    // Step 1: Login
    const token = await login();

    // Step 2: Update each employee
    console.log('📊 Updating employment data...');
    for (const [employeeId, details] of Object.entries(EMPLOYEES)) {
      try {
        await updateEmploymentData(employeeId, details, token);
        console.log(`✅ Updated ${details.name} (ID: ${employeeId})`);
      } catch (error) {
        console.error(`❌ Error updating ID ${employeeId}: ${error.message}`);
      }
    }

    console.log('\n🎉 Seed completed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
