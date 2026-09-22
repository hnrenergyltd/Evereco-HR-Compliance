-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'employee',
  employee_id INTEGER UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  surname TEXT NOT NULL,
  job_title TEXT,
  department TEXT,
  employment_status TEXT DEFAULT 'active',
  email TEXT,
  mobile_number TEXT,
  home_address TEXT,
  postcode TEXT,
  date_of_birth TEXT,
  nationality TEXT,
  national_insurance_number TEXT,
  sponsored_worker BOOLEAN DEFAULT 0,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Employment Details table
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

-- Attendance Records table
CREATE TABLE IF NOT EXISTS attendance_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER REFERENCES employees(id),
  clock_in_time TIMESTAMP,
  clock_out_time TIMESTAMP,
  work_location TEXT,
  site_project_name TEXT,
  total_hours REAL,
  status TEXT DEFAULT 'complete',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Absence Records table
CREATE TABLE IF NOT EXISTS absence_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER REFERENCES employees(id),
  absence_type TEXT,
  start_date TEXT,
  end_date TEXT,
  working_days INTEGER,
  reason TEXT,
  authorised BOOLEAN,
  approved_by INTEGER REFERENCES users(id),
  approval_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER REFERENCES employees(id),
  document_name TEXT,
  category TEXT,
  file_path TEXT,
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  uploaded_by INTEGER REFERENCES users(id),
  document_date TEXT,
  expiry_date TEXT,
  employee_visible BOOLEAN DEFAULT 0,
  deleted_at TIMESTAMP
);

-- Sponsorship Records table
CREATE TABLE IF NOT EXISTS sponsorship_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER REFERENCES employees(id),
  cos_reference_number TEXT,
  sponsorship_route TEXT,
  soc_occupation_code TEXT,
  job_title_on_cos TEXT,
  salary_on_cos REAL,
  contracted_hours_on_cos REAL,
  work_location_on_cos TEXT,
  cos_assigned_date TEXT,
  cos_end_date TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Immigration Records table
CREATE TABLE IF NOT EXISTS immigration_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER REFERENCES employees(id),
  visa_type TEXT,
  visa_start_date TEXT,
  visa_expiry_date TEXT,
  immigration_status TEXT,
  passport_number TEXT,
  passport_expiry_date TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Right to Work Checks table
CREATE TABLE IF NOT EXISTS right_to_work_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER REFERENCES employees(id),
  check_date TEXT,
  check_type TEXT,
  checked_by TEXT,
  outcome TEXT,
  follow_up_required BOOLEAN,
  follow_up_due_date TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Compliance Alerts table
CREATE TABLE IF NOT EXISTS compliance_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER REFERENCES employees(id),
  alert_type TEXT,
  severity TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);

-- Audit History table
CREATE TABLE IF NOT EXISTS audit_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  action TEXT,
  entity_type TEXT,
  entity_id INTEGER,
  previous_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT UNIQUE,
  setting_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(employment_status);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_absence_employee ON absence_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_documents_employee ON documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_history(user_id);

-- Insert default admin user (password: Change123!)
INSERT OR IGNORE INTO users (email, name, password_hash, role)
VALUES ('admin@evereco.com', 'Administrator', '$2a$10$KIX4YZxgbTXKLX4f.5u8h.1/xKXk7GW7.0J7J1hKd8wT.E0Pb5pR6', 'admin');

-- Insert initial employees.
-- OR IGNORE only suppresses UNIQUE/PK conflicts, and there is no unique
-- constraint on (first_name, surname), so it re-inserted these two on every
-- startup. Guard on NOT EXISTS instead so the seed is genuinely idempotent.
INSERT INTO employees (first_name, surname, employment_status, created_by)
SELECT 'Sardar Muhammad Hassan', 'Zaman', 'active', 1
WHERE NOT EXISTS (
  SELECT 1 FROM employees WHERE first_name = 'Sardar Muhammad Hassan' AND surname = 'Zaman'
);

INSERT INTO employees (first_name, surname, employment_status, created_by)
SELECT 'Muhammad', 'Nabeel', 'active', 1
WHERE NOT EXISTS (
  SELECT 1 FROM employees WHERE first_name = 'Muhammad' AND surname = 'Nabeel'
);
