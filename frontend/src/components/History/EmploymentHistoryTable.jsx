function EmploymentHistoryTable() {
  return (
    <div className="card">
      <h3>Employment History</h3>
      <div style={{ marginTop: '15px' }}>
        <p style={{ color: 'var(--text-light)' }}>Employment history table will be rendered here</p>
        <table className="table" style={{ marginTop: '15px' }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Field Changed</th>
              <th>Previous Value</th>
              <th>New Value</th>
              <th>Changed By</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colspan="5" style={{ textAlign: 'center', color: 'var(--text-light)' }}>
                No employment history records yet
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default EmploymentHistoryTable;
