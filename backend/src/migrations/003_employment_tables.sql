-- Salary History Table
CREATE TABLE IF NOT EXISTS salary_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  previous_salary REAL,
  new_salary REAL NOT NULL,
  date_changed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  changed_by TEXT,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employment History Table
CREATE TABLE IF NOT EXISTS employment_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  field_changed TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT NOT NULL,
  date_changed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  changed_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add new columns to employees table (SQLite doesn't support IF NOT EXISTS on ALTER, so we ignore errors)
-- Contract & Employment Details
ALTER TABLE employees ADD COLUMN employment_type TEXT;
ALTER TABLE employees ADD COLUMN employment_start_date TEXT;
ALTER TABLE employees ADD COLUMN employment_end_date TEXT;
ALTER TABLE employees ADD COLUMN contracted_weekly_hours REAL;
ALTER TABLE employees ADD COLUMN normal_working_days TEXT;
ALTER TABLE employees ADD COLUMN normal_working_hours TEXT;
ALTER TABLE employees ADD COLUMN annual_leave_entitlement INTEGER DEFAULT 20;
ALTER TABLE employees ADD COLUMN probation_period TEXT;
ALTER TABLE employees ADD COLUMN notice_period TEXT;
ALTER TABLE employees ADD COLUMN normal_place_of_work TEXT;

-- Job & Role Details
ALTER TABLE employees ADD COLUMN job_description TEXT;
ALTER TABLE employees ADD COLUMN manager_id INTEGER;

-- Salary & Payment Details
ALTER TABLE employees ADD COLUMN annual_salary REAL;
ALTER TABLE employees ADD COLUMN hourly_rate REAL;
ALTER TABLE employees ADD COLUMN payment_frequency TEXT DEFAULT 'Monthly';
ALTER TABLE employees ADD COLUMN salary_effective_date TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_salary_history_employee ON salary_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_employment_history_employee ON employment_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_history_date ON salary_history(date_changed);
CREATE INDEX IF NOT EXISTS idx_employment_history_date ON employment_history(date_changed);
