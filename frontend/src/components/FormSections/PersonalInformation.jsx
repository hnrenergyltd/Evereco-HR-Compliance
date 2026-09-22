function PersonalInformation({ data, onChange, errors, isEditing }) {
  return (
    <fieldset disabled={!isEditing} style={{ border: 'none', padding: '0', margin: '20px 0' }}>
      <h4 style={{ color: 'var(--primary)', marginBottom: '15px', fontSize: '1.1em' }}>Personal Information</h4>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
        <div className="form-group">
          <label>Title</label>
          <select
            value={data.title || ''}
            onChange={(e) => onChange('title', e.target.value)}
          >
            <option value="">Select Title</option>
            <option value="Mr">Mr</option>
            <option value="Mrs">Mrs</option>
            <option value="Ms">Ms</option>
            <option value="Dr">Dr</option>
            <option value="Prof">Prof</option>
          </select>
        </div>

        <div className="form-group">
          <label>First Name <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input
            type="text"
            value={data.first_name || ''}
            onChange={(e) => onChange('first_name', e.target.value)}
            placeholder="First name"
          />
          {errors.first_name && <span style={{ color: 'var(--danger)', fontSize: '0.85em' }}>{errors.first_name}</span>}
        </div>

        <div className="form-group">
          <label>Middle Name</label>
          <input
            type="text"
            value={data.middle_name || ''}
            onChange={(e) => onChange('middle_name', e.target.value)}
            placeholder="Middle name"
          />
        </div>

        <div className="form-group">
          <label>Surname <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input
            type="text"
            value={data.surname || ''}
            onChange={(e) => onChange('surname', e.target.value)}
            placeholder="Surname"
          />
          {errors.surname && <span style={{ color: 'var(--danger)', fontSize: '0.85em' }}>{errors.surname}</span>}
        </div>

        <div className="form-group">
          <label>Preferred Name</label>
          <input
            type="text"
            value={data.preferred_name || ''}
            onChange={(e) => onChange('preferred_name', e.target.value)}
            placeholder="Preferred name"
          />
        </div>

        <div className="form-group">
          <label>Date of Birth</label>
          <input
            type="date"
            value={data.date_of_birth || ''}
            onChange={(e) => onChange('date_of_birth', e.target.value)}
          />
          {errors.date_of_birth && <span style={{ color: 'var(--danger)', fontSize: '0.85em' }}>{errors.date_of_birth}</span>}
        </div>

        <div className="form-group">
          <label>Nationality</label>
          <input
            type="text"
            value={data.nationality || ''}
            onChange={(e) => onChange('nationality', e.target.value)}
            placeholder="e.g., British, Pakistani"
          />
        </div>

        <div className="form-group">
          <label>National Insurance Number</label>
          <input
            type="text"
            value={data.ni_number || ''}
            onChange={(e) => onChange('ni_number', e.target.value.toUpperCase())}
            placeholder="e.g., AB 12 34 56 C"
            style={{ fontFamily: 'monospace' }}
          />
          {errors.ni_number && <span style={{ color: 'var(--danger)', fontSize: '0.85em' }}>{errors.ni_number}</span>}
        </div>
      </div>
    </fieldset>
  );
}

export default PersonalInformation;
