-- Personal Details table (separate from employees)
CREATE TABLE IF NOT EXISTS personal_details (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER UNIQUE NOT NULL REFERENCES employees(id),
  title TEXT,
  middle_name TEXT,
  preferred_name TEXT,
  date_of_birth TEXT,
  nationality TEXT,
  ni_number TEXT,
  personal_email TEXT,
  work_email TEXT,
  mobile_number TEXT,
  home_telephone TEXT,
  address_line_1 TEXT,
  address_line_2 TEXT,
  city_town TEXT,
  postcode TEXT,
  country TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Manager table
CREATE TABLE IF NOT EXISTS managers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  manager_id INTEGER NOT NULL REFERENCES employees(id),
  assigned_date TEXT DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employment Details table (if not exists)
CREATE TABLE IF NOT EXISTS employment_details (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER REFERENCES employees(id),
  employment_type TEXT,
  employment_start_date TEXT,
  employment_end_date TEXT,
  full_time BOOLEAN DEFAULT 1,
  contracted_weekly_hours REAL,
  normal_working_days TEXT,
  annual_leave_entitlement INTEGER,
  probation_period TEXT,
  notice_period TEXT,
  work_location TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_personal_details_employee_id ON personal_details(employee_id);
CREATE INDEX IF NOT EXISTS idx_managers_employee_id ON managers(employee_id);
CREATE INDEX IF NOT EXISTS idx_managers_manager_id ON managers(manager_id);
