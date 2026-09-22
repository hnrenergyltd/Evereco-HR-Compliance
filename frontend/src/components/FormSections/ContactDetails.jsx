function ContactDetails({ data, onChange, errors, isEditing }) {
  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return !email || re.test(email);
  };

  const validatePhone = (phone) => {
    const re = /^[\d\s\-\+\(\)]+$/;
    return !phone || (re.test(phone) && phone.replace(/\D/g, '').length >= 10);
  };

  return (
    <fieldset disabled={!isEditing} style={{ border: 'none', padding: '0', margin: '20px 0' }}>
      <h4 style={{ color: 'var(--primary)', marginBottom: '15px', fontSize: '1.1em' }}>Contact Details</h4>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
        <div className="form-group">
          <label>Personal Email</label>
          <input
            type="email"
            value={data.personal_email || ''}
            onChange={(e) => onChange('personal_email', e.target.value)}
            placeholder="your.email@example.com"
          />
          {errors.personal_email && <span style={{ color: 'var(--danger)', fontSize: '0.85em' }}>{errors.personal_email}</span>}
        </div>

        <div className="form-group">
          <label>Work Email</label>
          <input
            type="email"
            value={data.work_email || ''}
            onChange={(e) => onChange('work_email', e.target.value)}
            placeholder="firstname.lastname@evereco.com"
          />
          {errors.work_email && <span style={{ color: 'var(--danger)', fontSize: '0.85em' }}>{errors.work_email}</span>}
        </div>

        <div className="form-group">
          <label>Mobile Number</label>
          <input
            type="tel"
            value={data.mobile_number || ''}
            onChange={(e) => onChange('mobile_number', e.target.value)}
            placeholder="+44 7000 000000"
          />
          {errors.mobile_number && <span style={{ color: 'var(--danger)', fontSize: '0.85em' }}>{errors.mobile_number}</span>}
        </div>

        <div className="form-group">
          <label>Home Telephone</label>
          <input
            type="tel"
            value={data.home_telephone || ''}
            onChange={(e) => onChange('home_telephone', e.target.value)}
            placeholder="+44 1234 567890"
          />
          {errors.home_telephone && <span style={{ color: 'var(--danger)', fontSize: '0.85em' }}>{errors.home_telephone}</span>}
        </div>
      </div>
    </fieldset>
  );
}

export default ContactDetails;
