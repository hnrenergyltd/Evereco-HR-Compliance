import { query } from '../config/database.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { ALLOWED_MIMETYPES, MAX_FILE_SIZE } from '../middleware/upload.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/*
 * Where uploaded documents live. In development this is a folder inside the
 * repository; in a container it must point at a mounted persistent volume,
 * because the container filesystem is rebuilt on every deploy and anything
 * written to it is lost.
 */
const UPLOAD_DIR = process.env.DOCUMENT_STORAGE_PATH
  ? path.resolve(process.env.DOCUMENT_STORAGE_PATH)
  : path.join(__dirname, '../../secure_documents');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/*
 * Multipart form fields always arrive as strings, so a plain truthiness test
 * would read the string "false" as true and expose the document to the
 * employee. Only an explicit affirmative counts.
 */
function toBool(value) {
  return value === true || value === 'true' || value === '1' || value === 'on';
}

/*
 * Documents are served through the token-gated download endpoint, so the
 * on-disk location must never reach a client.
 */
function stripFilePath({ file_path, ...rest }) {
  return rest;
}

export async function uploadDocument(req, res) {
  const { id: employeeId } = req.params;

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can upload documents' });
  }

  try {
    const { document_name, category, document_date, expiry_date, follow_up_date, notes, employee_visibility } = req.body;

    // Populated by the multer middleware on the route (multipart/form-data).
    const file = req.file;

    // Validation
    if (!document_name || !category) {
      return res.status(400).json({ error: 'Document name and category required' });
    }

    if (!file) {
      return res.status(400).json({ error: 'File required' });
    }

    if (!document_date) {
      return res.status(400).json({ error: 'Document date required' });
    }

    // Reject uploads aimed at an employee that does not exist, so a document
    // can never be attached to a bad id.
    const employeeExists = await query(
      `SELECT 1 AS ok FROM employees WHERE rowid = ? AND deleted_at IS NULL`,
      [parseInt(employeeId)]
    );
    if (!employeeExists.rows[0]) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Size and MIME are enforced by the upload middleware; these remain as a
    // backstop in case the controller is ever called from another path.
    if (file.size > MAX_FILE_SIZE) {
      return res.status(400).json({ error: 'File must be under 10MB' });
    }

    if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
      return res.status(400).json({ error: 'Only PDF, images, Word, and Excel files allowed' });
    }

    // Validate dates
    if (document_date) {
      const docDate = new Date(document_date);
      if (docDate > new Date()) {
        return res.status(400).json({ error: 'Document date cannot be in the future' });
      }
    }

    if (document_date && expiry_date) {
      const docDate = new Date(document_date);
      const expDate = new Date(expiry_date);
      if (expDate < docDate) {
        return res.status(400).json({ error: 'Expiry date must be after document date' });
      }
    }

    // Generate secure file path
    const fileExtension = path.extname(file.originalname);
    const secureFileName = crypto.randomUUID() + fileExtension;
    const fileDirectory = path.join(UPLOAD_DIR, crypto.randomUUID());
    const filePath = path.join(fileDirectory, secureFileName);

    // Create directory if doesn't exist
    if (!fs.existsSync(fileDirectory)) {
      fs.mkdirSync(fileDirectory, { recursive: true });
    }

    // Save file
    fs.writeFileSync(filePath, file.buffer);

    // Store in database
    const docResult = await query(
      `INSERT INTO documents (employee_id, document_name, category, file_path, file_size, file_mime_type,
                              document_date, expiry_date, follow_up_date, notes, employee_visibility, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [parseInt(employeeId), document_name, category, filePath.replace(/\\/g, '/'), file.size, file.mimetype,
       document_date || null, expiry_date || null, follow_up_date || null, notes || null,
       toBool(employee_visibility) ? 1 : 0, req.user.id]
    );

    // uploaded_at has no DEFAULT on databases where the column was added by
    // reconcileColumns(), so set it explicitly.
    const docId = docResult.lastID;
    await query(`UPDATE documents SET uploaded_at = CURRENT_TIMESTAMP WHERE rowid = ?`, [docId]);

    // Create version record
    await query(
      `INSERT INTO document_versions (document_id, version_number, file_path, uploaded_by, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [docId, 1, filePath.replace(/\\/g, '/'), req.user.id, 'Initial version']
    );

    // Create audit trail: who uploaded, when, for which employee, which file.
    try {
      const actor = await query(`SELECT name FROM users WHERE rowid = ?`, [req.user.id]);
      const actorName = actor.rows[0]?.name || `user ${req.user.id}`;
      await query(
        `INSERT INTO audit_history (user_id, action, created_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)`,
        [
          req.user.id,
          `Document uploaded by ${actorName}: "${document_name}" (${file.originalname}, ` +
            `${category}) for employee ${employeeId}`,
        ]
      );
    } catch (err) {
      console.log('⚠️  Audit trail error:', err.message);
    }

    res.json({ success: true, documentId: docId, message: 'Document uploaded successfully' });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
}

const ALLOWED_PAGE_SIZES = [10, 25, 50];
const DEFAULT_PAGE_SIZE = 10;

export async function getEmployeeDocuments(req, res) {
  const { id: employeeId } = req.params;
  const { category, search, expiry_status, include_archived, page, limit } = req.query;

  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Reject anything outside the offered page sizes so a caller cannot ask
    // for the whole table in one request.
    const requestedLimit = parseInt(limit, 10);
    const pageSize = ALLOWED_PAGE_SIZES.includes(requestedLimit) ? requestedLimit : DEFAULT_PAGE_SIZE;

    const requestedPage = parseInt(page, 10);
    const currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

    // The filters below are applied to both the count and the page query, so
    // the total always reflects what the user is actually filtering on.
    let whereSql = ` FROM documents WHERE employee_id = ? AND is_deleted = 0`;
    const params = [parseInt(employeeId)];

    // If not admin, only show documents visible to employee or uploaded by them
    if (!isAdmin) {
      // req.user.id is the users-table id; employee records are keyed by
      // employee_id. Comparing the two lets an employee reach another
      // person's documents whenever the id numbers happen to coincide.
      if (parseInt(employeeId) !== req.user.employee_id) {
        return res.status(403).json({ error: 'Cannot access other employees documents' });
      }
      whereSql += ` AND (employee_visibility = 1 OR uploaded_by = ?)`;
      params.push(userId);
    }

    if (!include_archived || include_archived === 'false') {
      whereSql += ` AND archived = 0`;
    }

    if (category) {
      whereSql += ` AND category = ?`;
      params.push(category);
    }

    if (search) {
      whereSql += ` AND document_name LIKE ?`;
      params.push(`%${search}%`);
    }

    // Filter by expiry status
    if (expiry_status) {
      const today = new Date().toISOString().split('T')[0];
      if (expiry_status === 'valid') {
        whereSql += ` AND (expiry_date IS NULL OR expiry_date > ?)`;
        params.push(today);
      } else if (expiry_status === 'expiring_soon') {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0];
        whereSql += ` AND expiry_date IS NOT NULL AND expiry_date <= ? AND expiry_date > ?`;
        params.push(thirtyDaysStr, today);
      } else if (expiry_status === 'expired') {
        whereSql += ` AND expiry_date IS NOT NULL AND expiry_date <= ?`;
        params.push(today);
      }
    }

    // Total matching rows, before the page window is applied.
    const countResult = await query(`SELECT COUNT(*) AS total${whereSql}`, params);
    const total = countResult.rows[0]?.total ?? 0;

    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    // Clamp so deleting the last item on the final page cannot strand the
    // caller on an empty page.
    const safePage = totalPages === 0 ? 1 : Math.min(currentPage, totalPages);
    const offset = (safePage - 1) * pageSize;

    /*
     * uploaded_at is NULL for rows created before that column existed, and
     * NULLs sort last under DESC, so id is the tie-breaker to keep "newest
     * first" stable.
     */
    const sql =
      `SELECT rowid as id, employee_id, document_name, category, file_path, file_size, file_mime_type,
              document_date, expiry_date, follow_up_date, notes, employee_visibility, uploaded_by,
              uploaded_at, updated_at, archived` +
      whereSql +
      ` ORDER BY uploaded_at DESC, rowid DESC LIMIT ? OFFSET ?`;

    const result = await query(sql, [...params, pageSize, offset]);

    // Resolve uploader names in one query so the UI can show
    // "Uploaded by [Admin Name]" without an N+1 lookup per document.
    const uploaderIds = [...new Set(result.rows.map((d) => d.uploaded_by).filter(Boolean))];
    const uploaderNames = {};
    if (uploaderIds.length > 0) {
      const placeholders = uploaderIds.map(() => '?').join(', ');
      const names = await query(
        `SELECT rowid as id, name FROM users WHERE rowid IN (${placeholders})`,
        uploaderIds
      );
      names.rows.forEach((u) => {
        uploaderNames[u.id] = u.name;
      });
    }

    // Add status badge
    const today = new Date().toISOString().split('T')[0];
    const documentsWithStatus = result.rows.map((doc) => {
      let status = 'valid';
      if (doc.expiry_date) {
        if (doc.expiry_date < today) {
          status = 'expired';
        } else if (doc.expiry_date <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) {
          status = 'expiring_soon';
        }
      }

      const shaped = {
        ...stripFilePath(doc),
        status,
        employee_visibility: Boolean(doc.employee_visibility),
        uploadedByName: uploaderNames[doc.uploaded_by] || 'Unknown',
      };

      // Internal notes are for administrators only.
      if (!isAdmin) delete shaped.notes;

      return shaped;
    });

    res.json({
      documents: documentsWithStatus,
      total,
      page: safePage,
      limit: pageSize,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPreviousPage: safePage > 1,
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
}

export async function getDocument(req, res) {
  const { documentId } = req.params;

  try {
    const result = await query(
      `SELECT rowid as id, employee_id, document_name, category, file_path, file_size, file_mime_type,
              document_date, expiry_date, follow_up_date, notes, employee_visibility, uploaded_by, uploaded_at, archived
       FROM documents WHERE rowid = ? AND is_deleted = 0`,
      [parseInt(documentId)]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const document = result.rows[0];

    // Permission check
    if (req.user.role !== 'admin') {
      if (document.employee_id !== req.user.employee_id || !document.employee_visibility) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // The users table stores a single `name`; selecting first_name/surname
    // here failed, so the uploader always came back as "Unknown".
    const uploaderResult = await query(
      `SELECT name FROM users WHERE rowid = ?`,
      [document.uploaded_by]
    );

    const uploader = uploaderResult.rows[0]?.name || 'Unknown';

    const shaped = {
      ...stripFilePath(document),
      employee_visibility: Boolean(document.employee_visibility),
      uploadedByName: uploader,
    };

    if (req.user.role !== 'admin') delete shaped.notes;

    res.json(shaped);
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
}

export async function generateDownloadToken(req, res) {
  const { documentId } = req.params;

  try {
    const docResult = await query(
      `SELECT rowid as id, employee_id, employee_visibility FROM documents WHERE rowid = ? AND is_deleted = 0`,
      [parseInt(documentId)]
    );

    if (!docResult.rows[0]) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const document = docResult.rows[0];

    // Permission check
    if (req.user.role !== 'admin') {
      if (document.employee_id !== req.user.employee_id || !document.employee_visibility) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Generate token valid for 1 hour
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await query(
      `INSERT INTO document_download_tokens (document_id, token, expires_at)
       VALUES (?, ?, ?)`,
      [parseInt(documentId), token, expiresAt]
    );

    res.json({ token, expiresIn: 3600 });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
}

export async function downloadDocument(req, res) {
  const { documentId } = req.params;
  const { token } = req.query;

  try {
    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    // Verify token
    const tokenResult = await query(
      `SELECT rowid as id, document_id, expires_at FROM document_download_tokens WHERE token = ?`,
      [token]
    );

    if (!tokenResult.rows[0]) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const tokenRecord = tokenResult.rows[0];
    const now = new Date();
    const expiresAt = new Date(tokenRecord.expires_at);

    if (now > expiresAt) {
      return res.status(401).json({ error: 'Token expired' });
    }

    // Get document
    const docResult = await query(
      `SELECT rowid as id, employee_id, document_name, file_path, file_mime_type, employee_visibility
       FROM documents WHERE rowid = ? AND is_deleted = 0`,
      [parseInt(documentId)]
    );

    if (!docResult.rows[0]) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const document = docResult.rows[0];

    // Final permission check
    if (req.user.role !== 'admin') {
      if (document.employee_id !== req.user.employee_id || !document.employee_visibility) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Update token as used
    await query(
      `UPDATE document_download_tokens SET used_at = CURRENT_TIMESTAMP, used_by = ? WHERE rowid = ?`,
      [req.user.id, tokenRecord.id]
    );

    // Log download
    try {
      await query(
        `INSERT INTO audit_history (user_id, action, created_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)`,
        [req.user.id, `Document downloaded: ${document.document_name}`]
      );
    } catch (err) {
      console.log('⚠️  Audit trail error:', err.message);
    }

    // Send file
    const filePath = document.file_path.replace(/\//g, '\\');
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    const fileContent = fs.readFileSync(filePath);
    res.setHeader('Content-Type', document.file_mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${document.document_name}"`);
    res.setHeader('Content-Length', fileContent.length);
    res.send(fileContent);
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
}

export async function updateDocument(req, res) {
  const { documentId } = req.params;

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can update documents' });
  }

  try {
    const { document_name, category, document_date, expiry_date, follow_up_date, notes, employee_visibility } = req.body;

    // Load the current row first: it is needed for the 404 check and to diff
    // old against new for the audit entry.
    const existingResult = await query(
      `SELECT rowid as id, document_name, category, document_date, expiry_date,
              follow_up_date, notes, employee_visibility
       FROM documents WHERE rowid = ? AND is_deleted = 0`,
      [parseInt(documentId)]
    );

    const existing = existingResult.rows[0];
    if (!existing) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (!document_name || !String(document_name).trim()) {
      return res.status(400).json({ error: 'Document name is required' });
    }

    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }

    if (document_date && new Date(document_date) > new Date()) {
      return res.status(400).json({ error: 'Document date cannot be in the future' });
    }

    if (document_date && expiry_date && new Date(expiry_date) < new Date(document_date)) {
      return res.status(400).json({ error: 'Expiry date must be after document date' });
    }

    const updated = {
      document_name: String(document_name).trim(),
      category,
      document_date: document_date || null,
      expiry_date: expiry_date || null,
      follow_up_date: follow_up_date || null,
      notes: notes || null,
      employee_visibility: toBool(employee_visibility) ? 1 : 0,
    };

    // employee_id, uploaded_by, uploaded_at, file_path and file_size are
    // deliberately absent: they are the document's provenance and must stay
    // fixed once uploaded.
    await query(
      `UPDATE documents SET document_name = ?, category = ?, document_date = ?, expiry_date = ?,
                           follow_up_date = ?, notes = ?, employee_visibility = ?, updated_at = CURRENT_TIMESTAMP
       WHERE rowid = ?`,
      [updated.document_name, updated.category, updated.document_date, updated.expiry_date,
       updated.follow_up_date, updated.notes, updated.employee_visibility, parseInt(documentId)]
    );

    const editedAtResult = await query(
      `SELECT updated_at FROM documents WHERE rowid = ?`,
      [parseInt(documentId)]
    );
    const editedAt = editedAtResult.rows[0]?.updated_at || new Date().toISOString();

    const actorResult = await query(`SELECT name FROM users WHERE rowid = ?`, [req.user.id]);
    const editedBy = actorResult.rows[0]?.name || `user ${req.user.id}`;

    // Record only the fields that actually changed, so the audit entry shows
    // what the edit did rather than the whole row.
    const changed = Object.keys(updated).filter((key) => {
      const before = key === 'employee_visibility' ? (existing[key] ? 1 : 0) : existing[key] ?? null;
      return before !== updated[key];
    });

    if (changed.length > 0) {
      try {
        const previousValues = {};
        const newValues = {};
        changed.forEach((key) => {
          previousValues[key] =
            key === 'employee_visibility' ? Boolean(existing[key]) : existing[key] ?? null;
          newValues[key] =
            key === 'employee_visibility' ? Boolean(updated[key]) : updated[key];
        });

        await query(
          `INSERT INTO audit_history (user_id, action, entity_type, entity_id, previous_value, new_value, created_at)
           VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            req.user.id,
            `document_edited by ${editedBy}: ${changed.join(', ')}`,
            'documents',
            parseInt(documentId),
            JSON.stringify(previousValues),
            JSON.stringify(newValues),
          ]
        );
      } catch (err) {
        console.log('⚠️  Audit trail error:', err.message);
      }
    }

    res.json({
      success: true,
      document_id: parseInt(documentId),
      edited_at: editedAt,
      edited_by: editedBy,
      changed_fields: changed,
      message: 'Document updated successfully',
    });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
}

export async function replaceDocument(req, res) {
  const { documentId } = req.params;

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can replace documents' });
  }

  try {
    const { document_date, expiry_date, notes } = req.body;
    const file = req.file; // supplied by the multer middleware on the route

    if (!file) {
      return res.status(400).json({ error: 'New file required' });
    }

    if (file.size > MAX_FILE_SIZE) {
      return res.status(400).json({ error: 'File must be under 10MB' });
    }

    if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
      return res.status(400).json({ error: 'Only PDF, images, Word, and Excel files allowed' });
    }

    // Get current document
    const docResult = await query(
      `SELECT rowid as id, document_name, file_path FROM documents WHERE rowid = ? AND is_deleted = 0`,
      [parseInt(documentId)]
    );

    if (!docResult.rows[0]) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const currentDoc = docResult.rows[0];

    // Get current version number
    const versionResult = await query(
      `SELECT MAX(version_number) as max_version FROM document_versions WHERE document_id = ?`,
      [parseInt(documentId)]
    );

    const nextVersion = (versionResult.rows[0]?.max_version || 0) + 1;

    // Save new file
    const fileExtension = path.extname(file.originalname);
    const secureFileName = crypto.randomUUID() + fileExtension;
    const fileDirectory = path.join(UPLOAD_DIR, crypto.randomUUID());
    const newFilePath = path.join(fileDirectory, secureFileName);

    if (!fs.existsSync(fileDirectory)) {
      fs.mkdirSync(fileDirectory, { recursive: true });
    }

    fs.writeFileSync(newFilePath, file.buffer);

    // Update document with new file
    await query(
      `UPDATE documents SET file_path = ?, file_size = ?, file_mime_type = ?,
                           document_date = ?, expiry_date = ?, updated_at = CURRENT_TIMESTAMP
       WHERE rowid = ?`,
      [newFilePath.replace(/\\/g, '/'), file.size, file.mimetype,
       document_date || null, expiry_date || null, parseInt(documentId)]
    );

    // Create version record
    await query(
      `INSERT INTO document_versions (document_id, version_number, file_path, uploaded_by, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [parseInt(documentId), nextVersion, newFilePath.replace(/\\/g, '/'), req.user.id, notes || 'Version replacement']
    );

    // Audit trail
    try {
      await query(
        `INSERT INTO audit_history (user_id, action, created_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)`,
        [req.user.id, `Document replaced: ${currentDoc.document_name} (v${nextVersion})`]
      );
    } catch (err) {
      console.log('⚠️  Audit trail error:', err.message);
    }

    res.json({ success: true, documentId, message: 'Document replaced successfully' });
  } catch (error) {
    console.error('Error replacing document:', error);
    res.status(500).json({ error: 'Failed to replace document' });
  }
}

export async function deleteDocument(req, res) {
  const { documentId } = req.params;
  const { archive } = req.query;

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can delete documents' });
  }

  try {
    const docResult = await query(
      `SELECT rowid as id, document_name FROM documents WHERE rowid = ? AND is_deleted = 0`,
      [parseInt(documentId)]
    );

    if (!docResult.rows[0]) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const document = docResult.rows[0];

    if (archive === 'true') {
      // Archive instead of delete
      await query(
        `UPDATE documents SET archived = 1, updated_at = CURRENT_TIMESTAMP WHERE rowid = ?`,
        [parseInt(documentId)]
      );

      try {
        await query(
          `INSERT INTO audit_history (user_id, action, created_at)
           VALUES (?, ?, CURRENT_TIMESTAMP)`,
          [req.user.id, `Document archived: ${document.document_name}`]
        );
      } catch (err) {
        console.log('⚠️  Audit trail error:', err.message);
      }

      res.json({ success: true, message: 'Document archived' });
    } else {
      // Soft delete
      await query(
        `UPDATE documents SET is_deleted = 1, deleted_by = ?, deleted_at = CURRENT_TIMESTAMP WHERE rowid = ?`,
        [req.user.id, parseInt(documentId)]
      );

      try {
        await query(
          `INSERT INTO audit_history (user_id, action, created_at)
           VALUES (?, ?, CURRENT_TIMESTAMP)`,
          [req.user.id, `Document deleted: ${document.document_name}`]
        );
      } catch (err) {
        console.log('⚠️  Audit trail error:', err.message);
      }

      res.json({ success: true, message: 'Document deleted' });
    }
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
}

export async function getAllDocuments(req, res) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can view all documents' });
  }

  try {
    const { employee_id, category, expiry_status, search, limit = 50, offset = 0 } = req.query;

    let sql = `SELECT d.rowid as id, d.employee_id, e.first_name, e.surname, d.document_name, d.category,
                      d.file_path, d.file_size, d.expiry_date, d.uploaded_at, d.employee_visibility, d.archived
               FROM documents d
               JOIN employees e ON d.employee_id = e.rowid
               WHERE d.is_deleted = 0`;

    const params = [];

    if (employee_id) {
      sql += ` AND d.employee_id = ?`;
      params.push(parseInt(employee_id));
    }

    if (category) {
      sql += ` AND d.category = ?`;
      params.push(category);
    }

    if (search) {
      sql += ` AND d.document_name LIKE ?`;
      params.push(`%${search}%`);
    }

    if (expiry_status) {
      const today = new Date().toISOString().split('T')[0];
      if (expiry_status === 'valid') {
        sql += ` AND (d.expiry_date IS NULL OR d.expiry_date > ?)`;
        params.push(today);
      } else if (expiry_status === 'expiring_soon') {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0];
        sql += ` AND d.expiry_date IS NOT NULL AND d.expiry_date <= ? AND d.expiry_date > ?`;
        params.push(thirtyDaysStr, today);
      } else if (expiry_status === 'expired') {
        sql += ` AND d.expiry_date IS NOT NULL AND d.expiry_date <= ?`;
        params.push(today);
      }
    }

    sql += ` ORDER BY d.uploaded_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);

    const today = new Date().toISOString().split('T')[0];
    const documentsWithStatus = result.rows.map(doc => {
      let status = 'valid';
      if (doc.expiry_date) {
        if (doc.expiry_date < today) {
          status = 'expired';
        } else if (doc.expiry_date <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) {
          status = 'expiring_soon';
        }
      }
      return {
        ...doc,
        status,
        employee_visibility: Boolean(doc.employee_visibility),
        employeeName: `${doc.first_name} ${doc.surname}`
      };
    });

    res.json(documentsWithStatus);
  } catch (error) {
    console.error('Error fetching all documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
}

export async function getExpiringDocuments(req, res) {
  try {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const thirtyDaysStr = thirtyDaysFromNow.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    const result = await query(
      `SELECT rowid as id, employee_id, document_name, category, expiry_date
       FROM documents WHERE expiry_date IS NOT NULL AND expiry_date <= ? AND expiry_date > ? AND is_deleted = 0
       ORDER BY expiry_date ASC`,
      [thirtyDaysStr, today]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching expiring documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
}
