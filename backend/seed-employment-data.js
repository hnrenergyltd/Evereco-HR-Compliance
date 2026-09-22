/**
 * One-off seed script to populate employment data for demo employees
 * Usage: node backend/seed-employment-data.js
 */

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

async function login() {
  console.log(`📝 Logging in as ${ADMIN_EMAIL}...`);
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.token;
}

async function getEmployees(token) {
  console.log('🔍 Fetching employee list...');
  const response = await fetch(`${API_URL}/employees`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch employees: ${response.status}`);
  }

  const data = await response.json();
  return data.employees || [];
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
    throw new Error(`Failed to update employee ${employeeId}: ${error.error || response.statusText}`);
  }

  return response.json();
}

async function main() {
  try {
    console.log('🚀 Starting employment data seed...\n');

    // Step 1: Login
    const token = await login();
    console.log('✅ Login successful\n');

    // Step 2: Fetch employees
    const employees = await getEmployees(token);
    console.log(`✅ Found ${employees.length} employees\n`);

    // Step 3: Update employment data for each target employee
    for (const [firstName, details] of Object.entries(employeeData)) {
      const employee = employees.find(e => e.first_name === firstName && e.surname === details.surname);

      if (!employee) {
        console.log(`⚠️  Employee ${firstName} ${details.surname} not found, skipping...`);
        continue;
      }

      try {
        console.log(`📊 Updating ${firstName} ${details.surname} (ID: ${employee.id})...`);
        await updateEmploymentData(employee.id, details, token);
        console.log(`✅ ${firstName} ${details.surname} updated successfully\n`);
      } catch (error) {
        console.error(`❌ Error updating ${firstName} ${details.surname}: ${error.message}\n`);
      }
    }

    console.log('🎉 Seed completed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
