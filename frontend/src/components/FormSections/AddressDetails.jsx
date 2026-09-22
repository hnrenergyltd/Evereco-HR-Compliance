function AddressDetails({ data, onChange, errors, isEditing }) {
  const validatePostcode = (postcode) => {
    const re = /^[A-Z]{1,2}[0-9]{1,2}[A-Z]?\s?[0-9][A-Z]{2}$/i;
    return !postcode || re.test(postcode.toUpperCase());
  };

  return (
    <fieldset disabled={!isEditing} style={{ border: 'none', padding: '0', margin: '20px 0' }}>
      <h4 style={{ color: 'var(--primary)', marginBottom: '15px', fontSize: '1.1em' }}>Home Address</h4>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>Address Line 1</label>
          <input
            type="text"
            value={data.address_line_1 || ''}
            onChange={(e) => onChange('address_line_1', e.target.value)}
            placeholder="123 Main Street"
          />
          {errors.address_line_1 && <span style={{ color: 'var(--danger)', fontSize: '0.85em' }}>{errors.address_line_1}</span>}
        </div>

        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>Address Line 2 (Optional)</label>
          <input
            type="text"
            value={data.address_line_2 || ''}
            onChange={(e) => onChange('address_line_2', e.target.value)}
            placeholder="Apartment, suite, etc."
          />
        </div>

        <div className="form-group">
          <label>City/Town</label>
          <input
            type="text"
            value={data.city_town || ''}
            onChange={(e) => onChange('city_town', e.target.value)}
            placeholder="London"
          />
          {errors.city_town && <span style={{ color: 'var(--danger)', fontSize: '0.85em' }}>{errors.city_town}</span>}
        </div>

        <div className="form-group">
          <label>Postcode</label>
          <input
            type="text"
            value={data.postcode || ''}
            onChange={(e) => onChange('postcode', e.target.value.toUpperCase())}
            placeholder="SW1A 1AA"
            style={{ fontFamily: 'monospace' }}
          />
          {errors.postcode && <span style={{ color: 'var(--danger)', fontSize: '0.85em' }}>{errors.postcode}</span>}
        </div>

        <div className="form-group">
          <label>Country</label>
          <input
            type="text"
            value={data.country || ''}
            onChange={(e) => onChange('country', e.target.value)}
            placeholder="United Kingdom"
          />
          {errors.country && <span style={{ color: 'var(--danger)', fontSize: '0.85em' }}>{errors.country}</span>}
        </div>
      </div>
    </fieldset>
  );
}

export default AddressDetails;
