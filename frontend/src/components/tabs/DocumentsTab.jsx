import { useState, useEffect, useRef } from 'react';
import '../tabs/DocumentsTab.css';

const DOCUMENT_CATEGORIES = [
  'Employment', 'Right to Work', 'Immigration/Visa', 'Certificate of Sponsorship',
  'Identity', 'Payroll', 'Qualifications', 'Absence', 'HR', 'Home Office', 'Other'
];

// Kept in step with ALLOWED_MIMETYPES in backend/src/middleware/upload.js.
const ALLOWED_MIMETYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

const CATEGORY_COLORS = {
  'Employment': '#3B82F6', 'Right to Work': '#EF4444', 'Immigration/Visa': '#A855F7',
  'Certificate of Sponsorship': '#14B8A6', 'Identity': '#F97316', 'Payroll': '#10B981',
  'Qualifications': '#6366F1', 'Absence': '#F59E0B', 'HR': '#EC4899', 'Home Office': '#DC2626', 'Other': '#6B7280'
};

function DocumentsTab({ employee, currentUser, isReadOnly = false }) {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const [uploadData, setUploadData] = useState({
    document_name: '', category: 'Employment', document_date: '', expiry_date: '',
    follow_up_date: '', notes: '', employee_visibility: false, file: null
  });

  const [filterCategory, setFilterCategory] = useState('all');
  const [filterExpiry, setFilterExpiry] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pageInfo, setPageInfo] = useState({
    total: 0, page: 1, limit: 10, totalPages: 0, hasNextPage: false, hasPreviousPage: false
  });

  const [showEditForm, setShowEditForm] = useState(false);
  const [editData, setEditData] = useState(null);

  const fileInputRef = useRef(null);

  // Uploading, editing and deleting documents is restricted to administrators.
  const isAdmin = currentUser?.role === 'admin' && !isReadOnly;

  // Filtering and paging are both server-side, so any change to them refetches.
  useEffect(() => {
    fetchDocuments();
  }, [employee.id, page, limit, filterCategory, filterExpiry]);

  // Any filter change invalidates the current page number.
  useEffect(() => {
    setPage(1);
  }, [filterCategory, filterExpiry, limit, employee.id]);

  // Search is server-side too, debounced so each keystroke is not a request.
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchDocuments();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  async function fetchDocuments() {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (filterCategory !== 'all') params.append('category', filterCategory);
      if (filterExpiry !== 'all') params.append('expiry_status', filterExpiry);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/employees/${employee.id}/documents?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
        setPageInfo({
          total: data.total ?? 0,
          page: data.page ?? 1,
          limit: data.limit ?? limit,
          totalPages: data.totalPages ?? 0,
          hasNextPage: Boolean(data.hasNextPage),
          hasPreviousPage: Boolean(data.hasPreviousPage)
        });
        // The server clamps out-of-range pages; mirror that back into state.
        if (data.page && data.page !== page) setPage(data.page);
      }
    } catch (error) { console.error('Error fetching documents:', error); }
    finally { setIsLoading(false); }
  }

  function resetUploadForm() {
    setUploadData({
      document_name: '', category: 'Employment', document_date: '', expiry_date: '',
      follow_up_date: '', notes: '', employee_visibility: false, file: null
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleUpload() {
    if (!isAdmin) {
      setMessage({ type: 'error', text: 'Only administrators can upload documents' });
      return;
    }

    if (!uploadData.file) {
      setMessage({ type: 'error', text: 'Please select a file to upload' });
      return;
    }
    if (!uploadData.document_name.trim()) {
      setMessage({ type: 'error', text: 'Document name is required' });
      return;
    }
    if (!uploadData.category) {
      setMessage({ type: 'error', text: 'Category is required' });
      return;
    }
    if (!uploadData.document_date) {
      setMessage({ type: 'error', text: 'Document date is required' });
      return;
    }

    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');

      // Sent as multipart/form-data. Content-Type is deliberately omitted so
      // the browser adds the multipart boundary itself.
      const form = new FormData();
      form.append('file', uploadData.file);
      form.append('document_name', uploadData.document_name.trim());
      form.append('category', uploadData.category);
      form.append('document_date', uploadData.document_date);
      if (uploadData.expiry_date) form.append('expiry_date', uploadData.expiry_date);
      if (uploadData.follow_up_date) form.append('follow_up_date', uploadData.follow_up_date);
      if (uploadData.notes) form.append('notes', uploadData.notes);
      form.append('employee_visibility', uploadData.employee_visibility ? 'true' : 'false');

      const response = await fetch(`/api/employees/${employee.id}/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      setMessage({ type: 'success', text: 'Document uploaded successfully' });
      setShowUploadForm(false);
      resetUploadForm();
      fetchDocuments();
      setTimeout(() => setMessage(null), 4000);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally { setIsProcessing(false); }
  }

  /*
   * Downloads go through a short-lived server-issued token rather than a
   * direct file URL, so access is re-checked server-side on each request.
   */
  async function handleDownload(doc) {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');

      const tokenRes = await fetch(`/api/employees/document/${doc.id}/download-token`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const tokenBody = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok) throw new Error(tokenBody.error || 'Not authorised to download this document');

      const fileRes = await fetch(
        `/api/employees/document/${doc.id}/download?token=${encodeURIComponent(tokenBody.token)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!fileRes.ok) {
        const err = await fileRes.json().catch(() => ({}));
        throw new Error(err.error || 'Download failed');
      }

      const blob = await fileRes.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.document_name || 'document';
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
      setTimeout(() => setMessage(null), 4000);
    } finally { setIsProcessing(false); }
  }

  function openEditForm(doc) {
    setEditData({
      id: doc.id,
      document_name: doc.document_name || '',
      category: doc.category || 'Employment',
      document_date: (doc.document_date || '').split('T')[0],
      expiry_date: (doc.expiry_date || '').split('T')[0],
      notes: doc.notes || '',
      employee_visibility: Boolean(doc.employee_visibility)
    });
    setShowPreview(false);
    setShowEditForm(true);
  }

  async function handleSaveEdit() {
    if (!isAdmin || !editData) return;

    if (!editData.document_name.trim()) {
      setMessage({ type: 'error', text: 'Document name is required' });
      return;
    }
    if (editData.document_date && editData.expiry_date &&
        new Date(editData.expiry_date) < new Date(editData.document_date)) {
      setMessage({ type: 'error', text: 'Expiry date must be after document date' });
      return;
    }

    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/employees/document/${editData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          document_name: editData.document_name.trim(),
          category: editData.category,
          document_date: editData.document_date || null,
          expiry_date: editData.expiry_date || null,
          notes: editData.notes || null,
          employee_visibility: editData.employee_visibility
        })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Update failed');

      setMessage({
        type: 'success',
        text: `Document updated successfully — last edited by ${result.edited_by} on ${formatDate(result.edited_at)}`
      });
      setShowEditForm(false);
      setEditData(null);
      fetchDocuments();
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally { setIsProcessing(false); }
  }

  async function handleDelete(doc) {
    if (!isAdmin) return;
    if (!window.confirm(`Delete "${doc.document_name}"? This can't be undone from here.`)) return;

    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/employees/document/${doc.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Delete failed');

      setMessage({ type: 'success', text: 'Document deleted' });
      setShowPreview(false);
      fetchDocuments();
      setTimeout(() => setMessage(null), 4000);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally { setIsProcessing(false); }
  }

  function getStatusBadge(expiryDate) {
    if (!expiryDate) return <span className="badge badge-valid">No Expiry</span>;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    if (expiry < today) {
      return <span className="badge badge-expired">Expired</span>;
    } else if (expiry <= thirtyDaysFromNow) {
      return <span className="badge badge-warning">Expiring Soon</span>;
    } else {
      return <span className="badge badge-valid">Valid</span>;
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB');
    } catch {
      return '—';
    }
  }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'File must be under 10MB' });
      e.target.value = '';
      return;
    }

    if (!ALLOWED_MIMETYPES.includes(file.type)) {
      setMessage({ type: 'error', text: 'Only PDF, images, Word, and Excel files allowed' });
      e.target.value = '';
      return;
    }

    setMessage(null);
    setUploadData({ ...uploadData, file });
  }

  function handleFileUploadClick() {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }

  // Filtering, searching and paging all happen server-side, so the rows that
  // come back are already the ones to render.
  const filteredDocs = documents;

  const rangeStart = pageInfo.total === 0 ? 0 : (pageInfo.page - 1) * pageInfo.limit + 1;
  const rangeEnd = Math.min(pageInfo.page * pageInfo.limit, pageInfo.total);

  return (
    <div className="documents-container">
      {message && <div className={`message ${message.type}`}>{message.text}</div>}

      <div className="filter-section">
        <div className="filter-group">
          <label>Category</label>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="all">All Categories</option>
            {DOCUMENT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <label>Expiry Status</label>
          <select value={filterExpiry} onChange={(e) => setFilterExpiry(e.target.value)}>
            <option value="all">All</option>
            <option value="valid">Valid</option>
            <option value="expiring_soon">Expiring Soon</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Search</label>
          <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        <div className="filter-group">
          <label>Show per page</label>
          <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>

        <button className="btn-filter-clear" onClick={() => { setFilterCategory('all'); setFilterExpiry('all'); setSearchTerm(''); setPage(1); }}>
          Clear
        </button>
      </div>

      {isAdmin && (
        <div className="upload-section">
          <button className="btn-upload-toggle" onClick={() => setShowUploadForm(!showUploadForm)}>
            {showUploadForm ? '✕ Cancel' : '+ Upload Document'}
          </button>

          {showUploadForm && (
            <div className="upload-form card">
              <h3>Upload Document</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Document Name *</label>
                  <input type="text" value={uploadData.document_name} onChange={(e) => setUploadData({ ...uploadData, document_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Category *</label>
                  <select value={uploadData.category} onChange={(e) => setUploadData({ ...uploadData, category: e.target.value })}>
                    {DOCUMENT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Document Date *</label>
                  <input type="date" max={new Date().toISOString().split('T')[0]} value={uploadData.document_date} onChange={(e) => setUploadData({ ...uploadData, document_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Expiry Date</label>
                  <input type="date" value={uploadData.expiry_date} onChange={(e) => setUploadData({ ...uploadData, expiry_date: e.target.value })} />
                </div>
              </div>

              <div className="form-group full-width">
                <label>Notes (internal — not shown to the employee)</label>
                <textarea value={uploadData.notes} onChange={(e) => setUploadData({ ...uploadData, notes: e.target.value })} rows="3" />
              </div>

              <div className="form-group full-width">
                <label>File Upload *</label>
                <div className="file-upload" onClick={handleFileUploadClick}>
                  <input ref={fileInputRef} type="file" onChange={handleFileSelect} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" />
                  <p className="file-info">{uploadData.file ? uploadData.file.name : 'Select file — PDF, image, Word or Excel, max 10MB'}</p>
                </div>
              </div>

              <div className="form-group full-width checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={uploadData.employee_visibility}
                    onChange={(e) => setUploadData({ ...uploadData, employee_visibility: e.target.checked })}
                  />
                  Visible to employee
                </label>
                <p className="field-hint">
                  When unticked the document is visible to administrators only.
                </p>
              </div>

              <div className="form-actions">
                <button className="btn-save" onClick={handleUpload} disabled={isProcessing}>
                  {isProcessing ? 'Uploading…' : 'Upload Document'}
                </button>
                <button className="btn-cancel" onClick={() => { setShowUploadForm(false); resetUploadForm(); }} disabled={isProcessing}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <p className="loading">Loading documents...</p>
      ) : filteredDocs.length === 0 ? (
        <p className="empty-message">
          {isAdmin ? 'No documents found' : 'No documents available to view'}
        </p>
      ) : (
        <>
        <p className="results-summary">
          Showing {rangeStart}-{rangeEnd} of {pageInfo.total} document{pageInfo.total === 1 ? '' : 's'}
        </p>
        <div className="documents-table-wrapper">
          <table className="documents-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Category</th>
                <th>Document Date</th>
                <th>Expiry</th>
                <th>Status</th>
                {isAdmin && <th>Visibility</th>}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map(doc => (
                <tr key={doc.id}>
                  <td className="doc-name">{doc.document_name}</td>
                  <td>
                    <span className="category-badge" style={{ backgroundColor: CATEGORY_COLORS[doc.category] }}>
                      {doc.category}
                    </span>
                  </td>
                  <td>{formatDate(doc.document_date)}</td>
                  <td>{formatDate(doc.expiry_date)}</td>
                  <td>{getStatusBadge(doc.expiry_date)}</td>
                  {isAdmin && (
                    <td>
                      <span className={`badge ${doc.employee_visibility ? 'badge-valid' : 'badge-muted'}`}>
                        {doc.employee_visibility ? 'Employee' : 'Admin only'}
                      </span>
                    </td>
                  )}
                  <td className="actions">
                    <button className="btn-action btn-view" onClick={() => { setSelectedDocument(doc); setShowPreview(true); }}>
                      View
                    </button>
                    <button className="btn-action btn-download" onClick={() => handleDownload(doc)} disabled={isProcessing}>
                      Download
                    </button>
                    {isAdmin && (
                      <button className="btn-action btn-edit" onClick={() => openEditForm(doc)} disabled={isProcessing}>
                        Edit
                      </button>
                    )}
                    {isAdmin && (
                      <button className="btn-action btn-delete" onClick={() => handleDelete(doc)} disabled={isProcessing}>
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pageInfo.totalPages > 1 && (
          <div className="pagination-controls">
            <button
              className="btn-page"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={!pageInfo.hasPreviousPage || isLoading}
            >
              ‹ Previous
            </button>

            <span className="page-indicator">
              Page {pageInfo.page} of {pageInfo.totalPages}
            </span>

            <button
              className="btn-page"
              onClick={() => setPage(p => p + 1)}
              disabled={!pageInfo.hasNextPage || isLoading}
            >
              Next ›
            </button>
          </div>
        )}
        </>
      )}

      {showEditForm && editData && isAdmin && (
        <div className="modal-overlay" onClick={() => !isProcessing && setShowEditForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Document</h3>
              <button className="btn-close" onClick={() => setShowEditForm(false)} disabled={isProcessing}>✕</button>
            </div>

            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Document Name *</label>
                  <input
                    type="text"
                    value={editData.document_name}
                    onChange={(e) => setEditData({ ...editData, document_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Category *</label>
                  <select
                    value={editData.category}
                    onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                  >
                    {DOCUMENT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Document Date</label>
                  <input
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    value={editData.document_date}
                    onChange={(e) => setEditData({ ...editData, document_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Expiry Date</label>
                  <input
                    type="date"
                    value={editData.expiry_date}
                    onChange={(e) => setEditData({ ...editData, expiry_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group full-width">
                <label>Notes (internal — not shown to the employee)</label>
                <textarea
                  rows="3"
                  value={editData.notes}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                />
              </div>

              <div className="form-group full-width checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={editData.employee_visibility}
                    onChange={(e) => setEditData({ ...editData, employee_visibility: e.target.checked })}
                  />
                  Visible to employee
                </label>
                <p className="field-hint">
                  The uploader, upload date and the file itself cannot be changed.
                </p>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-save" onClick={handleSaveEdit} disabled={isProcessing}>
                {isProcessing ? 'Saving…' : 'Save Changes'}
              </button>
              <button className="btn-cancel" onClick={() => setShowEditForm(false)} disabled={isProcessing}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showPreview && selectedDocument && (
        <div className="modal-overlay" onClick={() => setShowPreview(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedDocument.document_name}</h3>
              <button className="btn-close" onClick={() => setShowPreview(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="preview-info">
                <div className="info-row">
                  <span className="label">Category:</span>
                  <span className="category-badge" style={{ backgroundColor: CATEGORY_COLORS[selectedDocument.category] }}>
                    {selectedDocument.category}
                  </span>
                </div>
                <div className="info-row">
                  <span className="label">Document Date:</span>
                  <span>{formatDate(selectedDocument.document_date)}</span>
                </div>
                <div className="info-row">
                  <span className="label">Expiry:</span>
                  <span>{getStatusBadge(selectedDocument.expiry_date)}</span>
                </div>
                <div className="info-row">
                  <span className="label">Uploaded:</span>
                  <span>
                    {selectedDocument.uploadedByName
                      ? `by ${selectedDocument.uploadedByName}`
                      : ''}
                    {selectedDocument.uploaded_at
                      ? ` on ${formatDate(selectedDocument.uploaded_at)}`
                      : ''}
                    {!selectedDocument.uploadedByName && !selectedDocument.uploaded_at && '—'}
                  </span>
                </div>
                {isAdmin && (
                  <div className="info-row">
                    <span className="label">Visible to employee:</span>
                    <span>{selectedDocument.employee_visibility ? 'Yes' : 'No'}</span>
                  </div>
                )}
                {isAdmin && selectedDocument.notes && (
                  <div className="info-row full-width">
                    <span className="label">Notes:</span>
                    <p>{selectedDocument.notes}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-save" onClick={() => handleDownload(selectedDocument)} disabled={isProcessing}>
                Download
              </button>
              {isAdmin && (
                <button className="btn-action btn-edit" onClick={() => openEditForm(selectedDocument)} disabled={isProcessing}>
                  Edit
                </button>
              )}
              {isAdmin && (
                <button className="btn-action btn-delete" onClick={() => handleDelete(selectedDocument)} disabled={isProcessing}>
                  Delete
                </button>
              )}
              <button className="btn-cancel" onClick={() => setShowPreview(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DocumentsTab;


