-- Sensitive Information table for admin-only data
CREATE TABLE IF NOT EXISTS sensitive_information (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL UNIQUE REFERENCES employees(id) ON DELETE CASCADE,

  -- Tax
  tax_code TEXT,

  -- National Insurance
  ni_number TEXT,

  -- Passport
  passport_number TEXT,
  passport_country_of_issue TEXT,
  passport_expiry_date TEXT,

  -- Driving Licence
  driving_licence_number TEXT,
  driving_licence_country_of_issue TEXT,
  driving_licence_class TEXT,
  driving_licence_expiry_date TEXT,

  -- DBS Check
  dbs_initial_check_conducted BOOLEAN DEFAULT 0,
  dbs_check_conducted BOOLEAN DEFAULT 0,
  dbs_certificate_number TEXT,

  -- Right to Work
  right_to_work_status TEXT,

  -- Termination
  leaving_date TEXT,
  reason_for_termination TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_sensitive_information_employee ON sensitive_information(employee_id);
