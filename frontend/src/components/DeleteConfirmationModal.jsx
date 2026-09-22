import './DeleteConfirmationModal.css';

function DeleteConfirmationModal({
  isOpen,
  title = 'Delete Confirmation',
  message = 'Are you sure you want to proceed?',
  warningText = 'This action cannot be undone.',
  onConfirm,
  onCancel,
  isLoading = false,
  isDangerous = false
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className={`delete-confirmation-modal ${isDangerous ? 'dangerous' : ''}`}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button
            className="modal-close-btn"
            onClick={onCancel}
            disabled={isLoading}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-icon">
            {isDangerous ? '⚠️' : '❓'}
          </div>

          <p className="modal-message">{message}</p>

          {warningText && (
            <div className="modal-warning">
              <strong>⚠️ Warning:</strong> {warningText}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className={`btn ${isDangerous ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmationModal;
