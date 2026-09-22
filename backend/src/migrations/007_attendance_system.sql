-- Attendance Records table
CREATE TABLE IF NOT EXISTS attendance_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  `date` TEXT NOT NULL,
  clock_in_time TEXT,
  clock_out_time TEXT,
  location TEXT NOT NULL,
  site_name TEXT,
  total_hours REAL,
  notes TEXT,
  status TEXT DEFAULT 'incomplete',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attendance Corrections table
CREATE TABLE IF NOT EXISTS attendance_corrections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  attendance_record_id INTEGER NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
  original_clock_in TEXT,
  original_clock_out TEXT,
  requested_clock_in TEXT NOT NULL,
  requested_clock_out TEXT,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  approved_by INTEGER REFERENCES users(id),
  approval_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance_records(employee_id, `date`);
CREATE INDEX IF NOT EXISTS idx_attendance_corrections_employee ON attendance_corrections(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_corrections_status ON attendance_corrections(status);
