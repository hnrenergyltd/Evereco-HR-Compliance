-- ═══════════════════════════════════════════════════════════════
-- EVERECO ENERGY HR SYSTEM - INITIAL SCHEMA FOR POSTGRESQL
-- ═══════════════════════════════════════════════════════════════
-- This schema is optimized for PostgreSQL on Railway
-- Created: 2026-09-19

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- USERS TABLE (Authentication & Authorization)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'employee',
  employee_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- EMPLOYEES TABLE (Core Employee Data)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  surname VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  job_title VARCHAR(150),
  department VARCHAR(100),
  employment_status VARCHAR(50),
  mobile_number VARCHAR(20),
  home_address TEXT,
  postcode VARCHAR(20),
  date_of_birth DATE,
  nationality VARCHAR(100),
  national_insurance_number VARCHAR(20),
  sponsored_worker BOOLEAN DEFAULT FALSE,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  -- Employment Details
  employment_type VARCHAR(50),
  employment_start_date DATE,
  employment_end_date DATE,
  contracted_weekly_hours DECIMAL(5,2),
  normal_working_days VARCHAR(50),
  normal_working_hours VARCHAR(50),
  annual_leave_entitlement INTEGER,
  probation_period VARCHAR(100),
  notice_period VARCHAR(100),
  normal_place_of_work VARCHAR(255),
  manager_id INTEGER,
  annual_salary DECIMAL(10,2),
  hourly_rate DECIMAL(8,2),
  payment_frequency VARCHAR(50),
  salary_effective_date DATE,
  job_description TEXT,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id),
  FOREIGN KEY (manager_id) REFERENCES employees(id)
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PERSONAL DETAILS TABLE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS personal_details (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  title VARCHAR(20),
  middle_name VARCHAR(100),
  preferred_name VARCHAR(100),
  date_of_birth DATE,
  nationality VARCHAR(100),
  ni_number VARCHAR(20),
  personal_email VARCHAR(255),
  work_email VARCHAR(255),
  mobile_number VARCHAR(20),
  home_telephone VARCHAR(20),
  address_line_1 VARCHAR(255),
  address_line_2 VARCHAR(255),
  city_town VARCHAR(100),
  postcode VARCHAR(20),
  country VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SENSITIVE INFORMATION TABLE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS sensitive_information (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  bank_account_number VARCHAR(50),
  sort_code VARCHAR(10),
  tax_code VARCHAR(10),
  pension_provider VARCHAR(255),
  pension_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- EMERGENCY CONTACTS TABLE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  relationship VARCHAR(100),
  phone_number VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ATTENDANCE RECORDS TABLE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS attendance_records (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  clock_in_time TIMESTAMP,
  clock_out_time TIMESTAMP,
  location VARCHAR(255),
  site_name VARCHAR(255),
  working_from VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ABSENCE RECORDS TABLE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS absence_records (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  absence_type VARCHAR(100),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  requested_date TIMESTAMP,
  requested_by INTEGER,
  approved_by INTEGER,
  reason TEXT,
  notes TEXT,
  document_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (requested_by) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- DOCUMENTS TABLE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  document_type VARCHAR(100),
  file_name VARCHAR(255),
  file_path VARCHAR(255),
  file_size INTEGER,
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expiry_date DATE,
  status VARCHAR(50) DEFAULT 'active',
  uploaded_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SPONSORSHIP RECORDS TABLE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS sponsorship_records (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  visa_type VARCHAR(100),
  visa_issue_date DATE,
  visa_expiry_date DATE,
  certificate_of_sponsorship_number VARCHAR(100),
  cos_job_title VARCHAR(150),
  cos_salary DECIMAL(10,2),
  cos_weekly_hours DECIMAL(5,2),
  cos_work_location VARCHAR(255),
  right_to_work_status VARCHAR(50),
  biometric_status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SALARY HISTORY TABLE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS salary_history (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  annual_salary DECIMAL(10,2),
  hourly_rate DECIMAL(8,2),
  payment_frequency VARCHAR(50),
  effective_date DATE,
  change_reason TEXT,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- EMPLOYMENT HISTORY TABLE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS employment_history (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  job_title VARCHAR(150),
  department VARCHAR(100),
  employment_status VARCHAR(50),
  change_reason TEXT,
  effective_date DATE,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- AUDIT HISTORY TABLE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS audit_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  table_name VARCHAR(100),
  record_id INTEGER,
  action VARCHAR(50),
  changes JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SETTINGS TABLE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  setting_name VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- CREATE INDEXES FOR PERFORMANCE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_employee_id ON users(employee_id);
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_deleted ON employees(deleted_at);
CREATE INDEX idx_attendance_employee ON attendance_records(employee_id);
CREATE INDEX idx_absence_employee ON absence_records(employee_id);
CREATE INDEX idx_documents_employee ON documents(employee_id);
CREATE INDEX idx_sponsorship_employee ON sponsorship_records(employee_id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- INSERT DEFAULT ADMIN USER (if not exists)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- NOTE: Password should be hashed with bcrypt in application layer
-- This is just a template - actual password handling is in application code
INSERT INTO users (email, name, password_hash, role, created_at)
VALUES (
  'admin@everecoenergy.com',
  'Administrator',
  '$2a$10$placeholder_bcrypt_hash_goes_here',
  'admin',
  CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO NOTHING;
