-- Update absence_records table to add missing fields
ALTER TABLE absence_records ADD COLUMN status TEXT DEFAULT 'Pending';
ALTER TABLE absence_records ADD COLUMN requested_by INTEGER REFERENCES users(id);
ALTER TABLE absence_records ADD COLUMN requested_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE absence_records ADD COLUMN notes TEXT;
ALTER TABLE absence_records ADD COLUMN document_id INTEGER REFERENCES documents(id);
ALTER TABLE absence_records ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE absence_records ADD COLUMN is_deleted BOOLEAN DEFAULT 0;

-- Create annual_leave_entitlements table
CREATE TABLE IF NOT EXISTS annual_leave_entitlements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  entitlement INTEGER NOT NULL,
  taken INTEGER DEFAULT 0,
  booked INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id, year)
);
