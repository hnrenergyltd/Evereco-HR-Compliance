-- Documents table for storing document metadata
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Employment', 'Right to Work', 'Immigration/Visa', 'Certificate of Sponsorship', 'Identity', 'Payroll', 'Qualifications', 'Absence', 'HR', 'Home Office', 'Other')),
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_mime_type TEXT,
  document_date TEXT,
  expiry_date TEXT,
  follow_up_date TEXT,
  notes TEXT,
  employee_visibility BOOLEAN DEFAULT 0,
  uploaded_by INTEGER NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_deleted BOOLEAN DEFAULT 0,
  deleted_by INTEGER REFERENCES users(id),
  deleted_at TIMESTAMP,
  archived BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document versions table for tracking document replacements
CREATE TABLE IF NOT EXISTS document_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_by INTEGER NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document download tokens for secure temporary access
CREATE TABLE IF NOT EXISTS document_download_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  used_by INTEGER REFERENCES users(id),
  used_at TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_documents_employee_id ON documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_expiry_date ON documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_documents_is_deleted ON documents(is_deleted);
CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_download_tokens_token ON document_download_tokens(token);
