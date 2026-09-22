function SalaryHistoryTable() {
  return (
    <div className="card">
      <h3>Salary History</h3>
      <div style={{ marginTop: '15px' }}>
        <p style={{ color: 'var(--text-light)' }}>Salary history table will be rendered here</p>
        <table className="table" style={{ marginTop: '15px' }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Previous Salary</th>
              <th>New Salary</th>
              <th>Reason</th>
              <th>Changed By</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colspan="5" style={{ textAlign: 'center', color: 'var(--text-light)' }}>
                No salary history records yet
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SalaryHistoryTable;
