-- The sponsorship_records columns (visa_*, passport_*, immigration_*,
-- cos_notes, updated_at) were declared here with
-- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, which SQLite does not support:
-- every statement raised `near "EXISTS": syntax error` and the columns were
-- never created, which is why saving CoS/immigration data failed.
--
-- They are now added by reconcileColumns() in src/config/database.js, which
-- diffs PRAGMA table_info against the columns the app requires and issues
-- plain ALTER TABLE ADD COLUMN for whatever is missing. That works on both
-- fresh and existing databases, so the broken statements are removed here.

-- Create right_to_work_checks table
CREATE TABLE IF NOT EXISTS right_to_work_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  check_date TEXT NOT NULL,
  check_type TEXT NOT NULL,
  checked_by TEXT NOT NULL,
  outcome TEXT NOT NULL,
  immigration_permission_expiry TEXT,
  follow_up_required BOOLEAN DEFAULT 0,
  follow_up_due_date TEXT,
  notes TEXT,
  evidence_document_id INTEGER REFERENCES documents(id),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TIMESTAMP,
  deleted_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create compliance_alerts table
CREATE TABLE IF NOT EXISTS compliance_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT,
  triggered_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved BOOLEAN DEFAULT 0,
  resolved_date TIMESTAMP,
  resolved_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create visa_reminder_settings table
CREATE TABLE IF NOT EXISTS visa_reminder_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reminder_days TEXT DEFAULT '[180, 90, 60, 30]',
  rtw_reminder_days TEXT DEFAULT '[30, 7]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- employees.sponsored_worker is likewise added by reconcileColumns().
