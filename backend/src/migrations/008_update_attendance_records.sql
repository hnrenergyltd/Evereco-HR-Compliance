-- Create attendance_records in its current shape for fresh databases.
--
-- This file previously performed an unguarded table rebuild:
--   CREATE attendance_records_new -> INSERT ... SELECT work_location ...
--   -> DROP TABLE attendance_records -> RENAME _new TO attendance_records
--
-- Migrations re-run on every boot, so after the first successful rebuild the
-- INSERT...SELECT failed ("no such column: work_location", since the column is
-- now `location`) while the unconditional DROP still executed. The result was
-- that every backend restart silently deleted all attendance records and left
-- an empty table behind. Verified: a row inserted before a restart was gone
-- after it.
--
-- The rebuild is therefore removed. Fresh databases get the correct schema
-- from the CREATE below. Databases still on the legacy column names are
-- reconciled non-destructively by reconcileColumns() in src/config/database.js,
-- which only ever adds missing columns and never drops data.
CREATE TABLE IF NOT EXISTS attendance_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  work_date TEXT NOT NULL DEFAULT CURRENT_DATE,
  clock_in_time TEXT,
  clock_out_time TEXT,
  location TEXT,
  site_name TEXT,
  total_hours REAL,
  notes TEXT,
  status TEXT DEFAULT 'complete',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance_records(employee_id, work_date);

-- Ensure attendance_corrections table exists with correct schema
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

CREATE INDEX IF NOT EXISTS idx_attendance_corrections_employee ON attendance_corrections(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_corrections_status ON attendance_corrections(status);
